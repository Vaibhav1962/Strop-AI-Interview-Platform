"""Every DSA problem must carry a real statement (constraints and examples) the candidate can read before coding."""

import sys
from pathlib import Path

from app.orchestrator.actor import InterviewerActor
from app.orchestrator.question_bank.dsa_catalog import DSA_CATALOG
from app.orchestrator.spoken_text import to_spoken_text

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import dsa_statement_data  # noqa: E402

PLACEHOLDERS = ("Optimal Big-O time and space complexity required", "Handle empty, single element")


def test_every_problem_has_real_constraints():
    bad = []
    for item in DSA_CATALOG:
        cons = item["metadata_json"].get("constraints") or []
        if len(cons) < 2:
            bad.append(f"{item['id']}: fewer than 2 constraints")
        if any(p in c for c in cons for p in PLACEHOLDERS):
            bad.append(f"{item['id']}: placeholder constraints")
    assert not bad, "\n".join(bad[:20])


def test_every_problem_has_structured_examples():
    bad = []
    for item in DSA_CATALOG:
        exs = item["metadata_json"].get("examples") or []
        if not exs:
            bad.append(f"{item['id']}: no examples")
        for e in exs:
            if not (isinstance(e, dict) and e.get("input") and e.get("output")):
                bad.append(f"{item['id']}: example is not an {{input, output}} object")
    assert not bad, "\n".join(bad[:20])


def test_statement_data_covers_the_catalog_exactly():
    ids = {i["id"] for i in DSA_CATALOG}
    assert set(dsa_statement_data.CONSTRAINTS) == ids


def test_examples_are_the_real_tests():
    """Examples come from the canonical tests, so they cannot disagree with what the code runner checks."""
    item = next(i for i in DSA_CATALOG if i["id"] == "subarray-sum-k")
    assert item["metadata_json"]["examples"][0] == {"input": "nums = [1,1,1], k = 2", "output": "2"}


def test_prompt_gives_alex_the_spec_and_a_private_reference():
    spec = InterviewerActor.dsa_problem_spec(
        {
            "title": "Subarray Sum Equals K",
            "description": "Count subarrays that sum to k.",
            "constraints": ["1 <= nums.length <= 2 * 10^4"],
            "examples": [{"input": "nums = [1,1,1], k = 2", "output": "2"}],
            "optimal_time_complexity": "O(N)",
            "optimal_space_complexity": "O(N)",
        },
        {"expected_signals": ["prefix sum hash map"]},
    )
    assert "Constraint: 1 <= nums.length <= 2 * 10^4" in spec
    assert "Example: input nums = [1,1,1], k = 2 gives 2" in spec
    assert "PRIVATE REFERENCE" in spec and "best time O(N)" in spec and "prefix sum hash map" in spec


def test_prompt_spec_accepts_legacy_string_examples():
    spec = InterviewerActor.dsa_problem_spec({"title": "T", "examples": ["nums = [1], expected 1"]}, None)
    assert "Example: nums = [1], expected 1" in spec


def test_literal_arrays_are_spoken_as_words():
    assert to_spoken_text("Dry-run [1, -1, 1, -1] with k = 0.") == "Dry-run 1, minus 1, 1 and minus 1 with k = 0."
    assert to_spoken_text("Take [3, 4].") == "Take 3 and 4."
    assert to_spoken_text("What about [1,2,3,4,5,6,7,8]?") == "What about the example array?"


def test_spoken_text_leaves_everything_else_alone():
    for text in ("The hashmap is {0: 1}.", "That is O(N) time.", "Index nums[i] and nums[i + 1].", "A grid [[1,2],[3,4]]."):
        assert to_spoken_text(text) == text
    assert to_spoken_text("") == ""
