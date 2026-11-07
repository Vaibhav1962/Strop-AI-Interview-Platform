"""The DSA catalog is the single source of truth for problem tests. Keep it clean."""

import json

from app.orchestrator.question_bank.dsa_catalog import DSA_CATALOG


def _json_ok(text: str) -> bool:
    try:
        json.loads(text)
        return True
    except Exception:
        return False


def test_every_runnable_problem_has_canonical_tests():
    problems = []
    for item in DSA_CATALOG:
        meta = item["metadata_json"]
        if meta.get("runnable") is False:
            continue
        tests = meta.get("test_cases", [])
        if not tests:
            problems.append(f"{item['id']}: no tests")
        for i, tc in enumerate(tests, 1):
            lines = [l for l in str(tc.get("input", "")).splitlines() if l.strip()]
            if not lines or not all(_json_ok(l) for l in lines):
                problems.append(f"{item['id']} test {i}: input is not one JSON value per line")
            if not str(tc.get("expected", "")).strip() or not _json_ok(tc["expected"]):
                problems.append(f"{item['id']} test {i}: expected is empty or not JSON")
    assert not problems, "\n".join(problems[:20])


def test_argument_count_matches_inputs():
    for item in DSA_CATALOG:
        meta = item["metadata_json"]
        n_args = len(meta.get("args", []))
        for tc in meta.get("test_cases", []):
            lines = [l for l in str(tc["input"]).splitlines() if l.strip()]
            # Design problems (MinStack, LRUCache, TimeMap) feed an operations list and an arguments list.
            expected = 2 if n_args == 0 or meta["entry_point"][:1].isupper() else n_args
            assert len(lines) == expected, f"{item['id']}: {len(lines)} input lines for {n_args} args"


def test_problem_ids_are_unique():
    ids = [i["id"] for i in DSA_CATALOG]
    assert len(ids) == len(set(ids))
