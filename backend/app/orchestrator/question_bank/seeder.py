"""Idempotent Database Seeder for Phase 4 Unified Question Intelligence Bank.

Seeds and synchronizes curated catalogs for all 5 active tracks:
- DSA & Problem Solving (110 problems)
- System Design (56 scenarios)
- Core CS (111 questions)
- Behavioral & Leadership (68 questions)
- Resume Technical (35 templates)
"""

import hashlib
import logging
import uuid
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.question import Question
from app.orchestrator.question_bank.behavioral_catalog import BEHAVIORAL_CATALOG
from app.orchestrator.question_bank.core_cs_catalog import CORE_CS_CATALOG
from app.orchestrator.question_bank.dsa_catalog import DSA_CATALOG
from app.orchestrator.question_bank.resume_catalog import RESUME_CATALOG
from app.orchestrator.question_bank.system_design_catalog import SYSTEM_DESIGN_CATALOG

logger = logging.getLogger("orchestrator.question_bank.seeder")


def compute_semantic_fingerprint(track: str, topic: str, title: str) -> str:
    """Computes a deterministic 64-character SHA-256 fingerprint for semantic deduplication."""
    norm = f"{track.strip().lower()}:{topic.strip().lower()}:{title.strip().lower()}"
    return hashlib.sha256(norm.encode("utf-8")).hexdigest()


async def seed_all_catalogs(db: AsyncSession) -> dict[str, int]:
    """Idempotently seeds all five question catalogs into the PostgreSQL database.

    Returns a summary dictionary of seeded count per track.
    """
    catalogs: list[tuple[str, list[dict[str, Any]]]] = [
        ("DSA", DSA_CATALOG),
        ("System Design", SYSTEM_DESIGN_CATALOG),
        ("Core CS", CORE_CS_CATALOG),
        ("Behavioral", BEHAVIORAL_CATALOG),
        ("Resume Technical", RESUME_CATALOG),
    ]

    summary = {}

    # Query all existing fingerprints in one fast query
    res = await db.execute(select(Question.semantic_fingerprint))
    existing_fps = set(res.scalars().all())

    total_inserted = 0
    total_updated = 0

    for track_name, catalog in catalogs:
        inserted_for_track = 0
        for item in catalog:
            fp = compute_semantic_fingerprint(track_name, item["topic"], item["title"])

            if fp in existing_fps:
                if item.get("metadata_json"):
                    # The catalog is the source of truth for DSA tests, so refresh them on every seed. Other
                    # tracks only fill in metadata that is still empty.
                    cond = [Question.semantic_fingerprint == fp]
                    if track_name != "DSA":
                        cond.append(Question.metadata_json == {})
                    await db.execute(
                        update(Question)
                        .where(*cond)
                        .values(
                            metadata_json=item.get("metadata_json", {}),
                            question_family=item.get("question_family"),
                            source_attribution=item.get("source_attribution"),
                        )
                    )
                continue

            q = Question(
                id=uuid.uuid4(),
                track=track_name,
                topic=item["topic"],
                subtopic=item.get("subtopic"),
                difficulty=item.get("difficulty", "Medium"),
                title=item["title"],
                prompt=item["prompt"],
                context_scenario=item.get("context_scenario"),
                expected_signals=item.get("expected_signals", []),
                follow_up_probes=item.get("follow_up_probes", []),
                provenance="curated_seed",
                validation_status="verified",
                quality_score=1.2,
                semantic_fingerprint=fp,
                question_family=item.get("question_family"),
                source_attribution=item.get("source_attribution", "Strop Bar-Raising Catalog"),
                metadata_json=item.get("metadata_json", {}),
                usage_count=0,
            )
            db.add(q)
            existing_fps.add(fp)
            inserted_for_track += 1
            total_inserted += 1

        summary[track_name] = inserted_for_track

    if total_inserted > 0:
        await db.commit()
        logger.info("[Seeder] Inserted %d new curated questions across %d tracks.", total_inserted, len(catalogs))

    return summary


async def get_question_bank_statistics(db: AsyncSession) -> dict[str, Any]:
    """Returns database telemetry and distribution stats across all 5 tracks."""
    stats = {}
    for track_name in ["DSA", "System Design", "Core CS", "Behavioral", "Resume Technical"]:
        count_res = await db.execute(
            select(func.count(Question.id)).where(Question.track == track_name)
        )
        stats[track_name] = count_res.scalar() or 0

    total_res = await db.execute(select(func.count(Question.id)))
    stats["total"] = total_res.scalar() or 0
    return stats
