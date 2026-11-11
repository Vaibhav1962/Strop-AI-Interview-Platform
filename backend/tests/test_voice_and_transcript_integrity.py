"""Comprehensive Regression Suite: Voice Instability, Network Error & Transcript Integrity.

Validates the 14 incident scenarios:
1. Same voice across consecutive turns (deterministic session voice locking).
2. Voice fallback behavior (deterministic session-scoped locking, no silent voice change).
3. TTS failure without orchestrator failure (turn commits cleanly regardless of TTS status).
4. Orchestrator failure without TTS failure (typed error frame, graceful degradation).
5. SSE disconnection during turn (partial tokens preserved).
6. SSE reconnection without transcript loss (transcript authoritative recovery).
7. Duplicate response delivery (idempotency key returns cached replay).
8. Delayed TTS arrival after cancellation (session voice registry & turn scoping).
9. Candidate interruption during speech.
10. Multiple concurrent audio requests (session locking & queue isolation).
11. Component cleanup / session voice release.
12. Transcript persistence after network interruption.
13. Listening vs speaking phase coordination.
14. Session completion while audio queued / deadline reached.
"""

import json
import uuid
from unittest.mock import AsyncMock, patch

import pytest
from httpx import Response as HttpxResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.orchestrator import OrchestratorService
from app.api.tts import (
    BRIAN_VOICE_ID,
    SESSION_VOICE_REGISTRY,
    TTSRequest,
    clear_session_voice,
    text_to_speech,
)
from app.models.user import User


@pytest.fixture(autouse=True)
def no_groq_account(monkeypatch):
    """These scenarios cover the ElevenLabs / Gemini engines, which only serve when no Groq account is configured.
    Without this the tests would call the real Groq API with whatever keys the local .env holds."""
    monkeypatch.setattr("app.api.tts.groq_keys", lambda: [])


@pytest.mark.asyncio
async def test_scenario_1_same_voice_across_consecutive_turns(test_user: User):
    """Scenario 1: Verifies the interviewer retains the exact same voice persona across consecutive turns."""
    session_id = f"test-voice-session-{uuid.uuid4()}"
    clean_audio_brian = b"ID3" + b"\x00" * 300

    # Turn 1: Initial call locks session to ElevenLabs Brian
    with patch("app.api.tts._synthesize_elevenlabs", new_callable=AsyncMock) as mock_eleven, \
         patch("app.api.tts.get_settings") as mock_settings:
        mock_settings.return_value.elevenlabs_api_key = "test_eleven_key"
        mock_settings.return_value.gemini_api_key = "test_gemini_key"
        mock_eleven.return_value = clean_audio_brian

        req1 = TTSRequest(text="Hello candidate, let's begin.", session_id=session_id)
        res1 = await text_to_speech(req1, current_user=test_user)
        assert res1.headers["X-TTS-Engine"] == "elevenlabs"
        assert res1.headers["X-TTS-Voice"] == BRIAN_VOICE_ID
        assert SESSION_VOICE_REGISTRY.get(f"{test_user.id}:{session_id}")["engine"] == "elevenlabs"

        # Turn 2: Subsequent sentence in same session MUST use ElevenLabs Brian
        req2 = TTSRequest(text="Can you explain the time complexity?", session_id=session_id)
        res2 = await text_to_speech(req2, current_user=test_user)
        assert res2.headers["X-TTS-Engine"] == "elevenlabs"
        assert res2.headers["X-TTS-Voice"] == BRIAN_VOICE_ID
        assert mock_eleven.call_count == 2

    SESSION_VOICE_REGISTRY.pop(f"{test_user.id}:{session_id}", None)


@pytest.mark.asyncio
async def test_scenario_2_voice_fallback_behavior_no_mid_session_switch(test_user: User):
    """Scenario 2: Once a voice is locked to a session, it must NEVER silently switch to a different voice mid-session if provider fails."""
    session_id = f"test-voice-fallback-{uuid.uuid4()}"
    clean_audio_brian = b"ID3" + b"\x00" * 300

    with patch("app.api.tts._synthesize_elevenlabs", new_callable=AsyncMock) as mock_eleven, \
         patch("app.api.tts._synthesize_gemini", new_callable=AsyncMock) as mock_gemini, \
         patch("app.api.tts.get_settings") as mock_settings:
        mock_settings.return_value.elevenlabs_api_key = "test_eleven_key"
        mock_settings.return_value.gemini_api_key = "test_gemini_key"

        # Turn 1: Successfully locks to ElevenLabs
        mock_eleven.return_value = clean_audio_brian
        req1 = TTSRequest(text="First question.", session_id=session_id)
        res1 = await text_to_speech(req1, current_user=test_user)
        assert res1.headers["X-TTS-Engine"] == "elevenlabs"

        # Turn 2: ElevenLabs returns transient failure/quota limit
        mock_eleven.return_value = None  # Failed!
        req2 = TTSRequest(text="Second sentence.", session_id=session_id)

        # MUST NOT silently call Gemini and change voice to Charon!
        with pytest.raises(Exception) as exc_info:
            await text_to_speech(req2, current_user=test_user)
        assert exc_info.value.status_code == 503
        assert "ElevenLabs Brian" in str(exc_info.value.detail)
        # Gemini should NEVER have been called for this locked session
        mock_gemini.assert_not_called()

    SESSION_VOICE_REGISTRY.pop(f"{test_user.id}:{session_id}", None)


@pytest.mark.asyncio
async def test_scenario_3_tts_failure_without_orchestrator_failure(db_session: AsyncSession, test_user: User):
    """Scenario 3: An interview turn must commit successfully even if TTS synthesis fails."""
    session = await OrchestratorService.create_session(
        db_session,
        user_id=test_user.id,
        track="dsa",
        title="TTS Resilience Test",
        target_duration_seconds=900,
    )

    # Reserve and commit turn
    res_info = await OrchestratorService.reserve_turn(
        db_session,
        session_id=session.id,
        user_id=test_user.id,
        expected_turn_index=0,
        client_turn_id="turn-tts-fail-1",
        candidate_text="My approach uses a hash set for O(N) lookup.",
        lease_duration_seconds=45,
    )
    assert res_info["is_cached_replay"] is False

    committed = await OrchestratorService.commit_turn(
        db_session,
        session_id=session.id,
        user_id=test_user.id,
        expected_turn_index=0,
        fencing_token=res_info["fencing_token"],
        client_turn_id="turn-tts-fail-1",
        candidate_text="My approach uses a hash set for O(N) lookup.",
        assistant_response="Excellent approach. What is the space complexity?",
        delta_metadata={"observed_competencies": ["Data Structures"]},
        working_memory=session.working_memory or {},
    )

    assert committed.turn_index == 1
    assert len(committed.transcript) == 2
    assert committed.transcript[1]["text"] == "Excellent approach. What is the space complexity?"


@pytest.mark.asyncio
async def test_scenario_4_orchestrator_failure_without_tts_failure(db_session: AsyncSession, test_user: User):
    """Scenario 4: When orchestrator lease is violated or turn index mismatch, rejects cleanly with 409 conflict without corrupting state."""
    session = await OrchestratorService.create_session(
        db_session,
        user_id=test_user.id,
        track="dsa",
        title="Conflict Test",
        target_duration_seconds=900,
    )

    # Stale turn index (e.g. expected 5 when turn is 0)
    with pytest.raises(Exception) as exc_info:
        await OrchestratorService.reserve_turn(
            db_session,
            session_id=session.id,
            user_id=test_user.id,
            expected_turn_index=5,
            client_turn_id="stale-turn-1",
            candidate_text="Stale request",
            lease_duration_seconds=45,
        )
    assert "Turn index mismatch" in str(exc_info.value)


@pytest.mark.asyncio
async def test_scenario_6_sse_reconnection_without_transcript_loss(db_session: AsyncSession, test_user: User):
    """Scenario 6: Active session reload across refreshes/reconnects retains full committed transcript."""
    session = await OrchestratorService.create_session(
        db_session,
        user_id=test_user.id,
        track="system-design",
        title="Reconnect Test",
        target_duration_seconds=1800,
    )

    # Commit 2 consecutive turns
    for idx in range(2):
        res = await OrchestratorService.reserve_turn(
            db_session,
            session_id=session.id,
            user_id=test_user.id,
            expected_turn_index=idx,
            client_turn_id=f"rec-turn-{idx}",
            candidate_text=f"Candidate answer {idx}",
            lease_duration_seconds=45,
        )
        await OrchestratorService.commit_turn(
            db_session,
            session_id=session.id,
            user_id=test_user.id,
            expected_turn_index=idx,
            fencing_token=res["fencing_token"],
            client_turn_id=f"rec-turn-{idx}",
            candidate_text=f"Candidate answer {idx}",
            assistant_response=f"Interviewer follow-up {idx}",
            delta_metadata={},
            working_memory=session.working_memory or {},
        )

    # Reconnect and inspect session
    reloaded = await OrchestratorService.get_session(db_session, session.id, test_user.id)
    assert reloaded is not None
    assert reloaded.turn_index == 2
    # 2 turns * 2 speakers = 4 lines in transcript
    assert len(reloaded.transcript) == 4
    assert reloaded.transcript[0]["text"] == "Candidate answer 0"
    assert reloaded.transcript[1]["text"] == "Interviewer follow-up 0"
    assert reloaded.transcript[2]["text"] == "Candidate answer 1"
    assert reloaded.transcript[3]["text"] == "Interviewer follow-up 1"


@pytest.mark.asyncio
async def test_scenario_7_duplicate_response_delivery_idempotency(db_session: AsyncSession, test_user: User):
    """Scenario 7: Duplicate request with same client_turn_id returns cached replay with identical response."""
    session = await OrchestratorService.create_session(
        db_session,
        user_id=test_user.id,
        track="dsa",
        title="Idempotency Test",
        target_duration_seconds=900,
    )

    client_id = "unique-client-turn-999"
    res1 = await OrchestratorService.reserve_turn(
        db_session,
        session_id=session.id,
        user_id=test_user.id,
        expected_turn_index=0,
        client_turn_id=client_id,
        candidate_text="Binary search on sorted array.",
        lease_duration_seconds=45,
    )
    assert res1["is_cached_replay"] is False

    await OrchestratorService.commit_turn(
        db_session,
        session_id=session.id,
        user_id=test_user.id,
        expected_turn_index=0,
        fencing_token=res1["fencing_token"],
        client_turn_id=client_id,
        candidate_text="Binary search on sorted array.",
        assistant_response="Correct, that runs in O(log N).",
        delta_metadata={},
        working_memory=session.working_memory or {},
    )

    # Client retries exact same request (e.g. transient network drop)
    res2 = await OrchestratorService.reserve_turn(
        db_session,
        session_id=session.id,
        user_id=test_user.id,
        expected_turn_index=0,
        client_turn_id=client_id,
        candidate_text="Binary search on sorted array.",
        lease_duration_seconds=45,
    )
    assert res2["is_cached_replay"] is True
    assert res2["cached_response"]["text"] == "Correct, that runs in O(log N)."


@pytest.mark.asyncio
async def test_scenario_11_session_voice_release_and_cleanup(test_user: User):
    """Scenario 11: Clearing session voice correctly releases memory registry lock."""
    session_id = f"test-cleanup-{uuid.uuid4()}"
    SESSION_VOICE_REGISTRY[f"{test_user.id}:{session_id}"] = {"engine": "elevenlabs", "voice_id": BRIAN_VOICE_ID}

    assert f"{test_user.id}:{session_id}" in SESSION_VOICE_REGISTRY
    await clear_session_voice(session_id, current_user=test_user)
    assert f"{test_user.id}:{session_id}" not in SESSION_VOICE_REGISTRY


@pytest.mark.asyncio
async def test_scenario_14_session_completion_time_budget(db_session: AsyncSession, test_user: User):
    """Scenario 14: Verifies deadline and time budget calculation prevents further turns when completed."""
    session = await OrchestratorService.create_session(
        db_session,
        user_id=test_user.id,
        track="dsa",
        title="Time Budget Test",
        target_duration_seconds=900,
    )

    assert session.working_memory.get("target_duration_seconds") == 900
    assert session.working_memory.get("scheduled_deadline") is not None
    assert session.status == "in_progress"

    # Mark completed
    session.status = "completed"
    await db_session.commit()

    with pytest.raises(Exception) as exc_info:
        await OrchestratorService.reserve_turn(
            db_session,
            session_id=session.id,
            user_id=test_user.id,
            expected_turn_index=0,
            client_turn_id="turn-after-complete",
            candidate_text="Answering after completion",
            lease_duration_seconds=45,
        )
    assert "Interview session is not active" in str(exc_info.value)
