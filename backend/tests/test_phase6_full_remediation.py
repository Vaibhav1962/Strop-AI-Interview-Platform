import uuid
import pytest
from app.schemas.orchestrator import (
    TurnDeltaMetadata,
    ApproachUpdate,
    TurnClassification,
    WorkingMemory,
    BarsEvaluationReport,
    CompetencyEvaluation,
    EvidenceClassification,
    InterviewCoverageSummary,
)
from app.models.orchestrator_session import OrchestratorSession
from app.orchestrator.supervisor import SupervisorEngine, SupervisorDirective
from app.orchestrator.actor import InterviewerActor
from app.orchestrator.evaluator import BarsEvaluator
from app.api.orchestrator import sanitize_dsa_problem_for_client


# ==============================================================================
# Workstream B: DSA Hidden Test Sanitization & Prompt Discipline
# ==============================================================================

def test_hidden_test_sanitization():
    """Verify that private/hidden test cases are stripped from client payloads."""
    raw_dsa = {
        "id": "longest-substring",
        "title": "Longest Substring Without Repeating Characters",
        "testCases": [
            {"input": "abcabcbb", "expectedOutput": 3, "isHidden": False},
            {"input": "bbbbb", "expectedOutput": 1, "isHidden": False},
            {"input": "pwwkew", "expectedOutput": 3, "isHidden": True},
            {"input": "abcdefghijklm", "expectedOutput": 13, "is_hidden": True},
        ]
    }
    sanitized = sanitize_dsa_problem_for_client(raw_dsa)
    assert len(sanitized["testCases"]) == 2
    for tc in sanitized["testCases"]:
        assert not tc.get("isHidden")
        assert not tc.get("is_hidden")
        assert tc["input"] in ["abcabcbb", "bbbbb"]


def test_actor_dsa_prompt_milestone_discipline():
    """Verify Actor system prompt enforces problem orientation and forbids premature coding."""
    actor = InterviewerActor()
    directive = SupervisorDirective(
        action="PROBE_DEEPER",
        current_milestone_id="brute_force_and_intuition",
        current_milestone_title="Brute-Force Baseline & Big-O Intuition",
        target_focus="brute-force approach and quadratic complexity",
        guidance="Probe their initial approach.",
        suggested_fallback_probe="What is your brute force baseline?",
        stagnation_count=0,
        track="DSA",
    )
    wm = {
        "current_milestone": "brute_force_and_intuition",
        "dsa_problem": {"id": "longest-substring", "title": "Longest Substring", "revealed": False},
    }
    prompt = actor.build_system_prompt(directive, wm)
    assert "DO NOT ask them to write code yet!" in prompt
    assert "Milestone: Brute-Force Baseline" in prompt


# ==============================================================================
# Workstream C: Code Submission Flow & Supervisor Directives
# ==============================================================================

def test_supervisor_code_submission_directive():
    """Verify Supervisor triggers REVIEW_CODE when candidate code is submitted."""
    session = OrchestratorSession(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        track="DSA",
        working_memory={
            "current_milestone": "algorithmic_optimization",
            "has_unreviewed_code": True,
            "submitted_code": "def lengthOfLongestSubstring(s):\n    return len(set(s))\n",
            "submitted_language": "python",
        },
        transcript=[],
    )
    directive = SupervisorEngine.evaluate_state(session)
    assert directive.action == "REVIEW_CODE"
    assert "submitted code" in directive.guidance and "ACTUAL code" in directive.guidance


# ==============================================================================
# Workstream E: Truth-in-Evidence BARS Evaluation Guard
# ==============================================================================

def test_bars_evaluation_nullifies_coding_rubrics_when_no_code_submitted():
    """Verify that unwritten code is NEVER rated as written code in BARS evaluations."""
    evaluator = BarsEvaluator()
    session = OrchestratorSession(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        track="DSA",
        working_memory={
            "current_milestone": "brute_force_and_intuition",
            # Notice: submitted_code is None or missing
        },
        transcript=[],
    )
    
    mock_llm_report = {
        "session_id": str(session.id),
        "track": "DSA",
        "title": "DSA Problem Solving Interview",
        "calibration_signal": "Solid Evidence with Specific Gaps",
        "overall_hiring_recommendation": "Hire",
        "coverage_summary": {
            "total_competencies": 4,
            "demonstrated_count": 3,
            "weak_count": 1,
            "insufficient_coverage_count": 0,
            "contradictory_count": 0,
            "coverage_percentage": 75.0,
            "coverage_assessment": "Adequate",
        },
        "executive_summary": "Candidate demonstrated solid theoretical intuition.",
        "competency_evaluations": [
            {
                "id": "problem_solving_and_algorithmic_thinking",
                "name": "Problem Solving & Algorithmic Thinking",
                "evidence_classification": "Demonstrated competence",
                "bars_level": 4,
                "bars_anchor": "Identified optimal sliding window approach.",
                "behavioral_observation": "Candidate reasoned well about set window.",
                "evidence_quotes": [],
                "strengths": ["Good intuition"],
                "gaps_or_limitations": [],
            },
            {
                "id": "code_quality_and_implementation",
                "name": "Code Quality & Implementation",
                "evidence_classification": "Demonstrated competence",
                "bars_level": 4,
                "bars_anchor": "Clean and idiomatic Python implementation.",
                "behavioral_observation": "Wrote clean code.",
                "evidence_quotes": [],
                "strengths": ["Clean syntax"],
                "gaps_or_limitations": [],
            },
            {
                "id": "debugging_and_optimization",
                "name": "Debugging & Edge Case Verification",
                "evidence_classification": "Demonstrated competence",
                "bars_level": 3,
                "bars_anchor": "Tested empty string and duplicate characters.",
                "behavioral_observation": "Handled edge cases.",
                "evidence_quotes": [],
                "strengths": ["Edge cases"],
                "gaps_or_limitations": [],
            },
        ],
        "key_technical_strengths": ["Algorithm design"],
        "key_technical_weaknesses": [],
        "unresolved_architectural_areas": [],
        "communication_and_deliberation": "Clear communication",
        "actionable_growth_plan": ["Practice more hard problems"],
        "evaluation_limitations": [],
        "evaluated_at": "2026-11-05T12:00:00Z",
    }

    sanitized = evaluator.sanitize_and_validate_report(mock_llm_report, session)
    
    # Check that code_quality_and_implementation was overridden
    code_eval = next(c for c in sanitized.competency_evaluations if c.competency_id == "code_quality_and_implementation")
    assert code_eval.evidence_classification == EvidenceClassification.INSUFFICIENT_COVERAGE
    assert code_eval.bars_level is None

    # Check that debugging_and_optimization was overridden
    debug_eval = next(c for c in sanitized.competency_evaluations if c.competency_id == "debugging_and_optimization")
    assert debug_eval.evidence_classification == EvidenceClassification.INSUFFICIENT_COVERAGE
    assert debug_eval.bars_level is None


def test_bars_evaluation_preserves_ratings_when_code_was_submitted():
    """Verify that genuine ratings are preserved when candidate actually submitted code."""
    evaluator = BarsEvaluator()
    session = OrchestratorSession(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        track="DSA",
        working_memory={
            "current_milestone": "complexity_analysis_and_wrapup",
            "submitted_code": "def lengthOfLongestSubstring(s: str) -> int:\n    return len(set(s))\n",
            "submitted_language": "python",
        },
        transcript=[],
    )
    
    mock_llm_report = {
        "session_id": str(session.id),
        "track": "DSA",
        "title": "DSA Problem Solving Interview",
        "calibration_signal": "Strong Evidence in Covered Areas",
        "overall_hiring_recommendation": "Strong Hire",
        "coverage_summary": {
            "total_competencies": 1,
            "demonstrated_count": 1,
            "weak_count": 0,
            "insufficient_coverage_count": 0,
            "contradictory_count": 0,
            "coverage_percentage": 100.0,
            "coverage_assessment": "Complete",
        },
        "executive_summary": "Candidate wrote optimal O(N) sliding window implementation.",
        "competency_evaluations": [
            {
                "id": "code_quality_and_implementation",
                "name": "Code Quality & Implementation",
                "evidence_classification": "Demonstrated competence",
                "bars_level": 4,
                "bars_anchor": "Flawless, idiomatic Python implementation with optimal sliding window.",
                "behavioral_observation": "Clean hashmap tracking with zero regressions.",
                "evidence_quotes": [
                    {"turn_index": 3, "quote": "I implemented sliding window using seen map", "relevance": "Implementation"}
                ],
                "strengths": ["Idiomatic Python"],
                "gaps_or_limitations": [],
            },
        ],
        "key_technical_strengths": ["Optimal sliding window"],
        "key_technical_weaknesses": [],
        "unresolved_architectural_areas": [],
        "communication_and_deliberation": "Clear",
        "actionable_growth_plan": [],
        "evaluation_limitations": [],
        "evaluated_at": "2026-11-05T12:00:00Z",
    }

    sanitized = evaluator.sanitize_and_validate_report(mock_llm_report, session)
    code_eval = next(c for c in sanitized.competency_evaluations if c.competency_id == "code_quality_and_implementation")
    assert code_eval.bars_level == 4
    assert code_eval.evidence_classification == EvidenceClassification.DEMONSTRATED_COMPETENCE
