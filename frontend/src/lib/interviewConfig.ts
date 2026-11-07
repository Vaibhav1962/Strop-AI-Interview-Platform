import { getCurrentUserId } from "./api";

export type ActiveInterviewTypeId =
  | "dsa"
  | "system-design"
  | "cs-fundamentals"
  | "behavioral"
  | "resume";

export type HistoricalInterviewTypeId =
  | "staff-leadership"
  | "jd-match";

export type InterviewTypeId = ActiveInterviewTypeId | HistoricalInterviewTypeId;

export interface InterviewTypeInfo {
  id: InterviewTypeId;
  title: string;
  badge: string;
  icon: string;
  tagline: string;
  description: string;
  defaultTopics: string[];
}

export const INTERVIEW_TYPES: InterviewTypeInfo[] = [
  {
    id: "dsa",
    title: "DSA & Problem Solving",
    badge: "Algorithms & Coding",
    icon: "dsa",
    tagline: "Data structures, algorithmic complexity, interactive cross-questioning & coding",
    description:
      "Discuss and justify your approach to an algorithmic challenge, explore edge cases, and transition into writing and verifying code against test suites.",
    defaultTopics: [
      "Algorithmic Formulation: Problem breakdown, intuition, and data structure selection",
      "Complexity & Edge Cases: Analyzing Big-O space-time tradeoffs and boundary conditions",
      "Live Implementation: Writing clean, modular production code with language selection",
      "Verification & Test Coverage: Validating solution correctness against visible and hidden test cases",
    ],
  },
  {
    id: "system-design",
    title: "System Design",
    badge: "Distributed Systems",
    icon: "system",
    tagline: "Architect large-scale distributed architectures and storage pipelines",
    description:
      "Design resilient, high-throughput systems covering load balancing, data sharding, caching topologies, and CAP theorem tradeoffs under extreme load.",
    defaultTopics: [
      "High-Scale Architecture: Load balancing, stateless API tiers, and horizontal scaling strategies",
      "Storage & Partitioning: Sharding strategies, LSM trees vs B-trees, and database replication lag",
      "Distributed Caching: Redis cluster topologies, invalidation patterns, and stampede prevention",
      "Resiliency & Disaster Recovery: Circuit breakers, rate limiting, and zero-downtime failover",
    ],
  },
  {
    id: "cs-fundamentals",
    title: "Core CS",
    badge: "OS & Networks",
    icon: "cs",
    tagline: "Operating systems, network protocols, concurrency, and database engines",
    description:
      "Drill down on kernel execution, virtual memory paging, TCP/IP flow control, ACID transaction isolation anomalies, and multithreading primitives.",
    defaultTopics: [
      "OS Internals: Process vs thread scheduling, context switching overhead, and virtual memory paging",
      "Computer Networking: TCP handshake, flow control, head-of-line blocking, and HTTP/2 vs HTTP/3",
      "Concurrency Models: Mutexes, semaphores, atomic CAS operations, and deadlock prevention",
      "Database Internals: ACID guarantees, isolation anomalies, MVCC, and write-ahead logging (WAL)",
    ],
  },
  {
    id: "behavioral",
    title: "Behavioral",
    badge: "STAR Method",
    icon: "behavioral",
    tagline: "Engineering leadership, ownership, conflict resolution, and crisis handling",
    description:
      "Structured behavioral interview using the STAR method to evaluate cross-functional collaboration, architectural disagreements, and delivery under ambiguity.",
    defaultTopics: [
      "Critical Crisis Management: Leading through a catastrophic production outage or high-stakes blocker",
      "Architectural Disagreements: Navigating strong technical divergence with senior engineers or stakeholders",
      "Ownership & Ambiguity: Delivering a mission-critical initiative with incomplete requirements and tight deadlines",
      "Mentorship & Engineering Standards: Elevating code quality, operational rigor, and team technical excellence",
    ],
  },
  {
    id: "resume",
    title: "Resume Technical",
    badge: "Profile Grounded",
    icon: "resume",
    tagline: "Tailored directly to the projects and technologies on your resume",
    description:
      "Deep dive into the architecture, technical choices, and trade-offs of the actual projects detailed on your uploaded resume.",
    defaultTopics: [
      "System Architecture: Deep dive into systems and projects detailed on your resume",
      "Technical Depth: Validating architecture choices, data consistency, and edge-case handling",
      "Architecture & Trade-offs: Probing design choices, performance trade-offs, and failure modes",
      "Reliability & Debugging: Identifying bottlenecks, edge cases, and scaling limits",
    ],
  },
];

export const HISTORICAL_INTERVIEW_TYPES: InterviewTypeInfo[] = [
  {
    id: "staff-leadership",
    title: "Staff+ Engineering Leadership",
    badge: "Staff / Principal",
    icon: "staff-leadership",
    tagline: "Cross-team architectural influence, RFC governance, multi-quarter technical strategy",
    description:
      "High-level technical stewardship evaluating multi-org alignment, setting technical vision across ambiguous constraints, mentoring staff engineers, and decommissioning legacy monoliths.",
    defaultTopics: [
      "Cross-Team RFC Governance: Establishing engineering consensus and architectural decision records across disagreeing teams",
      "Multi-Quarter Tech Strategy: Driving complex technical roadmaps from conceptual ambiguity to phased multi-tier rollout",
      "Legacy Decommissioning & Migration: Zero-downtime deprecation of mission-critical core engines under live production traffic",
      "Executive Alignment & Business Tradeoffs: Translating technical debt and infrastructure investments to C-level stakeholders",
    ],
  },
  {
    id: "jd-match",
    title: "Target Role & JD Calibrated",
    badge: "Role Targeted",
    icon: "jd-match",
    tagline: "Dynamic interview calibrated to your target company, seniority, and specific job description",
    description:
      "Simulate a company-calibrated technical panel aligned with target competencies, tech stack requirements, and domain architecture for your target role.",
    defaultTopics: [
      "Core Role Competencies: Deep-dive into technical must-haves and framework mastery matching the target job description",
      "Domain Architecture: Designing systems and data flows specific to the target company's business model and scale",
      "Production Pitfalls: Troubleshooting failure modes, race conditions, and scaling bottlenecks relevant to the target role",
      "Cultural & Operational Alignment: Demonstrating ownership, on-call maturity, and engineering excellence expected at target company",
    ],
  },
];

// ============================================================================
// SYSTEM DESIGN ARCHETYPES & CHAOS DISRUPTION RESERVOIR
// ============================================================================

export interface ChaosDisruptionEvent {
  id: string;
  triggerMinute: number;
  title: string;
  description: string;
  interviewerInjectionPrompt: string;
  expectedCandidateActions: string[];
}

export interface SystemDesignScenario {
  id: string;
  title: string;
  archetype:
    | "financial-ledger"
    | "realtime-geo"
    | "streaming"
    | "content-feed"
    | "distributed-infra";
  scaleRequirements: {
    qps: string;
    readWriteRatio: string;
    storageGrowth: string;
    latencySLA: string;
    availability: string;
  };
  functionalRequirements: string[];
  nonFunctionalRequirements: string[];
  coreTradeoffs: string[];
  recommendedComponents: string[];
  chaosEvents: ChaosDisruptionEvent[];
}

export const SYSTEM_DESIGN_SCENARIOS: SystemDesignScenario[] = [
  {
    id: "fin-ledger",
    title: "Double-Entry Financial Ledger & Settlement Engine",
    archetype: "financial-ledger",
    scaleRequirements: {
      qps: "15,000 transactions/sec peak",
      readWriteRatio: "1:1 read to write",
      storageGrowth: "5 TB / month immutable ledger logs",
      latencySLA: "p99 < 120ms settlement confirmation",
      availability: "99.999% (Strict linearizability, zero balance drift)",
    },
    functionalRequirements: [
      "Maintain double-entry accounting where every debit matches an equal credit across accounts",
      "Support atomic wallet balance transfers without dirty reads or double-spends",
      "Provide deterministic audit trail with cryptographically verifiable sequence numbers",
      "Execute multi-currency conversion with real-time exchange rate locks",
    ],
    nonFunctionalRequirements: [
      "Strict serializability or two-phase commit across account shards",
      "Zero penny leakage under database partition or sudden node failure",
      "Idempotent API execution with unique transaction UUIDs",
    ],
    coreTradeoffs: [
      "Two-Phase Commit (2PC) vs Saga Orchestration with compensating transactions",
      "Pessimistic row-level locking vs Optimistic Concurrency Control (OCC) with version tags",
      "Synchronous replication for write durability vs asynchronous replica read latency",
    ],
    recommendedComponents: [
      "PostgreSQL with strict SERIALIZABLE isolation / CockroachDB",
      "Kafka event log for immutable financial journal streams",
      "Redis Cluster for idempotency key caching and fast balance pre-checks",
      "Distributed lock manager (Redlock / ZooKeeper) for high-frequency account locks",
    ],
    chaosEvents: [
      {
        id: "fin-chaos-partition",
        triggerMinute: 12,
        title: "Primary DB Crash Mid-Two-Phase Commit",
        description:
          "The primary ledger database partition crashes while holding prepared locks on 10,000 active settlement transactions.",
        interviewerInjectionPrompt:
          "Let's throw a production wrench in: your primary database partition crashes precisely between the prepare and commit phase of a two-phase commit across accounts. 10,000 transactions are left in an in-doubt state, and user balances are locked. How does your recovery coordinator resolve this without causing double credits or holding locks indefinitely?",
        expectedCandidateActions: [
          "Explain transaction coordinator recovery log parsing",
          "Identify how participants query coordinator state or timeout to abort/commit safely",
          "Discuss idempotent compensations in a Saga architecture if 2PC was avoided",
        ],
      },
      {
        id: "fin-chaos-double-spend",
        triggerMinute: 22,
        title: "Flash Concurrency Double-Spend Attack",
        description:
          "A malicious actor triggers 50 simultaneous transfer requests for the same $500 balance within a 3ms window across geographically distributed gateways.",
        interviewerInjectionPrompt:
          "Security alerts trigger: an account with $500 sends 50 concurrent $500 withdrawal requests within 3 milliseconds routed through different regional API gateways. How does your idempotency layer and account locking guarantee exactly one withdrawal succeeds and 49 are rejected?",
        expectedCandidateActions: [
          "Validate idempotency key uniqueness constraints at database layer",
          "Discuss conditional balance update: `UPDATE accounts SET balance = balance - 500 WHERE id = ? AND balance >= 500`",
          "Evaluate Redis distributed lock or single-partition sequencing per account ID",
        ],
      },
    ],
  },
  {
    id: "realtime-geo",
    title: "Real-Time Driver Dispatch & Spatial Geolocation Tracking",
    archetype: "realtime-geo",
    scaleRequirements: {
      qps: "660,000 GPS pings/sec (2M active drivers every 3 seconds)",
      readWriteRatio: "10:1 (riders polling nearby drivers)",
      storageGrowth: "12 TB / day GPS history streams",
      latencySLA: "p99 < 50ms geospatial radius search",
      availability: "99.99% multi-region resilient",
    },
    functionalRequirements: [
      "Ingest high-frequency GPS coordinate pings from millions of mobile drivers",
      "Query top-k nearest available drivers within a 5 km radius of a rider",
      "Stream continuous location updates to matched riders with sub-second lag",
      "Calculate dynamic ETA routes based on real-time traffic speeds",
    ],
    nonFunctionalRequirements: [
      "In-memory spatial index with sub-50ms neighbor search",
      "Partitioning by spatial grids (Uber H3 hexagons or Google S2 cells)",
      "Zero packet loss of active billing state during cellular handoffs",
    ],
    coreTradeoffs: [
      "Quadtree vs Uber H3 hexagonal hierarchical spatial index",
      "WebSocket persistent connections vs HTTP/2 Server-Sent Events (SSE) for driver telemetry",
      "Write-heavy spatial updates directly in Redis vs batching via Kafka queue",
    ],
    recommendedComponents: [
      "Uber H3 / Google S2 geospatial library",
      "Redis Cluster with Geo commands (GEOADD, GEORADIUS) or ScyllaDB spatial",
      "Netty / Go WebSocket gateway servers with Epoll event loops",
      "Kafka partitioned by H3 index level 7 for location telemetry stream",
    ],
    chaosEvents: [
      {
        id: "geo-chaos-stadium-surge",
        triggerMinute: 15,
        title: "Stadium Flash Crowd Spatial Hot-Spot",
        description:
          "80,000 fans leave a stadium simultaneously, concentrating 25,000 rider search requests into a single spatial cell within 60 seconds.",
        interviewerInjectionPrompt:
          "A massive concert just ended: 25,000 riders open their apps inside the exact same 500-meter hexagonal cell within 60 seconds. The Redis shard responsible for that spatial cell's GEO index CPU spikes to 100% and begins dropping connections. How do you prevent this localized hotspot from taking down your entire dispatch platform?",
        expectedCandidateActions: [
          "Decouple read searches from write GPS updates via read-replicas with sub-second replication",
          "Implement adaptive spatial cell resolution: dynamically coarse-grain hot cells into sub-cells",
          "Apply rate limiting and client-side poll interval backoffs (jitter)",
        ],
      },
      {
        id: "geo-chaos-out-of-order",
        triggerMinute: 24,
        title: "Cellular UDP Reordering & GPS Drift",
        description:
          "Tunnel cellular handoffs cause driver GPS pings to arrive out of chronological order, causing drivers to appear to teleport backwards.",
        interviewerInjectionPrompt:
          "Drivers traversing city tunnels experience packet delays where pings from 10 seconds ago arrive AFTER the latest ping. Rider maps show cars jumping backwards across intersections. How does your ingestion pipeline filter out-of-order telemetry and reject GPS multipath drift?",
        expectedCandidateActions: [
          "Enforce monotonic client timestamp checking with max allowable drift window",
          "Apply Kalman filtering for trajectory and speed smoothing",
          "Discard pings whose required velocity exceeds physical automobile limits (e.g. > 150 km/h jump)",
        ],
      },
    ],
  },
  {
    id: "video-streaming",
    title: "Global Video-on-Demand & Live Streaming CDN Pipeline",
    archetype: "streaming",
    scaleRequirements: {
      qps: "50 Million concurrent streams; 400 Gbps origin egress",
      readWriteRatio: "1000:1 read heavy",
      storageGrowth: "50 TB / day transcoded video chunks",
      latencySLA: "p99 playback startup < 800ms; sub-2s live stream latency",
      availability: "99.999% global CDN availability",
    },
    functionalRequirements: [
      "Upload video source files and transcode into multiple resolutions (1080p, 720p, 480p) via HLS/DASH",
      "Adaptive Bitrate Streaming (ABR) adjusting chunk quality dynamically to viewer bandwidth",
      "Global low-latency delivery across multi-CDN architectures",
      "Track precise viewing watch-time analytics and resume playback state",
    ],
    nonFunctionalRequirements: [
      "95%+ CDN edge cache hit ratio to protect origin infrastructure",
      "Resilient video segmentation into 2-to-6 second TS/M4S media chunks",
      "DRM encryption keys (FairPlay / Widevine) delivered securely",
    ],
    coreTradeoffs: [
      "HLS (HTTP Live Streaming) vs CMAF (Common Media Application Format) chunk duration",
      "Single CDN vendor vs Multi-CDN dynamic DNS routing (Cedexis / Route53)",
      "Pre-transcoding all bitrates upfront vs Just-In-Time (JIT) packaging at edge",
    ],
    recommendedComponents: [
      "AWS S3 / GCS multi-region object storage for chunk storage",
      "Distributed transcoding worker pool using FFmpeg on spot GPU instances",
      "Multi-tier CDN hierarchy (Edge POP -> Regional Shield -> Origin Shield)",
      "Cassandra / DynamoDB for low-latency playback watch marker state",
    ],
    chaosEvents: [
      {
        id: "streaming-chaos-cache-miss",
        triggerMinute: 14,
        title: "Edge CDN Invalidation Stampede",
        description:
          "A misconfigured cache header causes a 65% cache miss spike at edge POPs, directing 80 Gbps of chunk requests directly to origin storage.",
        interviewerInjectionPrompt:
          "During the season finale of your flagship show, a misconfigured cache-control header causes edge CDNs to flush cached manifest files. 65% of all chunk requests punch straight through to origin storage, causing origin S3 buckets to throttle with 503 SlowDown errors. How do you protect the origin from collapse and restore edge caching in seconds?",
        expectedCandidateActions: [
          "Introduce Origin Shielding (Regional intermediate CDN proxy layer) with request collapsing (coalescing)",
          "Enable stale-while-revalidate and stale-if-error cache headers",
          "Implement token-bucket rate limiting at ingress shields",
        ],
      },
    ],
  },
  {
    id: "content-feed",
    title: "Global Feed Aggregation & Fan-Out Timeline Engine",
    archetype: "content-feed",
    scaleRequirements: {
      qps: "80,000 post creations/sec; 600,000 feed read requests/sec",
      readWriteRatio: "8:1 read to write",
      storageGrowth: "15 TB / day post metadata and social graph edges",
      latencySLA: "p99 feed load < 100ms",
      availability: "99.99%",
    },
    functionalRequirements: [
      "Publish text, image, and video posts to a user's follower graph",
      "Generate personalized chronological and ranked feeds for 300M daily active users",
      "Handle celebrity accounts with over 100 million followers without write starvation",
      "Support real-time like and comment count counters with eventual consistency",
    ],
    nonFunctionalRequirements: [
      "Sub-100ms feed fetch latency across worldwide regions",
      "Zero-downtime social graph partitioning",
      "Graceful degradation to cached feeds during backend latency spikes",
    ],
    coreTradeoffs: [
      "Fan-out on Write (Push model) vs Fan-out on Read (Pull model) vs Hybrid model",
      "Redis sorted sets for user timeline cache vs memory footprint costs",
      "Relational DB graph queries vs Distributed Graph Database (Neo4j / TAO)",
    ],
    recommendedComponents: [
      "Redis Cluster with ZSET (score = timestamp/rank, value = post_id)",
      "Kafka / RabbitMQ fan-out asynchronous worker pool",
      "Document store (Cassandra / MongoDB) for post contents",
      "Bloom filters for seen-post deduplication",
    ],
    chaosEvents: [
      {
        id: "feed-chaos-celebrity-push",
        triggerMinute: 16,
        title: "Celebrity 100M-Follower Fan-out Queue Explosion",
        description:
          "A global celebrity with 110M followers publishes breaking news. The fan-out on write worker queue spikes to 90 million backlogged messages.",
        interviewerInjectionPrompt:
          "A celebrity with 110 million followers posts breaking news. If your system pushes this post to all follower timelines, your fan-out message queues will backlog for 40 minutes, delaying normal users' posts. How does your feed architecture elegantly handle celebrity accounts without queue starvation?",
        expectedCandidateActions: [
          "Detail a Hybrid Fan-out model: standard users use Push (fan-out on write); celebrities use Pull (fan-out on read)",
          "When a normal user opens their feed, pull the celebrity's recent posts and merge them on-the-fly with the user's cached timeline",
          "Apply tiered worker queue priorities so celebrity broadcasts do not block standard user updates",
        ],
      },
    ],
  },
  {
    id: "distributed-infra",
    title: "Distributed Key-Value Store with Quorum Consensus",
    archetype: "distributed-infra",
    scaleRequirements: {
      qps: "1.2 Million ops/sec distributed across 100 nodes",
      readWriteRatio: "3:1 read to write",
      storageGrowth: "100 TB raw state storage",
      latencySLA: "p99 write < 10ms; p99 read < 5ms",
      availability: "99.999% across 3 availability zones",
    },
    functionalRequirements: [
      "Provide get(key) and put(key, value) with tunable consistency levels",
      "Distribute data across nodes via consistent hashing with virtual nodes",
      "Support multi-datacenter cross-region asynchronous replication",
      "Execute automatic node failover and leader election via Raft consensus",
    ],
    nonFunctionalRequirements: [
      "Tunable CAP theorem tradeoffs (R + W > N quorum consistency)",
      "LSM-tree storage engine for high-throughput sequential disk writes",
      "Gossip protocol for decentralized cluster membership and failure detection",
    ],
    coreTradeoffs: [
      "Consistent Hashing with Virtual Nodes vs Centralized Metadata Service (Google Chubby/etcd)",
      "LSM-Tree (Log-Structured Merge-tree) vs B+ Tree for write vs read amplification",
      "Sloppy Quorum with Hinted Handoff vs Strict Quorum",
    ],
    recommendedComponents: [
      "Raft consensus protocol for leader election",
      "LSM-Tree (MemTable + Write-Ahead Log + SSTables with Bloom filters)",
      "Consistent Hash Ring with 256 virtual nodes per physical host",
      "Gossip protocol (SWIM algorithm) for node health checks",
    ],
    chaosEvents: [
      {
        id: "infra-chaos-split-brain",
        triggerMinute: 18,
        title: "Network Partition Split-Brain in Consensus Quorum",
        description:
          "A cross-rack switch failure isolates 2 out of 5 consensus nodes, leaving minority and majority partitions.",
        interviewerInjectionPrompt:
          "A core rack switch dies, splitting your 5-node consensus group into a 2-node partition and a 3-node partition. Clients in Region B are still sending writes to the 2-node partition. How does your consensus protocol prevent split-brain writes, and what error or behavior do clients in Region B observe?",
        expectedCandidateActions: [
          "Explain majority quorum requirement: majority = floor(N/2) + 1 = 3 nodes required to commit writes",
          "Demonstrate that the 2-node minority cannot achieve quorum and must reject or queue writes",
          "Explain how lease-read timers prevent stale reads on the old partitioned leader",
        ],
      },
    ],
  },
];

// ============================================================================
// BEHAVIORAL STAR COMPETENCY RESERVOIR
// ============================================================================

export interface BehavioralCompetencyScenario {
  id: string;
  competency:
    | "outage-ownership"
    | "technical-disagreement"
    | "ambiguity"
    | "failure-reflection"
    | "code-quality"
    | "mentorship";
  title: string;
  prompt: string;
  socraticFollowups: string[];
  greenFlags: string[];
  redFlags: string[];
}

export const BEHAVIORAL_COMPETENCIES: BehavioralCompetencyScenario[] = [
  {
    id: "outage-ownership",
    competency: "outage-ownership",
    title: "Sev-1 Production Outage Ownership & Incident Command",
    prompt:
      "Tell me about a catastrophic production incident or Sev-1 outage where you took ownership. Walk me through how you diagnosed the root cause under high pressure, coordinated the mitigation, and instituted permanent prevention.",
    socraticFollowups: [
      "When your first hypothesis about the failure failed, how did you prevent panic and keep the debugging methodical?",
      "How did you balance the urgent pressure to rollback immediately versus capturing transient diagnostic state?",
      "What concrete architectural guardrail did you personally implement in the post-mortem to guarantee this failure mode cannot recur?",
    ],
    greenFlags: [
      "Maintained blameless post-mortem culture while taking personal accountability",
      "Clear metrics cited (MTTD, MTTR, customer impact numbers)",
      "Introduced automated systemic prevention (circuit breaker, canary gate, integration test) rather than 'better documentation'",
    ],
    redFlags: [
      "Blamed junior colleagues or external cloud vendors without systemic analysis",
      "Vague hand-wavy description of the actual technical root cause",
      "No lasting architectural improvements post-incident",
    ],
  },
  {
    id: "tech-disagreement",
    competency: "technical-disagreement",
    title: "Architectural Disagreement with Senior Engineers or Tech Lead",
    prompt:
      "Describe a situation where you had a deep technical disagreement with a senior architect, tech lead, or peer over a critical architectural decision. How did you advocate for your point of view, and how was the dispute resolved?",
    socraticFollowups: [
      "What empirical data, benchmarks, or prototypes did you introduce to elevate the conversation beyond subjective opinions?",
      "If the final decision went against your recommendation, how did you demonstrate disagree-and-commit to your team?",
      "Looking back with the benefit of hindsight, was the chosen approach the right one?",
    ],
    greenFlags: [
      "Relied on objective prototypes, benchmark numbers, and customer SLAs rather than ego",
      "Understood and articulated the opposing viewpoint with empathy and intellectual honesty",
      "Committed 100% to the chosen direction once decided",
    ],
    redFlags: [
      "Passive-aggressive resistance after being overruled",
      "Framed disagreement as personal victory/defeat rather than team outcome",
      "Unable to explain why the other party held their position",
    ],
  },
  {
    id: "ambiguity-execution",
    competency: "ambiguity",
    title: "Mission-Critical Delivery Under Extreme Ambiguity",
    prompt:
      "Tell me about a project you led that had ill-defined requirements, conflicting stakeholder goals, or high technical uncertainty. How did you structure the ambiguity, drive consensus, and deliver results on schedule?",
    socraticFollowups: [
      "How did you slice the problem into an MVP that validated key technical assumptions early?",
      "When stakeholders changed their priorities halfway through, how did you safeguard engineering momentum?",
      "What did you decide NOT to build, and how did you defend that de-scoping?",
    ],
    greenFlags: [
      "Proactively authored 1-pagers and design docs to force alignment",
      "De-risked high-uncertainty dependencies through rapid spike tests",
      "Comfortable operating without waiting for perfect guidance from management",
    ],
    redFlags: [
      "Paralyzed by lack of specifications; waited for someone else to write requirements",
      "Allowed scope creep to blow deadlines without pushback",
    ],
  },
  {
    id: "failure-reflection",
    competency: "failure-reflection",
    title: "Major Technical Failure or Architectural Misjudgment",
    prompt:
      "Walk me through a time when a technical decision or architecture you championed turned out to be wrong or caused serious issues in hindsight. What went wrong, when did you realize it, and what did you learn?",
    socraticFollowups: [
      "What was your earliest signal that the system wasn't scaling or behaving as anticipated?",
      "How did you communicate the mistake to leadership and affected teams without being defensive?",
      "How has that specific mistake shaped the architectural heuristics you rely on today?",
    ],
    greenFlags: [
      "Total intellectual honesty and zero defensiveness",
      "Reflective analysis of cognitive blind spots (e.g. premature optimization, over-engineering)",
      "Clear translation of failure into career wisdom and improved instincts",
    ],
    redFlags: [
      "Gave a trivial or humble-brag mistake ('I worked too hard' / 'I cared too much about quality')",
      "Blamed product managers or changing requirements for their own architectural misjudgment",
    ],
  },
  {
    id: "code-quality-techdebt",
    competency: "code-quality",
    title: "Advocating for Engineering Rigor vs Feature Pressure",
    prompt:
      "Tell me about a time when product pressure or impending release dates clashed with engineering standards, test coverage, or technical debt remediation. How did you navigate this tradeoff?",
    socraticFollowups: [
      "How did you quantify the cost of technical debt in business metrics (e.g. bug velocity, customer churn, deployment frequency)?",
      "What pragmatic compromise did you negotiate to deliver customer value without compromising long-term platform stability?",
    ],
    greenFlags: [
      "Tied technical health directly to business outcomes and team velocity",
      "Understood that shipping software involves pragmatic calculated debt, not dogmatic purity",
    ],
    redFlags: [
      "Either caved immediately to product pressure or behaved like an uncompromising purist who refused to ship",
    ],
  },
  {
    id: "mentorship-growth",
    competency: "mentorship",
    title: "Elevating Team Rigor & Mentoring Underperforming Engineers",
    prompt:
      "Describe a scenario where you mentored an engineer or elevated the technical capabilities of your team. How did you identify their growth areas, provide constructive feedback, and measure their progress?",
    socraticFollowups: [
      "How did you calibrate between helping them debug directly versus giving them space to learn through struggle?",
      "Where is that engineer today, and how did your mentorship affect the team's engineering culture?",
    ],
    greenFlags: [
      "Showed genuine investment in people development",
      "Provided specific frameworks and feedback rather than vague encouragement",
    ],
    redFlags: [
      "Micro-managed or wrote the code for them rather than teaching",
      "Treated mentorship as an annoying interruption to personal output",
    ],
  },
];

// ============================================================================
// STAFF+ ENGINEERING LEADERSHIP RESERVOIR
// ============================================================================

export interface StaffLeadershipScenario {
  id: string;
  dimension:
    | "rfc-governance"
    | "tech-strategy"
    | "legacy-decommissioning"
    | "executive-alignment";
  title: string;
  context: string;
  initialQuestion: string;
  pushbackScenarios: string[];
  evalCriteria: string[];
}

export const STAFF_LEADERSHIP_SCENARIOS: StaffLeadershipScenario[] = [
  {
    id: "staff-rfc-governance",
    dimension: "rfc-governance",
    title: "Cross-Team RFC Governance & Disputed Architectural Decisions",
    context:
      "Three separate product engineering teams want to build divergent event-streaming consumers. Team A wants Apache Flink for stateful stream joins, Team B wants simple Celery Python workers, and Team C wants Go goroutines reading Kafka directly. Technical disputes have stalled product launches for 6 weeks.",
    initialQuestion:
      "As a Staff Engineer brought in to resolve this cross-team stalemate, how do you structure the RFC process, establish evaluation criteria, and drive organizational consensus without acting like an authoritarian top-down dictator?",
    pushbackScenarios: [
      "Team A claims your proposed standardized framework will slow down their immediate Q3 OKRs and refuses to adopt it. How do you respond?",
      "What formal Architectural Decision Record (ADR) template do you institute to ensure future engineers understand the context and tradeoffs of this decision?",
      "When consensus cannot be achieved despite extensive debate, at what point and through what mechanism do you escalate to VP/CTO level?",
    ],
    evalCriteria: [
      "Uses Socratic facilitation and shared rubric rather than personal authority",
      "Balances short-term team velocity against company-wide infrastructure leverage",
      "Establishes clear decision deadlines with explicit 'disagree and commit' protocols",
    ],
  },
  {
    id: "staff-tech-strategy",
    dimension: "tech-strategy",
    title: "Multi-Quarter Technical Strategy & Platform Modernization",
    context:
      "Your company's revenue-critical transaction backend is an 8-year-old monolithic Ruby on Rails service. It causes 2 Sev-1 database lockouts per month, deployment takes 45 minutes, and hiring engineers willing to work on it is becoming difficult. Leadership wants to break it into microservices, but product cannot halt feature development.",
    initialQuestion:
      "How do you design and execute a 2-year technical migration strategy that decomposes this critical service into modern domain-driven services while maintaining continuous product delivery and zero customer downtime?",
    pushbackScenarios: [
      "Product managers complain that your platform migration will consume 40% of their sprint capacity for 4 quarters. How do you negotiate and structure this investment?",
      "How do you use the Strangler Fig pattern, dual-writes, and shadow traffic verification to prove zero regression before cutting over production reads?",
      "How do you prevent the team from falling into the trap of distributed monoliths where services share databases or have tight synchronous coupling?",
    ],
    evalCriteria: [
      "Pragmatic application of domain-driven design (bounded contexts)",
      "Clear risk management using incremental dark traffic and feature flags",
      "Ability to translate technical debt metrics into executive ROI and business velocity",
    ],
  },
  {
    id: "staff-legacy-decommissioning",
    dimension: "legacy-decommissioning",
    title: "Zero-Downtime Mission-Critical Core Engine Deprecation",
    context:
      "A 10-year-old legacy billing calculation engine is running in production with zero test coverage, authored by engineers who left the company 5 years ago. It handles $400M in annual recurring revenue. A new Go-based billing engine has been built, but previous cutover attempts resulted in subtle $100k billing discrepancies.",
    initialQuestion:
      "Walk me through your comprehensive engineering playbook for decommissioning this legacy core engine with mathematical certainty, zero revenue leakage, and seamless rollback capabilities.",
    pushbackScenarios: [
      "Shadow traffic reveals that 0.4% of edge-case corporate tax calculations differ between the old engine and the new engine. How do you systematically reconcile these differences?",
      "How do you design the automated circuit breaker that aborts cutover and falls back to legacy without losing transaction state?",
      "What is your ceremony and checklist for permanently deleting the old codebase and shutting down the legacy servers?",
    ],
    evalCriteria: [
      "Deep understanding of differential shadow testing (running both systems in parallel and comparing diffs)",
      "Defensive rollback automation",
      "Thorough reconciliation accounting and audit logging",
    ],
  },
  {
    id: "staff-executive-alignment",
    dimension: "executive-alignment",
    title: "Securing Multi-Million Dollar Infrastructure Investment from C-Level",
    context:
      "Your cloud infrastructure bill is growing at 3x the rate of company revenue due to unoptimized database tier overprovisioning and redundant multi-region replications. Remediation requires a $1.8M engineering investment over 6 months, shifting 15 senior engineers away from product features.",
    initialQuestion:
      "How do you build the business case and pitch this infrastructure investment to the CFO, VP of Product, and CEO who are skeptical about diverting resources away from customer-facing feature development?",
    pushbackScenarios: [
      "The CFO pushes back: 'Why can't we just buy reserved instances and keep shipping features?' How do you counter with unit economics?",
      "How do you structure milestones so leadership sees tangible ROI within the first 60 days rather than waiting 6 months?",
      "What operational dashboards and SLOs do you commit to as personal accountability for this initiative?",
    ],
    evalCriteria: [
      "Translates technical concepts (p99 latency, compute instances, IOPS) into financial metrics (COGS, gross margin, ARR)",
      "Designs incremental de-risked milestone deliverables",
      "Demonstrates high financial literacy and executive presence",
    ],
  },
];

// ============================================================================
// STORAGE & SELECTION HELPERS
// ============================================================================

function getInterviewTypeStorageKey(): string {
  const uid = getCurrentUserId();
  return uid ? `interviewiq_${uid}_selected_interview_type` : "interviewiq_selected_interview_type";
}

export function getSelectedInterviewType(): ActiveInterviewTypeId {
  if (typeof window === "undefined") return "dsa";
  const stored = localStorage.getItem(getInterviewTypeStorageKey()) as ActiveInterviewTypeId | null;
  if (stored && INTERVIEW_TYPES.some((t) => t.id === stored)) {
    return stored;
  }
  return "dsa";
}

export function setSelectedInterviewType(type: InterviewTypeId): void {
  if (typeof window === "undefined") return;
  // Only persist if it's one of the 5 canonical active interview types
  if (INTERVIEW_TYPES.some((t) => t.id === type)) {
    localStorage.setItem(getInterviewTypeStorageKey(), type);
  }
}

export function getInterviewTypeInfo(type: InterviewTypeId): InterviewTypeInfo {
  const active = INTERVIEW_TYPES.find((t) => t.id === type);
  if (active) return active;
  const historical = HISTORICAL_INTERVIEW_TYPES.find((t) => t.id === type);
  if (historical) return historical;
  return INTERVIEW_TYPES[0];
}

export function getInterviewTopicsForType(
  type: InterviewTypeId,
  customResumeTopics?: string[]
): string[] {
  if (type === "resume" && customResumeTopics && customResumeTopics.length > 0) {
    return customResumeTopics;
  }
  const info = getInterviewTypeInfo(type);
  return info.defaultTopics;
}

// ============================================================================
// DYNAMIC SCENARIO RETRIEVAL HELPERS
// ============================================================================

export function getScenariosForTrack(track: InterviewTypeId): any[] {
  switch (track) {
    case "system-design":
      return SYSTEM_DESIGN_SCENARIOS;
    case "behavioral":
      return BEHAVIORAL_COMPETENCIES;
    case "staff-leadership":
      return STAFF_LEADERSHIP_SCENARIOS;
    default:
      return [];
  }
}

export function getRandomScenarioForTrack(track: InterviewTypeId): any {
  const scenarios = getScenariosForTrack(track);
  if (!scenarios || scenarios.length === 0) return null;
  const idx = Math.floor(Math.random() * scenarios.length);
  return scenarios[idx];
}

export function getChaosEventsForScenario(scenarioId: string): ChaosDisruptionEvent[] {
  const scenario = SYSTEM_DESIGN_SCENARIOS.find((s) => s.id === scenarioId);
  return scenario ? scenario.chaosEvents : [];
}

export function getTrackAgenda(
  track: InterviewTypeId,
  context?: {
    targetRole?: string;
    targetCompany?: string;
    customTopics?: string[];
    scenarioId?: string;
  }
): string[] {
  if (track === "resume" && context?.customTopics && context.customTopics.length > 0) {
    return context.customTopics;
  }

  if (track === "system-design" && context?.scenarioId) {
    const sc = SYSTEM_DESIGN_SCENARIOS.find((s) => s.id === context.scenarioId);
    if (sc) {
      return [
        `Requirements & Scale: Architecting ${sc.title} (${sc.scaleRequirements.qps})`,
        `Data Storage & Partitioning: ${sc.coreTradeoffs[0]}`,
        `Chaos Disruption Event: ${sc.chaosEvents[0]?.title || "Failover Strategy"}`,
        `Resilience & Deep Dive: ${sc.nonFunctionalRequirements[0]}`,
      ];
    }
  }

  if (track === "staff-leadership" && context?.scenarioId) {
    const sc = STAFF_LEADERSHIP_SCENARIOS.find((s) => s.id === context.scenarioId);
    if (sc) {
      return [
        `Strategic Context: ${sc.title}`,
        `RFC Alignment & Tradeoffs: ${sc.initialQuestion.slice(0, 80)}...`,
        `Stakeholder Friction: ${sc.pushbackScenarios[0]?.slice(0, 80)}...`,
        `Execution Playbook & Long-Term Governance`,
      ];
    }
  }

  if (track === "jd-match") {
    const role = context?.targetRole || "Senior Staff Software Engineer";
    const company = context?.targetCompany || "Tier-1 Tech Company";
    return [
      `Target Role Alignment: Core competencies and expectations for ${role} at ${company}`,
      `Domain System Architecture: Designing mission-critical platforms matching ${company}'s scale`,
      `Production Failure Modes: Diagnosing bottlenecks, data races, and recovery protocols`,
      `Ownership & Culture: Demonstrating high-agency leadership expected at ${company}`,
    ];
  }

  return getInterviewTopicsForType(track, context?.customTopics);
}
