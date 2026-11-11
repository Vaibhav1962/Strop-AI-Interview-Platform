"""The rubric is strict: levels are capped by what the candidate really said, and the report says what would raise them."""

import uuid
from types import SimpleNamespace

from app.orchestrator.evaluator import BarsEvaluator


def session_with(candidate_text: str, track="DSA"):
    return SimpleNamespace(
        id=uuid.uuid4(),
        track=track,
        title="Strict test",
        working_memory={"submitted_code": "x = 1"},
        transcript=[
            {"turn_index": 0, "speaker": "Alex", "text": "Walk me through your approach."},
            {"turn_index": 1, "speaker": "Candidate", "text": candidate_text},
        ],
    )


def report_for(level, quotes, classification="Demonstrated competence", comp_id="problem_clarification"):
    return {
        "competency_evaluations": [
            {
                "competency_id": comp_id,
                "competency_name": "x",
                "evidence_classification": classification,
                "bars_level": level,
                "bars_anchor": "model text",
                "behavioral_observation": "obs",
                "evidence_quotes": [{"turn_index": 1, "speaker": "Candidate", "quote": q, "relevance": "r"} for q in quotes],
                "strengths": [],
                "gaps_or_limitations": [],
            }
        ],
        "communication_scorecard": {"overall_rating": "Exemplary", "dimensions": [
            {"dimension_id": d, "name": d, "rating": "Exemplary", "observation": "o"} for d in
            ("clarity", "structure", "conciseness", "verbal_fluency", "confidence", "technical_communication", "responsiveness")
        ]},
    }


LONG = ("I would clarify the constraints first, the input size and whether values can be negative or zero, then use a hash map "
        "to track the best product ending at each index so the whole pass is linear and the extra space stays constant. ") * 9


def comp(report):
    return report.competency_evaluations[0]


def test_an_invented_quote_earns_nothing():
    s = session_with(LONG)
    r = BarsEvaluator.sanitize_and_validate_report(report_for(4, ["I proved the invariant by induction on the prefix length"]), s)
    assert comp(r).bars_level <= 2
    assert comp(r).evidence_quotes == []


def test_level_four_needs_two_real_quotes():
    s = session_with(LONG)
    quote = "use a hash map to track the best product ending at each index"
    one = BarsEvaluator.sanitize_and_validate_report(report_for(4, [quote]), s)
    assert comp(one).bars_level == 3
    two = BarsEvaluator.sanitize_and_validate_report(report_for(4, [quote, "clarify the constraints first, the input size and whether values can be negative"]), s)
    assert comp(two).bars_level == 4


def test_a_thin_interview_cannot_reach_a_high_level():
    s = session_with("I would use a hash map to track the best product ending at each index.")
    r = BarsEvaluator.sanitize_and_validate_report(report_for(3, ["use a hash map to track the best product ending at each index"]), s)
    assert comp(r).bars_level == 2
    assert comp(r).evidence_classification.value == "Weak evidence"
    assert any("Rated lower" in g for g in comp(r).gaps_or_limitations)


def test_the_report_names_the_next_level_from_the_rubric():
    s = session_with(LONG)
    r = BarsEvaluator.sanitize_and_validate_report(report_for(3, ["use a hash map to track the best product ending at each index"]), s)
    assert comp(r).bars_level == 3
    assert comp(r).next_level_anchor and comp(r).next_level_anchor.startswith("Level 4")


def test_communication_is_not_exemplary_without_substantial_clean_speech():
    s = session_with("I would use a hash map and a single pass.")
    r = BarsEvaluator.sanitize_and_validate_report(report_for(2, ["use a hash map and a single pass"]), s)
    assert {d.rating for d in r.communication_scorecard.dimensions} <= {"Adequate", "Developing"}
