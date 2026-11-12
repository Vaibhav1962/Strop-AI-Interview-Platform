"""Interviewer Actor for Strop.

Integrates Qwen 2.5 72B Instruct (via OpenRouter) with track-aware Socratic Bar-Raiser prompting,
interview-type persona specialization (DSA, System Design, Core CS, Behavioral, etc.),
conversation memory, streaming support, and resilient JSON delta extraction.
"""

import asyncio
import json
import os
import re
import time
from collections.abc import AsyncGenerator
from typing import Any

import httpx
from app.groq_keys import groq_keys, cooling_down, start_cooldown, ordered_keys, record_usage, estimate_tokens

from app.orchestrator.incremental_extractor import IncrementalDialogueExtractor
from app.orchestrator.supervisor import SupervisorDirective
from app.schemas.orchestrator import TurnDeltaMetadata

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "qwen/qwen-2.5-72b-instruct"


def clean_json_response(raw_text: Any) -> dict[str, Any]:
    if not raw_text:
        return {}
    text = str(raw_text).strip()

    # 1. Strip explicit <think> tags if present
    text = re.sub(r"<think>[\s\S]*?</think>", "", text).strip()

    # 2. If Markdown code fences exist, extract the block
    if "```json" in text:
        after_tag = text.split("```json", 1)[1]
        fence_content = after_tag.split("```", 1)[0].strip()
        try:
            return json.loads(fence_content, strict=False)
        except Exception:
            pass

    # 3. Direct parse
    try:
        return json.loads(text, strict=False)
    except Exception:
        sanitized = re.sub(r"\\([^\"\\/bfnrtu])", r"\1", text)
        try:
            return json.loads(sanitized, strict=False)
        except Exception:
            pass

    # 4. Search for outermost JSON object {...}
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group(0), strict=False)
        except Exception:
            sanitized_match = re.sub(r"\\([^\"\\/bfnrtu])", r"\1", match.group(0))
            try:
                return json.loads(sanitized_match, strict=False)
            except Exception:
                pass

    # 5. Regex search for assistant_response key
    resp_match = re.search(r'"assistant_response"\s*:\s*"([^"]+)"', text)
    if resp_match:
        return {
            "assistant_response": resp_match.group(1),
            "delta_metadata": {
                "technical_claims": [],
                "identified_vulnerabilities": [],
                "progress_classification": "PROGRESS",
                "socratic_directive": "fallback_extracted",
            },
        }

    # 6. If raw text without JSON, remove any thinking preamble
    cleaned_speech = text
    if "Here's a thinking process" in cleaned_speech or "Thinking Process" in cleaned_speech:
        speech_match = re.search(r'(?:Final Response|Response|Alex:|Alex \(Interviewer\):)\s*[:\n]\s*([\s\S]+)', cleaned_speech, re.IGNORECASE)
        if speech_match:
            cleaned_speech = speech_match.group(1).strip()
        else:
            cleaned_speech = ""

    if cleaned_speech and not cleaned_speech.startswith("{"):
        return {
            "assistant_response": cleaned_speech,
            "delta_metadata": {
                "technical_claims": [],
                "identified_vulnerabilities": [],
                "progress_classification": "PROGRESS",
                "socratic_directive": "direct_conversational_turn",
            },
        }

    return {}


# Raw conversation messages sent on every request. Older turns reach the model through the conversation ledger and
# running summary instead; sending all of them made one late-interview request larger than Groq's whole per-minute
# token budget (8,000 tokens per model on the free tier).
HISTORY_MESSAGES = 14


class InterviewerActor:
    def __init__(
        self,
        api_key: str | None = None,
        model: str = DEFAULT_MODEL,
        base_url: str = OPENROUTER_URL,
    ):
        try:
            from app.config import get_settings
            cfg_key = get_settings().qwen_api_key
        except Exception:
            cfg_key = ""
        self.api_key = api_key or os.getenv("QWEN_API_KEY") or cfg_key or ""
        self.model = model
        self.base_url = base_url
        try:
            from app.config import get_settings
            gem_key = get_settings().gemini_api_key
        except Exception:
            gem_key = ""
        self.gemini_api_key = os.getenv("GEMINI_API_KEY") or gem_key or ""
        try:
            from app.config import get_settings
            groq_key = get_settings().groq_api_key
        except Exception:
            groq_key = ""
        self.groq_api_key = os.getenv("GROQ_API_KEY") or groq_key or ""
        # Chosen by benchmarking Groq's current free chat models: ~1s to first word, valid JSON, quotes the candidate.
        self.groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
        self.groq_fallback_model = os.getenv("GROQ_FALLBACK_MODEL", "qwen/qwen3.8-27b")
        self.groq_third_model = os.getenv("GROQ_THIRD_MODEL", "openai/gpt-oss-20b")

    @staticmethod
    def opening_message(track: str) -> str:
        """The greeting the UI already spoke before the first candidate turn. Giving it to the model as
        context stops it from re-greeting the candidate and keeps the transcript coherent."""
        return (
            f"Hello, I'm Alex. I'll be conducting your {track} interview today. Before we dive into the technical "
            "assessment, could you please introduce yourself, walk me through your engineering journey, and "
            "highlight your primary technical focus?"
        )

    async def _gemini_complete(self, system_prompt: str, messages: list[dict[str, str]]) -> str:
        """Non-streaming JSON completion on Gemini, used when OpenRouter credits are exhausted or it is down."""
        if not self.gemini_api_key:
            raise RuntimeError("Gemini fallback unavailable: GEMINI_API_KEY is not configured")
        contents: list[dict[str, Any]] = []
        for m in messages:
            if m["role"] == "system":
                continue
            contents.append({"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"] or "."}]})
        if not contents or contents[0]["role"] != "user":
            contents.insert(0, {"role": "user", "parts": [{"text": "(The interview begins.)"}]})
        body = {
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "contents": contents,
            "generationConfig": {
                "temperature": 0.35,
                "maxOutputTokens": 1400,
                "responseMimeType": "application/json",
            },
        }
        last_err: Exception | None = None
        models = ("gemini-2.5-flash-lite", "gemini-3.5-flash-lite", "gemini-flash-latest")
        # Rate limits (429) and overload (503) are usually brief: sweep the models up to three times with a growing pause.
        for sweep in range(3):
            throttled = False
            for model in models:
                try:
                    async with httpx.AsyncClient(timeout=25.0) as client:
                        res = await client.post(
                            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                            headers={"x-goog-api-key": self.gemini_api_key},
                            json=body,
                        )
                    if res.status_code != 200:
                        last_err = RuntimeError(f"Gemini {model} returned {res.status_code}")
                        throttled = throttled or res.status_code in (429, 500, 503)
                        continue
                    parts = res.json()["candidates"][0]["content"]["parts"]
                    text = "".join(p.get("text", "") for p in parts if not p.get("thought")).strip()
                    if text:
                        return text
                    last_err = RuntimeError(f"Gemini {model} returned empty content")
                except Exception as exc:  # network / parse failure -> try next model
                    last_err = exc
            if not throttled or sweep == 2:
                break
            await asyncio.sleep(4.0 * (sweep + 1))
        raise RuntimeError(f"Gemini fallback failed: {last_err}")

    @staticmethod
    def build_context_ledger(
        transcript: list[dict[str, Any]],
        candidate_text: str,
        working_memory: dict[str, Any],
    ) -> str:
        """Authoritative memory of the conversation so far, appended to the system prompt on every turn so the
        interviewer listens, builds on what was said and never repeats a question."""
        asked: list[str] = []
        said: list[str] = []
        for turn in transcript:
            text = (turn.get("text") or "").strip()
            if not text:
                continue
            if turn.get("speaker") in ("Alex", "AI"):
                sentences = re.split(r"(?<=[.?!])\s+", text)
                qs = [x.strip() for x in sentences if x.strip().endswith("?")]
                if qs:
                    asked.append(qs[-1][:240])
            else:
                said.append(text[:260].replace("\n", " "))

        elapsed_line = ""
        try:
            from datetime import datetime, timezone

            started = working_memory.get("session_started_at")
            target = int(working_memory.get("target_duration_seconds", 0) or 0)
            if started and target:
                t0 = datetime.fromisoformat(started)
                if t0.tzinfo is None:
                    t0 = t0.replace(tzinfo=timezone.utc)
                mins = max(0, int((datetime.now(timezone.utc) - t0).total_seconds() // 60))
                elapsed_line = f"Time: about {mins} of {target // 60} minutes used.\n"
        except Exception:
            pass

        asked_block = "\n".join(f"  {i + 1}. {q}" for i, q in enumerate(asked)) or "  (none yet)"
        said_block = "\n".join(f"  - {x}" for x in said[-8:]) or "  (nothing yet)"
        return (
            "\n\n=== CONVERSATION LEDGER (your memory of this interview; it overrides any habit of repeating yourself) ===\n"
            + elapsed_line
            + "Questions you (Alex) have ALREADY asked. Never repeat or rephrase any of them:\n"
            + asked_block
            + "\nWhat the candidate has told you so far. Use it; never ask for it again:\n"
            + said_block
            + "\nThe candidate's LATEST answer:\n  "
            + (candidate_text or "").strip()[:600].replace("\n", " ")
            + "\n\nRules for your next message:\n"
            "  1. Open by reacting to a specific detail from the LATEST answer (quote or paraphrase a few of their words) so it is obvious you listened.\n"
            "  2. Ask exactly ONE new question that builds on what they said. It must not duplicate or rephrase any question above.\n"
            "  3. If they already covered something, acknowledge it and move forward. If they contradicted an earlier statement, point that out.\n"
            "  4. Do not greet them again, and do not re-introduce yourself or the problem unless the directive tells you to.\n"
            "  5. CROSS-QUESTION like a senior interviewer: your question must probe something specific in their latest answer - a claim they have not justified, a hidden cost or assumption, an input that would break it, a trade-off against a concrete alternative, or a counterexample you propose. Never ask a generic textbook question they could answer without having listened.\n"
            "  6. If they already stated something correctly (a complexity, an edge case, a data structure), do NOT ask for it again. Challenge a detail of it instead, or move on.\n"
            "  7. Stay inside the actual problem. Do not bring up techniques that belong to a different problem (for example pointers or sliding windows for a hashing problem).\n"
        )

    GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

    @staticmethod
    def groq_model_extras(model: str) -> dict[str, Any]:
        """Keep reasoning models quick: a spoken interview cannot wait for long hidden thinking."""
        if "gpt-oss" in model:
            return {"reasoning_effort": "low"}
        if "qwen" in model:
            return {"reasoning_effort": "none"}
        return {}

    def groq_models(self) -> list[str]:
        seen: list[str] = []
        for m in (self.groq_model, self.groq_fallback_model, self.groq_third_model):
            if m and m not in seen:
                seen.append(m)
        return seen

    def groq_key_list(self, model: str | None = None) -> list[tuple[str, str]]:
        """[(key_id, key)], least-used key first for `model`. Empty when Groq is disabled on this instance."""
        if not self.groq_api_key:
            return []
        keys = [("groq1", self.groq_api_key)]
        keys += [(kid, k) for kid, k in groq_keys() if k != self.groq_api_key and kid != "groq1"]
        if model:
            order = {kid: i for i, (kid, _) in enumerate(ordered_keys(model))}
            keys.sort(key=lambda kv: order.get(kv[0], 99))
        return keys

    def note_provider_success(self, provider_name: str, payload: dict[str, Any], response_text: str) -> None:
        """Count a successful Groq request against its key so the next one prefers the less busy key."""
        if not provider_name.startswith("Groq"):
            return
        label, _, model = provider_name.partition(":")
        used = estimate_tokens(*(m.get("content", "") for m in payload.get("messages", []))) + estimate_tokens(response_text) + 150
        record_usage("groq1" if label == "Groq" else "groq2", model, used)

    @staticmethod
    def _provider_label(key_id: str, model: str) -> str:
        return f"{'Groq' if key_id == 'groq1' else 'Groq2'}:{model}"

    @staticmethod
    def note_provider_failure(provider_name: str, error: Exception) -> None:
        """A rate-limited Groq key+model is skipped for a minute so the next turn goes straight to the next one."""
        if "returned 429" not in str(error) or not provider_name.startswith("Groq"):
            return
        label, _, model = provider_name.partition(":")
        start_cooldown("groq1" if label == "Groq" else "groq2", model)

    def streaming_providers(self, openrouter_payload: dict[str, Any], openrouter_headers: dict[str, str]):
        """OpenAI-compatible streaming providers in priority order: each Groq model on each key (fast, free tier),
        then OpenRouter. Free-tier caps are per model and per account, so the next entry keeps the interview alive."""
        providers = []
        base = {k: openrouter_payload[k] for k in ("messages", "temperature", "stream") if k in openrouter_payload}
        base.update({"max_tokens": 600, "response_format": {"type": "json_object"}})
        for model in self.groq_models():
            for key_id, key in self.groq_key_list(model):
                if cooling_down(key_id, model):
                    continue
                headers = {"Content-Type": "application/json", "Authorization": f"Bearer {key}"}
                providers.append((
                    self._provider_label(key_id, model),
                    self.GROQ_URL,
                    headers,
                    {**base, "model": model, **self.groq_model_extras(model)},
                ))
        if self.api_key:
            providers.append(("OpenRouter", self.base_url, openrouter_headers, openrouter_payload))
        return providers

    async def _groq_complete(self, messages: list[dict[str, str]]) -> str:
        """Non-streaming Groq call across the configured models and keys; returns "" when none is available."""
        for model in self.groq_models():
            for key_id, key in self.groq_key_list(model):
                if cooling_down(key_id, model):
                    continue
                try:
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        res = await client.post(
                            self.GROQ_URL,
                            headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
                            json={
                                "model": model,
                                "messages": messages,
                                "temperature": 0.35,
                                "max_tokens": 600,
                                "response_format": {"type": "json_object"},
                                **self.groq_model_extras(model),
                            },
                        )
                    if res.status_code == 200:
                        body = res.json()
                        text = (body.get("choices") or [{}])[0].get("message", {}).get("content") or ""
                        record_usage(key_id, model, int((body.get("usage") or {}).get("total_tokens") or estimate_tokens(str(messages), text)))
                        if text:
                            return text
                    else:
                        if res.status_code == 429:
                            start_cooldown(key_id, model)
                        print(f"[Actor] {self._provider_label(key_id, model)} returned {res.status_code}: {res.text[:140]}")
                except Exception as exc:
                    print(f"[Actor] {self._provider_label(key_id, model)} error: {str(exc)[:140]}")
        return ""

    @staticmethod
    def pick_unused_probe(directive: SupervisorDirective, transcript: list[dict[str, Any]], candidate_text: str) -> str:
        """A fallback follow-up that has not been asked yet; otherwise one built from the candidate's own words."""
        from difflib import SequenceMatcher

        asked = [(t.get("text") or "").lower() for t in transcript if t.get("speaker") in ("Alex", "AI")]

        def used(q: str) -> bool:
            ql = q.lower().strip()
            return any(ql in a or SequenceMatcher(None, ql, a[-len(ql) - 40:]).ratio() > 0.75 for a in asked)

        candidates: list[str] = []
        probe = (getattr(directive, "suggested_fallback_probe", "") or "").strip()
        if probe:
            candidates.append(probe)
        try:
            from app.orchestrator.milestones import get_milestone_by_id

            m = get_milestone_by_id(getattr(directive, "track", "") or "", directive.current_milestone_id)
            if m:
                candidates.extend(m.fallback_probes or [])
        except Exception:
            pass
        for q in candidates:
            if q and not used(q):
                return q
        words = (candidate_text or "").replace(chr(10), " ").split()
        if len(words) >= 6:
            quote = " ".join(words[:14])
            return f'You said "{quote}...". Can you go one level deeper on that, with a concrete example?'
        return ""

    def build_system_prompt(
        self,
        directive: SupervisorDirective,
        working_memory: dict[str, Any],
    ) -> str:
        from app.orchestrator.milestones import normalize_track
        raw_track = getattr(directive, "track", None) or working_memory.get("track") or "System Design"
        track = normalize_track(raw_track)
        confirmed_facts = working_memory.get("architectural_facts", [])
        confirmed_vulns = working_memory.get("confirmed_vulnerabilities", [])

        facts_block = "\n".join(f"  - {f}" for f in confirmed_facts[-8:]) if confirmed_facts else "  - None yet."
        vulns_block = "\n".join(f"  - {v}" for v in confirmed_vulns[-5:]) if confirmed_vulns else "  - None yet."

        # Milestone 1: Structured Candidate Knowledge Formatting
        sk = working_memory.get("structured_knowledge", {})
        approaches = sk.get("approach_summary", {})
        complexities = sk.get("complexities", {})
        examples = sk.get("examples_discussed", [])
        edge_cases = sk.get("edge_cases_covered", [])
        corrections = sk.get("candidate_corrections", [])
        requests = sk.get("candidate_requests", [])
        questions_answered = sk.get("questions_answered", [])

        sk_lines = []
        if approaches.get("brute_force"):
            bf_tc = complexities.get("brute_force_time") or "O(N^2) baseline"
            bf_sc = complexities.get("brute_force_space") or "O(1)"
            sk_lines.append(f"  - Established Brute-Force Approach: {approaches['brute_force']} (Time: {bf_tc}, Space: {bf_sc})")
        if approaches.get("optimal_approach"):
            opt_tc = complexities.get("optimal_time") or "O(N)"
            opt_sc = complexities.get("optimal_space") or "O(1)"
            sk_lines.append(f"  - Established Optimal Approach: {approaches['optimal_approach']} (Time: {opt_tc}, Space: {opt_sc})")
        if approaches.get("alternative_approaches"):
            sk_lines.append(f"  - Alternative Approaches Considered: {'; '.join(approaches['alternative_approaches'])}")
        if examples:
            sk_lines.append(f"  - Worked Examples Already Provided: {'; '.join(examples[-3:])}")
        if edge_cases:
            sk_lines.append(f"  - Boundary Edge Cases Covered: {', '.join(edge_cases[-5:])}")
        if corrections:
            sk_lines.append(f"  - Candidate Corrections / Revisions: {'; '.join(corrections[-3:])}")
        if requests:
            sk_lines.append(f"  - Candidate Progression Intent: {', '.join(requests[-3:])}")
        if questions_answered:
            sk_lines.append(f"  - Topics Already Answered: {'; '.join(questions_answered[-3:])}")

        sk_block = "\n".join(sk_lines) if sk_lines else "  - None explicitly structured yet."

        # Milestone 1: Running Interview Digest (Chronological Summary)
        running_summary = working_memory.get("running_summary", [])
        summary_block = "\n".join(f"  * {s}" for s in running_summary[-12:]) if running_summary else "  * Session beginning."

        # Milestone 4: Scratchpad Notes (if candidate typed notes)
        scratchpad_notes = working_memory.get("scratchpad_notes", "").strip()
        scratchpad_block = f"\nCANDIDATE'S WRITTEN SCRATCHPAD NOTES (PERSISTED WORKSPACE):\n\"{scratchpad_notes[:800]}\"\n" if scratchpad_notes else ""

        # Track-specific Persona Definition
        if track == "DSA":
            dsa_info = working_memory.get("dsa_problem", {})
            prob_title = dsa_info.get("title", "Longest Substring Without Repeating Characters")
            is_revealed = dsa_info.get("revealed", False)
            current_m_id = getattr(directive, "current_milestone_id", "") or working_memory.get("current_milestone", "")
            persona_title = "Alex, an elite Senior Staff Software Engineer and Bar-Raiser conducting a live Algorithmic Problem Solving & Coding interview (LeetCode Hard/Medium calibration at Google/Meta/Stripe scale)"
            
            dsa_state = working_memory.get("structured_knowledge", {}).get("dsa_state", {})
            opt_approach = dsa_state.get("proposed_approach") or approaches.get("optimal_approach")
            opt_time = dsa_state.get("time_complexity") or complexities.get("optimal_time")
            opt_space = dsa_state.get("space_complexity") or complexities.get("optimal_space")
            has_optimal = bool(
                opt_approach
                and (
                    "opt" in dsa_state.get("approach_category", "")
                    or "opt" in dsa_state.get("optimality_status", "")
                    or approaches.get("optimal_approach")
                )
            )

            if is_revealed or current_m_id in ("code_implementation_and_dryrun", "complexity_verification_and_testing"):
                problem_intro_directive = (
                    f"- Assigned Algorithmic Challenge: '{prob_title}' (Coding workspace unlocked and active). "
                    "Invite the candidate to implement their optimal solution in the CodeMirror editor or review their submitted code.\n"
                )
            elif current_m_id == "problem_orientation_and_clarification":
                if has_optimal:
                    problem_intro_directive = (
                        f"- Milestone: Optimal Approach Formulated ({opt_approach}). Acknowledge their optimal solution and cross-question one specific detail of it: a hidden cost, a failing input, or a concrete alternative. DO NOT ask for brute force!\n"
                    )
                else:
                    brief_parts = [f"'{prob_title}'"]
                    if dsa_info.get("description"):
                        brief_parts.append(f"Statement: {dsa_info['description']}")
                    if dsa_info.get("constraints"):
                        brief_parts.append("Constraints: " + "; ".join(str(c) for c in dsa_info["constraints"][:4]))
                    exs = dsa_info.get("examples") or []
                    if exs and isinstance(exs[0], dict):
                        brief_parts.append(f"Example: input {exs[0].get('input', '')} gives {exs[0].get('output', '')}")
                    problem_brief = " | ".join(brief_parts)
                    problem_intro_directive = (
                        "- Milestone: Problem Understanding. The candidate has NOT been shown the problem, so YOU must state it. "
                        f"Problem to state: {problem_brief}. "
                        "If you have not yet stated it in this conversation: acknowledge their background in one short clause, then present the problem aloud in plain spoken English "
                        "(what the input is, what to return, one example, and the constraints), and ask them to restate it in their own words and name the edge cases they would check. "
                        "This one turn may run up to 6 sentences. "
                        "If you HAVE already stated it, do not repeat it: answer their clarifying questions using the constraints above. "
                        "NEVER ask the candidate to supply the constraints or input sizes: those are yours to give. DO NOT ask them to write code yet!\n"
                    )
            elif current_m_id == "brute_force_and_intuition":
                if has_optimal:
                    problem_intro_directive = (
                        f"- Milestone: Optimal Approach Validated ({opt_approach} in {opt_time or 'O(N)'}). "
                        f"CRITICAL: Candidate already formulated the optimal solution. STRICTLY FORBIDDEN to ask for brute force! Cross-question one specific detail of their approach (hidden cost, failing input, concrete alternative).\n"
                    )
                else:
                    problem_intro_directive = (
                        f"- Milestone: Brute-Force Baseline. Probe their baseline approach and Big-O complexity. "
                        "Challenge the computational bottleneck. DO NOT ask them to write code yet!\n"
                    )
            else:
                problem_intro_directive = (
                    f"- Milestone: Algorithmic Optimization. Probe their optimal algorithm, invariants, and Big-O improvements. "
                    "DO NOT announce that the coding workspace is open until the supervisor authorizes the transition!\n"
                )

            regression_guard = ""
            if has_optimal:
                regression_guard = (
                    f"\nCRITICAL DIRECTIVE - ESTABLISHED OPTIMAL APPROACH:\n"
                    f"- The candidate has ALREADY articulated the optimal solution: {opt_approach} (Time: {opt_time or 'O(N)'}, Space: {opt_space or 'O(1)'}).\n"
                    f"- REGRESSION PROHIBITION: DO NOT ask for the brute-force baseline or previous suboptimal ideas. Acknowledge their optimal design and probe invariant mechanics or edge cases.\n"
                )

            track_invariants = (
                f"INTERVIEW BOUNDARIES FOR DSA:\n"
                f"{problem_intro_directive}"
                f"{regression_guard}"
                "- Conduct an actual algorithmic interview. Focus STRICTLY on: problem clarification, optimal approach validation, data structure selection (hash maps, heaps, two pointers, trees, graphs, DP), edge-case identification, clean code implementation, and exact Big-O time and space complexity.\n"
                "- STRICT PROHIBITION: DO NOT ask about distributed systems, microservices, databases, financial ledgers, or cloud infrastructure. This is a pure coding and algorithms assessment.\n"
                "- If the candidate mentions this is a DSA interview or expresses confusion, warmly assure them: 'Yes, absolutely! This is our DSA & Problem Solving interview.' and continue with the algorithmic problem.\n"
                "- When the candidate explains an approach, probe their algorithmic logic and Big-O trade-offs.\n"
                "- When the candidate writes/submits code in the workspace, inspect their syntax, boundary conditions (empty, null, single element, overflow), and dry-run execution."
            )
            facts_header = "CANDIDATE'S STATED ALGORITHMIC INTUITION & LOGIC:"
            vulns_header = "IDENTIFIED ALGORITHMIC BUGS, EDGE CASES & BOTTLENECKS:"
        elif track == "Core CS":
            persona_title = "Alex, a Principal Systems Software Engineer and Computer Scientist conducting a rigorous CS Fundamentals calibration interview"
            track_invariants = (
                "INTERVIEW BOUNDARIES FOR CORE CS:\n"
                "- Focus STRICTLY on core computer science foundations: operating system kernel internals (processes vs threads, virtual memory paging, CPU scheduling), networking protocols (TCP/IP sliding windows, flow control, QUIC, HTTP/2 vs HTTP/3), concurrency primitives (mutexes, semaphores, atomic CAS, race conditions, deadlocks), and database storage internals (ACID, MVCC, WAL, B-Trees vs LSM).\n"
                "- Probe depth of understanding rather than superficial definitions. Ask how things work under the hood.\n"
                "- DO NOT ask high-level distributed systems or LeetCode coding questions."
            )
            facts_header = "CANDIDATE'S EXPLAINED CONCEPTS & LOW-LEVEL MECHANISMS:"
            vulns_header = "IDENTIFIED CONCEPTUAL GAPS & UNEXPLORED ANOMALIES:"
        elif track == "Behavioral":
            persona_title = "Alex, a Director of Engineering and Lead Bar-Raiser conducting an executive behavioral leadership assessment using the STAR framework"
            track_invariants = (
                "INTERVIEW BOUNDARIES FOR BEHAVIORAL:\n"
                "- Focus STRICTLY on past behavioral execution: ownership, high agency, decision-making under ambiguity, handling strong technical disagreements, incident recovery, and retrospective growth.\n"
                "- Enforce the STAR method (Situation, Task, Action, Result). Dissect passive 'we' statements: continuously ask 'What was YOUR specific role, decision, and contribution?'\n"
                "- Challenge vague or rehearsed answers by probing for exact metrics, trade-offs evaluated, and lessons learned.\n"
                "- DO NOT ask system design or coding questions."
            )
            facts_header = "CANDIDATE'S STATED SITUATIONAL CONTEXT & PERSONAL ACTIONS:"
            vulns_header = "IDENTIFIED VAGUE CLAIMS, UNADDRESSED RISKS & MISSING ACTIONS:"
        elif track == "Resume Technical":
            persona_title = "Alex, a Staff Engineer conducting a deep technical interrogation grounded strictly in the candidate's uploaded resume projects"
            track_invariants = (
                "INTERVIEW BOUNDARIES FOR RESUME TECHNICAL:\n"
                "- Probe the architecture, consistency models, and scale trade-offs of the actual systems detailed on the candidate's resume.\n"
                "- Verify authenticity and depth: ask why specific technologies were selected, what failed in production, and how bottlenecks were resolved."
            )
            facts_header = "CANDIDATE'S RESUME CLAIMS & ARCHITECTURAL DECISIONS:"
            vulns_header = "UNVERIFIED CLAIMS & PRODUCTION BLIND SPOTS:"
        elif track == "Staff Leadership":
            persona_title = "Alex, a VP of Engineering and Technical Fellow conducting an executive Staff+ Engineering Leadership calibration"
            track_invariants = (
                "INTERVIEW BOUNDARIES FOR STAFF LEADERSHIP:\n"
                "- Focus on multi-quarter technical strategy, RFC proposal craft, managing stakeholder friction, resolving cross-team architectural divergence, and establishing organizational engineering standards."
            )
            facts_header = "CANDIDATE'S STRATEGIC INITIATIVES & GOVERNANCE PROPOSALS:"
            vulns_header = "STAKEHOLDER RISKS & UNRESOLVED FRICTION POINTS:"
        elif track == "JD Match":
            persona_title = "Alex, a Principal Engineering Bar-Raiser conducting a target-role calibrated technical panel based on the candidate's target job description"
            track_invariants = (
                "INTERVIEW BOUNDARIES FOR JD MATCH:\n"
                "- Calibrate questions to the target seniority, role competencies, and company engineering standards.\n"
                "- Probe both core domain architecture and practical production engineering execution."
            )
            facts_header = "CANDIDATE'S DEMONSTRATED ROLE COMPETENCIES:"
            vulns_header = "IDENTIFIED GAPS AGAINST TARGET JOB REQUIREMENTS:"
        else:
            # Default / System Design
            persona_title = "Alex, an elite Staff Infrastructure Engineer and Bar-Raiser conducting a high-signal technical calibration interview for a Senior/Staff Distributed Systems role at Stripe scale"
            track_invariants = (
                "INTERVIEW BOUNDARIES FOR SYSTEM DESIGN:\n"
                "- Focus on large-scale distributed architectures, horizontal scaling, data partitioning, consensus, replication lag, and CAP/PACELC trade-offs."
            )
            facts_header = "CANDIDATE'S PREVIOUS DECISIONS & ARCHITECTURAL FACTS:"
            vulns_header = "IDENTIFIED ARCHITECTURAL VULNERABILITIES & UNRESOLVED GAPS:"

        # Tactical Directive Instructions
        directive_instructions = {
            "REVIEW_CODE": (
                f"TACTICAL DIRECTIVE: REVIEW CANDIDATE'S SUBMITTED CODE IN THE WORKSPACE.\n"
                f"- The candidate has submitted code in the editor for the active problem.\n"
                f"- In 1 concise sentence, acknowledge their implementation.\n"
                f"- Ask them to dry-run a specific boundary case or explain how their code handles edge cases (e.g. empty collection, duplicates, negative numbers, or integer overflow).\n"
                f"- Suggested prompt: \"{directive.suggested_fallback_probe}\""
            ),
            "PROBE_DEEPER": (
                f"TACTICAL DIRECTIVE: PROBE DEEPER on '{directive.target_focus}'.\n"
                f"- Ground your question directly in what the candidate just stated.\n"
                f"- Probe the technical depth, mechanics, or trade-offs.\n"
                f"- Suggested inspiration: \"{directive.suggested_fallback_probe}\""
            ),
            "CHALLENGE_FLAW": (
                f"TACTICAL DIRECTIVE: CHALLENGE TECHNICAL FLAW OR BOUNDARY on '{directive.target_focus}'.\n"
                f"- The candidate's response has an unaddressed edge case, vulnerability, or contradiction: '{directive.target_focus}'.\n"
                f"- Respectfully challenge this point without being pedantic. Require them to explain how they handle this scenario.\n"
                f"- Do not solve it for them; ask how they survive or resolve this condition."
            ),
            "HINT_AND_REDIRECT": (
                f"TACTICAL DIRECTIVE: HINT AND REDIRECT on '{directive.target_focus}'.\n"
                f"- The candidate is struggling, stuck, or repeating themselves.\n"
                f"- Provide a concise Socratic hint that reframes the constraint. Guide them forward without solving it for them."
            ),
            "TRANSITION_MILESTONE": (
                f"TACTICAL DIRECTIVE: TRANSITION TO NEXT MILESTONE -> '{directive.current_milestone_title}' (Focus: '{directive.target_focus}').\n"
                f"- CRITICAL REQUIREMENT: The previous milestone is concluded. You MUST pivot to the new milestone focus area.\n"
                f"- DO NOT repeat previous questions; they are safely logged in working memory.\n"
                f"- In at most ONE brief sentence, acknowledge the candidate's last statement.\n"
                f"- Then transition the discussion into '{directive.target_focus}' using this seed question:\n"
                f"  \"{directive.suggested_fallback_probe}\""
            ),
            "CONCLUDE": (
                f"TACTICAL DIRECTIVE: CONCLUDE INTERVIEW.\n"
                f"- All interview milestones are complete.\n"
                f"- Ask a reflective retrospective question (e.g. summary of time/space trade-offs or key lessons learned) or bring the session to a graceful conclusion."
            ),
            "CLOSING_WINDOW": (
                f"TACTICAL DIRECTIVE: CLOSING WINDOW (< 2 minutes remaining).\n"
                f"- Interview time budget is almost reached. DO NOT introduce any new problems or deep technical topics.\n"
                f"- Acknowledge their recent thoughts, ask if they have any brief final questions for you, or wrap up the current problem cleanly."
            ),
            "ACKNOWLEDGE_AND_ADVANCE": (
                f"TACTICAL DIRECTIVE: ACKNOWLEDGE PREVIOUS ANSWER & ADVANCE.\n"
                f"- The candidate already explained their approach or noted that this question was already answered.\n"
                f"- In 1 polite sentence, acknowledge their previous explanation directly (e.g. 'Understood, thanks for reiterating your approach').\n"
                f"- Immediately pivot forward to: '{directive.target_focus}'.\n"
                f"- Suggested inspiration: \"{directive.suggested_fallback_probe}\""
            ),
            "CONCLUDE_TIME_BUDGET": (
                f"TACTICAL DIRECTIVE: TIME BUDGET REACHED - CONCLUDE INTERVIEW.\n"
                f"- The scheduled interview time has concluded.\n"
                f"- Warmly and professionally thank the candidate for their time, acknowledge the work completed today, and state that the post-interview evaluation report is being synthesized."
            ),
        }

        specific_instruction = directive_instructions.get(
            directive.action,
            f"TACTICAL DIRECTIVE: {directive.action} focusing on '{directive.target_focus}'.\nGuidance: {directive.guidance}",
        )

        current_question = working_memory.get("current_question")
        question_guidance = ""
        if current_question:
            q_title = current_question.get("title", "")
            q_prompt = current_question.get("prompt", "")
            q_signals = ", ".join(current_question.get("expected_signals", []))
            question_guidance = (
                f"\nACTIVE QUESTION INTELLIGENCE: '{q_title}'\n"
                f"Curated Question Prompt: \"{q_prompt}\"\n"
                f"Key Concepts & Signals Expected: {q_signals}\n"
            )

        return f"""You are {persona_title}.

CURRENT TRACK: {track}
CURRENT MILESTONE: {directive.current_milestone_title}
TACTICAL DIRECTIVE: {directive.action}
TARGET FOCUS: {directive.target_focus}
SUPERVISOR GUIDANCE: {directive.guidance}

{track_invariants}
{question_guidance}
{scratchpad_block}
================================================================================
STRUCTURED CANDIDATE KNOWLEDGE (AUTHORITATIVE STATE - DO NOT ASK CANDIDATE TO REPEAT THIS):
{sk_block}
================================================================================

RUNNING INTERVIEW DIGEST:
{summary_block}

================================================================================
TURN DIRECTIVE (MANDATORY INSTRUCTIONS FOR THIS TURN):
{specific_instruction}
================================================================================

{facts_header}
{facts_block}

{vulns_header}
{vulns_block}

BEHAVIORAL RULES:
1. STRICT ADHERENCE TO TACTICAL DIRECTIVE: Follow the mandatory turn directive above. If the directive is TRANSITION_MILESTONE, smoothly acknowledge the candidate's last point and transition to the new milestone topic. DO NOT re-ask questions from previous milestones.
2. CONVERSATIONAL CADENCE: Speak like an authentic, collaborative Staff/Principal Engineer in an interview room. Never use canned bot praise ("Great!", "Awesome!", "That's fantastic!"). Keep your spoken dialogue concise (2 to 4 sentences maximum).
3. NATURAL GROUNDING: Seamlessly connect your probe to what the candidate said while advancing the conversation according to the directive.
4. REPETITION SENSITIVITY: If the candidate notes that a question or example was already answered, immediately acknowledge it and smoothly pivot forward. DO NOT insist on repeating it.
5. TRACK FIDELITY & IDENTITY GUARD: The current interview track is strictly '{track}'.
   - NEVER claim or treat this interview as a different track.
   - If the candidate explicitly mentions this is a {track} interview, immediately confirm and keep the conversation focused on {track}.
   - Never steer into distributed systems or cloud architecture unless the current track is 'System Design'.

OUTPUT FORMAT:
You MUST respond with a single valid JSON object with EXACTLY this structure:
{{
  "assistant_response": "Your spoken dialogue to the candidate",
  "delta_metadata": {{
    "technical_claims": ["explicit technical claim made by candidate in their latest turn"],
    "identified_vulnerabilities": ["algorithmic flaw, unhandled edge case, architectural risk, or vague claim"],
    "progress_classification": "PROGRESS" | "ELABORATION" | "STUCK" | "DELIBERATION" | "REPETITION",
    "socratic_directive": "concise directive summary for next turn",
    "approach_update": {{
      "approach_type": "brute_force" | "optimal" | "alternative",
      "description": "summary of candidate approach if stated",
      "time_complexity": "O(...)",
      "space_complexity": "O(...)"
    }},
    "examples_provided": ["example input/output mentioned by candidate"],
    "edge_cases_covered": ["edge cases identified by candidate"],
    "candidate_correction": "any revision or correction made by candidate",
    "candidate_requested_action": "move_to_coding" | "clarify_constraints" | null,
    "repetition_noticed": true | false
  }}
}}
Do NOT output any markdown ticks (```json) or conversational preface outside this JSON."""

    async def generate_turn_stream(
        self,
        directive: SupervisorDirective,
        working_memory: dict[str, Any],
        transcript: list[dict[str, Any]],
        candidate_text: str,
    ) -> AsyncGenerator[dict[str, Any], None]:
        """Generates streaming turn response via Server-Sent Events from OpenRouter Qwen 2.5 72B.

        Yields:
        - `{"type": "ttft", "ttft_ms": float}` upon first token arrival
        - `{"type": "token", "token": str}` for incremental dialogue tokens (strictly filtered from JSON)
        - `{"type": "final", "assistant_response": str, "delta_metadata": dict}` on completion
        """
        if directive.action == "CONCLUDE_TIME_BUDGET":
            # Time is up: no model call. The closing line is fixed so the wording is always right.
            closing = directive.suggested_fallback_probe
            yield {"type": "ttft", "ttft_ms": 0.0}
            for part in re.findall(r"\S+\s*", closing):
                yield {"type": "token", "token": part}
            yield {
                "type": "final",
                "assistant_response": closing,
                "delta_metadata": {
                    "technical_claims": [],
                    "identified_vulnerabilities": [],
                    "progress_classification": "PROGRESS",
                    "socratic_directive": "CONCLUDE_TIME_BUDGET",
                    "examples_provided": [],
                    "edge_cases_covered": [],
                    "repetition_noticed": False,
                },
            }
            return

        system_prompt = self.build_system_prompt(directive, working_memory) + self.build_context_ledger(
            transcript, candidate_text, working_memory
        )

        # Build message history
        messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]

        # The UI speaks the opening greeting locally, so it is not in the persisted transcript. Surface it as
        # context for the first turn so the model does not greet the candidate a second time.
        if not transcript:
            messages.append({"role": "assistant", "content": self.opening_message(directive.track)})

        # Include up to the last 12 transcript turns for context
        for turn in transcript[-HISTORY_MESSAGES:]:
            speaker = turn.get("speaker")
            text = turn.get("text", "")
            role = "assistant" if speaker in ("Alex", "AI") else "user"
            messages.append({"role": role, "content": text})

        # Append current candidate turn
        messages.append({"role": "user", "content": candidate_text})

        payload = {
            "model": self.model,
            "models": ["qwen/qwen-2.5-72b-instruct", "openrouter/free", "meta-llama/llama-3.3-70b-instruct"],
            "messages": messages,
            "response_format": {"type": "json_object"},
            "temperature": 0.35,
            "max_tokens": 350,
            "stream": True,
            "provider": {"allow_fallbacks": True},
        }

        extractor = IncrementalDialogueExtractor()
        ttft_recorded = False
        start_time = time.perf_counter()
        complete_raw_chunks: list[str] = []

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://interviewiq.app",
            "X-Title": "Strop Orchestrator",
        }

        # Provider chain: Qwen (OpenRouter, streaming) -> Gemini (non-streaming) -> OpenRouter free (last resort).
        # Falling back is only safe before any token has reached the client; after that we must surface the error.
        primary_error: Exception | None = None
        providers = self.streaming_providers(payload, headers)
        if not providers:
            primary_error = RuntimeError("No streaming model key is configured (GROQ_API_KEY / GROQ2_API_KEY / QWEN_API_KEY)")
        for provider_name, provider_url, provider_headers, provider_payload in providers:
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    async with client.stream("POST", provider_url, json=provider_payload, headers=provider_headers) as response:
                        if response.status_code != 200:
                            err_body = await response.aread()
                            raise RuntimeError(f"{provider_name} returned {response.status_code}: {err_body.decode('utf-8')[:300]}")
                        async for line in response.aiter_lines():
                            if not line:
                                continue
                            if line.startswith("data: "):
                                data_str = line[6:].strip()
                                if data_str == "[DONE]":
                                    break
                                try:
                                    chunk = json.loads(data_str)
                                    token = (chunk.get("choices") or [{}])[0].get("delta", {}).get("content") or ""
                                    if token:
                                        if not ttft_recorded:
                                            ttft_ms = (time.perf_counter() - start_time) * 1000.0
                                            yield {"type": "ttft", "ttft_ms": round(ttft_ms, 2)}
                                            ttft_recorded = True

                                        complete_raw_chunks.append(token)
                                        dialogue_token = extractor.feed(token)
                                        if dialogue_token:
                                            yield {"type": "token", "token": dialogue_token}
                                except json.JSONDecodeError:
                                    continue
                if not ttft_recorded:
                    raise RuntimeError(f"{provider_name} returned no content")
                primary_error = None
                self.note_provider_success(provider_name, provider_payload, "".join(complete_raw_chunks))
                break
            except Exception as exc:
                if ttft_recorded:
                    raise
                primary_error = exc
                self.note_provider_failure(provider_name, exc)
                print(f"[Actor] {provider_name} unavailable ({str(exc)[:140]}); trying the next provider")

        if primary_error is not None:
            print(f"[Actor] Primary model unavailable ({str(primary_error)[:160]}); falling back to Gemini")
            gemini_text = ""
            try:
                gemini_text = await self._gemini_complete(system_prompt, messages)
            except Exception as gem_exc:
                print(f"[Actor] Gemini fallback failed ({str(gem_exc)[:160]}); trying OpenRouter free tier")
                payload["model"] = "openrouter/free"
                payload.pop("models", None)
                payload["max_tokens"] = 320
                payload["stream"] = False
                async with httpx.AsyncClient(timeout=45.0) as client:
                    res = await client.post(self.base_url, json=payload, headers=headers)
                if res.status_code != 200:
                    fallback_probe = getattr(directive, "suggested_fallback_probe", "") or (
                        "Thank you for sharing that approach. Let's explore the key invariants and boundary conditions."
                    )
                    gemini_text = json.dumps({
                        "assistant_response": fallback_probe,
                        "delta_metadata": {
                            "technical_claims": [],
                            "identified_vulnerabilities": [],
                            "progress_classification": "PROGRESS",
                            "socratic_directive": directive.action,
                        }
                    })
                msg = res.json().get("choices", [{}])[0].get("message", {})
                gemini_text = msg.get("content") or ""
            if gemini_text:
                complete_raw_chunks.append(gemini_text)
                streamed = extractor.feed(gemini_text)
                ttft_ms = (time.perf_counter() - start_time) * 1000.0
                yield {"type": "ttft", "ttft_ms": round(ttft_ms, 2)}
                ttft_recorded = True
                # Emit in small word groups so client-side sentence chunking / TTS behaves as with live streaming
                words = re.findall(r"\S+\s*", streamed or "")
                for i in range(0, len(words), 4):
                    yield {"type": "token", "token": "".join(words[i:i + 4])}

        raw_complete_text = "".join(complete_raw_chunks)
        parsed = clean_json_response(raw_complete_text)

        assistant_response = (parsed.get("assistant_response") or "").strip()
        if not assistant_response:
            # Never commit an empty interviewer turn. Prefer the milestone's prepared follow-up over failing the candidate.
            fallback = self.pick_unused_probe(directive, transcript, candidate_text)
            if not fallback:
                raise RuntimeError("Interviewer model returned an empty response; please retry your answer.")
            for part in re.findall(r"\S+\s*", fallback):
                yield {"type": "token", "token": part}
            assistant_response = fallback
        delta_metadata = parsed.get("delta_metadata", {})

        # The wrap-up turn must actually hand the floor back: guarantee the closing question is asked and spoken.
        if directive.action == "CLOSING_WINDOW" and "?" not in assistant_response:
            extra = "Before we wrap up, do you have any questions for me, or anything you would like to add?"
            for part in re.findall(r"\S+\s*", " " + extra):
                yield {"type": "token", "token": part}
            assistant_response = f"{assistant_response} {extra}".strip()

        # Ensure valid delta metadata fields
        if not isinstance(delta_metadata, dict):
            delta_metadata = {}
        delta_metadata.setdefault("technical_claims", [])
        delta_metadata.setdefault("identified_vulnerabilities", [])
        delta_metadata.setdefault("progress_classification", "PROGRESS")
        delta_metadata.setdefault("socratic_directive", directive.action)
        delta_metadata.setdefault("examples_provided", [])
        delta_metadata.setdefault("edge_cases_covered", [])
        delta_metadata.setdefault("repetition_noticed", False)

        yield {
            "type": "final",
            "assistant_response": assistant_response,
            "delta_metadata": delta_metadata,
        }

    async def generate_turn(
        self,
        directive: SupervisorDirective,
        working_memory: dict[str, Any],
        transcript: list[dict[str, Any]],
        candidate_text: str,
    ) -> tuple[str, TurnDeltaMetadata, float, float]:
        """Synchronous/non-streaming fallback turn generation."""
        t_start = time.perf_counter()
        system_prompt = self.build_system_prompt(directive, working_memory) + self.build_context_ledger(
            transcript, candidate_text, working_memory
        )
        messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]

        for turn in transcript[-HISTORY_MESSAGES:]:
            speaker = turn.get("speaker")
            text = turn.get("text", "")
            role = "assistant" if speaker in ("Alex", "AI") else "user"
            messages.append({"role": role, "content": text})

        messages.append({"role": "user", "content": candidate_text})

        payload = {
            "model": self.model,
            "models": ["qwen/qwen-2.5-72b-instruct", "openrouter/free", "meta-llama/llama-3.3-70b-instruct"],
            "messages": messages,
            "response_format": {"type": "json_object"},
            "temperature": 0.35,
            "max_tokens": 350,
            "reasoning": {"max_tokens": 0},
            "stream": False,
            "provider": {"allow_fallbacks": True},
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://interviewiq.app",
            "X-Title": "Strop Orchestrator",
        }

        raw_content = await self._groq_complete(messages)
        if not raw_content and self.gemini_api_key:
            try:
                raw_content = await self._gemini_complete(system_prompt, messages)
            except Exception as gem_exc:
                print(f"[Actor] Gemini primary failed ({str(gem_exc)[:160]}); trying OpenRouter")
                raw_content = ""
        try:
            if raw_content:
                pass  # Gemini already answered
            elif not self.api_key:
                raise RuntimeError("QWEN_API_KEY is not configured")
            for attempt in range(0 if raw_content else 2):
                try:
                    async with httpx.AsyncClient(timeout=45.0) as client:
                        res = await client.post(self.base_url, json=payload, headers=headers)
                    if res.status_code == 200:
                        msg = res.json().get("choices", [{}])[0].get("message", {})
                        raw_content = msg.get("content") or ""
                        if raw_content:
                            break
                        raise RuntimeError("OpenRouter returned empty content")
                    if res.status_code == 400 and "reasoning" in payload and attempt == 0:
                        payload.pop("reasoning", None)
                        continue
                    if res.status_code in (429, 500, 502, 503, 504) and attempt == 0:
                        await asyncio.sleep(2.0)
                        continue
                    raise RuntimeError(f"OpenRouter returned {res.status_code}: {res.text[:300]}")
                except (httpx.TimeoutException, httpx.NetworkError):
                    if attempt == 0:
                        await asyncio.sleep(2.0)
                        continue
                    raise
        except Exception as primary_exc:
            print(f"[Actor] Primary model unavailable ({str(primary_exc)[:160]}); falling back to Gemini")
            try:
                raw_content = await self._gemini_complete(system_prompt, messages)
            except Exception as gem_exc:
                print(f"[Actor] Gemini fallback failed ({str(gem_exc)[:160]}); using milestone probe")
                fallback_probe = getattr(directive, "suggested_fallback_probe", "") or (
                    "Thank you for sharing that approach. Could you walk me through the key constraints and edge cases?"
                )
                raw_content = json.dumps({
                    "assistant_response": fallback_probe,
                    "delta_metadata": {
                        "technical_claims": [],
                        "identified_vulnerabilities": [],
                        "progress_classification": "PROGRESS",
                        "socratic_directive": directive.action,
                    }
                })

        parsed = clean_json_response(raw_content)
        assistant_response = parsed.get("assistant_response", "").strip()
        if not assistant_response:
            candidate_resp = parsed.get("dialogue_response") or parsed.get("response") or ""
            if not candidate_resp and raw_content and not str(raw_content).strip().startswith("{"):
                text_clean = str(raw_content).strip()
                is_reasoning = any(text_clean.startswith(prefix) for prefix in (
                    "The user", "The candidate", "I need to", "We need to", "Here's a thinking", "Thinking Process"
                ))
                if not is_reasoning:
                    candidate_resp = text_clean
            assistant_response = candidate_resp or (
                "Thank you for detailing that approach. Could you walk me through the key algorithmic invariants and any boundary conditions you consider?"
            )
        delta_raw = parsed.get("delta_metadata", {})
        if not isinstance(delta_raw, dict):
            delta_raw = {}

        approach_raw = delta_raw.get("approach_update")
        approach_update = None
        if isinstance(approach_raw, dict):
            from app.schemas.orchestrator import ApproachUpdate
            try:
                app_type = approach_raw.get("approach_type") or "optimal"
                desc = approach_raw.get("description") or ""
                approach_update = ApproachUpdate(
                    approach_type=str(app_type),
                    description=str(desc),
                    time_complexity=approach_raw.get("time_complexity"),
                    space_complexity=approach_raw.get("space_complexity"),
                    key_data_structures=approach_raw.get("key_data_structures") or [],
                )
            except Exception:
                approach_update = None

        prog_class = str(delta_raw.get("progress_classification") or "PROGRESS").upper()
        if prog_class not in {"PROGRESS", "ELABORATION", "STUCK", "DELIBERATION", "REPETITION"}:
            prog_class = "PROGRESS"

        delta_metadata = TurnDeltaMetadata(
            technical_claims=delta_raw.get("technical_claims", []),
            identified_vulnerabilities=delta_raw.get("identified_vulnerabilities", []),
            progress_classification=prog_class,
            socratic_directive=delta_raw.get("socratic_directive", directive.action),
            observed_competencies=delta_raw.get("observed_competencies", []),
            approach_update=approach_update,
            examples_provided=delta_raw.get("examples_provided", []),
            edge_cases_covered=delta_raw.get("edge_cases_covered", []),
            candidate_correction=delta_raw.get("candidate_correction"),
            candidate_requested_action=delta_raw.get("candidate_requested_action"),
            repetition_noticed=delta_raw.get("repetition_noticed", False),
        )

        total_ms = (time.perf_counter() - t_start) * 1000.0
        ttft_ms = total_ms

        return assistant_response, delta_metadata, ttft_ms, total_ms
