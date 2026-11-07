"""Two Groq accounts: both are used, and load is spread across them instead of exhausting the first key."""

from types import SimpleNamespace

import pytest

from app import groq_keys as gk
from app.orchestrator.actor import InterviewerActor


@pytest.fixture(autouse=True)
def two_keys(monkeypatch):
    # Ignore any real keys in backend/.env: only the environment variables set here count.
    monkeypatch.setattr("app.config.get_settings", lambda: SimpleNamespace(groq_api_key="", groq2_api_key=""))
    monkeypatch.setenv("GROQ_API_KEY", "key-one")
    monkeypatch.setenv("GROQ2_API_KEY", "key-two")
    gk._usage.clear()
    gk._cooldown_until.clear()
    yield
    gk._usage.clear()
    gk._cooldown_until.clear()


def test_both_keys_are_configured_in_priority_order():
    assert [k for k, _ in gk.groq_keys()] == ["groq1", "groq2"]


def test_blank_and_duplicate_keys_are_ignored(monkeypatch):
    monkeypatch.setenv("GROQ2_API_KEY", "key-one")
    assert [k for k, _ in gk.groq_keys()] == ["groq1"]
    monkeypatch.setenv("GROQ_API_KEY", "")
    monkeypatch.setenv("GROQ2_API_KEY", "key-two")
    assert [k for k, _ in gk.groq_keys()] == ["groq2"]


def test_the_less_used_key_goes_first():
    model = "openai/gpt-oss-120b"
    assert gk.ordered_keys(model)[0][0] == "groq1"  # tie keeps the configured order
    gk.record_usage("groq1", model, 3500)
    assert gk.ordered_keys(model)[0][0] == "groq2"
    gk.record_usage("groq2", model, 7000)
    assert gk.ordered_keys(model)[0][0] == "groq1"


def test_usage_is_tracked_per_model():
    gk.record_usage("groq1", "openai/gpt-oss-120b", 8000)
    assert gk.ordered_keys("openai/gpt-oss-20b")[0][0] == "groq1"


def test_requests_alternate_between_keys_as_they_fill_up():
    actor = InterviewerActor(api_key="or-key")
    model = actor.groq_models()[0]
    used = []
    for _ in range(4):
        first = actor.groq_key_list(model)[0][0]
        used.append(first)
        gk.record_usage(first, model, 3500)
    assert used == ["groq1", "groq2", "groq1", "groq2"]


def test_streaming_providers_prefer_the_idle_key_and_keep_the_other_as_backup():
    actor = InterviewerActor(api_key="or-key")
    model = actor.groq_models()[0]
    gk.record_usage("groq1", model, 7500)
    providers = actor.streaming_providers({"messages": [{"role": "user", "content": "hi"}], "temperature": 0.3, "stream": True}, {})
    labels = [p[0] for p in providers]
    assert labels[0] == f"Groq2:{model}"
    assert f"Groq:{model}" in labels
    assert labels[-1] == "OpenRouter"


def test_a_rate_limited_key_is_skipped_for_that_model_only():
    actor = InterviewerActor(api_key="or-key")
    model = actor.groq_models()[0]
    other = actor.groq_models()[1]
    actor.note_provider_failure(f"Groq:{model}", RuntimeError(f"Groq:{model} returned 429: slow down"))
    labels = [p[0] for p in actor.streaming_providers({"messages": [], "stream": True}, {})]
    assert f"Groq:{model}" not in labels
    assert f"Groq2:{model}" in labels
    assert f"Groq:{other}" in labels


def test_usage_is_recorded_after_a_successful_stream():
    actor = InterviewerActor(api_key="or-key")
    model = actor.groq_models()[0]
    payload = {"messages": [{"role": "user", "content": "x" * 4000}]}
    actor.note_provider_success(f"Groq:{model}", payload, "y" * 800)
    assert gk.recent_tokens("groq1", model) >= 1000 + 200
    assert gk.recent_tokens("groq2", model) == 0
