"""Deterministic Supervisor Engine for Strop.

Governs milestone progression, competency coverage, time budgets, stagnation detection,
and tactical directives across distinct interview types (DSA, System Design, Core CS, Behavioral, etc.).
"""

from dataclasses import dataclass
import re
from datetime import datetime, timezone
from typing import Any

from app.models.orchestrator_session import OrchestratorSession
from app.orchestrator.dsa_intelligence import (
    extract_candidate_dsa_evidence,
    normalize_big_o,
)
from app.orchestrator.milestones import (
    MilestoneDefinition,
    get_milestone_by_id,
    get_milestones_for_track,
    normalize_track,
)
from app.schemas.orchestrator import TurnClassification


@dataclass
class SupervisorDirective:
    action: str  # "PROBE_DEEPER", "CHALLENGE_FLAW", "HINT_AND_REDIRECT", "TRANSITION_MILESTONE", "CONCLUDE", "REVIEW_CODE"
    current_milestone_id: str
    current_milestone_title: str
    target_focus: str
    guidance: str
    suggested_fallback_probe: str
    stagnation_count: int
    track: str = "System Design"
    is_final_milestone: bool = False


TIME_UP_CLOSING = (
    "Thank you, that's a solid answer. I would love to continue, but we have reached the end of the interview. "
    "Thank you for your time today. Your evaluation report is being prepared."
)


# Phrases in Alex's own reply that invite the candidate to start coding. If he says this, the editor must be open.
_CODING_INVITE = re.compile(
    r"\b(?:can|could|would) you (?:now |please )?(?:go ahead and )?(?:write|implement|code)\b"
    r"|\b(?:go ahead and|please|let'?s) (?:write|implement|code|start (?:the )?(?:implementation|coding)|move to (?:the )?(?:implementation|coding))\b"
    r"|\bin the (?:code )?editor\b"
    r"|\b(?:open|use|switch to|head to) the (?:code )?editor\b",
    re.IGNORECASE,
)



def _approach_label(approach: str | None) -> str:
    """The extractor can return a bag of keywords ("Binary Search, Queue, Sorting, Dfs"); never speak that aloud."""
    a = (approach or "").strip()
    if not a or a.count(",") >= 2 or len(a) > 90:
        return "your approach"
    return a


class SupervisorEngine:
    @staticmethod
    def trailing_streak(working_memory: dict[str, Any], action: str) -> int:
        """How many of the most recent directives in a row were `action`."""
        n = 0
        for a in reversed(working_memory.get("recent_actions", []) or []):
            if a != action:
                break
            n += 1
        return n

    @staticmethod
    def reconcile_dsa_workspace(mem: dict[str, Any], assistant_response: str | None) -> dict[str, Any]:
        """Keep the coding workspace in step with what Alex just said.

        If Alex invites the candidate to write code, the editor must unlock now. Otherwise the candidate is told to code
        with nowhere to do it, because the workspace otherwise only unlocks at a later milestone.
        """
        raw_track = mem.get("track")
        if not raw_track or normalize_track(raw_track) != "DSA" or "dsa_problem" not in mem:
            return mem
        if mem["dsa_problem"].get("revealed") or not assistant_response or not _CODING_INVITE.search(assistant_response):
            return mem
        mem = dict(mem)
        code_m = "code_implementation_and_dryrun"
        if mem.get("current_milestone") != code_m:
            mem["current_milestone"] = code_m
            mem.setdefault("milestone_history", []).append(code_m)
            mem.setdefault("milestone_turn_counts", {})[code_m] = 0
        dsa_info = dict(mem["dsa_problem"])
        dsa_info["revealed"] = True
        dsa_info["revealed_at_milestone"] = code_m
        dsa_info["revealed_at_turn"] = len(mem.get("milestone_history", []))
        mem["dsa_problem"] = dsa_info
        return mem

    @staticmethod
    def evaluate_state(
        session: OrchestratorSession,
        candidate_text: str | None = None,
    ) -> SupervisorDirective:
        raw_track = session.track or "System Design"
        track = normalize_track(raw_track)
        milestones = get_milestones_for_track(track)
        working_memory = dict(session.working_memory or {})

        # Evidence-aware DSA pre-extraction for the active turn
        dsa_state = {}
        if track == "DSA":
            sk = working_memory.get("structured_knowledge", {})
            existing_dsa_state = dict(sk.get("dsa_state", {}))
            if candidate_text:
                dsa_state = extract_candidate_dsa_evidence(
                    candidate_text,
                    existing_dsa_state,
                    working_memory.get("dsa_problem", {}),
                )
            else:
                dsa_state = existing_dsa_state

        current_milestone_id = working_memory.get("current_milestone")
        if not current_milestone_id:
            current_milestone_id = milestones[0].id
            working_memory["current_milestone"] = current_milestone_id

        # Find current milestone definition and index
        current_idx = 0
        for i, m in enumerate(milestones):
            if m.id == current_milestone_id:
                current_idx = i
                break

        current_milestone = milestones[current_idx]
        is_final = current_idx == len(milestones) - 1

        transcript = session.transcript or []
        milestone_turn_count = working_memory.get("milestone_turn_counts", {}).get(current_milestone_id, 0)

        # Inspect latest candidate delta metadata from previous turn (if any)
        stagnation_count = working_memory.get("stagnation_turn_count", 0)
        latest_vulns: list[str] = []
        latest_claims: list[str] = []
        latest_classification = TurnClassification.PROGRESS

        if transcript:
            for entry in reversed(transcript):
                if entry.get("speaker") == "Alex" and "delta_metadata" in entry:
                    delta = entry.get("delta_metadata", {})
                    latest_vulns = delta.get("identified_vulnerabilities", [])
                    latest_claims = delta.get("technical_claims", [])
                    cls_str = delta.get("progress_classification")
                    if cls_str:
                        try:
                            latest_classification = TurnClassification(cls_str)
                        except ValueError:
                            pass
                    break

        # Check for submitted code in DSA tracks
        has_new_submitted_code = working_memory.get("has_unreviewed_code", False)
        submitted_code = working_memory.get("submitted_code")
        if track == "DSA" and has_new_submitted_code and submitted_code:
            return SupervisorDirective(
                action="REVIEW_CODE",
                current_milestone_id="code_implementation_and_dryrun",
                current_milestone_title="Live Code Implementation & Dry-Running",
                target_focus="submitted code review and correctness",
                guidance=(
                    "The candidate submitted code. Read the ACTUAL code in their message and review it concretely: "
                    "(a) If the message reports failed tests (for example 0/1 tests passed), say so plainly and ask them to find the bug by tracing one input; do not praise the code. "
                    "(b) If tests passed, confirm briefly, then ask ONE pointed question about something specific in their code (a named variable, line or expression): its real cost, a failing input, or a concrete cheaper alternative. "
                    "(c) If the code syntax does not match the stated language, point that out first. "
                    "(d) If this is a re-submission, say what changed compared with before instead of repeating an earlier question. "
                    "Never ask a generic walk-me-through-your-loop question and never repeat an earlier question."
                ),
                suggested_fallback_probe="Looking at your code, which line would you change first if the input had ten times more strings, and why?",
                stagnation_count=0,
                track=track,
                is_final_milestone=is_final,
            )

        # Time-budget enforcement using authoritative scheduled deadline
        target_duration_seconds = working_memory.get("target_duration_seconds", 1800)
        elapsed_seconds = 0
        now = datetime.now(timezone.utc)
        if session.created_at:
            created_at = session.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            elapsed_seconds = int((now - created_at).total_seconds())
        elapsed_seconds = max(elapsed_seconds, working_memory.get("deliberation_seconds_spent", 0))
        remaining_seconds = target_duration_seconds - elapsed_seconds

        if "scheduled_deadline" in working_memory:
            try:
                deadline_dt = datetime.fromisoformat(working_memory["scheduled_deadline"])
                if deadline_dt.tzinfo is None:
                    deadline_dt = deadline_dt.replace(tzinfo=timezone.utc)
                deadline_rem = int((deadline_dt - now).total_seconds())
                if working_memory.get("deliberation_seconds_spent", 0) > 0:
                    remaining_seconds = min(remaining_seconds, deadline_rem)
                else:
                    remaining_seconds = deadline_rem
            except Exception:
                pass

        # Time budget reached: hard termination with professional closing statement
        if target_duration_seconds > 0 and remaining_seconds <= 0:
            return SupervisorDirective(
                action="CONCLUDE_TIME_BUDGET",
                current_milestone_id=current_milestone.id,
                current_milestone_title=current_milestone.title,
                target_focus="time budget reached",
                guidance=(
                    "The scheduled time is over and the candidate has just finished answering. Do NOT ask any question. "
                    "Briefly acknowledge their last answer, then say you would love to continue but you have reached the end "
                    "of the interview, thank them, and say their report is being prepared."
                ),
                suggested_fallback_probe=TIME_UP_CLOSING,
                stagnation_count=0,
                track=track,
                is_final_milestone=True,
            )

        # Closing handshake: once Alex has asked for final questions, the candidate's reply ends the interview.
        if working_memory.get("closing_window_asked"):
            return SupervisorDirective(
                action="CONCLUDE",
                current_milestone_id=current_milestone.id,
                current_milestone_title=current_milestone.title,
                target_focus="close the interview",
                guidance=(
                    "The candidate has answered your closing question. Do NOT ask another question. Respond to what they just "
                    "said, thank them for the conversation, mention one concrete strength you noticed from THEIR answers, "
                    "and tell them their evaluation report is being prepared."
                ),
                suggested_fallback_probe="Thank you, that covers everything. I appreciated how you walked through your reasoning today. Your evaluation report is being prepared.",
                stagnation_count=0,
                track=track,
                is_final_milestone=True,
            )

        # Closing window: the last ~12% of the budget (at least 2 minutes) is reserved for wrap-up
        closing_threshold = max(120, int(target_duration_seconds * 0.12))
        if target_duration_seconds > 0 and 0 < remaining_seconds <= closing_threshold:
            return SupervisorDirective(
                action="CLOSING_WINDOW",
                current_milestone_id=current_milestone.id,
                current_milestone_title=current_milestone.title,
                target_focus="closing window and wrap-up",
                guidance=(
                    "Under 2 minutes remaining in the interview budget. Do NOT introduce any new problems or deep technical topics. "
                    "Ask the candidate if they have any final questions for you, or ask for a high-level retrospective summary."
                ),
                suggested_fallback_probe="We have about a couple minutes left in our scheduled time. Do you have any questions for me about the problem, or any final thoughts you'd like to share?",
                stagnation_count=0,
                track=track,
                is_final_milestone=is_final,
            )

        # DSA-Specific Evidence-Aware Milestone Progression & Regression Prevention
        if track == "DSA":
            # Scenario 8: Candidate explicitly noted repetition / previous answer
            if dsa_state.get("repetition_noticed"):
                existing = dsa_state.get("proposed_approach") or "your approach"
                return SupervisorDirective(
                    action="ACKNOWLEDGE_AND_ADVANCE",
                    current_milestone_id=current_milestone.id,
                    current_milestone_title=current_milestone.title,
                    target_focus="existing evidence acknowledged",
                    guidance=(
                        f"Candidate noted they already explained this ({existing}). "
                        f"Immediately acknowledge their existing explanation politely ('Understood, you already covered {existing}') "
                        f"and pivot directly to the next unaddressed topic (e.g. implementation in the editor or edge cases)."
                    ),
                    suggested_fallback_probe=f"Understood, thanks for reiterating that. Let's proceed with the implementation.",
                    stagnation_count=0,
                    track=track,
                    is_final_milestone=is_final,
                )

            # Scenario 3: Candidate claimed an approach is optimal when it is actually suboptimal / flawed
            if dsa_state.get("optimality_status") == "flawed_claim" and SupervisorEngine.trailing_streak(working_memory, "CHALLENGE_FLAW") < 2:
                stated_tc = dsa_state.get("time_complexity") or "stated complexity"
                prob_tc = (working_memory.get("dsa_problem") or {}).get("optimal_time_complexity", "O(N)")
                return SupervisorDirective(
                    action="CHALLENGE_FLAW",
                    current_milestone_id=current_milestone.id,
                    current_milestone_title=current_milestone.title,
                    target_focus="claimed optimality vs theoretical lower bound",
                    guidance=(
                        f"Candidate claimed their approach is optimal, but {stated_tc} is suboptimal (problem optimal is {prob_tc}). "
                        f"Respectfully probe whether a lower asymptotic bound is possible using an auxiliary data structure or technique. Do NOT accept {stated_tc} as optimal."
                    ),
                    suggested_fallback_probe=f"You mentioned that {stated_tc} would be optimal here. Is it possible to avoid repeated comparisons and achieve {prob_tc} runtime with an auxiliary data structure?",
                    stagnation_count=stagnation_count,
                    track=track,
                    is_final_milestone=is_final,
                )

            # Scenario 4: Candidate pivoted or changed their proposed approach halfway through
            if dsa_state.get("approach_switched"):
                prev = dsa_state.get("previous_approach", "previous idea")
                curr = dsa_state.get("proposed_approach", "new approach")
                return SupervisorDirective(
                    action="PROBE_DEEPER",
                    current_milestone_id="algorithmic_optimization",
                    current_milestone_title="Algorithmic Optimization & Data Structures",
                    target_focus="switched approach mechanics and invariants",
                    guidance=(
                        f"Candidate pivoted from {prev} to {curr}. Acknowledge the pivot and probe the core invariant or mechanics of {curr}."
                    ),
                    suggested_fallback_probe=f"Pivoting from {prev} to {curr} makes sense. Walk me through the core invariant of {curr} and what time complexity it achieves.",
                    stagnation_count=0,
                    track=track,
                    is_final_milestone=False,
                )

            # Scenario 1, 2, 7: Candidate has articulated the optimal approach
            has_optimal = (
                dsa_state.get("approach_category") == "optimal"
                or dsa_state.get("optimality_status") == "optimal"
                or bool(working_memory.get("structured_knowledge", {}).get("approach_summary", {}).get("optimal_approach"))
            )

            if has_optimal:
                opt_approach = _approach_label(
                    dsa_state.get("proposed_approach")
                    or working_memory.get("structured_knowledge", {}).get("approach_summary", {}).get("optimal_approach")
                )
                opt_time = (
                    dsa_state.get("time_complexity")
                    or working_memory.get("structured_knowledge", {}).get("complexities", {}).get("optimal_time")
                    or "O(N)"
                )
                opt_space = (
                    dsa_state.get("space_complexity")
                    or working_memory.get("structured_knowledge", {}).get("complexities", {}).get("optimal_space")
                )

                # Scenario 5: Candidate provided time complexity without space complexity or correctness reasoning
                if (
                    opt_time
                    and not opt_space
                    and not dsa_state.get("correctness_reasoning")
                    and not dsa_state.get("invariants_discussed")
                    and SupervisorEngine.trailing_streak(working_memory, "PROBE_DEEPER") < 2
                ):
                    return SupervisorDirective(
                        action="PROBE_DEEPER",
                        current_milestone_id="algorithmic_optimization",
                        current_milestone_title="Algorithmic Optimization & Data Structures",
                        target_focus="auxiliary space complexity and correctness invariant",
                        guidance=(
                            f"Candidate stated {opt_time} for their {opt_approach}, but has not clarified auxiliary space complexity or correctness invariants. "
                            f"STRICT REGRESSION PROHIBITION: DO NOT ask for brute force! Probe auxiliary space complexity and why the approach is correct."
                        ),
                        suggested_fallback_probe=f"{opt_time} runtime makes sense for the {opt_approach}. What is your auxiliary space complexity, and how do you guarantee correctness across all input cases?",
                        stagnation_count=0,
                        track=track,
                        is_final_milestone=False,
                    )

                # In the optimization stage with the optimal approach on the table: authorize the editor so Alex never
                # asks for code while the workspace is still locked.
                if current_milestone_id == "algorithmic_optimization" and (
                    dsa_state.get("wants_to_code") or opt_space or milestone_turn_count >= current_milestone.min_turns
                ):
                    return SupervisorDirective(
                        action="TRANSITION_MILESTONE",
                        current_milestone_id="code_implementation_and_dryrun",
                        current_milestone_title="Live Code Implementation & Dry-Running",
                        target_focus="live code implementation in editor",
                        guidance=(
                            f"Candidate has the optimal {opt_approach} ({opt_time}). Acknowledge it in one sentence and invite them to "
                            f"write it out in the code editor, which is now open. Do NOT ask for brute force."
                        ),
                        suggested_fallback_probe=f"That {opt_approach} is the right approach. The code editor is open now, so go ahead and implement it.",
                        stagnation_count=0,
                        track=track,
                        is_final_milestone=False,
                    )

                # Optimal Approach is Established:
                # If current milestone is still problem orientation or brute-force, SKIP brute force immediately!
                if current_milestone_id in ("problem_orientation_and_clarification", "brute_force_and_intuition"):
                    if dsa_state.get("wants_to_code") or (dsa_state.get("correctness_reasoning") and opt_space):
                        return SupervisorDirective(
                            action="TRANSITION_MILESTONE",
                            current_milestone_id="code_implementation_and_dryrun",
                            current_milestone_title="Live Code Implementation & Dry-Running",
                            target_focus="live code implementation in editor",
                            guidance=(
                                f"Candidate formulated the optimal {opt_approach} with {opt_time} runtime. "
                                f"STRICT REGRESSION PROHIBITION: DO NOT ask for brute force. "
                                f"Acknowledge their optimal design and invite them to write out the solution in the code editor."
                            ),
                            suggested_fallback_probe=f"That {opt_approach} with {opt_time} time and {opt_space or 'O(1)'} space is optimal. Let's implement it in the code editor.",
                            stagnation_count=0,
                            track=track,
                            is_final_milestone=False,
                        )
                    else:
                        return SupervisorDirective(
                            action="TRANSITION_MILESTONE",
                            current_milestone_id="algorithmic_optimization",
                            current_milestone_title="Algorithmic Optimization & Data Structures",
                            target_focus="core invariant and edge cases",
                            guidance=(
                                f"Candidate articulated the optimal approach ({opt_approach}) in {opt_time}. "
                                f"STRICT REGRESSION PROHIBITION: DO NOT ask for brute force. "
                                f"Acknowledge the optimal technique and probe the key invariant that keeps it correct, or how boundary cases are handled, before opening the editor."
                            ),
                            suggested_fallback_probe=f"That gives us our optimal {opt_time} runtime. Walk me through the key invariant that keeps your approach correct, and the first edge case you would test, before we code.",
                            stagnation_count=0,
                            track=track,
                            is_final_milestone=False,
                        )

        # 1. Stagnation & Stalled Candidate Evaluation
        if latest_classification in (TurnClassification.STUCK, TurnClassification.REPETITION):
            if stagnation_count >= 2:
                # 3 consecutive stalled turns: deterministically advance to next milestone
                if not is_final:
                    next_milestone = milestones[current_idx + 1]
                    return SupervisorDirective(
                        action="TRANSITION_MILESTONE",
                        current_milestone_id=next_milestone.id,
                        current_milestone_title=next_milestone.title,
                        target_focus=next_milestone.key_focus_areas[0] if next_milestone.key_focus_areas else "",
                        guidance=f"Candidate is stuck on {current_milestone.title}. Acknowledge and transition cleanly to {next_milestone.title}.",
                        suggested_fallback_probe=next_milestone.fallback_probes[0] if next_milestone.fallback_probes else "",
                        stagnation_count=stagnation_count,
                        track=track,
                        is_final_milestone=False,
                    )
            # Stagnation 1 or 2: Provide progressive hint tailored to track
            hint_guidance = (
                "Candidate is struggling with the algorithm or data structure. Provide a concise Socratic hint pointing toward the optimal invariant without writing code."
                if track == "DSA"
                else "Candidate is struggling or repeating claims. Provide a concise Socratic hint that reframes the constraint; do not solve it for them."
            )
            return SupervisorDirective(
                action="HINT_AND_REDIRECT",
                current_milestone_id=current_milestone.id,
                current_milestone_title=current_milestone.title,
                target_focus="progressive hint and reframing",
                guidance=hint_guidance,
                suggested_fallback_probe=current_milestone.fallback_probes[0] if current_milestone.fallback_probes else "",
                stagnation_count=stagnation_count,
                track=track,
                is_final_milestone=is_final,
            )

        # 2. Detected Technical Vulnerabilities, Bugs, or Contradictions
        all_vulns = latest_vulns or working_memory.get("confirmed_vulnerabilities", [])
        challenged_vulns = set(working_memory.get("challenged_vulnerabilities", []))
        unresolved_vulns = [v for v in all_vulns if v not in challenged_vulns]
        # Two challenges in a row is enough: a third makes the interview feel like an interrogation and stalls progress.
        if unresolved_vulns and SupervisorEngine.trailing_streak(working_memory, "CHALLENGE_FLAW") < 2:
            target_vuln = unresolved_vulns[0]
            challenge_guidance = (
                f"Candidate's algorithm or code has an unhandled edge case or complexity issue: '{target_vuln}'. Respectfully probe how they resolve this boundary condition."
                if track == "DSA"
                else f"Candidate made a vague or unverified claim: '{target_vuln}'. Probe for specific personal actions and outcomes using the STAR framework."
                if track == "Behavioral"
                else f"Challenge this specific technical vulnerability without being pedantic: '{target_vuln}'. Require candidate to explain failure behavior."
            )
            return SupervisorDirective(
                action="CHALLENGE_FLAW",
                current_milestone_id=current_milestone.id,
                current_milestone_title=current_milestone.title,
                target_focus=target_vuln,
                guidance=challenge_guidance,
                suggested_fallback_probe=current_milestone.fallback_probes[0] if current_milestone.fallback_probes else "",
                stagnation_count=stagnation_count,
                track=track,
                is_final_milestone=is_final,
            )

        # 2b. Time pacing: each milestone owns an equal slice of the budget. If the clock says we should already be
        # further along, move on (after at least one exchange) instead of stalling on a stage.
        if target_duration_seconds > 0 and not is_final and milestone_turn_count >= 1:
            elapsed_frac = max(0.0, 1 - remaining_seconds / target_duration_seconds)
            expected_idx = min(len(milestones) - 1, int(elapsed_frac * len(milestones)))
            if current_idx < expected_idx:
                paced_next = milestones[current_idx + 1]
                return SupervisorDirective(
                    action="TRANSITION_MILESTONE",
                    current_milestone_id=paced_next.id,
                    current_milestone_title=paced_next.title,
                    target_focus=paced_next.key_focus_areas[0] if paced_next.key_focus_areas else "",
                    guidance=(
                        f"We are running on a time budget. Acknowledge what the candidate just said in one sentence, then move "
                        f"naturally into '{paced_next.title}'."
                    ),
                    suggested_fallback_probe=paced_next.fallback_probes[0] if paced_next.fallback_probes else "",
                    stagnation_count=0,
                    track=track,
                    is_final_milestone=False,
                )

        # 3. Milestone Completion / Transition Threshold (Milestone-Scoped Evidence)
        if milestone_turn_count >= current_milestone.min_turns:
            milestone_facts_map = working_memory.get("milestone_facts", {})
            current_m_facts = milestone_facts_map.get(current_milestone_id, [])
            facts_in_current_milestone = len(current_m_facts)

            # Check if candidate explicitly requested to move forward
            candidate_requests = working_memory.get("structured_knowledge", {}).get("candidate_requests", [])
            wants_to_advance = (
                "move_to_coding" in candidate_requests
                or "move_forward" in candidate_requests
                or bool(dsa_state.get("wants_to_code"))
            )

            # Transition condition: Sufficient facts in this milestone, max turns reached, or explicit request
            if (
                facts_in_current_milestone >= 1
                or milestone_turn_count >= current_milestone.max_turns
                or wants_to_advance
            ):
                if not is_final:
                    next_milestone = milestones[current_idx + 1]
                    # If DSA track and candidate already articulated optimal approach, skip brute force milestone
                    if track == "DSA" and next_milestone.id == "brute_force_and_intuition":
                        has_opt = (
                            dsa_state.get("approach_category") == "optimal"
                            or dsa_state.get("optimality_status") == "optimal"
                            or bool(working_memory.get("structured_knowledge", {}).get("approach_summary", {}).get("optimal_approach"))
                        )
                        if has_opt:
                            next_milestone = milestones[current_idx + 2] if current_idx + 2 < len(milestones) else milestones[-1]

                    return SupervisorDirective(
                        action="TRANSITION_MILESTONE",
                        current_milestone_id=next_milestone.id,
                        current_milestone_title=next_milestone.title,
                        target_focus=next_milestone.key_focus_areas[0] if next_milestone.key_focus_areas else "",
                        guidance=f"Milestone '{current_milestone.title}' is adequately explored. Transition naturally into '{next_milestone.title}'.",
                        suggested_fallback_probe=next_milestone.fallback_probes[0] if next_milestone.fallback_probes else "",
                        stagnation_count=0,
                        track=track,
                        is_final_milestone=False,
                    )
                else:
                    # Prevent premature interview conclusion if significant time remains in the scheduled session
                    if remaining_seconds > closing_threshold:
                        followup_probe = (
                            "Now that the implementation is verified, how would this solution adapt if the input stream was too large to fit in memory (e.g. streaming chunks from disk), or how would you parallelize this across multiple threads?"
                            if track == "DSA"
                            else "We have covered our primary architecture. What is the single highest-risk failure mode under a 10x traffic surge, and how would your telemetry detect it in production?"
                        )
                        return SupervisorDirective(
                            action="PROBE_DEEPER",
                            current_milestone_id=current_milestone.id,
                            current_milestone_title=current_milestone.title,
                            target_focus="advanced scaling, streaming constraints, and failure modes",
                            guidance=(
                                f"The candidate has completed the core milestone with {remaining_seconds // 60} minutes remaining in the interview budget. "
                                f"Do NOT conclude or exit early. Probe an advanced follow-up: streaming inputs, memory bounds, or concurrency."
                            ),
                            suggested_fallback_probe=followup_probe,
                            stagnation_count=0,
                            track=track,
                            is_final_milestone=False,
                        )
                    else:
                        return SupervisorDirective(
                            action="CLOSING_WINDOW",
                            current_milestone_id=current_milestone.id,
                            current_milestone_title=current_milestone.title,
                            target_focus="wrap up and synthesis",
                            guidance=(
                                "All planned topics are covered. Do NOT start a new technical topic. In one sentence, summarize what the "
                                "candidate covered using THEIR own points, then ask whether they have any questions for you or anything "
                                "they would like to add before we wrap up."
                            ),
                            suggested_fallback_probe="That covers what I wanted to explore today. Do you have any questions for me, or anything you would like to add before we wrap up?",
                            stagnation_count=0,
                            track=track,
                            is_final_milestone=True,
                        )

        # 4. Standard Deepening Probing
        focus_idx = min(milestone_turn_count, len(current_milestone.key_focus_areas) - 1)
        target_focus = current_milestone.key_focus_areas[focus_idx] if current_milestone.key_focus_areas else current_milestone.description

        probe_guidance = (
            f"Probe deeper into the algorithmic approach or data structure. Focus on '{target_focus}'. Ground your question in what they just said."
            if track == "DSA"
            else f"Probe deeper into the candidate's personal actions and decision framework. Focus on '{target_focus}'. Ask what THEY did."
            if track == "Behavioral"
            else f"Probe deeper into the candidate's proposed mechanism. Focus on '{target_focus}'. Ground your question in what they just said."
        )

        return SupervisorDirective(
            action="PROBE_DEEPER",
            current_milestone_id=current_milestone.id,
            current_milestone_title=current_milestone.title,
            target_focus=target_focus,
            guidance=probe_guidance,
            suggested_fallback_probe=current_milestone.fallback_probes[focus_idx % len(current_milestone.fallback_probes)],
            stagnation_count=stagnation_count,
            track=track,
            is_final_milestone=is_final,
        )

    @staticmethod
    def update_working_memory_after_turn(
        working_memory: dict[str, Any],
        delta_metadata: dict[str, Any],
        new_milestone_id: str | None = None,
        challenged_flaw: str | None = None,
        candidate_text: str | None = None,
        assistant_response: str | None = None,
        directive_action: str | None = None,
    ) -> dict[str, Any]:
        """Updates working memory state based on extracted delta metadata and supervisor directive."""
        mem = dict(working_memory)

        if directive_action:
            mem["recent_actions"] = (list(mem.get("recent_actions", [])) + [directive_action])[-8:]

        # Clear unreviewed code flag once reviewed
        if "has_unreviewed_code" in mem:
            mem["has_unreviewed_code"] = False

        # Update claims and facts (deduplicated)
        claims = delta_metadata.get("technical_claims", [])
        if claims:
            facts = mem.setdefault("architectural_facts", [])
            for c in claims:
                if c not in facts:
                    facts.append(c)

        # Update confirmed vulnerabilities (deduplicated)
        vulns = delta_metadata.get("identified_vulnerabilities", [])
        if vulns:
            v_list = mem.setdefault("confirmed_vulnerabilities", [])
            for v in vulns:
                if v not in v_list:
                    v_list.append(v)

        # Record challenged flaw to prevent repetitive questioning loops
        if challenged_flaw:
            ch_list = mem.setdefault("challenged_vulnerabilities", [])
            if challenged_flaw not in ch_list:
                ch_list.append(challenged_flaw)

        # Update stagnation tracking
        cls_str = delta_metadata.get("progress_classification")
        if cls_str in (
            TurnClassification.STUCK.value,
            TurnClassification.REPETITION.value,
            "STUCK",
            "REPETITION",
        ):
            mem["stagnation_turn_count"] = mem.get("stagnation_turn_count", 0) + 1
        else:
            mem["stagnation_turn_count"] = 0

        # Milestone progression
        current_m = mem.get("current_milestone", "initial")
        turn_counts = mem.setdefault("milestone_turn_counts", {})
        if current_m:
            turn_counts[current_m] = turn_counts.get(current_m, 0) + 1

        # Milestone 2: Per-Milestone Fact Scoping
        milestone_facts = mem.setdefault("milestone_facts", {})
        m_facts_list = milestone_facts.setdefault(current_m, [])
        for c in claims:
            if c not in m_facts_list:
                m_facts_list.append(c)

        # Milestone 1: Structured Knowledge Foundation
        sk = mem.setdefault("structured_knowledge", {})
        approaches = sk.setdefault("approach_summary", {
            "initial_intuition": None,
            "brute_force": None,
            "optimal_approach": None,
            "alternative_approaches": [],
        })
        complexities = sk.setdefault("complexities", {
            "brute_force_time": None,
            "brute_force_space": None,
            "optimal_time": None,
            "optimal_space": None,
        })
        examples = sk.setdefault("examples_discussed", [])
        edge_cases = sk.setdefault("edge_cases_covered", [])
        corrections = sk.setdefault("candidate_corrections", [])
        requests = sk.setdefault("candidate_requests", [])
        questions_answered = sk.setdefault("questions_answered", [])

        # Ingest approach update from delta_metadata
        app_update = delta_metadata.get("approach_update")
        if isinstance(app_update, dict):
            app_type = app_update.get("approach_type") or "optimal"
            desc = app_update.get("description") or ""
            tc = app_update.get("time_complexity")
            sc = app_update.get("space_complexity")
            app_type_str = str(app_type).lower()
            if "brute" in app_type_str:
                if desc:
                    approaches["brute_force"] = desc
                if tc:
                    complexities["brute_force_time"] = tc
                if sc:
                    complexities["brute_force_space"] = sc
            elif "opt" in app_type_str or "improv" in app_type_str:
                if desc:
                    approaches["optimal_approach"] = desc
                if tc:
                    complexities["optimal_time"] = tc
                if sc:
                    complexities["optimal_space"] = sc
            else:
                if desc and desc not in approaches.get("alternative_approaches", []):
                    approaches.setdefault("alternative_approaches", []).append(desc)

        # Ingest examples from delta_metadata
        for ex in delta_metadata.get("examples_provided", []):
            if ex and ex not in examples:
                examples.append(ex)

        # Ingest edge cases from delta_metadata
        for ec in delta_metadata.get("edge_cases_covered", []):
            if ec and ec not in edge_cases:
                edge_cases.append(ec)

        # Ingest candidate corrections
        cand_corr = delta_metadata.get("candidate_correction")
        if cand_corr and cand_corr not in corrections:
            corrections.append(cand_corr)

        # Ingest candidate requested action
        req_act = delta_metadata.get("candidate_requested_action")
        if req_act and req_act not in requests:
            requests.append(req_act)

        # Ingest repetition notice
        if delta_metadata.get("repetition_noticed"):
            if "repetition_identified" not in requests:
                requests.append("repetition_identified")

        # Deterministic extraction from candidate text if available:
        raw_track = mem.get("track")
        track = normalize_track(raw_track) if raw_track else None
        if track == "DSA" and candidate_text:
            existing_dsa_state = dict(sk.get("dsa_state", {}))
            updated_dsa_state = extract_candidate_dsa_evidence(
                candidate_text,
                existing_dsa_state,
                mem.get("dsa_problem", {}),
            )
            sk["dsa_state"] = updated_dsa_state

            # Synchronize to approaches and complexities
            if updated_dsa_state.get("approach_category") == "optimal" or updated_dsa_state.get("optimality_status") == "optimal":
                if updated_dsa_state.get("proposed_approach"):
                    approaches["optimal_approach"] = updated_dsa_state["proposed_approach"]
                if updated_dsa_state.get("time_complexity"):
                    complexities["optimal_time"] = updated_dsa_state["time_complexity"]
                if updated_dsa_state.get("space_complexity"):
                    complexities["optimal_space"] = updated_dsa_state["space_complexity"]
            elif updated_dsa_state.get("approach_category") == "brute_force":
                if updated_dsa_state.get("proposed_approach") and not approaches.get("brute_force"):
                    approaches["brute_force"] = updated_dsa_state["proposed_approach"]
                if updated_dsa_state.get("time_complexity") and not complexities.get("brute_force_time"):
                    complexities["brute_force_time"] = updated_dsa_state["time_complexity"]
                if updated_dsa_state.get("space_complexity") and not complexities.get("brute_force_space"):
                    complexities["brute_force_space"] = updated_dsa_state["space_complexity"]

            for ec in updated_dsa_state.get("edge_cases_discussed", []):
                if ec not in edge_cases:
                    edge_cases.append(ec)

            if updated_dsa_state.get("wants_to_code"):
                if "move_to_coding" not in requests:
                    requests.append("move_to_coding")

            if updated_dsa_state.get("repetition_noticed"):
                if "already_answered" not in questions_answered:
                    questions_answered.append(f"Turn {len(mem.get('milestone_history', []))}: Candidate noted question was already answered")

        if candidate_text:
            c_text_lower = candidate_text.lower()
            # Check for candidate asking to move forward / code
            if any(phrase in c_text_lower for phrase in ("ready to code", "start coding", "move forward", "write the code", "open the editor")):
                if "move_to_coding" not in requests:
                    requests.append("move_to_coding")
            # Check for candidate noting repetition
            if any(phrase in c_text_lower for phrase in ("already answered", "already explained", "already stated", "as i mentioned earlier", "as i said earlier")):
                if "already_answered" not in questions_answered:
                    questions_answered.append(f"Turn {len(mem.get('milestone_history', []))}: Candidate noted question was already answered")

            # Deterministic Big-O regex scan for brute force vs optimal
            import re
            big_o_matches = re.findall(r"O\([^)]+\)", candidate_text, re.IGNORECASE)
            if big_o_matches:
                if "brute" in c_text_lower:
                    if not complexities.get("brute_force_time"):
                        complexities["brute_force_time"] = big_o_matches[0]
                    if len(big_o_matches) > 1 and not complexities.get("brute_force_space"):
                        complexities["brute_force_space"] = big_o_matches[1]
                elif any(word in c_text_lower for word in ("optimal", "optimize", "two pointer", "sliding window", "hash", "tree", "binary search")):
                    if not complexities.get("optimal_time"):
                        complexities["optimal_time"] = big_o_matches[0]
                    if len(big_o_matches) > 1 and not complexities.get("optimal_space"):
                        complexities["optimal_space"] = big_o_matches[1]

        # Milestone 1: Running Interview Summary
        running_summary = mem.setdefault("running_summary", [])
        turn_num = len(mem.get("milestone_history", []))
        if candidate_text and len(candidate_text.strip()) > 0:
            summary_item = f"Turn {turn_num} [Candidate]: {candidate_text.strip()[:180]}"
            if not any(s.startswith(f"Turn {turn_num} [Candidate]") for s in running_summary):
                running_summary.append(summary_item)
        if assistant_response and len(assistant_response.strip()) > 0:
            summary_item = f"Turn {turn_num} [Alex]: {assistant_response.strip()[:180]}"
            if not any(s.startswith(f"Turn {turn_num} [Alex]") for s in running_summary):
                running_summary.append(summary_item)

        # Keep running_summary bounded to last 24 entries to prevent unbounded growth
        if len(running_summary) > 24:
            mem["running_summary"] = running_summary[-24:]

        if new_milestone_id and new_milestone_id != current_m:
            challenged = mem.get("challenged_vulnerabilities", [])
            existing_concerns = {c.get("flaw") for c in mem.get("unresolved_concerns", [])}
            for flaw in challenged:
                if flaw not in existing_concerns:
                    mem.setdefault("unresolved_concerns", []).append({
                        "flaw": flaw,
                        "milestone_id": current_m,
                        "status": "unresolved_at_transition",
                    })

            mem["current_milestone"] = new_milestone_id
            mem.setdefault("milestone_history", []).append(new_milestone_id)
            mem.setdefault("milestone_turn_counts", {})[new_milestone_id] = 0

        # DSA Problem Reveal Lifecycle: Authoritative state transition
        # Coding workspace remains hidden until reaching code implementation milestone
        raw_track = mem.get("track")
        track = normalize_track(raw_track) if raw_track else None
        if track == "DSA" and "dsa_problem" in mem:
            dsa_info = dict(mem["dsa_problem"])
            current_m = mem.get("current_milestone", "")
            # Only reveal coding workspace once reaching code implementation milestone
            # or subsequent milestones, ensuring discussion happens before coding!
            if current_m in ("code_implementation_and_dryrun", "complexity_verification_and_testing"):
                if not dsa_info.get("revealed", False):
                    dsa_info["revealed"] = True
                    dsa_info["revealed_at_milestone"] = current_m
                    dsa_info["revealed_at_turn"] = len(mem.get("milestone_history", []))
                    mem["dsa_problem"] = dsa_info

        return mem
