"""Semantic Track Consistency Guard for Strop.

Validates that generated interviewer dialogue adheres strictly to the canonical
interview track boundaries before committing turns to PostgreSQL.

Prevents cross-track domain bleed (e.g. a DSA interview asking distributed ledger
questions, or a Behavioral interview asking for code implementation).
"""

import re
from typing import Tuple


# Core indicator patterns for cross-track violation detection
SYSTEM_DESIGN_INDICATORS = [
    re.compile(r"\b(distributed ledger|ledger system)\b", re.IGNORECASE),
    re.compile(r"\b(write throughput|latency slas?)\b", re.IGNORECASE),
    re.compile(r"\b(sharding strategy|database sharding|data partitioning)\b", re.IGNORECASE),
    re.compile(r"\b(kafka cluster|message broker|event-driven architecture)\b", re.IGNORECASE),
    re.compile(r"\b(load balancer topology|stateless api tiers?)\b", re.IGNORECASE),
    re.compile(r"\b(cap theorem|pacelc|replication lag)\b", re.IGNORECASE),
    re.compile(r"\b(microservices? architecture|service mesh)\b", re.IGNORECASE),
]

DSA_CORE_INDICATORS = [
    re.compile(r"\b(algorithm|algorithmic|complexity|big-o|time complexity|space complexity)\b", re.IGNORECASE),
    re.compile(r"\b(data structure|hash map|hashmap|array|string|pointer|two pointers?|sliding window)\b", re.IGNORECASE),
    re.compile(r"\b(tree|binary tree|graph|heap|priority queue|stack|queue|linked list)\b", re.IGNORECASE),
    re.compile(r"\b(brute force|dynamic programming|memoization|recursion|backtracking)\b", re.IGNORECASE),
    re.compile(r"\b(code|implementation|edge case|boundary condition|test case)\b", re.IGNORECASE),
    re.compile(r"\b(problem|substring|subsequence|index|indices|traversal)\b", re.IGNORECASE),
]

BEHAVIORAL_CORE_INDICATORS = [
    re.compile(r"\b(situation|task|action|result|star method)\b", re.IGNORECASE),
    re.compile(r"\b(tell me about a time|describe a situation|walk me through an experience)\b", re.IGNORECASE),
    re.compile(r"\b(conflict|disagreement|disagreed|stakeholder|teammate|team)\b", re.IGNORECASE),
    re.compile(r"\b(leadership|ownership|mentorship|mistake|failure|learned)\b", re.IGNORECASE),
    re.compile(r"\b(your role|your specific contribution|what did you do)\b", re.IGNORECASE),
]

CODING_IMPLEMENTATION_INDICATORS = [
    re.compile(r"\b(write a function|implement a function|write the code for|code editor)\b", re.IGNORECASE),
    re.compile(r"\b(leetcode|coding problem|unit tests?|test runner)\b", re.IGNORECASE),
]


def verify_track_consistency(track: str, dialogue_text: str) -> Tuple[bool, str | None]:
    """Verifies that dialogue_text adheres to track boundaries.
    
    Returns (True, None) if consistent, or (False, reason) if severe domain bleed is detected.
    """
    if not dialogue_text or not dialogue_text.strip():
        return True, None

    normalized_track = track.strip()
    text = dialogue_text.strip()

    if normalized_track == "DSA":
        # DSA check: Must NOT conduct distributed systems / ledger architecture interview
        has_sys_design_bleed = any(p.search(text) for p in SYSTEM_DESIGN_INDICATORS)
        has_dsa_context = any(p.search(text) for p in DSA_CORE_INDICATORS)

        if has_sys_design_bleed and not has_dsa_context:
            return (
                False,
                "Dialogue introduced distributed systems/infrastructure concepts into a DSA coding interview without algorithmic context."
            )

    elif normalized_track == "Behavioral":
        # Behavioral check: Must NOT conduct live coding or distributed infrastructure architecture
        has_coding_ask = any(p.search(text) for p in CODING_IMPLEMENTATION_INDICATORS)
        has_sys_design_bleed = any(p.search(text) for p in SYSTEM_DESIGN_INDICATORS[:3])

        if has_coding_ask or has_sys_design_bleed:
            return (
                False,
                "Dialogue introduced technical coding or system architecture questions into a Behavioral leadership interview."
            )

    elif normalized_track == "Core CS":
        # Core CS check: Must NOT conduct high-level cloud distributed architecture design
        has_distributed_infra = any(p.search(text) for p in SYSTEM_DESIGN_INDICATORS[:3])
        if has_distributed_infra:
            return (
                False,
                "Dialogue introduced high-level cloud infrastructure design into a Core CS fundamentals interview."
            )

    return True, None

