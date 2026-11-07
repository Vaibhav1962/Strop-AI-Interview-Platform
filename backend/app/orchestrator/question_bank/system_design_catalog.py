"""System Design Curated Scenario Catalog.
Total Scenarios: 56
"""

from typing import Any

SYSTEM_DESIGN_CATALOG: list[dict[str, Any]] = [
  {
    "id": "distributed-cache",
    "title": "Distributed In-Memory Cache (Redis Cluster Scale)",
    "topic": "Storage & Caching",
    "subtopic": "Architectural Scaling",
    "difficulty": "Senior",
    "prompt": "Design a distributed in-memory key-value caching system supporting high throughput, sub-millisecond latencies, and high availability.",
    "context_scenario": "100M active keys, 1M read QPS, 50K write QPS. 99.99% read SLA < 2ms.",
    "expected_signals": [
      "consistent hashing with virtual nodes to eliminate hot spots",
      "eviction strategies: LRU/LFU/TTL with probabilistic sampling",
      "cache replication, sentinel failover, and gossip protocol",
      "cache stampede / thundering herd mitigation with mutexes/singleflight"
    ],
    "follow_up_probes": [
      "How do you rebalance shards with zero downtime when adding new cache nodes?",
      "How do you handle hot-key read spikes on a single key exceeding single-node NIC capacity?"
    ],
    "question_family": "Distributed Caching",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "1M Read QPS, 50K Write QPS, 500GB RAM",
      "bottlenecks": [
        "Hot key saturation",
        "Rehash latency",
        "Network bandwidth"
      ],
      "tradeoffs": [
        "AP vs CP during partition",
        "Memory overhead of virtual nodes vs rebalance speed"
      ]
    }
  },
  {
    "id": "distributed-kv-store",
    "title": "Distributed Key-Value Store (Dynamo / Cassandra Architecture)",
    "topic": "Storage & Caching",
    "subtopic": "Storage Internals",
    "difficulty": "Staff",
    "prompt": "Design a globally scalable, fault-tolerant distributed key-value store with tunable consistency.",
    "context_scenario": "Billions of keys, petabytes of data, multi-datacenter deployment.",
    "expected_signals": [
      "consistent hashing ring with virtual nodes",
      "quorums: R + W > N for strong consistency; configurable sloppier quorums",
      "vector clocks / Lamport timestamps for concurrent write conflict resolution",
      "anti-entropy using Merkle trees and hinted handoff during node outages"
    ],
    "follow_up_probes": [
      "Explain how read repair and hinted handoff resolve transient failures.",
      "When vector clocks diverge (concurrent writes), who resolves the conflict: client or server?"
    ],
    "question_family": "Distributed Storage",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "100k writes/sec, 500k reads/sec, multi-region",
      "bottlenecks": [
        "Replication lag",
        "Vector clock explosion",
        "Merkle tree sync overhead"
      ],
      "tradeoffs": [
        "Availability vs Consistency",
        "Latency vs Quorum level"
      ]
    }
  },
  {
    "id": "snowflake-id-gen",
    "title": "Globally Distributed Unique ID Generator (Snowflake Architecture)",
    "topic": "Platform & Infrastructure",
    "subtopic": "Reliability & Correctness",
    "difficulty": "Medium",
    "prompt": "Design a distributed system that generates globally unique 64-bit integer IDs that are roughly time-sortable at extreme throughput.",
    "context_scenario": "Generate 50,000 unique IDs per second across multiple data centers with 0 collisions and zero coordination lock contention.",
    "expected_signals": [
      "bit allocation breakdown: 1 sign bit + 41-bit timestamp (ms) + 10-bit worker/datacenter ID + 12-bit sequence",
      "clock drift / NTP backward jump handling: reject or spin until clock catches up",
      "coordination-free generation per worker node in local memory without database locking"
    ],
    "follow_up_probes": [
      "What happens if the system clock steps backward by 5 milliseconds during an NTP sync?",
      "Why is a 64-bit integer ID preferred over a 128-bit UUID for B-Tree database indexing?"
    ],
    "question_family": "Core Platform",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "50,000 IDs/sec, sub-millisecond generation",
      "bottlenecks": [
        "NTP clock skew",
        "Worker ID exhaustion"
      ],
      "tradeoffs": [
        "Timestamp bit allocation (lifespan) vs sequence bit allocation (burst QPS)"
      ]
    }
  },
  {
    "id": "payment-gateway",
    "title": "High-Reliability Digital Payment Processing Gateway",
    "topic": "Financial & Commerce",
    "subtopic": "Consistency & Reliability",
    "difficulty": "Senior",
    "prompt": "Design a payment processing gateway connecting merchants to banking networks with strict exactly-once semantics and zero double-charging.",
    "context_scenario": "5,000 transactions/second, 99.999% availability, strict zero-loss audit compliance.",
    "expected_signals": [
      "idempotency keys hashed at API gateway with distributed lock (Redis) and database state machine",
      "two-phase commits or Sagas with compensating transactions for multi-step bank settlement",
      "outbox pattern with transactional log tailing to guarantee event delivery",
      "PCI-DSS tokenization separating cardholder data into isolated vault"
    ],
    "follow_up_probes": [
      "How do you prevent double-charging if the external banking network times out after processing the charge?",
      "Explain the state machine transitions of a payment transaction (initiated, authorized, captured, settled, refunded)."
    ],
    "question_family": "Financial Systems",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "5,000 TPS, 99.999% uptime, strict auditability",
      "bottlenecks": [
        "External bank latency",
        "Distributed lock contention"
      ],
      "tradeoffs": [
        "Strong consistency vs payment completion latency",
        "Synchronous vs asynchronous settlement"
      ]
    }
  },
  {
    "id": "flash-sale-inventory",
    "title": "Flash Sale & Real-Time Inventory Reservation Engine",
    "topic": "Financial & Commerce",
    "subtopic": "High Concurrency",
    "difficulty": "Senior",
    "prompt": "Design an inventory reservation system for e-commerce flash sales where 10,000 items sell out within seconds under 1,000,000 concurrent buyers.",
    "context_scenario": "1M concurrent users, 10,000 inventory items, single-digit millisecond responses, zero overselling.",
    "expected_signals": [
      "in-memory pre-allocation in Redis using Lua scripts for atomic decrement: if stock >= qty then stock - qty",
      "asynchronous order processing via message queues (Kafka) decoupling reservation from payment",
      "optimistic locking with version counters at the persistence layer",
      "circuit breaking and rate limiting upstream at API gateway"
    ],
    "follow_up_probes": [
      "Why is relational database row locking (SELECT ... FOR UPDATE) guaranteed to collapse under 1M concurrent requests?",
      "What happens when a candidate reserves stock but abandons payment after 10 minutes?"
    ],
    "question_family": "Financial Systems",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "1M concurrent users, 10k items, 100k checkout attempts/sec",
      "bottlenecks": [
        "Database connection exhaustion",
        "Redis single-thread CPU limit"
      ],
      "tradeoffs": [
        "Exact inventory count visibility vs eventual consistency in catalog browsing"
      ]
    }
  },
  {
    "id": "accounting-ledger",
    "title": "Double-Entry Financial Accounting Ledger",
    "topic": "Financial & Commerce",
    "subtopic": "Data Integrity",
    "difficulty": "Staff",
    "prompt": "Design an immutable, append-only double-entry financial ledger recording millions of balance movements with absolute zero deviation.",
    "context_scenario": "10,000 ledger transactions/sec, immutable audit history across 10 years, zero data loss.",
    "expected_signals": [
      "double-entry accounting principle: sum(debits) - sum(credits) == 0 for every transaction entry",
      "append-only immutable log tables with cryptographic hash chaining (blockchain/Merkle tree)",
      "partitioning ledger by account ID or currency with two-phase commit across accounts",
      "snapshotting account balances periodically to avoid full log replay on balance queries"
    ],
    "follow_up_probes": [
      "How do you handle concurrent transfers between the same two accounts without deadlocking?",
      "Explain why ledger entries are NEVER updated or deleted, even for corrections (compensating entries only)."
    ],
    "question_family": "Financial Systems",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "10,000 TPS, 100% auditability",
      "bottlenecks": [
        "Distributed deadlocks on hot accounts",
        "Snapshot generation overhead"
      ],
      "tradeoffs": [
        "Ledger write throughput vs real-time balance query latency"
      ]
    }
  },
  {
    "id": "distributed-message-queue",
    "title": "Distributed Message Broker (Kafka / Pulsar Architecture)",
    "topic": "Streaming & Messaging",
    "subtopic": "Storage & OS Internals",
    "difficulty": "Staff",
    "prompt": "Design a distributed, horizontally scalable append-only event streaming platform with partitioned topics and consumer groups.",
    "context_scenario": "100M events/sec, multi-terabyte daily ingestion, millisecond consumer lag, replayability.",
    "expected_signals": [
      "partitioned commit log stored on disk using sequential I/O and OS page cache",
      "zero-copy data transfer using Linux sendfile() syscall bypassing user-space buffer copying",
      "consumer group coordinator tracking partition assignments and committed offsets",
      "replication via In-Sync Replicas (ISR) and leader-epoch tracking"
    ],
    "follow_up_probes": [
      "Why does sequential disk I/O with page cache match or outperform random memory access?",
      "What happens during a consumer group rebalance when a worker node crashes?"
    ],
    "question_family": "Streaming Systems",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "100M events/sec, multi-TB/day",
      "bottlenecks": [
        "Disk IOPS vs sequential bandwidth",
        "Consumer rebalance storm"
      ],
      "tradeoffs": [
        "Partition count vs rebalance overhead",
        "At-least-once vs exactly-once delivery latency"
      ]
    }
  },
  {
    "id": "task-scheduler",
    "title": "Distributed Job & Task Scheduler (Cron at Scale)",
    "topic": "Platform & Infrastructure",
    "subtopic": "Concurrency & Scheduling",
    "difficulty": "Senior",
    "prompt": "Design a distributed task scheduler that executes millions of recurring and one-off delayed tasks accurately within seconds of scheduled time.",
    "context_scenario": "10M scheduled tasks daily, task execution deadlines ranging from 10 seconds to 1 year.",
    "expected_signals": [
      "hierarchical timing wheels or Redis sorted sets (ZSET with timestamp as score) for delayed scheduling",
      "partitioning tasks across scheduler workers using consistent hashing",
      "leader election or distributed locks ensuring tasks are dispatched exactly once to execution workers",
      "dead letter queues and exponential backoff retry for failed jobs"
    ],
    "follow_up_probes": [
      "Why is polling a relational database with 'SELECT * WHERE scheduled_at <= NOW()' catastrophic at 10M tasks?",
      "How do you recover tasks assigned to a worker node that crashes mid-execution?"
    ],
    "question_family": "Core Platform",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "10M tasks/day, sub-second trigger accuracy",
      "bottlenecks": [
        "Database polling lock contention",
        "Delayed queue head-of-line blocking"
      ],
      "tradeoffs": [
        "Timing accuracy vs scheduler heartbeat overhead"
      ]
    }
  },
  {
    "id": "chat-system",
    "title": "Real-Time Chat Application (Discord / WhatsApp Scale)",
    "topic": "Real-Time Communication",
    "subtopic": "Connection Management",
    "difficulty": "Senior",
    "prompt": "Design a real-time messaging application supporting 1-on-1 conversations, group chats with up to 10,000 members, and offline delivery.",
    "context_scenario": "50M daily active users, 10B messages/day, end-to-end latency < 100ms.",
    "expected_signals": [
      "persistent WebSocket connections terminated at lightweight connection gateway servers",
      "session routing table (Redis / distributed hash table) mapping user_id -> gateway_node_id",
      "message broker (Kafka / RabbitMQ) fan-out for group messages with fan-out on write for small groups vs fan-out on read for huge groups",
      "message storage: LSM-tree based database (Cassandra / ScyllaDB) partitioned by conversation_id"
    ],
    "follow_up_probes": [
      "How do you deliver a message to a group with 10,000 online members without choking the connection gateway?",
      "How are unread message badges and offline synchronization implemented efficiently?"
    ],
    "question_family": "Real-Time Systems",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "50M DAU, 10B msgs/day, sub-100ms delivery",
      "bottlenecks": [
        "WebSocket memory consumption",
        "Large group fan-out amplification"
      ],
      "tradeoffs": [
        "Fan-out on read vs fan-out on write for celebrity groups"
      ]
    }
  },
  {
    "id": "collaborative-document",
    "title": "Real-Time Collaborative Document Editing (Google Docs Scale)",
    "topic": "Real-Time Communication",
    "subtopic": "Algorithmic Consensus",
    "difficulty": "Staff",
    "prompt": "Design a real-time collaborative document editing engine allowing hundreds of users to edit the same document concurrently without conflicts.",
    "context_scenario": "100M documents, up to 1,000 concurrent editors per active document, low-latency live character synchronization.",
    "expected_signals": [
      "Conflict-free Replicated Data Types (CRDTs, e.g. RGA/Yjs) or Operational Transformation (OT) with central sequencing server",
      "WebSocket duplex stream transmitting mutation deltas (insert, delete, format) rather than full snapshots",
      "vector clocks or Lamport timestamps for causality preservation",
      "periodic document compaction and snapshotting to object storage (S3)"
    ],
    "follow_up_probes": [
      "Compare CRDTs vs Operational Transformation in algorithmic complexity, memory overhead, and peer-to-peer applicability.",
      "How do you render a document with 1,000 concurrent cursors without killing browser DOM performance?"
    ],
    "question_family": "Real-Time Systems",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "1,000 editors/doc, sub-50ms sync",
      "bottlenecks": [
        "Operation transformation tree depth",
        "CRDT tombstone memory bloat"
      ],
      "tradeoffs": [
        "Central sequencer (OT) simplicity vs decentralized peer-to-peer (CRDT) resiliency"
      ]
    }
  },
  {
    "id": "video-streaming",
    "title": "Global Video Streaming Infrastructure (YouTube / Netflix Scale)",
    "topic": "Media & Streaming",
    "subtopic": "CDN & Transcoding",
    "difficulty": "Senior",
    "prompt": "Design a scalable video processing and streaming infrastructure supporting video upload, adaptive bitrate transcoding, and global playback.",
    "context_scenario": "100M video views/day, 500 hours of video uploaded per minute, adaptive streaming across 4G, 5G, and broadband.",
    "expected_signals": [
      "chunked chunk-based upload direct to object storage using pre-signed S3 URLs",
      "asynchronous distributed transcoding pipeline generating multi-bitrate HLS / DASH manifest streams (1080p, 720p, 480p, AV1/H.264)",
      "multi-tier CDN distribution caching popular video chunks at the edge",
      "range request headers (HTTP 206 Partial Content) enabling fast seek and buffering"
    ],
    "follow_up_probes": [
      "Why is video playback served over CDN while video upload bypasses CDN and goes direct to object storage?",
      "How does Adaptive Bitrate Streaming (ABR) dynamically switch video resolution in response to network fluctuations?"
    ],
    "question_family": "Media Systems",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "100M views/day, 500 hrs/min upload",
      "bottlenecks": [
        "Transcoding CPU compute",
        "Edge CDN egress bandwidth"
      ],
      "tradeoffs": [
        "Transcoding speed vs compression efficiency (AV1 vs H.264)"
      ]
    }
  },
  {
    "id": "proximity-service",
    "title": "Proximity Search & Location Service (Yelp / Uber Scale)",
    "topic": "Search & Geospatial",
    "subtopic": "Spatial Indexing",
    "difficulty": "Senior",
    "prompt": "Design a geospatial proximity service that finds points of interest (restaurants, drivers) within a specified radius in real-time.",
    "context_scenario": "100M points of interest, 50,000 search QPS, 500,000 dynamic driver location updates/sec.",
    "expected_signals": [
      "spatial indexing algorithms: Geohash, Quadtree, or Google S2 / Uber H3 hexagonal hierarchical spatial index",
      "partitioning geospatial database by geographic region or cell ID",
      "two-tier architecture: static POI database vs in-memory dynamic driver location tracker (Redis GEO / in-memory H3 grid)",
      "filtering and sorting search results by distance and ranking metrics"
    ],
    "follow_up_probes": [
      "Compare Geohash (base32 string prefixes) with Uber H3 (hexagons) for neighbor searches and boundary distortion.",
      "How do you handle 500k dynamic driver location updates without overwhelming disk write IOPS?"
    ],
    "question_family": "Geospatial Systems",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "50k search QPS, 500k GPS updates/sec",
      "bottlenecks": [
        "Spatial index update locks",
        "Boundary edge cell search"
      ],
      "tradeoffs": [
        "Geohash string prefix simplicity vs H3 uniform neighbor adjacency"
      ]
    }
  },
  {
    "id": "typeahead-autocomplete",
    "title": "Real-Time Typeahead Search Autocomplete",
    "topic": "Search & Geospatial",
    "subtopic": "Data Structures & Caching",
    "difficulty": "Medium",
    "prompt": "Design a real-time search typeahead suggestion system that returns top 5 trending search queries as the user types each character.",
    "context_scenario": "100M search queries/day, 50M distinct query phrases, 99.9% response latency < 20ms.",
    "expected_signals": [
      "Trie (prefix tree) data structure stored in memory, augmented with top 5 completions precomputed at each node",
      "offline MapReduce / Spark aggregation pipeline computing query frequency and trending weights daily",
      "browser client caching with debounce (150ms) and CDN edge caching for popular prefixes",
      "Unicode normalization and lowercase canonicalization"
    ],
    "follow_up_probes": [
      "Why is computing top 5 suggestions on-the-fly via DFS traversal inside the Trie too slow for 20ms SLA?",
      "How do you update the Trie with new trending queries without taking the read service offline?"
    ],
    "question_family": "Search Systems",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "100M queries/day, sub-20ms SLA",
      "bottlenecks": [
        "Trie memory consumption",
        "Node update locking"
      ],
      "tradeoffs": [
        "Precomputed top-5 memory bloat vs runtime search latency"
      ]
    }
  },
  {
    "id": "api-gateway-rate-limiter",
    "title": "Global API Gateway & Distributed Rate Limiter",
    "topic": "Platform & Infrastructure",
    "subtopic": "Security & Traffic Management",
    "difficulty": "Senior",
    "prompt": "Design a distributed rate limiter protecting microservices from denial of service and abusive clients at global scale.",
    "context_scenario": "1M requests/second, multi-region API gateway, minimal added latency (< 2ms).",
    "expected_signals": [
      "rate limiting algorithms: Token Bucket, Leaky Bucket, Fixed Window Counter, Sliding Window Log, Sliding Window Counter",
      "distributed counter storage in Redis with Lua script atomicity or local in-memory token buckets with periodic async synchronization",
      "rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset",
      "graceful degradation: fail-open vs fail-closed during Redis cluster outage"
    ],
    "follow_up_probes": [
      "Compare Sliding Window Counter vs Token Bucket in memory efficiency and burst tolerance.",
      "How do you avoid cross-datacenter Redis network roundtrips on every single API request?"
    ],
    "question_family": "Core Platform",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "1M RPS, < 2ms latency overhead",
      "bottlenecks": [
        "Redis network roundtrip latency",
        "Thundering herd on rate limit reset"
      ],
      "tradeoffs": [
        "Strict rate limit precision vs low-latency local bucket synchronization"
      ]
    }
  },
  {
    "id": "distributed-web-crawler",
    "title": "Distributed Web Crawler (Search Engine Ingestion Scale)",
    "topic": "Platform & Infrastructure",
    "subtopic": "Distributed Crawling",
    "difficulty": "Staff",
    "prompt": "Design a distributed web crawler capable of downloading and indexing billions of web pages monthly with politeness and deduplication.",
    "context_scenario": "1B pages/month, 400 pages/sec continuous download, multi-terabyte HTML content.",
    "expected_signals": [
      "URL frontier with priority queues (freshness/page rank) and politeness queues (delay per host)",
      "Bloom filters and MurmurHash for instant URL deduplication",
      "DNS resolver cache to avoid DNS bottleneck on millions of external domain lookups",
      "HTML parsing, content fingerprinting (SimHash) for duplicate page detection, and object storage persistence"
    ],
    "follow_up_probes": [
      "How do you prevent crawler traps (infinite dynamic URLs like calendars) from exhausting frontier memory?",
      "Explain how SimHash detects near-duplicate web pages differing only in timestamps or advertisements."
    ],
    "question_family": "Platform & Ingestion",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "1B pages/month, 400 downloads/sec",
      "bottlenecks": [
        "DNS resolution latency",
        "Politeness queue starvation",
        "Frontier memory bloat"
      ],
      "tradeoffs": [
        "Crawl freshness vs politeness server delay"
      ]
    }
  },
  {
    "id": "time-series-database-standard",
    "title": "Distributed Time-Series Database for Metrics (Prometheus / InfluxDB Scale) (Standard)",
    "topic": "Storage & Databases",
    "subtopic": "Architecture & Reliability",
    "difficulty": "Senior",
    "prompt": "Design time-series storage engine with gorilla compression and downsampling.",
    "context_scenario": "Enterprise scale requirements for Standard deployment with strict SLA.",
    "expected_signals": [
      "partitioning and sharding architecture",
      "replication topology and failure recovery",
      "caching and latency optimization",
      "monitoring, metrics, and alerting boundaries"
    ],
    "follow_up_probes": [
      "What happens during a regional network partition?",
      "How do you test this architecture for catastrophic failure modes?"
    ],
    "question_family": "time-series-database",
    "source_attribution": "Strop System Design Catalog",
    "metadata_json": {
      "tier": "Standard",
      "scale": "Multi-million daily active users",
      "bottlenecks": [
        "Database I/O",
        "Network ingress"
      ],
      "tradeoffs": [
        "Consistency vs Availability",
        "Cost vs Redundancy"
      ]
    }
  },
  {
    "id": "time-series-database-high-scale-multi-region",
    "title": "Distributed Time-Series Database for Metrics (Prometheus / InfluxDB Scale) (High-Scale Multi-Region)",
    "topic": "Storage & Databases",
    "subtopic": "Architecture & Reliability",
    "difficulty": "Senior",
    "prompt": "Design time-series storage engine with gorilla compression and downsampling.",
    "context_scenario": "Enterprise scale requirements for High-Scale Multi-Region deployment with strict SLA.",
    "expected_signals": [
      "partitioning and sharding architecture",
      "replication topology and failure recovery",
      "caching and latency optimization",
      "monitoring, metrics, and alerting boundaries"
    ],
    "follow_up_probes": [
      "What happens during a regional network partition?",
      "How do you test this architecture for catastrophic failure modes?"
    ],
    "question_family": "time-series-database",
    "source_attribution": "Strop System Design Catalog",
    "metadata_json": {
      "tier": "High-Scale Multi-Region",
      "scale": "Multi-million daily active users",
      "bottlenecks": [
        "Database I/O",
        "Network ingress"
      ],
      "tradeoffs": [
        "Consistency vs Availability",
        "Cost vs Redundancy"
      ]
    }
  },
  {
    "id": "distributed-object-storage-standard",
    "title": "Cloud Object Storage System (Amazon S3 Scale) (Standard)",
    "topic": "Storage & Databases",
    "subtopic": "Architecture & Reliability",
    "difficulty": "Staff",
    "prompt": "Design multi-tenant object storage with erasure coding and 11 nines durability.",
    "context_scenario": "Enterprise scale requirements for Standard deployment with strict SLA.",
    "expected_signals": [
      "partitioning and sharding architecture",
      "replication topology and failure recovery",
      "caching and latency optimization",
      "monitoring, metrics, and alerting boundaries"
    ],
    "follow_up_probes": [
      "What happens during a regional network partition?",
      "How do you test this architecture for catastrophic failure modes?"
    ],
    "question_family": "distributed-object-storage",
    "source_attribution": "Strop System Design Catalog",
    "metadata_json": {
      "tier": "Standard",
      "scale": "Multi-million daily active users",
      "bottlenecks": [
        "Database I/O",
        "Network ingress"
      ],
      "tradeoffs": [
        "Consistency vs Availability",
        "Cost vs Redundancy"
      ]
    }
  },
  {
    "id": "distributed-object-storage-high-scale-multi-region",
    "title": "Cloud Object Storage System (Amazon S3 Scale) (High-Scale Multi-Region)",
    "topic": "Storage & Databases",
    "subtopic": "Architecture & Reliability",
    "difficulty": "Staff",
    "prompt": "Design multi-tenant object storage with erasure coding and 11 nines durability.",
    "context_scenario": "Enterprise scale requirements for High-Scale Multi-Region deployment with strict SLA.",
    "expected_signals": [
      "partitioning and sharding architecture",
      "replication topology and failure recovery",
      "caching and latency optimization",
      "monitoring, metrics, and alerting boundaries"
    ],
    "follow_up_probes": [
      "What happens during a regional network partition?",
      "How do you test this architecture for catastrophic failure modes?"
    ],
    "question_family": "distributed-object-storage",
    "source_attribution": "Strop System Design Catalog",
    "metadata_json": {
      "tier": "High-Scale Multi-Region",
      "scale": "Multi-million daily active users",
      "bottlenecks": [
        "Database I/O",
        "Network ingress"
      ],
      "tradeoffs": [
        "Consistency vs Availability",
        "Cost vs Redundancy"
      ]
    }
  },
  {
    "id": "distributed-sql-db-standard",
    "title": "Globally Distributed ACID SQL Database (Google Spanner Scale) (Standard)",
    "topic": "Storage & Databases",
    "subtopic": "Architecture & Reliability",
    "difficulty": "Staff",
    "prompt": "Design multi-region SQL database with TrueTime API and two-phase commit Paxos.",
    "context_scenario": "Enterprise scale requirements for Standard deployment with strict SLA.",
    "expected_signals": [
      "partitioning and sharding architecture",
      "replication topology and failure recovery",
      "caching and latency optimization",
      "monitoring, metrics, and alerting boundaries"
    ],
    "follow_up_probes": [
      "What happens during a regional network partition?",
      "How do you test this architecture for catastrophic failure modes?"
    ],
    "question_family": "distributed-sql-db",
    "source_attribution": "Strop System Design Catalog",
    "metadata_json": {
      "tier": "Standard",
      "scale": "Multi-million daily active users",
      "bottlenecks": [
        "Database I/O",
        "Network ingress"
      ],
      "tradeoffs": [
        "Consistency vs Availability",
        "Cost vs Redundancy"
      ]
    }
  },
  {
    "id": "distributed-sql-db-high-scale-multi-region",
    "title": "Globally Distributed ACID SQL Database (Google Spanner Scale) (High-Scale Multi-Region)",
    "topic": "Storage & Databases",
    "subtopic": "Architecture & Reliability",
    "difficulty": "Staff",
    "prompt": "Design multi-region SQL database with TrueTime API and two-phase commit Paxos.",
    "context_scenario": "Enterprise scale requirements for High-Scale Multi-Region deployment with strict SLA.",
    "expected_signals": [
      "partitioning and sharding architecture",
      "replication topology and failure recovery",
      "caching and latency optimization",
      "monitoring, metrics, and alerting boundaries"
    ],
    "follow_up_probes": [
      "What happens during a regional network partition?",
      "How do you test this architecture for catastrophic failure modes?"
    ],
    "question_family": "distributed-sql-db",
    "source_attribution": "Strop System Design Catalog",
    "metadata_json": {
      "tier": "High-Scale Multi-Region",
      "scale": "Multi-million daily active users",
      "bottlenecks": [
        "Database I/O",
        "Network ingress"
      ],
      "tradeoffs": [
        "Consistency vs Availability",
        "Cost vs Redundancy"
      ]
    }
  },
  {
    "id": "centralized-logging-standard",
    "title": "Centralized Distributed Logging & Tracing (ELK / Jaeger Scale) (Standard)",
    "topic": "Platform & Infrastructure",
    "subtopic": "Architecture & Reliability",
    "difficulty": "Senior",
    "prompt": "Design log ingestion pipeline handling 1M logs/sec with full-text search.",
    "context_scenario": "Enterprise scale requirements for Standard deployment with strict SLA.",
    "expected_signals": [
      "partitioning and sharding architecture",
      "replication topology and failure recovery",
      "caching and latency optimization",
      "monitoring, metrics, and alerting boundaries"
    ],
    "follow_up_probes": [
      "What happens during a regional network partition?",
      "How do you test this architecture for catastrophic failure modes?"
    ],
    "question_family": "centralized-logging",
    "source_attribution": "Strop System Design Catalog",
    "metadata_json": {
      "tier": "Standard",
      "scale": "Multi-million daily active users",
      "bottlenecks": [
        "Database I/O",
        "Network ingress"
      ],
      "tradeoffs": [
        "Consistency vs Availability",
        "Cost vs Redundancy"
      ]
    }
  },
  {
    "id": "centralized-logging-high-scale-multi-region",
    "title": "Centralized Distributed Logging & Tracing (ELK / Jaeger Scale) (High-Scale Multi-Region)",
    "topic": "Platform & Infrastructure",
    "subtopic": "Architecture & Reliability",
    "difficulty": "Senior",
    "prompt": "Design log ingestion pipeline handling 1M logs/sec with full-text search.",
    "context_scenario": "Enterprise scale requirements for High-Scale Multi-Region deployment with strict SLA.",
    "expected_signals": [
      "partitioning and sharding architecture",
      "replication topology and failure recovery",
      "caching and latency optimization",
      "monitoring, metrics, and alerting boundaries"
    ],
    "follow_up_probes": [
      "What happens during a regional network partition?",
      "How do you test this architecture for catastrophic failure modes?"
    ],
    "question_family": "centralized-logging",
    "source_attribution": "Strop System Design Catalog",
    "metadata_json": {
      "tier": "High-Scale Multi-Region",
      "scale": "Multi-million daily active users",
      "bottlenecks": [
        "Database I/O",
        "Network ingress"
      ],
      "tradeoffs": [
        "Consistency vs Availability",
        "Cost vs Redundancy"
      ]
    }
  },
  {
    "id": "feature-flag-system-standard",
    "title": "High-Throughput Distributed Feature Flag Engine (LaunchDarkly Scale) (Standard)",
    "topic": "Platform & Infrastructure",
    "subtopic": "Architecture & Reliability",
    "difficulty": "Senior",
    "prompt": "Design sub-millisecond feature flag evaluation system with real-time push rule propagation.",
    "context_scenario": "Enterprise scale requirements for Standard deployment with strict SLA.",
    "expected_signals": [
      "partitioning and sharding architecture",
      "replication topology and failure recovery",
      "caching and latency optimization",
      "monitoring, metrics, and alerting boundaries"
    ],
    "follow_up_probes": [
      "What happens during a regional network partition?",
      "How do you test this architecture for catastrophic failure modes?"
    ],
    "question_family": "feature-flag-system",
    "source_attribution": "Strop System Design Catalog",
    "metadata_json": {
      "tier": "Standard",
      "scale": "Multi-million daily active users",
      "bottlenecks": [
        "Database I/O",
        "Network ingress"
      ],
      "tradeoffs": [
        "Consistency vs Availability",
        "Cost vs Redundancy"
      ]
    }
  },
  {
    "id": "feature-flag-system-high-scale-multi-region",
    "title": "High-Throughput Distributed Feature Flag Engine (LaunchDarkly Scale) (High-Scale Multi-Region)",
    "topic": "Platform & Infrastructure",
    "subtopic": "Architecture & Reliability",
    "difficulty": "Senior",
    "prompt": "Design sub-millisecond feature flag evaluation system with real-time push rule propagation.",
    "context_scenario": "Enterprise scale requirements for High-Scale Multi-Region deployment with strict SLA.",
    "expected_signals": [
      "partitioning and sharding architecture",
      "replication topology and failure recovery",
      "caching and latency optimization",
      "monitoring, metrics, and alerting boundaries"
    ],
    "follow_up_probes": [
      "What happens during a regional network partition?",
      "How do you test this architecture for catastrophic failure modes?"
    ],
    "question_family": "feature-flag-system",
    "source_attribution": "Strop System Design Catalog",
    "metadata_json": {
      "tier": "High-Scale Multi-Region",
      "scale": "Multi-million daily active users",
      "bottlenecks": [
        "Database I/O",
        "Network ingress"
      ],
      "tradeoffs": [
        "Consistency vs Availability",
        "Cost vs Redundancy"
      ]
    }
  },
  {
    "id": "content-delivery-network-standard",
    "title": "Global Content Delivery Network (Cloudflare Edge Architecture) (Standard)",
    "topic": "Platform & Infrastructure",
    "subtopic": "Architecture & Reliability",
    "difficulty": "Staff",
    "prompt": "Design CDN with Anycast BGP routing, TLS termination, and edge caching.",
    "context_scenario": "Enterprise scale requirements for Standard deployment with strict SLA.",
    "expected_signals": [
      "partitioning and sharding architecture",
      "replication topology and failure recovery",
      "caching and latency optimization",
      "monitoring, metrics, and alerting boundaries"
    ],
    "follow_up_probes": [
      "What happens during a regional network partition?",
      "How do you test this architecture for catastrophic failure modes?"
    ],
    "question_family": "content-delivery-network",
    "source_attribution": "Strop System Design Catalog",
    "metadata_json": {
      "tier": "Standard",
      "scale": "Multi-million daily active users",
      "bottlenecks": [
        "Database I/O",
        "Network ingress"
      ],
      "tradeoffs": [
        "Consistency vs Availability",
        "Cost vs Redundancy"
      ]
    }
  },
  {
    "id": "content-delivery-network-high-scale-multi-region",
    "title": "Global Content Delivery Network (Cloudflare Edge Architecture) (High-Scale Multi-Region)",
    "topic": "Platform & Infrastructure",
    "subtopic": "Architecture & Reliability",
    "difficulty": "Staff",
    "prompt": "Design CDN with Anycast BGP routing, TLS termination, and edge caching.",
    "context_scenario": "Enterprise scale requirements for High-Scale Multi-Region deployment with strict SLA.",
    "expected_signals": [
      "partitioning and sharding architecture",
      "replication topology and failure recovery",
      "caching and latency optimization",
      "monitoring, metrics, and alerting boundaries"
    ],
    "follow_up_probes": [
      "What happens during a regional network partition?",
      "How do you test this architecture for catastrophic failure modes?"
    ],
    "question_family": "content-delivery-network",
    "source_attribution": "Strop System Design Catalog",
    "metadata_json": {
      "tier": "High-Scale Multi-Region",
      "scale": "Multi-million daily active users",
      "bottlenecks": [
        "Database I/O",
        "Network ingress"
      ],
      "tradeoffs": [
        "Consistency vs Availability",
        "Cost vs Redundancy"
      ]
    }
  },
  {
    "id": "ride-sharing-matching-standard",
    "title": "Real-Time Ride-Sharing Matching Engine (Uber / Lyft Scale) (Standard)",
    "topic": "Commerce & Real-Time",
    "subtopic": "Architecture & Reliability",
    "difficulty": "Staff",
    "prompt": "Design geospatial matching engine pairing riders with drivers under dynamic surge pricing.",
    "context_scenario": "Enterprise scale requirements for Standard deployment with strict SLA.",
    "expected_signals": [
      "partitioning and sharding architecture",
      "replication topology and failure recovery",
      "caching and latency optimization",
      "monitoring, metrics, and alerting boundaries"
    ],
    "follow_up_probes": [
      "What happens during a regional network partition?",
      "How do you test this architecture for catastrophic failure modes?"
    ],
    "question_family": "ride-sharing-matching",
    "source_attribution": "Strop System Design Catalog",
    "metadata_json": {
      "tier": "Standard",
      "scale": "Multi-million daily active users",
      "bottlenecks": [
        "Database I/O",
        "Network ingress"
      ],
      "tradeoffs": [
        "Consistency vs Availability",
        "Cost vs Redundancy"
      ]
    }
  },
  {
    "id": "ride-sharing-matching-high-scale-multi-region",
    "title": "Real-Time Ride-Sharing Matching Engine (Uber / Lyft Scale) (High-Scale Multi-Region)",
    "topic": "Commerce & Real-Time",
    "subtopic": "Architecture & Reliability",
    "difficulty": "Staff",
    "prompt": "Design geospatial matching engine pairing riders with drivers under dynamic surge pricing.",
    "context_scenario": "Enterprise scale requirements for High-Scale Multi-Region deployment with strict SLA.",
    "expected_signals": [
      "partitioning and sharding architecture",
      "replication topology and failure recovery",
      "caching and latency optimization",
      "monitoring, metrics, and alerting boundaries"
    ],
    "follow_up_probes": [
      "What happens during a regional network partition?",
      "How do you test this architecture for catastrophic failure modes?"
    ],
    "question_family": "ride-sharing-matching",
    "source_attribution": "Strop System Design Catalog",
    "metadata_json": {
      "tier": "High-Scale Multi-Region",
      "scale": "Multi-million daily active users",
      "bottlenecks": [
        "Database I/O",
        "Network ingress"
      ],
      "tradeoffs": [
        "Consistency vs Availability",
        "Cost vs Redundancy"
      ]
    }
  },
  {
    "id": "food-delivery-logistics-standard",
    "title": "On-Demand Food Delivery Logistics Platform (DoorDash Scale) (Standard)",
    "topic": "Commerce & Real-Time",
    "subtopic": "Architecture & Reliability",
    "difficulty": "Senior",
    "prompt": "Design order dispatch and multi-stop route optimization system.",
    "context_scenario": "Enterprise scale requirements for Standard deployment with strict SLA.",
    "expected_signals": [
      "partitioning and sharding architecture",
      "replication topology and failure recovery",
      "caching and latency optimization",
      "monitoring, metrics, and alerting boundaries"
    ],
    "follow_up_probes": [
      "What happens during a regional network partition?",
      "How do you test this architecture for catastrophic failure modes?"
    ],
    "question_family": "food-delivery-logistics",
    "source_attribution": "Strop System Design Catalog",
    "metadata_json": {
      "tier": "Standard",
      "scale": "Multi-million daily active users",
      "bottlenecks": [
        "Database I/O",
        "Network ingress"
      ],
      "tradeoffs": [
        "Consistency vs Availability",
        "Cost vs Redundancy"
      ]
    }
  },
  {
    "id": "food-delivery-logistics-high-scale-multi-region",
    "title": "On-Demand Food Delivery Logistics Platform (DoorDash Scale) (High-Scale Multi-Region)",
    "topic": "Commerce & Real-Time",
    "subtopic": "Architecture & Reliability",
    "difficulty": "Senior",
    "prompt": "Design order dispatch and multi-stop route optimization system.",
    "context_scenario": "Enterprise scale requirements for High-Scale Multi-Region deployment with strict SLA.",
    "expected_signals": [
      "partitioning and sharding architecture",
      "replication topology and failure recovery",
      "caching and latency optimization",
      "monitoring, metrics, and alerting boundaries"
    ],
    "follow_up_probes": [
      "What happens during a regional network partition?",
      "How do you test this architecture for catastrophic failure modes?"
    ],
    "question_family": "food-delivery-logistics",
    "source_attribution": "Strop System Design Catalog",
    "metadata_json": {
      "tier": "High-Scale Multi-Region",
      "scale": "Multi-million daily active users",
      "bottlenecks": [
        "Database I/O",
        "Network ingress"
      ],
      "tradeoffs": [
        "Consistency vs Availability",
        "Cost vs Redundancy"
      ]
    }
  },
  {
    "id": "notification-engine-standard",
    "title": "Multi-Channel Notification Dispatch Service (Twilio / SendGrid Scale) (Standard)",
    "topic": "Commerce & Real-Time",
    "subtopic": "Architecture & Reliability",
    "difficulty": "Medium",
    "prompt": "Design notification system supporting Push, SMS, and Email with delivery guarantees.",
    "context_scenario": "Enterprise scale requirements for Standard deployment with strict SLA.",
    "expected_signals": [
      "partitioning and sharding architecture",
      "replication topology and failure recovery",
      "caching and latency optimization",
      "monitoring, metrics, and alerting boundaries"
    ],
    "follow_up_probes": [
      "What happens during a regional network partition?",
      "How do you test this architecture for catastrophic failure modes?"
    ],
    "question_family": "notification-engine",
    "source_attribution": "Strop System Design Catalog",
    "metadata_json": {
      "tier": "Standard",
      "scale": "Multi-million daily active users",
      "bottlenecks": [
        "Database I/O",
        "Network ingress"
      ],
      "tradeoffs": [
        "Consistency vs Availability",
        "Cost vs Redundancy"
      ]
    }
  },
  {
    "id": "notification-engine-high-scale-multi-region",
    "title": "Multi-Channel Notification Dispatch Service (Twilio / SendGrid Scale) (High-Scale Multi-Region)",
    "topic": "Commerce & Real-Time",
    "subtopic": "Architecture & Reliability",
    "difficulty": "Medium",
    "prompt": "Design notification system supporting Push, SMS, and Email with delivery guarantees.",
    "context_scenario": "Enterprise scale requirements for High-Scale Multi-Region deployment with strict SLA.",
    "expected_signals": [
      "partitioning and sharding architecture",
      "replication topology and failure recovery",
      "caching and latency optimization",
      "monitoring, metrics, and alerting boundaries"
    ],
    "follow_up_probes": [
      "What happens during a regional network partition?",
      "How do you test this architecture for catastrophic failure modes?"
    ],
    "question_family": "notification-engine",
    "source_attribution": "Strop System Design Catalog",
    "metadata_json": {
      "tier": "High-Scale Multi-Region",
      "scale": "Multi-million daily active users",
      "bottlenecks": [
        "Database I/O",
        "Network ingress"
      ],
      "tradeoffs": [
        "Consistency vs Availability",
        "Cost vs Redundancy"
      ]
    }
  },
  {
    "id": "url-shortener",
    "title": "High-Volume URL Shortening Service (Bitly Scale)",
    "topic": "Platform & Infrastructure",
    "subtopic": "Architecture & Scaling",
    "difficulty": "Medium",
    "prompt": "Design scalable URL shortener with analytics and expiration.",
    "context_scenario": "10B URLs generated, 100k read QPS.",
    "expected_signals": [
      "data flow decomposition",
      "storage engine selection",
      "scalability and bottleneck mitigation",
      "fault tolerance and failure scenarios"
    ],
    "follow_up_probes": [
      "How does your architecture handle sudden 10x traffic spikes?",
      "What is the single point of failure and how do you eliminate it?"
    ],
    "question_family": "url-shortener",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "10B URLs generated, 100k read QPS.",
      "difficulty": "Medium"
    }
  },
  {
    "id": "pastebin",
    "title": "Distributed Pastebin Text Storage System",
    "topic": "Platform & Infrastructure",
    "subtopic": "Architecture & Scaling",
    "difficulty": "Medium",
    "prompt": "Design text storage system with custom retention and access control.",
    "context_scenario": "10M pastes/day, high read:write ratio.",
    "expected_signals": [
      "data flow decomposition",
      "storage engine selection",
      "scalability and bottleneck mitigation",
      "fault tolerance and failure scenarios"
    ],
    "follow_up_probes": [
      "How does your architecture handle sudden 10x traffic spikes?",
      "What is the single point of failure and how do you eliminate it?"
    ],
    "question_family": "pastebin",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "10M pastes/day, high read:write ratio.",
      "difficulty": "Medium"
    }
  },
  {
    "id": "stock-exchange-orderbook",
    "title": "High-Frequency Limit Order Book & Matching Engine",
    "topic": "Financial & Commerce",
    "subtopic": "Architecture & Scaling",
    "difficulty": "Staff",
    "prompt": "Design deterministic, microsecond-latency financial exchange order book.",
    "context_scenario": "1M orders/sec, zero data loss, strict FIFO price-time priority.",
    "expected_signals": [
      "data flow decomposition",
      "storage engine selection",
      "scalability and bottleneck mitigation",
      "fault tolerance and failure scenarios"
    ],
    "follow_up_probes": [
      "How does your architecture handle sudden 10x traffic spikes?",
      "What is the single point of failure and how do you eliminate it?"
    ],
    "question_family": "stock-exchange-orderbook",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "1M orders/sec, zero data loss, strict FIFO price-time priority.",
      "difficulty": "Staff"
    }
  },
  {
    "id": "hotel-booking",
    "title": "Global Hotel & Flight Reservation System (Airbnb / Booking Scale)",
    "topic": "Financial & Commerce",
    "subtopic": "Architecture & Scaling",
    "difficulty": "Senior",
    "prompt": "Design reservation platform preventing double booking with search filtering.",
    "context_scenario": "100k bookings/day, high seasonal search traffic.",
    "expected_signals": [
      "data flow decomposition",
      "storage engine selection",
      "scalability and bottleneck mitigation",
      "fault tolerance and failure scenarios"
    ],
    "follow_up_probes": [
      "How does your architecture handle sudden 10x traffic spikes?",
      "What is the single point of failure and how do you eliminate it?"
    ],
    "question_family": "hotel-booking",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "100k bookings/day, high seasonal search traffic.",
      "difficulty": "Senior"
    }
  },
  {
    "id": "ad-click-aggregator",
    "title": "Real-Time Advertising Impression & Click Aggregator",
    "topic": "Streaming & Messaging",
    "subtopic": "Architecture & Scaling",
    "difficulty": "Senior",
    "prompt": "Design analytics pipeline aggregating ad clicks for billing with fraud detection.",
    "context_scenario": "100M clicks/day, exactly-once aggregation windowing.",
    "expected_signals": [
      "data flow decomposition",
      "storage engine selection",
      "scalability and bottleneck mitigation",
      "fault tolerance and failure scenarios"
    ],
    "follow_up_probes": [
      "How does your architecture handle sudden 10x traffic spikes?",
      "What is the single point of failure and how do you eliminate it?"
    ],
    "question_family": "ad-click-aggregator",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "100M clicks/day, exactly-once aggregation windowing.",
      "difficulty": "Senior"
    }
  },
  {
    "id": "video-conferencing",
    "title": "Large-Scale Video Conferencing Platform (Zoom / Google Meet Scale)",
    "topic": "Real-Time Communication",
    "subtopic": "Architecture & Scaling",
    "difficulty": "Staff",
    "prompt": "Design WebRTC media routing architecture with SFU and MCU servers.",
    "context_scenario": "10,000 concurrent video rooms, sub-150ms audio latency.",
    "expected_signals": [
      "data flow decomposition",
      "storage engine selection",
      "scalability and bottleneck mitigation",
      "fault tolerance and failure scenarios"
    ],
    "follow_up_probes": [
      "How does your architecture handle sudden 10x traffic spikes?",
      "What is the single point of failure and how do you eliminate it?"
    ],
    "question_family": "video-conferencing",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "10,000 concurrent video rooms, sub-150ms audio latency.",
      "difficulty": "Staff"
    }
  },
  {
    "id": "iot-telemetry",
    "title": "Global IoT Device Telemetry Ingestion Platform",
    "topic": "Streaming & Messaging",
    "subtopic": "Architecture & Scaling",
    "difficulty": "Senior",
    "prompt": "Design time-series telemetry platform ingesting readings from 10M smart devices.",
    "context_scenario": "100k readings/sec, MQTT protocol termination.",
    "expected_signals": [
      "data flow decomposition",
      "storage engine selection",
      "scalability and bottleneck mitigation",
      "fault tolerance and failure scenarios"
    ],
    "follow_up_probes": [
      "How does your architecture handle sudden 10x traffic spikes?",
      "What is the single point of failure and how do you eliminate it?"
    ],
    "question_family": "iot-telemetry",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "100k readings/sec, MQTT protocol termination.",
      "difficulty": "Senior"
    }
  },
  {
    "id": "content-moderation",
    "title": "Automated Content Moderation & Abuse Detection Pipeline",
    "topic": "Platform & Infrastructure",
    "subtopic": "Architecture & Scaling",
    "difficulty": "Senior",
    "prompt": "Design asynchronous text and image moderation pipeline with human review fallback.",
    "context_scenario": "50M uploads/day, ML inference queueing.",
    "expected_signals": [
      "data flow decomposition",
      "storage engine selection",
      "scalability and bottleneck mitigation",
      "fault tolerance and failure scenarios"
    ],
    "follow_up_probes": [
      "How does your architecture handle sudden 10x traffic spikes?",
      "What is the single point of failure and how do you eliminate it?"
    ],
    "question_family": "content-moderation",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "50M uploads/day, ML inference queueing.",
      "difficulty": "Senior"
    }
  },
  {
    "id": "online-gaming-leaderboard",
    "title": "Real-Time Global Gaming Leaderboard & Matchmaking",
    "topic": "Real-Time Communication",
    "subtopic": "Architecture & Scaling",
    "difficulty": "Medium",
    "prompt": "Design real-time rank calculation and matchmaking engine for multiplayer games.",
    "context_scenario": "10M players, continuous score updates via Redis Sorted Sets.",
    "expected_signals": [
      "data flow decomposition",
      "storage engine selection",
      "scalability and bottleneck mitigation",
      "fault tolerance and failure scenarios"
    ],
    "follow_up_probes": [
      "How does your architecture handle sudden 10x traffic spikes?",
      "What is the single point of failure and how do you eliminate it?"
    ],
    "question_family": "online-gaming-leaderboard",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "10M players, continuous score updates via Redis Sorted Sets.",
      "difficulty": "Medium"
    }
  },
  {
    "id": "social-network-feed",
    "title": "Social Network News Feed Generation (X / Instagram Timeline Scale)",
    "topic": "Storage & Caching",
    "subtopic": "Architecture & Scaling",
    "difficulty": "Senior",
    "prompt": "Design timeline generation system with fan-out on write vs fan-out on read for celebrity users.",
    "context_scenario": "500M users, real-time post delivery within 5 seconds.",
    "expected_signals": [
      "data flow decomposition",
      "storage engine selection",
      "scalability and bottleneck mitigation",
      "fault tolerance and failure scenarios"
    ],
    "follow_up_probes": [
      "How does your architecture handle sudden 10x traffic spikes?",
      "What is the single point of failure and how do you eliminate it?"
    ],
    "question_family": "social-network-feed",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "500M users, real-time post delivery within 5 seconds.",
      "difficulty": "Senior"
    }
  },
  {
    "id": "music-streaming",
    "title": "Music Streaming & Recommendation Service (Spotify Scale)",
    "topic": "Media & Streaming",
    "subtopic": "Architecture & Scaling",
    "difficulty": "Senior",
    "prompt": "Design audio streaming platform with offline listening and song recommendation caching.",
    "context_scenario": "200M DAU, playlist synchronization.",
    "expected_signals": [
      "data flow decomposition",
      "storage engine selection",
      "scalability and bottleneck mitigation",
      "fault tolerance and failure scenarios"
    ],
    "follow_up_probes": [
      "How does your architecture handle sudden 10x traffic spikes?",
      "What is the single point of failure and how do you eliminate it?"
    ],
    "question_family": "music-streaming",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "200M DAU, playlist synchronization.",
      "difficulty": "Senior"
    }
  },
  {
    "id": "distributed-secrets-manager",
    "title": "Distributed Cloud Secrets Manager & Key Management Service (AWS KMS Scale)",
    "topic": "Platform & Infrastructure",
    "subtopic": "Architecture & Scaling",
    "difficulty": "Staff",
    "prompt": "Design hardware security module backed encryption key storage with audit logging.",
    "context_scenario": "High availability, tamper-evident audit logs.",
    "expected_signals": [
      "data flow decomposition",
      "storage engine selection",
      "scalability and bottleneck mitigation",
      "fault tolerance and failure scenarios"
    ],
    "follow_up_probes": [
      "How does your architecture handle sudden 10x traffic spikes?",
      "What is the single point of failure and how do you eliminate it?"
    ],
    "question_family": "distributed-secrets-manager",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "High availability, tamper-evident audit logs.",
      "difficulty": "Staff"
    }
  },
  {
    "id": "package-registry",
    "title": "High-Throughput Software Package Registry (npm / PyPI Scale)",
    "topic": "Platform & Infrastructure",
    "subtopic": "Architecture & Scaling",
    "difficulty": "Senior",
    "prompt": "Design package registry handling immutable artifact downloads with edge caching.",
    "context_scenario": "1B package downloads/day, SHA-256 integrity verification.",
    "expected_signals": [
      "data flow decomposition",
      "storage engine selection",
      "scalability and bottleneck mitigation",
      "fault tolerance and failure scenarios"
    ],
    "follow_up_probes": [
      "How does your architecture handle sudden 10x traffic spikes?",
      "What is the single point of failure and how do you eliminate it?"
    ],
    "question_family": "package-registry",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "1B package downloads/day, SHA-256 integrity verification.",
      "difficulty": "Senior"
    }
  },
  {
    "id": "distributed-lock-service",
    "title": "Distributed Lock Service with Fencing Tokens (Chubby Scale)",
    "topic": "Platform & Infrastructure",
    "subtopic": "Architecture & Scaling",
    "difficulty": "Staff",
    "prompt": "Design consensus-based distributed lock manager with heartbeats and fencing tokens.",
    "context_scenario": "Consensus guarantees, preventing split-brain execution.",
    "expected_signals": [
      "data flow decomposition",
      "storage engine selection",
      "scalability and bottleneck mitigation",
      "fault tolerance and failure scenarios"
    ],
    "follow_up_probes": [
      "How does your architecture handle sudden 10x traffic spikes?",
      "What is the single point of failure and how do you eliminate it?"
    ],
    "question_family": "distributed-lock-service",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "Consensus guarantees, preventing split-brain execution.",
      "difficulty": "Staff"
    }
  },
  {
    "id": "customer-support-ticketing",
    "title": "Omnichannel Customer Support Ticket Routing System",
    "topic": "Platform & Infrastructure",
    "subtopic": "Architecture & Scaling",
    "difficulty": "Medium",
    "prompt": "Design real-time ticket assignment system with SLA breach escalation.",
    "context_scenario": "500k tickets/day, agent skill-based routing.",
    "expected_signals": [
      "data flow decomposition",
      "storage engine selection",
      "scalability and bottleneck mitigation",
      "fault tolerance and failure scenarios"
    ],
    "follow_up_probes": [
      "How does your architecture handle sudden 10x traffic spikes?",
      "What is the single point of failure and how do you eliminate it?"
    ],
    "question_family": "customer-support-ticketing",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "500k tickets/day, agent skill-based routing.",
      "difficulty": "Medium"
    }
  },
  {
    "id": "health-metrics-wearable",
    "title": "Wearable Health Telemetry & Anomaly Alerting Pipeline",
    "topic": "Streaming & Messaging",
    "subtopic": "Architecture & Scaling",
    "difficulty": "Senior",
    "prompt": "Design medical-grade wearable metrics ingestion with real-time arrhythmia alerting.",
    "context_scenario": "Sub-second emergency alerting, HIPAA compliant data tier.",
    "expected_signals": [
      "data flow decomposition",
      "storage engine selection",
      "scalability and bottleneck mitigation",
      "fault tolerance and failure scenarios"
    ],
    "follow_up_probes": [
      "How does your architecture handle sudden 10x traffic spikes?",
      "What is the single point of failure and how do you eliminate it?"
    ],
    "question_family": "health-metrics-wearable",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "Sub-second emergency alerting, HIPAA compliant data tier.",
      "difficulty": "Senior"
    }
  },
  {
    "id": "digital-wallet",
    "title": "P2P Digital Wallet & Peer Transfer Network (Venmo / CashApp Scale)",
    "topic": "Financial & Commerce",
    "subtopic": "Architecture & Scaling",
    "difficulty": "Senior",
    "prompt": "Design instant peer-to-peer balance transfer system with fraud scoring.",
    "context_scenario": "10k transfers/sec, ACID ledger balance guarantees.",
    "expected_signals": [
      "data flow decomposition",
      "storage engine selection",
      "scalability and bottleneck mitigation",
      "fault tolerance and failure scenarios"
    ],
    "follow_up_probes": [
      "How does your architecture handle sudden 10x traffic spikes?",
      "What is the single point of failure and how do you eliminate it?"
    ],
    "question_family": "digital-wallet",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "10k transfers/sec, ACID ledger balance guarantees.",
      "difficulty": "Senior"
    }
  },
  {
    "id": "live-sports-scores",
    "title": "Live Sports Score Updates & Push Notification Fan-Out",
    "topic": "Real-Time Communication",
    "subtopic": "Architecture & Scaling",
    "difficulty": "Medium",
    "prompt": "Design real-time score streaming system pushing updates to 10M concurrent mobile clients.",
    "context_scenario": "Sub-second broadcast fan-out, server-sent events / WebSockets.",
    "expected_signals": [
      "data flow decomposition",
      "storage engine selection",
      "scalability and bottleneck mitigation",
      "fault tolerance and failure scenarios"
    ],
    "follow_up_probes": [
      "How does your architecture handle sudden 10x traffic spikes?",
      "What is the single point of failure and how do you eliminate it?"
    ],
    "question_family": "live-sports-scores",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "Sub-second broadcast fan-out, server-sent events / WebSockets.",
      "difficulty": "Medium"
    }
  },
  {
    "id": "distributed-tracing-collector",
    "title": "Distributed Tracing Collector & Storage Pipeline (Jaeger / Zipkin)",
    "topic": "Platform & Infrastructure",
    "subtopic": "Architecture & Scaling",
    "difficulty": "Senior",
    "prompt": "Design tracing pipeline ingesting spans from 1000 microservices with adaptive tail-based sampling.",
    "context_scenario": "100k spans/sec, OpenTelemetry protocol.",
    "expected_signals": [
      "data flow decomposition",
      "storage engine selection",
      "scalability and bottleneck mitigation",
      "fault tolerance and failure scenarios"
    ],
    "follow_up_probes": [
      "How does your architecture handle sudden 10x traffic spikes?",
      "What is the single point of failure and how do you eliminate it?"
    ],
    "question_family": "distributed-tracing-collector",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "100k spans/sec, OpenTelemetry protocol.",
      "difficulty": "Senior"
    }
  },
  {
    "id": "cloud-file-sync",
    "title": "Cloud File Synchronization Service (Dropbox / Google Drive Scale)",
    "topic": "Storage & Caching",
    "subtopic": "Architecture & Scaling",
    "difficulty": "Staff",
    "prompt": "Design file sync client and server with block-level deduplication and delta sync.",
    "context_scenario": "100M users, 4MB chunked hashing.",
    "expected_signals": [
      "data flow decomposition",
      "storage engine selection",
      "scalability and bottleneck mitigation",
      "fault tolerance and failure scenarios"
    ],
    "follow_up_probes": [
      "How does your architecture handle sudden 10x traffic spikes?",
      "What is the single point of failure and how do you eliminate it?"
    ],
    "question_family": "cloud-file-sync",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "100M users, 4MB chunked hashing.",
      "difficulty": "Staff"
    }
  },
  {
    "id": "collaborative-whiteboard",
    "title": "Real-Time Collaborative Whiteboard Canvas (Miro / Figma Scale)",
    "topic": "Real-Time Communication",
    "subtopic": "Architecture & Scaling",
    "difficulty": "Senior",
    "prompt": "Design infinite canvas vector synchronization with spatial indexing and WebSockets.",
    "context_scenario": "100 concurrent drawing cursors per board.",
    "expected_signals": [
      "data flow decomposition",
      "storage engine selection",
      "scalability and bottleneck mitigation",
      "fault tolerance and failure scenarios"
    ],
    "follow_up_probes": [
      "How does your architecture handle sudden 10x traffic spikes?",
      "What is the single point of failure and how do you eliminate it?"
    ],
    "question_family": "collaborative-whiteboard",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "100 concurrent drawing cursors per board.",
      "difficulty": "Senior"
    }
  },
  {
    "id": "distributed-rate-limiter-service",
    "title": "Tiered Multi-Tenant Rate Limiting Service (Stripe API Scale)",
    "topic": "Platform & Infrastructure",
    "subtopic": "Architecture & Scaling",
    "difficulty": "Senior",
    "prompt": "Design multi-tier rate limiter enforcing per-customer and global rate tiers.",
    "context_scenario": "Sub-millisecond latency overhead, Redis cluster.",
    "expected_signals": [
      "data flow decomposition",
      "storage engine selection",
      "scalability and bottleneck mitigation",
      "fault tolerance and failure scenarios"
    ],
    "follow_up_probes": [
      "How does your architecture handle sudden 10x traffic spikes?",
      "What is the single point of failure and how do you eliminate it?"
    ],
    "question_family": "distributed-rate-limiter-service",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "Sub-millisecond latency overhead, Redis cluster.",
      "difficulty": "Senior"
    }
  },
  {
    "id": "search-engine-indexer",
    "title": "Inverted Index Generation Pipeline for Web Search",
    "topic": "Search & Geospatial",
    "subtopic": "Architecture & Scaling",
    "difficulty": "Staff",
    "prompt": "Design distributed inverted index builder using MapReduce and LSM storage.",
    "context_scenario": "Billions of web documents, term frequency indexing.",
    "expected_signals": [
      "data flow decomposition",
      "storage engine selection",
      "scalability and bottleneck mitigation",
      "fault tolerance and failure scenarios"
    ],
    "follow_up_probes": [
      "How does your architecture handle sudden 10x traffic spikes?",
      "What is the single point of failure and how do you eliminate it?"
    ],
    "question_family": "search-engine-indexer",
    "source_attribution": "Strop Curated System Design Bank",
    "metadata_json": {
      "scale": "Billions of web documents, term frequency indexing.",
      "difficulty": "Staff"
    }
  }
]
