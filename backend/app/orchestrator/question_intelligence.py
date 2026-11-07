"""Unified Adaptive Question Intelligence Engine for Strop (Phase 4).

Governs:
1. Multi-factor adaptive question selection across all 5 active tracks.
2. Cross-session candidate exposure tracking preventing repetitive interviews.
3. Track-specific metadata generation (DSA coding specs, System Design scale numbers, STAR rubrics).
4. Dynamic LLM question generation with structural validation and quarantine gates.
5. Semantic fingerprinting and multi-tier duplicate prevention.
"""

import hashlib
import json
import logging
import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.orchestrator_session import OrchestratorSession
from app.models.question import Question
from app.orchestrator.milestones import normalize_track
from app.orchestrator.question_bank.seeder import compute_semantic_fingerprint, seed_all_catalogs

logger = logging.getLogger("orchestrator.question_intelligence")


class QuestionIntelligenceEngine:
    """Intelligent question selector and dynamic context generator."""

    @classmethod
    async def ensure_seeded(cls, db: AsyncSession) -> None:
        """Ensures the curated question repository is populated across all 5 tracks."""
        count_res = await db.execute(select(func.count(Question.id)))
        count = count_res.scalar() or 0
        if count < 350:
            logger.info("[QuestionIntelligence] Seeding full 5-track question repository (found %d)...", count)
            summary = await seed_all_catalogs(db)
            logger.info("[QuestionIntelligence] Successfully seeded catalogs: %s", summary)

    @classmethod
    async def get_candidate_exposure_history(
        cls,
        db: AsyncSession,
        user_id: uuid.UUID | str | None,
        canonical_track: str,
        limit_sessions: int = 10,
    ) -> dict[str, Any]:
        """Retrieves past question exposure and topics across recent sessions for this user."""
        if not user_id:
            return {
                "past_asked_ids": set(),
                "id_recency_penalty": {},
                "past_families": set(),
                "past_topics": set(),
            }

        try:
            uid = uuid.UUID(str(user_id)) if isinstance(user_id, str) else user_id
            stmt = (
                select(OrchestratorSession.working_memory)
                .where(
                    OrchestratorSession.user_id == uid,
                    OrchestratorSession.track == canonical_track,
                )
                .order_by(OrchestratorSession.created_at.desc())
                .limit(limit_sessions)
            )
            res = await db.execute(stmt)
            session_memories = res.scalars().all()

            past_asked_ids = set()
            id_recency_penalty: dict[str, float] = {}
            past_families = set()
            past_topics = set()

            for idx, mem in enumerate(session_memories):
                if not isinstance(mem, dict):
                    continue
                # Penalty decays from 250 for most recent session down to 50 for 10th session
                penalty = max(250.0 - (idx * 20.0), 50.0)

                qids = mem.get("asked_question_ids", [])
                for qid in qids:
                    qid_str = str(qid)
                    past_asked_ids.add(qid_str)
                    if qid_str not in id_recency_penalty:
                        id_recency_penalty[qid_str] = penalty

                for top in mem.get("covered_topics", []):
                    past_topics.add(top.lower())

                cur_q = mem.get("current_question")
                if cur_q and isinstance(cur_q, dict) and cur_q.get("question_family"):
                    past_families.add(cur_q["question_family"].lower())

            return {
                "past_asked_ids": past_asked_ids,
                "id_recency_penalty": id_recency_penalty,
                "past_families": past_families,
                "past_topics": past_topics,
            }
        except Exception as e:
            logger.warning("[QuestionIntelligence] Error querying candidate exposure history: %s", e)
            return {
                "past_asked_ids": set(),
                "id_recency_penalty": {},
                "past_families": set(),
                "past_topics": set(),
            }

    @classmethod
    async def select_adaptive_question(
        cls,
        db: AsyncSession,
        track: str,
        working_memory: dict[str, Any],
        user_id: uuid.UUID | str | None = None,
        candidate_profile: dict[str, Any] | None = None,
        target_difficulty: str | None = None,
        requested_topic: str | None = None,
        requested_problem_id: str | None = None,
        is_revision_mode: bool = False,
    ) -> dict[str, Any] | None:
        """Selects an optimal question using multi-factor scoring and cross-session exposure tracking.

        Scoring Model:
        Score = QualityScore - UsagePenalty - RecencyPenalty - FamilyPenalty
                + NoveltyBonus + GapAlignmentBonus + DifficultyFitBonus + TopicMatchBonus
        """
        await cls.ensure_seeded(db)

        canonical_track = normalize_track(track)
        current_asked_ids = set(str(qid) for qid in working_memory.get("asked_question_ids", []))
        covered_topics = set(t.lower() for t in working_memory.get("covered_topics", []))
        unresolved_concerns = working_memory.get("unresolved_concerns", [])
        weak_topics = {c.get("flaw", "").lower() for c in unresolved_concerns if c.get("flaw")}

        # 1. Retrieve Candidate Historical Exposure
        exposure = await cls.get_candidate_exposure_history(db, user_id, canonical_track)
        id_recency_penalty = exposure["id_recency_penalty"]
        past_families = exposure["past_families"]
        past_topics = exposure["past_topics"]

        # 2. Query Active Validated Questions for this Track (Excluding Quarantined)
        stmt = (
            select(Question)
            .where(
                Question.track == canonical_track,
                Question.validation_status.in_(["verified", "candidate"]),
            )
        )
        res = await db.execute(stmt)
        # Problems the stdin test harness cannot drive (linked structures, in-place mutation) stay out of rotation.
        questions = [q for q in res.scalars().all() if (q.metadata_json or {}).get("runnable") is not False]

        if not questions:
            logger.warning("[QuestionIntelligence] No active questions found for track %s", canonical_track)
            return None

        # Explicit Revision Request: If candidate explicitly requested a specific problem ID
        if requested_problem_id:
            req_clean = requested_problem_id.strip().lower()
            for q in questions:
                meta = q.metadata_json or {}
                if (
                    str(q.id).lower() == req_clean
                    or meta.get("entry_point", "").lower() == req_clean
                    or req_clean in q.title.lower().replace(" ", "-")
                    or req_clean in q.title.lower()
                ):
                    await cls._record_question_usage(db, q, working_memory, canonical_track, explicit_id=requested_problem_id)
                    return cls._to_dict(q)

        # 3. Filter Out Questions Already Asked in CURRENT Session (unless revision mode requested)
        available = [q for q in questions if str(q.id) not in current_asked_ids]
        if not available:
            # If all available questions exhausted in this session, fallback to all questions
            available = list(questions)

        # 4. Resume Technical Grounding: Prioritize Unexamined Technologies / Projects
        if canonical_track == "Resume Technical" and candidate_profile:
            claimed_skills = candidate_profile.get("skills", [])
            claimed_projects = candidate_profile.get("projects", [])
            for q in available:
                tech_meta = q.metadata_json.get("technology", "").lower()
                if tech_meta and any(tech_meta in s.lower() for s in claimed_skills):
                    # Prioritize this verified technology question
                    await cls._record_question_usage(db, q, working_memory, canonical_track)
                    return cls._to_dict(q)

        # 5. Multi-Factor Scoring
        scored_candidates: list[tuple[float, Question]] = []

        for q in available:
            # Base quality score
            score = (q.quality_score or 1.0) * 100.0

            # Usage penalty (prefer fresh questions in the catalog)
            score -= min((q.usage_count or 0) * 8.0, 80.0)

            # Cross-session recency penalty
            if not is_revision_mode:
                qid_str = str(q.id)
                if qid_str in id_recency_penalty:
                    score -= id_recency_penalty[qid_str]

                if q.question_family and q.question_family.lower() in past_families:
                    score -= 90.0

            # Topic Novelty bonus: high priority for topics never explored by candidate
            q_topic_lower = q.topic.lower()
            if q_topic_lower not in past_topics and q_topic_lower not in covered_topics:
                score += 60.0

            # Gap / Weakness Alignment bonus: probe candidate's past flaws
            if any(w in q_topic_lower or (q.subtopic and w in q.subtopic.lower()) for w in weak_topics):
                score += 70.0

            # Difficulty Fit bonus
            if target_difficulty and q.difficulty.lower() == target_difficulty.lower():
                score += 40.0

            # Requested Topic Match bonus
            if requested_topic and requested_topic.lower() in q_topic_lower:
                score += 150.0

            scored_candidates.append((score, q))

        # Sort descending by score
        scored_candidates.sort(key=lambda x: x[0], reverse=True)
        chosen = scored_candidates[0][1]

        # Record usage and update working memory
        await cls._record_question_usage(db, chosen, working_memory, canonical_track)
        return cls._to_dict(chosen)

    @classmethod
    async def _record_question_usage(
        cls,
        db: AsyncSession,
        question: Question,
        working_memory: dict[str, Any],
        canonical_track: str,
        explicit_id: str | None = None,
    ) -> None:
        """Records question usage in working memory and updates database telemetry."""
        question.usage_count = (question.usage_count or 0) + 1
        await db.commit()

        qid = str(question.id)
        asked = working_memory.setdefault("asked_question_ids", [])
        if qid not in asked:
            asked.append(qid)

        covered = working_memory.setdefault("covered_topics", [])
        if question.topic.lower() not in [t.lower() for t in covered]:
            covered.append(question.topic)

        # Store structured question object in working memory
        q_dict = cls._to_dict(question)
        working_memory["current_question"] = q_dict

        # If DSA track, populate rich dsa_problem metadata for code execution workspace
        if canonical_track == "DSA":
            meta = question.metadata_json or {}
            working_memory["dsa_problem"] = {
                "id": explicit_id or meta.get("entry_point", str(question.id)),
                "problem_id": str(question.id),
                "title": question.title,
                "difficulty": question.difficulty,
                "tagline": question.context_scenario or f"{question.topic} algorithmic challenge",
                "description": question.prompt,
                "constraints": meta.get("constraints", [
                    "Optimal Big-O time and space complexity required.",
                    "Handle empty, single element, and extreme boundary values.",
                ]),
                "examples": meta.get("examples", []),
                "optimal_time_complexity": meta.get("optimal_time_complexity", "O(N)"),
                "optimal_space_complexity": meta.get("optimal_space_complexity", "O(1)"),
                "entry_point": meta.get("entry_point", "solution"),
                "args": meta.get("args", [{"name": "input_val", "type": "any"}]),
                "return_type": meta.get("return_type", "any"),
                "templates": meta.get("templates", {
                    "Python": f"class Solution:\n    def {meta.get('entry_point', 'solution')}(self, input_val):\n        # Implement optimal solution\n        pass\n",
                    "JavaScript": f"function {meta.get('entry_point', 'solution')}(input_val) {{\n  // Implement optimal solution\n}}\n",
                }),
                "test_cases": meta.get("test_cases", []),
                "revealed": False,
                "revealed_at_turn": None,
            }

    @classmethod
    async def generate_dynamic_question(
        cls,
        db: AsyncSession,
        track: str,
        topic: str,
        difficulty: str = "Medium",
        context_prompt: str = "",
    ) -> dict[str, Any] | None:
        """Dynamic Question Generation & Quarantine Pipeline:

        Generation -> Structural Validation -> Deduplication -> Quality Scoring -> Activation / Quarantine.
        """
        from app.config import get_settings
        import httpx

        settings = get_settings()
        api_key = settings.OPENROUTER_API_KEY
        if not api_key:
            logger.warning("[QuestionIntelligence] No API key for dynamic question generation.")
            return None

        canonical_track = normalize_track(track)
        generation_prompt = f"""You are a Lead Bar-Raiser creating a brand new, highly rigorous technical interview question for the '{canonical_track}' track.
Topic: {topic}
Difficulty: {difficulty}
Context or Specific Constraint: {context_prompt or 'Standard FAANG/Stripe Bar-Raising Evaluation'}

Return ONLY a JSON object with this exact schema:
{{
  "title": "Distinctive descriptive title (4-8 words)",
  "topic": "{topic}",
  "subtopic": "Specific technical subdomain",
  "difficulty": "{difficulty}",
  "question_family": "Short 2-4 word algorithmic pattern or system scenario family",
  "prompt": "Rigorous, clear interview question or problem statement (2-4 sentences)",
  "context_scenario": "Concrete real-world operational scale or constraint scenario",
  "expected_signals": [
    "first critical technical mechanism or invariant candidate must explain",
    "second critical edge case, boundary, or trade-off they must analyze",
    "third key complexity or failure mitigation factor"
  ],
  "follow_up_probes": [
    "First deep follow-up probing failure modes or scaling bottlenecks",
    "Second deep follow-up probing alternative architectural trade-offs"
  ],
  "metadata": {{
    "optimal_time_complexity": "O(N) or N/A",
    "optimal_space_complexity": "O(1) or N/A"
  }}
}}"""

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "qwen/qwen-2.5-72b-instruct",
                        "messages": [{"role": "user", "content": generation_prompt}],
                        "response_format": {"type": "json_object"},
                        "temperature": 0.4,
                    },
                )

                if res.status_code != 200:
                    logger.warning("[QuestionIntelligence] Dynamic generation HTTP %d: %s", res.status_code, res.text)
                    return None

                data = res.json()
                content = data["choices"][0]["message"]["content"]
                parsed = json.loads(content)

                # 1. Structural Validation Gate
                title = str(parsed.get("title", "")).strip()
                prompt_text = str(parsed.get("prompt", "")).strip()
                signals = parsed.get("expected_signals", [])
                probes = parsed.get("follow_up_probes", [])

                is_valid = (
                    len(title) >= 4
                    and len(prompt_text) >= 25
                    and isinstance(signals, list)
                    and len(signals) >= 2
                    and isinstance(probes, list)
                    and len(probes) >= 1
                )

                fp = compute_semantic_fingerprint(canonical_track, topic, title)

                # 2. Semantic Deduplication Check
                existing = await db.execute(select(Question).where(Question.semantic_fingerprint == fp))
                if existing.scalar_one_or_none() is not None:
                    logger.info("[QuestionIntelligence] Duplicate question rejected with fingerprint %s", fp)
                    return None

                # 3. Activation vs Quarantine Routing
                status = "verified" if is_valid else "quarantined"
                q_score = 1.2 if is_valid else 0.0

                new_q = Question(
                    id=uuid.uuid4(),
                    track=canonical_track,
                    topic=topic,
                    subtopic=parsed.get("subtopic"),
                    difficulty=parsed.get("difficulty", difficulty),
                    title=title,
                    prompt=prompt_text,
                    context_scenario=parsed.get("context_scenario"),
                    expected_signals=signals if is_valid else [],
                    follow_up_probes=probes if is_valid else [],
                    provenance="dynamic_generated",
                    validation_status=status,
                    quality_score=q_score,
                    semantic_fingerprint=fp,
                    question_family=parsed.get("question_family", topic),
                    source_attribution="Strop Qwen 2.5 72B Dynamic Generator",
                    metadata_json=parsed.get("metadata", {}),
                    usage_count=0,
                )
                db.add(new_q)
                await db.commit()

                if not is_valid:
                    logger.warning("[QuestionIntelligence] Generated question quarantined due to validation failure: %s", title)
                    return None

                logger.info("[QuestionIntelligence] Persisted verified dynamic question '%s' (fp: %s)", title, fp)
                return cls._to_dict(new_q)

        except Exception as e:
            logger.warning("[QuestionIntelligence] Error during dynamic question generation: %s", e)
            return None

    @classmethod
    def _to_dict(cls, q: Question) -> dict[str, Any]:
        return {
            "id": str(q.id),
            "track": q.track,
            "topic": q.topic,
            "subtopic": q.subtopic,
            "difficulty": q.difficulty,
            "title": q.title,
            "prompt": q.prompt,
            "context_scenario": q.context_scenario,
            "expected_signals": q.expected_signals,
            "follow_up_probes": q.follow_up_probes,
            "provenance": q.provenance,
            "quality_score": q.quality_score,
            "question_family": q.question_family,
            "metadata_json": q.metadata_json or {},
        }
