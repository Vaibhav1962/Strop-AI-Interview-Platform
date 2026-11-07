"""Adversarial tests for IncrementalDialogueExtractor."""

import pytest
from app.orchestrator.incremental_extractor import IncrementalDialogueExtractor


def feed_in_chunks(text: str, chunk_size: int = 1) -> str:
    """Helper to feed full string into extractor in arbitrary chunks."""
    extractor = IncrementalDialogueExtractor()
    out = []
    for i in range(0, len(text), chunk_size):
        chunk = text[i : i + chunk_size]
        res = extractor.feed(chunk)
        if res:
            out.append(res)
    res_flush = extractor.flush()
    if res_flush:
        out.append(res_flush)
    return "".join(out)


def test_standard_json_extraction():
    raw_json = (
        '{\n'
        '  "assistant_response": "Hello, Alex here. Let\'s explore your architecture.",\n'
        '  "delta_metadata": {"progress_classification": "PROGRESS"}\n'
        '}'
    )
    # Feed whole
    assert feed_in_chunks(raw_json, chunk_size=len(raw_json)) == "Hello, Alex here. Let's explore your architecture."
    # Feed in 3-char chunks
    assert feed_in_chunks(raw_json, chunk_size=3) == "Hello, Alex here. Let's explore your architecture."
    # Feed in 1-char chunks (adversarial fragmentation)
    assert feed_in_chunks(raw_json, chunk_size=1) == "Hello, Alex here. Let's explore your architecture."


def test_escaped_quotes_and_backslashes():
    raw_json = (
        '{\n'
        '  "assistant_response": "You said: \\"Postgres won\'t scale\\\\recover\\", but what about sharding?",\n'
        '  "delta_metadata": {}\n'
        '}'
    )
    expected = 'You said: "Postgres won\'t scale\\recover", but what about sharding?'
    assert feed_in_chunks(raw_json, chunk_size=1) == expected
    assert feed_in_chunks(raw_json, chunk_size=2) == expected
    assert feed_in_chunks(raw_json, chunk_size=5) == expected


def test_escaped_newlines_and_tabs():
    raw_json = (
        '{\n'
        '  "assistant_response": "Point 1:\\n- Line A\\n- Line B\\t(details)",\n'
        '  "delta_metadata": {}\n'
        '}'
    )
    expected = "Point 1:\n- Line A\n- Line B\t(details)"
    assert feed_in_chunks(raw_json, chunk_size=1) == expected
    assert feed_in_chunks(raw_json, chunk_size=4) == expected


def test_unicode_escapes_and_surrogate_pairs():
    # \u0024 = $, \u2014 = —, \uD83D\uDE80 = 🚀
    raw_json = (
        '{\n'
        '  "assistant_response": "Budget is \\u0024500 \\u2014 launch \\uD83D\\uDE80 now!",\n'
        '  "delta_metadata": {}\n'
        '}'
    )
    expected = "Budget is $500 — launch 🚀 now!"
    assert feed_in_chunks(raw_json, chunk_size=1) == expected
    assert feed_in_chunks(raw_json, chunk_size=3) == expected


def test_direct_utf8_unicode():
    raw_json = (
        '{\n'
        '  "assistant_response": "こんにちは！ Great point on resilience 💡 and failover 🛡️.",\n'
        '  "delta_metadata": {}\n'
        '}'
    )
    expected = "こんにちは！ Great point on resilience 💡 and failover 🛡️."
    assert feed_in_chunks(raw_json, chunk_size=1) == expected
    assert feed_in_chunks(raw_json, chunk_size=2) == expected


def test_fields_before_and_after_target_key():
    raw_json = (
        '{\n'
        '  "turn_id": 42,\n'
        '  "debug_meta": {"status": "ok"},\n'
        '  "assistant_response": "Welcome to the deep dive.",\n'
        '  "delta_metadata": {\n'
        '    "technical_claims": ["Raft with RocksDB"],\n'
        '    "identified_vulnerabilities": ["Leader election partition"]\n'
        '  }\n'
        '}'
    )
    result = feed_in_chunks(raw_json, chunk_size=2)
    assert result == "Welcome to the deep dive."
    # Metadata must NEVER be emitted
    assert "Raft" not in result
    assert "Leader election" not in result
    assert "delta_metadata" not in result


def test_incomplete_stream_cuts_off_inside_string():
    raw_json = (
        '{\n'
        '  "assistant_response": "How do you coordinate distributed sag'
    )
    extractor = IncrementalDialogueExtractor()
    out = [extractor.feed(raw_json)]
    out.append(extractor.flush())
    assert "".join(out) == "How do you coordinate distributed sag"
    assert not extractor.is_done()


def test_malformed_json_no_target_key():
    raw_json = '{"error": "Rate limit exceeded", "code": 429}'
    extractor = IncrementalDialogueExtractor()
    out = extractor.feed(raw_json)
    out += extractor.flush()
    assert out == ""
    assert not extractor.is_done()


def test_whitespace_variations():
    raw_json = '{\n   "assistant_response"   \t\n:   \t"Smooth answer."\n}'
    assert feed_in_chunks(raw_json, chunk_size=3) == "Smooth answer."

