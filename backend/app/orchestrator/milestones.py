"""Milestone definitions and track blueprints for Strop.

Governs deterministic milestone progression, competencies, and fallback Socratic probes
across distinct interview types (DSA, System Design, Core CS, Behavioral, Resume Technical, Staff Leadership).
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class MilestoneDefinition:
    id: str
    title: str
    description: str
    core_competencies: list[str]
    min_turns: int = 1
    max_turns: int = 5
    key_focus_areas: list[str] = field(default_factory=list)
    fallback_probes: list[str] = field(default_factory=list)


# -----------------------------------------------------------------------------
# 1. DSA & PROBLEM SOLVING MILESTONES
# -----------------------------------------------------------------------------
DSA_MILESTONES = [
    MilestoneDefinition(
        id="problem_orientation_and_clarification",
        title="Problem Understanding & Clarification",
        description="Greeting, introducing the algorithmic problem naturally, clarifying inputs, outputs, constraints, and boundary cases.",
        core_competencies=["problem_clarification", "boundary_identification"],
        min_turns=1,
        max_turns=3,
        key_focus_areas=[
            "clarifying input constraints (size of N, value ranges, sorted vs unsorted)",
            "identifying potential edge cases (empty inputs, negative values, duplicates)",
            "confirming expected return types and memory constraints",
        ],
        fallback_probes=[
            "Before jumping straight into implementation, walk me through your understanding of the problem statement and any edge cases you anticipate.",
            "What assumptions are you making about the input distribution, scale of N, and whether the input can contain duplicates or nulls?",
        ],
    ),
    MilestoneDefinition(
        id="brute_force_and_intuition",
        title="Brute-Force Baseline & Problem Intuition",
        description="Exploring initial brute-force approach, computational complexity, and baseline intuition.",
        core_competencies=["brute_force_formulation", "complexity_baseline"],
        min_turns=1,
        max_turns=3,
        key_focus_areas=[
            "formulating the naive/brute-force approach",
            "calculating time and space complexity of the baseline",
            "identifying the computational bottleneck that needs optimization",
        ],
        fallback_probes=[
            "What is the most direct brute-force approach that comes to mind, and what would its asymptotic time and space complexity look like?",
            "What is the core bottleneck in this naive solution that causes unnecessary repeated work?",
        ],
    ),
    MilestoneDefinition(
        id="algorithmic_optimization",
        title="Algorithmic Optimization & Data Structures",
        description="Developing the optimal algorithmic approach, selecting appropriate data structures, and proving Big-O improvements.",
        core_competencies=["data_structure_selection", "algorithmic_optimization"],
        min_turns=2,
        max_turns=4,
        key_focus_areas=[
            "selecting optimal data structures (hash maps, heaps, two pointers, trees, graphs, DP)",
            "evaluating time vs space trade-offs during optimization",
            "exploring alternative approaches and identifying the theoretical lower bound",
        ],
        fallback_probes=[
            "Can we improve on the brute-force time complexity? What data structure or algorithmic technique allows us to achieve an optimal Big-O?",
            "How does this optimized approach trade off auxiliary space against execution time?",
        ],
    ),
    MilestoneDefinition(
        id="code_implementation_and_dryrun",
        title="Live Code Implementation & Dry-Running",
        description="Translating algorithmic reasoning into clean, modular production code in the workspace and dry-running test cases.",
        core_competencies=["code_quality", "implementation_correctness", "dry_running"],
        min_turns=2,
        max_turns=5,
        key_focus_areas=[
            "writing idiomatic, modular code in the selected language",
            "handling edge cases explicitly (empty collections, 1-element inputs, boundary bounds)",
            "dry-running execution step-by-step with sample inputs",
        ],
        fallback_probes=[
            "Your approach is clear. Let's write out the implementation in the coding editor. Aim for clean, idiomatic code with clear variable names.",
            "Could you walk me through your code line by line with an example input, tracking pointers and state variables?",
        ],
    ),
    MilestoneDefinition(
        id="complexity_verification_and_testing",
        title="Complexity Analysis & Boundary Verification",
        description="Rigorous Big-O time/space verification, edge-case testing, and discussing potential follow-up constraints.",
        core_competencies=["complexity_analysis", "edge_case_verification"],
        min_turns=1,
        max_turns=3,
        key_focus_areas=[
            "exact asymptotic time and space complexity analysis",
            "evaluating behavior under extreme input sizes and edge cases",
            "potential scaling modifications (e.g. streaming inputs or memory-constrained hardware)",
        ],
        fallback_probes=[
            "Now that the implementation is complete, what is the exact asymptotic time and auxiliary space complexity of your solution?",
            "What edge cases could stress or break this code (e.g. integer overflow, maximum recursion depth, duplicate elements), and how does the implementation handle them?",
        ],
    ),
]


# -----------------------------------------------------------------------------
# 2. SYSTEM DESIGN MILESTONES (Preserved 5-Milestone Architecture)
# -----------------------------------------------------------------------------
SYSTEM_DESIGN_MILESTONES = [
    MilestoneDefinition(
        id="requirements_and_scope",
        title="Requirements & Scope Framing",
        description="Clarifying scale, latency, throughput, consistency requirements, and API boundaries.",
        core_competencies=["scope_definition", "quantitative_estimation"],
        min_turns=2,
        max_turns=4,
        key_focus_areas=[
            "read/write throughput targets",
            "consistency requirements (strict vs eventual)",
            "availability vs partition tolerance trade-offs",
        ],
        fallback_probes=[
            "Before we dive into components, what write throughput and latency SLAs are we designing this system for?",
            "What specific consistency guarantees does the business require for data updates under network partitions?",
        ],
    ),
    MilestoneDefinition(
        id="high_level_architecture",
        title="High-Level Architecture & Data Flow",
        description="End-to-end service topology, API contracts, sync vs async boundaries.",
        core_competencies=["system_architecture", "api_design"],
        min_turns=2,
        max_turns=5,
        key_focus_areas=[
            "request ingress and gateway routing",
            "service decoupling and communication protocols",
            "primary database and cache separation",
        ],
        fallback_probes=[
            "Walk me through the complete path of a request from client ingress down to persistence.",
            "How do your backend services communicate—is the service orchestration synchronous or event-driven?",
        ],
    ),
    MilestoneDefinition(
        id="deep_dive_data_and_storage",
        title="Deep Dive: Storage, Sharding & Consensus",
        description="Data partitioning, replication topology, consensus protocols, and ledger idempotency.",
        core_competencies=["data_modeling", "distributed_transactions", "consensus"],
        min_turns=2,
        max_turns=5,
        key_focus_areas=[
            "partitioning key selection and hot-spot prevention",
            "dual-write mitigation and transactional outbox/saga orchestration",
            "consensus protocol and replication lag handling",
        ],
        fallback_probes=[
            "How do you partition data across database shards, and what shard key prevents hot-spot skew?",
            "If an update spans two different database shards, how do you guarantee atomicity without locking two-phase commit overhead?",
        ],
    ),
    MilestoneDefinition(
        id="fault_tolerance_and_scale",
        title="Fault Tolerance, Recovery & Scaling",
        description="Handling split-brain, network partitions, coordinator crashes, and high-contention resources.",
        core_competencies=["fault_tolerance", "reliability_engineering", "scalability"],
        min_turns=2,
        max_turns=5,
        key_focus_areas=[
            "handling network partitions between data centers",
            "service crash recovery and in-flight request idempotency",
            "hot resource contention and backpressure rate limiting",
        ],
        fallback_probes=[
            "What happens if node B drops offline right after node A commits its state update?",
            "For high-volume hot keys receiving thousands of concurrent writes per second, how do you prevent row-lock serialization bottlenecks?",
        ],
    ),
    MilestoneDefinition(
        id="operational_wrapup",
        title="Operational Trade-offs & Wrap-up",
        description="Evaluating operational complexity, failure blast radius, and retrospective trade-offs.",
        core_competencies=["operational_excellence", "trade_off_analysis"],
        min_turns=1,
        max_turns=3,
        key_focus_areas=[
            "observability, telemetry, and automated reconciliation daemons",
            "biggest single point of failure in the proposed design",
        ],
        fallback_probes=[
            "If you deployed this system tomorrow, where is the most dangerous single point of failure or operational blind spot?",
            "How do you continuously audit and reconcile data consistency asynchronously to detect silent anomalies?",
        ],
    ),
]


# -----------------------------------------------------------------------------
# 3. CORE CS MILESTONES
# -----------------------------------------------------------------------------
CORE_CS_MILESTONES = [
    MilestoneDefinition(
        id="os_internals_and_processes",
        title="OS Internals, Processes & Virtual Memory",
        description="Processes vs threads, virtual memory paging, CPU scheduling, and context-switching overhead.",
        core_competencies=["os_fundamentals", "memory_architecture"],
        min_turns=2,
        max_turns=4,
        key_focus_areas=[
            "process vs thread kernel representation and context switch cost",
            "virtual memory, page tables, TLB cache, and page fault mechanics",
            "user space vs kernel space transitions and system calls",
        ],
        fallback_probes=[
            "Can you explain the structural difference between a process and a thread at the kernel level, including address space separation and context-switching overhead?",
            "Walk me through how virtual memory translation works with multi-level page tables and what sequence occurs when a page fault happens.",
        ],
    ),
    MilestoneDefinition(
        id="networking_and_protocols",
        title="Networking, TCP/IP & Transport Protocols",
        description="TCP handshakes, flow control, congestion avoidance, HTTP/2 multiplexing, and HTTP/3 QUIC.",
        core_competencies=["networking_protocols", "transport_layer"],
        min_turns=2,
        max_turns=4,
        key_focus_areas=[
            "TCP 3-way handshake, teardown states, and flow control (sliding window)",
            "head-of-line blocking in TCP vs HTTP/2 multiplexing",
            "QUIC over UDP and zero-RTT connection establishment in HTTP/3",
        ],
        fallback_probes=[
            "Explain the TCP three-way handshake, flow control with sliding windows, and how TCP handles congestion vs head-of-line blocking.",
            "What architectural problems in HTTP/2 does HTTP/3 over QUIC solve, and how does it prevent transport-layer head-of-line blocking?",
        ],
    ),
    MilestoneDefinition(
        id="concurrency_and_synchronization",
        title="Concurrency, Synchronization & Race Conditions",
        description="Mutexes, semaphores, CAS primitives, memory models, and deadlock conditions.",
        core_competencies=["concurrency_primitives", "deadlock_prevention"],
        min_turns=2,
        max_turns=4,
        key_focus_areas=[
            "mutex vs spinlock vs counting semaphore vs atomic CAS",
            "deadlock Coffman conditions and prevention strategies (lock ordering)",
            "memory visibility, race conditions, and compare-and-swap (CAS) loops",
        ],
        fallback_probes=[
            "In concurrent programming, what is the difference between a mutex, a semaphore, and a lock-free atomic compare-and-swap (CAS) operation?",
            "What are the four necessary Coffman conditions for a deadlock, and how would you architect lock acquisition to mathematically eliminate deadlocks?",
        ],
    ),
    MilestoneDefinition(
        id="database_engine_internals",
        title="Database Internals, ACID & Storage Engines",
        description="ACID isolation anomalies, WAL durability, MVCC, B+ Trees vs LSM Trees.",
        core_competencies=["database_internals", "transaction_isolation"],
        min_turns=2,
        max_turns=4,
        key_focus_areas=[
            "ANSI SQL isolation levels (Read Committed, Repeatable Read, Serializable)",
            "MVCC multi-versioning mechanics and Write-Ahead Logging (WAL)",
            "B+ Tree vs LSM Tree trade-offs for write vs read amplification",
        ],
        fallback_probes=[
            "Explain the four SQL isolation levels and the specific anomalies (dirty reads, non-repeatable reads, phantom reads, write skew) each prevents.",
            "How does Write-Ahead Logging (WAL) combined with checkpointing guarantee durability (the D in ACID) across sudden server crashes?",
        ],
    ),
]


# -----------------------------------------------------------------------------
# 4. BEHAVIORAL MILESTONES (STAR Method & Engineering Leadership)
# -----------------------------------------------------------------------------
BEHAVIORAL_MILESTONES = [
    MilestoneDefinition(
        id="situation_and_task_context",
        title="Situation & Project Scope Framing",
        description="Framing specific project context, organizational stakes, complexity, and personal role ownership.",
        core_competencies=["situation_framing", "scope_ownership"],
        min_turns=1,
        max_turns=3,
        key_focus_areas=[
            "articulating specific organizational stakes and business context",
            "defining the candidate's exact personal scope vs team scope",
            "identifying core constraints, ambiguities, and delivery deadlines",
        ],
        fallback_probes=[
            "Tell me about a high-stakes technical initiative you led where requirements were ambiguous or changing. What was the exact situation and your personal responsibility?",
            "Why was this project critical to the organization, and what were the consequences of failure or delay?",
        ],
    ),
    MilestoneDefinition(
        id="action_and_decision_rationale",
        title="Concrete Actions & Technical Decision-Making",
        description="Probing exact actions taken, technical trade-offs weighed, and navigating ambiguity without hand-waving.",
        core_competencies=["ownership_and_agency", "decision_rationale"],
        min_turns=2,
        max_turns=4,
        key_focus_areas=[
            "concrete individual actions taken (what YOU did, not 'we')",
            "technical trade-offs evaluated under pressure",
            "de-risking architectural dependencies and driving team alignment",
        ],
        fallback_probes=[
            "Walk me through a pivotal technical decision you personally made on that project. What trade-offs did you evaluate, and who did you have to convince?",
            "When faced with incomplete data or conflicting opinions, what concrete framework did you use to make the call?",
        ],
    ),
    MilestoneDefinition(
        id="conflict_and_crisis_handling",
        title="Conflict Resolution & Crisis Management",
        description="Handling strong technical disagreements, production outages, pushback, and cross-functional friction.",
        core_competencies=["conflict_resolution", "crisis_handling"],
        min_turns=2,
        max_turns=4,
        key_focus_areas=[
            "navigating architectural disagreements with peers or leadership",
            "resolving cross-functional friction (product vs engineering)",
            "leading through sudden production outages or catastrophic blockers",
        ],
        fallback_probes=[
            "Tell me about a strong technical disagreement you had with a senior engineer or architect. How did you navigate the impasse while keeping momentum?",
            "When a critical production bug or delivery blocker threatened your milestone, what was your immediate incident response?",
        ],
    ),
    MilestoneDefinition(
        id="results_and_retrospective_learning",
        title="Outcomes, Impact & Retrospective Reflection",
        description="Measurable business/technical impact, self-reflection, mistakes made, and continuous growth.",
        core_competencies=["business_impact", "retrospective_growth"],
        min_turns=1,
        max_turns=3,
        key_focus_areas=[
            "quantifying technical and business metrics (latency, reliability, cost, revenue)",
            "honest self-critique of mistakes or architectural regrets",
            "lessons learned and how they changed future engineering practices",
        ],
        fallback_probes=[
            "What was the measurable outcome of that project—both in technical metrics (latency, throughput, error rates) and business impact?",
            "Looking back with hindsight, what is one major mistake or misjudgment you made, and what would you do differently today?",
        ],
    ),
]


# -----------------------------------------------------------------------------
# 5. RESUME TECHNICAL MILESTONES
# -----------------------------------------------------------------------------
RESUME_MILESTONES = [
    MilestoneDefinition(
        id="resume_project_deep_dive",
        title="Resume Project Architecture Deep Dive",
        description="Probing specific systems and projects detailed on candidate's uploaded resume.",
        core_competencies=["system_architecture", "resume_authenticity"],
        min_turns=2,
        max_turns=4,
        key_focus_areas=[
            "architecture and design decisions of core resume projects",
            "verifying concrete implementation details vs high-level buzzwords",
        ],
        fallback_probes=[
            "I see the flagship system listed on your resume. Walk me through its end-to-end architecture and your specific contributions.",
        ],
    ),
    MilestoneDefinition(
        id="technical_depth_and_claims",
        title="Validating Technical Depth & Claims",
        description="Validating data consistency, scaling claims, and technology choices from resume projects.",
        core_competencies=["technical_depth", "data_consistency"],
        min_turns=2,
        max_turns=4,
        key_focus_areas=[
            "validating specific scale and throughput claims",
            "exploring why specific databases or message queues were chosen over alternatives",
        ],
        fallback_probes=[
            "On your resume you mention handling high traffic with low latency. What was your database partitioning and caching topology to achieve that?",
        ],
    ),
    MilestoneDefinition(
        id="past_struggles_and_recovery",
        title="Past Weak Spot & Production Incident Review",
        description="Probing past struggle areas, edge cases, and production incident recovery.",
        core_competencies=["incident_recovery", "resilience"],
        min_turns=2,
        max_turns=4,
        key_focus_areas=[
            "debugging production outages and post-mortems",
            "recovering from partial failure modes and distributed inconsistencies",
        ],
        fallback_probes=[
            "What was the most challenging production outage or edge-case bug you encountered in that system, and how did you resolve it?",
        ],
    ),
    MilestoneDefinition(
        id="scale_and_production_tradeoffs",
        title="Scale Trade-offs & Retrospective",
        description="Evaluating system evolution, bottlenecks under 10x traffic, and architectural trade-offs.",
        core_competencies=["trade_off_analysis", "scalability"],
        min_turns=1,
        max_turns=3,
        key_focus_areas=[
            "identifying scaling bottlenecks under 10x traffic",
            "retrospective architectural decisions the candidate would change",
        ],
        fallback_probes=[
            "If that system's traffic grew by 10x overnight, where would it break first, and how would you re-architect it?",
        ],
    ),
]


# -----------------------------------------------------------------------------
# 6. STAFF LEADERSHIP MILESTONES
# -----------------------------------------------------------------------------
STAFF_LEADERSHIP_MILESTONES = [
    MilestoneDefinition(
        id="strategic_context_and_rfc",
        title="Strategic Context & RFC Proposal",
        description="Framing multi-quarter architectural strategy, writing RFCs, and building technical consensus.",
        core_competencies=["strategic_vision", "rfc_craft"],
        min_turns=2,
        max_turns=4,
        key_focus_areas=[
            "aligning technical architecture with company business goals",
            "structuring technical RFCs to de-risk high-stakes decisions",
        ],
        fallback_probes=[
            "As a Staff+ engineer, how do you evaluate when a legacy architecture requires a complete multi-quarter overhaul versus incremental refactoring?",
        ],
    ),
    MilestoneDefinition(
        id="stakeholder_friction_and_pushback",
        title="Stakeholder Alignment & Handling Pushback",
        description="Navigating pushback from principal engineers, product executives, and cross-functional partners.",
        core_competencies=["stakeholder_influence", "conflict_negotiation"],
        min_turns=2,
        max_turns=4,
        key_focus_areas=[
            "resolving divergence with other senior technical leaders",
            "translating technical risks into business impact for executive stakeholders",
        ],
        fallback_probes=[
            "When another Staff engineer strongly opposes your proposed architecture, how do you resolve the disagreement objectively?",
        ],
    ),
    MilestoneDefinition(
        id="governance_and_long_term_ownership",
        title="Engineering Standards & Long-Term Governance",
        description="Setting engineering standards, elevating team rigor, mentoring seniors, and operational excellence.",
        core_competencies=["engineering_standards", "mentorship"],
        min_turns=1,
        max_turns=3,
        key_focus_areas=[
            "establishing bar-raising architectural and operational standards across teams",
            "mentoring senior engineers into staff leadership roles",
        ],
        fallback_probes=[
            "How do you institutionalize engineering excellence, operational reviews, and architectural consistency across multiple autonomous teams?",
        ],
    ),
]


# -----------------------------------------------------------------------------
# TRACK NORMALIZATION AND MAPPING — CANONICAL FIVE-TRACK REGISTRY
# -----------------------------------------------------------------------------

ACTIVE_CANONICAL_TRACKS: list[str] = [
    "DSA",
    "System Design",
    "Core CS",
    "Behavioral",
    "Resume Technical",
]

HISTORICAL_TRACKS: list[str] = [
    "Staff Leadership",
    "JD Match",
]

TRACK_MILESTONES: dict[str, list[MilestoneDefinition]] = {
    "DSA": DSA_MILESTONES,
    "System Design": SYSTEM_DESIGN_MILESTONES,
    "Core CS": CORE_CS_MILESTONES,
    "Behavioral": BEHAVIORAL_MILESTONES,
    "Resume Technical": RESUME_MILESTONES,
    # Preserved exclusively for historical sessions and legacy report rendering:
    "Staff Leadership": STAFF_LEADERSHIP_MILESTONES,
    "JD Match": SYSTEM_DESIGN_MILESTONES,
}

ACTIVE_TRACK_ALIASES: dict[str, str] = {
    "dsa": "DSA",
    "dsa & problem solving": "DSA",
    "algorithms": "DSA",
    "algorithms & coding": "DSA",
    "coding": "DSA",
    "system-design": "System Design",
    "system_design": "System Design",
    "system design": "System Design",
    "distributed systems": "System Design",
    "distributed-systems": "System Design",
    "distributed_systems": "System Design",
    "cs-fundamentals": "Core CS",
    "cs_fundamentals": "Core CS",
    "cs fundamentals": "Core CS",
    "core cs": "Core CS",
    "core-cs": "Core CS",
    "core_cs": "Core CS",
    "os & networks": "Core CS",
    "behavioral": "Behavioral",
    "behavioral & leadership": "Behavioral",
    "behavioral_leadership": "Behavioral",
    "star method": "Behavioral",
    "leadership": "Behavioral",
    "resume": "Resume Technical",
    "resume technical": "Resume Technical",
    "resume_technical": "Resume Technical",
    "profile grounded": "Resume Technical",
}

HISTORICAL_TRACK_ALIASES: dict[str, str] = {
    "staff-leadership": "Staff Leadership",
    "staff_leadership": "Staff Leadership",
    "staff leadership": "Staff Leadership",
    "staff+ engineering leadership": "Staff Leadership",
    "staff+ leadership": "Staff Leadership",
    "jd-match": "JD Match",
    "jd_match": "JD Match",
    "jd match": "JD Match",
    "target role & jd calibrated": "JD Match",
}


def normalize_track(raw_track: str, allow_historical: bool = False) -> str:
    """Deterministically normalizes raw track identifiers into canonical track names.
    
    If allow_historical is False (default):
    - Staff+ Leadership is explicitly rejected with an actionable unsupported track error.
    - Only the 5 active canonical tracks are accepted.
    
    If allow_historical is True (used when querying/evaluating existing historical records):
    - Historical tracks are recognized so existing historical sessions can still be displayed.
    """
    if not raw_track:
        raise ValueError("Interview track cannot be empty.")
    
    cleaned = raw_track.strip().lower()

    # Explicit rejection for discontinued Staff+ Leadership track
    if cleaned in HISTORICAL_TRACK_ALIASES or cleaned in [t.lower() for t in HISTORICAL_TRACKS]:
        if not allow_historical:
            raise ValueError(
                f"Track '{raw_track}' is no longer a supported active interview track. "
                f"The active product supports exactly five tracks: {', '.join(ACTIVE_CANONICAL_TRACKS)}."
            )
        return HISTORICAL_TRACK_ALIASES.get(cleaned, raw_track)

    if cleaned in ACTIVE_TRACK_ALIASES:
        return ACTIVE_TRACK_ALIASES[cleaned]
    
    # Check exact match in active canonical tracks
    for canonical in ACTIVE_CANONICAL_TRACKS:
        if canonical.lower() == cleaned:
            return canonical
            
    raise ValueError(
        f"Unsupported interview track: '{raw_track}'. Supported active tracks are: "
        f"{', '.join(ACTIVE_CANONICAL_TRACKS)}."
    )


def get_milestones_for_track(track: str) -> list[MilestoneDefinition]:
    """Retrieves deterministic milestone progression for the normalized interview track."""
    canonical_track = normalize_track(track, allow_historical=True)
    if canonical_track not in TRACK_MILESTONES:
        raise ValueError(f"No milestone definitions configured for track: {canonical_track}")
    return TRACK_MILESTONES[canonical_track]


def get_milestone_by_id(track: str, milestone_id: str) -> MilestoneDefinition | None:
    """Finds a milestone definition by ID within the track's progression."""
    for m in get_milestones_for_track(track):
        if m.id == milestone_id:
            return m
    return None
