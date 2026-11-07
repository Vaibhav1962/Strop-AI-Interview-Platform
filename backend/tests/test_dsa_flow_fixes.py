"""Regression tests for the DSA flow problems found in the simulated interviews:

1. Alex invites the candidate to code while the editor is still locked.
2. Consecutive challenges / space-complexity probes loop instead of progressing.
3. The problem statement is never given to the candidate.
"""

from app.orchestrator.actor import InterviewerActor
from app.orchestrator.supervisor import SupervisorEngine
from tests.test_dsa_conversational_memory import create_mock_dsa_session


def _mem(**extra):
    base = {
        "track": "DSA",
        "current_milestone": "algorithmic_optimization",
        "milestone_history": ["algorithmic_optimization"],
        "milestone_turn_counts": {"algorithmic_optimization": 1},
        "dsa_problem": {"revealed": False, "title": "Two Sum"},
    }
    base.update(extra)
    return base


def test_editor_unlocks_when_alex_invites_coding():
    for text in (
        "That works. Can you now write the code for this?",
        "Could you go ahead and implement it?",
        "The editor is ready: please write the solution.",
        "Open the code editor and start.",
        "Let's move to the implementation.",
    ):
        mem = SupervisorEngine.reconcile_dsa_workspace(_mem(), text)
        assert mem["dsa_problem"]["revealed"] is True, text
        assert mem["current_milestone"] == "code_implementation_and_dryrun", text


def test_editor_stays_locked_for_ordinary_questions():
    for text in (
        "What is the time complexity of that approach?",
        "Why does the window shrink when you see a duplicate?",
        "Before we write any code, what is the auxiliary space?",
    ):
        mem = SupervisorEngine.reconcile_dsa_workspace(_mem(), text)
        assert mem["dsa_problem"]["revealed"] is False, text
        assert mem["current_milestone"] == "algorithmic_optimization", text


def test_reconcile_leaves_other_tracks_alone():
    mem = {"track": "System Design", "dsa_problem": {"revealed": False}}
    assert SupervisorEngine.reconcile_dsa_workspace(mem, "Can you write the code?") is mem


def test_directive_history_is_recorded_and_capped():
    mem = {}
    for _ in range(12):
        mem = SupervisorEngine.update_working_memory_after_turn(mem, {}, directive_action="CHALLENGE_FLAW")
    assert len(mem["recent_actions"]) == 8
    assert SupervisorEngine.trailing_streak(mem, "CHALLENGE_FLAW") == 8
    mem = SupervisorEngine.update_working_memory_after_turn(mem, {}, directive_action="PROBE_DEEPER")
    assert SupervisorEngine.trailing_streak(mem, "CHALLENGE_FLAW") == 0
    assert SupervisorEngine.trailing_streak(mem, "PROBE_DEEPER") == 1


def test_challenges_stop_after_two_in_a_row():
    session = create_mock_dsa_session(
        current_milestone="algorithmic_optimization",
        milestone_turn_counts={"algorithmic_optimization": 2},
        working_memory=None,
    )
    wm = dict(session.working_memory)
    wm["confirmed_vulnerabilities"] = ["empty input is not handled", "duplicate handling is unclear"]
    wm["recent_actions"] = ["PROBE_DEEPER", "CHALLENGE_FLAW", "CHALLENGE_FLAW"]
    session.working_memory = wm
    directive = SupervisorEngine.evaluate_state(session)
    assert directive.action != "CHALLENGE_FLAW"

    wm["recent_actions"] = ["PROBE_DEEPER", "PROBE_DEEPER", "CHALLENGE_FLAW"]
    session.working_memory = wm
    assert SupervisorEngine.evaluate_state(session).action == "CHALLENGE_FLAW"


def test_actor_prompt_states_the_problem_itself():
    actor = InterviewerActor(api_key="test-key")
    session = create_mock_dsa_session()
    wm = dict(session.working_memory)
    wm["dsa_problem"] = {
        **wm["dsa_problem"],
        "description": "Given a string s, find the length of the longest substring without duplicate characters.",
        "constraints": ["0 <= s.length <= 5 * 10^4"],
        "examples": [{"input": "s = 'abcabcbb'", "output": "3"}],
    }
    directive = SupervisorEngine.evaluate_state(session)
    prompt = actor.build_system_prompt(directive, wm)
    assert "YOU must state it" in prompt
    assert "longest substring without duplicate characters" in prompt
    assert "NEVER ask the candidate to supply the constraints" in prompt


def test_keyword_bags_are_not_spoken_as_the_candidates_approach():
    from app.orchestrator.supervisor import _approach_label

    assert _approach_label("Binary Search, Queue, Sorting, Dfs") == "your approach"
    assert _approach_label("") == "your approach"
    assert _approach_label(None) == "your approach"
    assert _approach_label("Two-pointer sliding window with hash map") == "Two-pointer sliding window with hash map"
