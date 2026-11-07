"""Focused test for InterviewerActor.generate_turn_stream with clean dialogue token extraction."""

import json
import pytest
from unittest.mock import patch, MagicMock

from app.orchestrator.actor import InterviewerActor
from app.orchestrator.supervisor import SupervisorDirective


class MockAiterLines:
    def __init__(self, lines):
        self.lines = lines

    def __aiter__(self):
        self._iter = iter(self.lines)
        return self

    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration


class MockStreamResponse:
    def __init__(self, lines, status_code: int = 200):
        self.lines = lines
        self.status_code = status_code

    async def aread(self):
        return b""

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass

    def aiter_lines(self):
        return MockAiterLines(self.lines)


@pytest.mark.asyncio
async def test_actor_generate_turn_stream_dialogue_filtering():
    # Simulate fragmented chunks as emitted by OpenRouter SSE
    json_fragments = [
        '{\n  "',
        'assistant_response',
        '": "Hello candidate! ',
        'Let\\\'s review ',
        'your partition strategy.\\n',
        'What about cross-shard consensus?",\n',
        '  "delta_metadata": {\n',
        '    "technical_claims": ["partition strategy"],\n',
        '    "identified_vulnerabilities": ["cross-shard consensus"],\n',
        '    "progress_classification": "PROGRESS"\n',
        '  }\n}'
    ]

    sse_lines = []
    for frag in json_fragments:
        payload = json.dumps({"choices": [{"delta": {"content": frag}}]})
        sse_lines.append(f"data: {payload}")
    sse_lines.append("data: [DONE]")

    mock_client = MagicMock()
    mock_client.stream.return_value = MockStreamResponse(sse_lines)
    mock_client_ctx = MagicMock()
    mock_client_ctx.__aenter__.return_value = mock_client
    mock_client_ctx.__aexit__.return_value = None

    actor = InterviewerActor(api_key="mock_key")
    directive = SupervisorDirective(
        action="PROBE_DEEPER",
        target_focus="cross-shard consensus",
        guidance="Probe consensus failure modes",
        current_milestone_title="Deep Dive",
        current_milestone_id="deep_dive",
        suggested_fallback_probe="Fallback probe",
        stagnation_count=0,
    )

    events = []
    with patch("httpx.AsyncClient", return_value=mock_client_ctx):
        async for ev in actor.generate_turn_stream(
            directive=directive,
            working_memory={},
            transcript=[],
            candidate_text="I use hash partitioning.",
        ):
            events.append(ev)

    # 1. Assert TTFT was emitted
    ttft_events = [e for e in events if e["type"] == "ttft"]
    assert len(ttft_events) == 1
    assert ttft_events[0]["ttft_ms"] >= 0

    # 2. Assert tokens contain ONLY dialogue characters
    token_events = [e for e in events if e["type"] == "token"]
    streamed_dialogue = "".join(e["token"] for e in token_events)

    expected_dialogue = (
        "Hello candidate! Let's review your partition strategy.\n"
        "What about cross-shard consensus?"
    )
    assert streamed_dialogue == expected_dialogue

    # 3. CRITICAL: Assert NO JSON syntax or metadata leaked into streamed dialogue
    assert "assistant_response" not in streamed_dialogue
    assert "delta_metadata" not in streamed_dialogue
    assert "technical_claims" not in streamed_dialogue
    assert "{" not in streamed_dialogue
    assert "}" not in streamed_dialogue

    # 4. Assert final event has structured metadata
    final_events = [e for e in events if e["type"] == "final"]
    assert len(final_events) == 1
    assert final_events[0]["assistant_response"] == expected_dialogue
    assert final_events[0]["delta_metadata"]["progress_classification"] == "PROGRESS"
    assert "partition strategy" in final_events[0]["delta_metadata"]["technical_claims"]
