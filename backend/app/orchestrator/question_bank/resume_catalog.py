"""Resume Technical Curated Probing Catalog.
Total Templates: 35
"""

from typing import Any

RESUME_CATALOG: list[dict[str, Any]] = [
  {
    "id": "res-kafka-architecture",
    "title": "Apache Kafka: Partitioning, Consumer Groups & Offsets",
    "topic": "Streaming & Event Driven",
    "subtopic": "Streaming Architecture",
    "difficulty": "Senior",
    "prompt": "I see Apache Kafka listed on your resume for high-throughput event processing. In your project, how did you choose your partition keys, what consumer group commit strategy did you adopt (auto-commit vs manual sync/async), and how did you prevent consumer rebalance storms?",
    "context_scenario": "Production Kafka deployment, high throughput events, consumer lag monitoring.",
    "expected_signals": [
      "partition key strategy ensuring uniform distribution without hot partitions",
      "manual commit with synchronous offset commits on critical paths vs asynchronous batch commits",
      "handling consumer rebalances: cooperative sticky assignor (Incremental Cooperative Rebalance)",
      "idempotent producer configuration (enable.idempotence=true) and ACKS=all"
    ],
    "follow_up_probes": [
      "What was your typical end-to-end consumer lag in milliseconds, and how did you alert on partition head-of-line blocking?",
      "If a consumer crashes after processing an event but before committing the offset, how did your downstream consumers prevent duplicate processing?"
    ],
    "question_family": "Kafka",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "Kafka",
      "evidence_sought": [
        "Partitioning logic",
        "Offset commit strategy",
        "Exactly-once vs at-least-once understanding"
      ]
    }
  },
  {
    "id": "res-redis-caching-patterns",
    "title": "Redis: Cache Invalidation, Stampede & Memory Optimization",
    "topic": "Caching & In-Memory Systems",
    "subtopic": "Distributed Caching",
    "difficulty": "Senior",
    "prompt": "You highlighted Redis for caching and session management. In your architecture, what cache invalidation strategy did you implement (write-through, cache-aside, write-behind), how did you prevent the Thundering Herd / Cache Stampede problem during key expirations, and what eviction policy did you configure?",
    "context_scenario": "High-read low-latency caching, TTL management, memory ceiling.",
    "expected_signals": [
      "cache-aside (lazy loading) with deterministic invalidation on database mutations",
      "cache stampede prevention: probabilistic early expiration (XFetch algorithm) or distributed mutex / singleflight locking",
      "eviction policy: allkeys-lru vs volatile-lru with maxmemory limit",
      "Redis memory optimization: hash structures instead of flat strings, ziplist encoding"
    ],
    "follow_up_probes": [
      "How did you handle the dual-write consistency problem when updating the database and evicting the cache?",
      "What happened to application p99 latencies if the Redis master node experienced a failover?"
    ],
    "question_family": "Redis",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "Redis",
      "evidence_sought": [
        "Dual-write consistency",
        "Cache stampede mitigation",
        "Eviction policy tuning"
      ]
    }
  },
  {
    "id": "res-postgresql-query-tuning",
    "title": "PostgreSQL: Query Optimization, Indexing & Connection Pooling",
    "topic": "Relational Databases",
    "subtopic": "Database Optimization",
    "difficulty": "Senior",
    "prompt": "Your resume emphasizes PostgreSQL for core transactional storage. Can you walk me through the most challenging slow query or locking bottleneck you diagnosed in production? How did you interpret the EXPLAIN ANALYZE execution plan, what indexes or schema changes did you apply, and how did you manage connection pooling?",
    "context_scenario": "Production PostgreSQL database, slow queries, lock contention, connection pooling with PgBouncer.",
    "expected_signals": [
      "interpreting EXPLAIN (ANALYZE, BUFFERS): distinguishing index seek vs bitmap index scan vs sequential heap scan",
      "identifying high buffer read counts and temporary disk sorts",
      "connection pooling: PgBouncer transaction pooling vs session pooling to eliminate backend process fork overhead",
      "lock contention analysis: pg_stat_activity, pg_locks, preventing table-level ACCESS EXCLUSIVE locks during schema migrations"
    ],
    "follow_up_probes": [
      "How did you ensure that adding a new index to a multi-million-row production table did not block live customer writes? (CREATE INDEX CONCURRENTLY)",
      "What was your autovacuum tuning strategy for high-update tables to avoid bloat and transaction ID wraparound?"
    ],
    "question_family": "PostgreSQL",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "PostgreSQL",
      "evidence_sought": [
        "EXPLAIN ANALYZE mastery",
        "Non-blocking indexing",
        "Connection pool sizing"
      ]
    }
  },
  {
    "id": "res-microservices-resiliency",
    "title": "Microservice Resiliency: Circuit Breakers, Retries & Fallbacks",
    "topic": "Distributed Architecture",
    "subtopic": "System Resiliency",
    "difficulty": "Senior",
    "prompt": "You mentioned designing microservices. When Service A calls Service B synchronously over HTTP or gRPC and Service B degrades or experiences latency spikes, how does your system prevent cascading thread pool exhaustion across your entire fleet?",
    "context_scenario": "Inter-service RPC, timeout budgets, cascading failures, circuit breaking.",
    "expected_signals": [
      "strict request timeouts and deadline propagation (e.g. gRPC context deadlines)",
      "circuit breaker pattern (e.g. Resilience4j / Envoy) transitioning between Closed, Open, and Half-Open states",
      "exponential backoff with jitter on retries to avoid retry storms against struggling downstream services",
      "graceful degradation: returning cached stale data or fallback defaults rather than returning HTTP 500"
    ],
    "follow_up_probes": [
      "Why can unjittered retries cause a struggling microservice to experience immediate permanent collapse? (Retry storm)",
      "How did you implement distributed tracing (OpenTelemetry / Jaeger) across your service boundaries to trace cross-service latency?"
    ],
    "question_family": "Microservices",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "Microservices",
      "evidence_sought": [
        "Deadline propagation",
        "Circuit breakers",
        "Distributed tracing"
      ]
    }
  },
  {
    "id": "res-kubernetes-production",
    "title": "Kubernetes: Pod Disruption, Health Probes & Resource Sizing",
    "topic": "Cloud & DevOps",
    "subtopic": "Container Orchestration",
    "difficulty": "Senior",
    "prompt": "Your profile mentions deploying applications on Kubernetes. In production, how did you configure your liveness versus readiness probes to prevent cascading restarts, how did you handle graceful shutdown (SIGTERM vs SIGKILL), and how did you determine CPU/memory requests versus limits?",
    "context_scenario": "Production EKS/GKE cluster, zero-downtime rolling deploys, pod lifecycle.",
    "expected_signals": [
      "readiness probe removes pod from service endpoint traffic without restarting container; liveness probe restarts unhealthy container",
      "avoiding aggressive liveness probes that trigger restart loops when app is under heavy load",
      "graceful shutdown: handling SIGTERM, closing listening sockets, completing in-flight transactions, preStop sleep hook to allow iptables/kube-proxy to drain",
      "resource requests (guaranteed scheduling) vs limits (throttling on CPU, OOM-kill on memory); avoiding CPU limit throttling"
    ],
    "follow_up_probes": [
      "What happens if an application fails its readiness probe? How does this differ from failing its liveness probe?",
      "Why does exceeding a memory limit cause immediate SIGKILL (OOM 137) whereas exceeding a CPU limit merely throttles execution?"
    ],
    "question_family": "Kubernetes",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "Kubernetes",
      "evidence_sought": [
        "Probe discrimination",
        "Graceful shutdown handling",
        "Memory vs CPU limits"
      ]
    }
  },
  {
    "id": "res-docker-optimization",
    "title": "Docker: Multi-Stage Builds, Security & Image Optimization",
    "topic": "Containerization",
    "subtopic": "Container Security",
    "difficulty": "Medium",
    "prompt": "You noted Docker in your tech stack. How did you optimize your production Dockerfiles for minimal image size, build caching speed, and container security?",
    "context_scenario": "Container image layers, multi-stage builds, non-root users, vulnerability scanning.",
    "expected_signals": [
      "multi-stage builds separating build tooling (compilers, devDependencies) from final minimal runtime image (Alpine/Distroless)",
      "ordering Dockerfile instructions from least frequently changed to most frequently changed to maximize layer cache hits",
      "running containers as dedicated non-root users (UID > 1000) with read-only root filesystems",
      "scanning container images in CI/CD using Trivy / Clair for CVEs"
    ],
    "follow_up_probes": [
      "Why is it dangerous to run containers as the default root user even if isolated in a container namespace?",
      "How do multi-stage Docker builds reduce the attack surface of production images?"
    ],
    "question_family": "Docker",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "Docker",
      "evidence_sought": [
        "Multi-stage builds",
        "Layer caching",
        "Non-root execution"
      ]
    }
  },
  {
    "id": "res-graphql-vs-rest",
    "title": "GraphQL: N+1 Query Problem & Dataloader Architecture",
    "topic": "API Design",
    "subtopic": "API Architecture",
    "difficulty": "Senior",
    "prompt": "You listed GraphQL APIs on your resume. How did your backend resolve the notorious N+1 query problem when resolving nested relational fields, and how did you prevent malicious client queries from DOSing your database with deeply nested queries?",
    "context_scenario": "GraphQL resolvers, DataLoader batching, query depth limiting.",
    "expected_signals": [
      "DataLoader pattern: batches and deduplicates individual resolver database requests within a single tick of the event loop",
      "query complexity and depth limiting middleware rejecting queries exceeding configured AST depth or node budget",
      "persisted queries: whitelist pre-approved query hashes from frontend, preventing arbitrary ad-hoc queries in production",
      "caching at the HTTP/CDN layer using cache-control headers on individual fields"
    ],
    "follow_up_probes": [
      "Walk through how a DataLoader uses asynchronous microtasks to batch 50 individual author queries into a single 'SELECT * WHERE id IN (...)' query.",
      "How do you handle pagination in GraphQL without loading entire result sets into server memory? (Relay Cursor Connections)"
    ],
    "question_family": "GraphQL",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "GraphQL",
      "evidence_sought": [
        "DataLoader batching",
        "Query complexity limits",
        "Cursor pagination"
      ]
    }
  },
  {
    "id": "res-websocket-scale",
    "title": "WebSockets: State Management, Horizontal Scaling & Heartbeats",
    "topic": "Real-Time Protocols",
    "subtopic": "Real-Time Scaling",
    "difficulty": "Senior",
    "prompt": "Your resume includes real-time WebSockets. When scaling your WebSocket server horizontally across multiple backend instances, how did you broadcast messages to users connected to different servers, and how did you detect zombie connections?",
    "context_scenario": "Long-lived TCP connections, Redis Pub/Sub backplane, heartbeat ping/pong.",
    "expected_signals": [
      "Redis Pub/Sub or Kafka backplane broadcasting messages across all WebSocket server nodes",
      "each server maintains in-memory map of local client connections (connection_id -> socket)",
      "periodic bidirectional heartbeat (ping/pong frames) terminating zombie sockets that dropped without sending TCP FIN",
      "load balancer configuration with sticky sessions (session affinity) during initial HTTP upgrade handshake"
    ],
    "follow_up_probes": [
      "Why do WebSocket connections prevent standard stateless round-robin load balancing after the connection is established?",
      "How do you handle server deployments without disconnecting thousands of concurrent WebSocket clients simultaneously? (Graceful rolling drain)"
    ],
    "question_family": "WebSockets",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "WebSockets",
      "evidence_sought": [
        "Pub/Sub backplane",
        "Zombie detection",
        "Connection draining"
      ]
    }
  },
  {
    "id": "res-elasticsearch-indexing",
    "title": "Elasticsearch: Sharding, Mappings & Bulk Ingestion",
    "topic": "Search & Analytics",
    "subtopic": "Search Engineering",
    "difficulty": "Senior",
    "prompt": "You mentioned Elasticsearch for search and log analysis. How did you design your index mappings (analyzed vs keyword), determine your primary and replica shard counts, and optimize bulk ingestion throughput?",
    "context_scenario": "Lucene segments, inverted index, text analyzers, tokenizers, shard allocation.",
    "expected_signals": [
      "explicit index mappings: choosing 'keyword' for exact filtering/sorting and 'text' with standard/custom analyzers for full-text search",
      "shard sizing guideline: keeping shard sizes between 20GB and 50GB to avoid small-shard cluster state bloat or giant unmanageable shards",
      "bulk ingestion optimization: refresh_interval = -1 during bulk loads, replica count = 0 during initial indexing, bulk API batching",
      "understanding Lucene segment merges and read vs write amplification"
    ],
    "follow_up_probes": [
      "What happens if an index has too many small shards (oversharding) in terms of cluster master node heap memory and query latency?",
      "Explain the difference between a query in 'filter' context (cached, score ignored) versus 'query' context (relevance score calculated)."
    ],
    "question_family": "Elasticsearch",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "Elasticsearch",
      "evidence_sought": [
        "Mapping design",
        "Shard sizing",
        "Filter vs Query context"
      ]
    }
  },
  {
    "id": "res-go-concurrency-patterns",
    "title": "Golang: Goroutines, Channels, Mutexes & Memory Leak Prevention",
    "topic": "Language & Concurrency",
    "subtopic": "Systems Engineering",
    "difficulty": "Senior",
    "prompt": "Your resume highlights Go backend services. In your Go projects, how did you avoid goroutine leaks, when did you prefer sync.Mutex over channels, and how did you profile memory and CPU using pprof?",
    "context_scenario": "Goroutine lifecycle, context cancellation, select statement, pprof profiling.",
    "expected_signals": [
      "goroutine leak prevention: ensuring every goroutine has an explicit termination condition and respects context.Context cancellation (ctx.Done())",
      "philosophy: share memory by communicating (channels for ownership transfer/pipelines) vs communicate by sharing memory (sync.Mutex for high-throughput state caches)",
      "buffered vs unbuffered channels: avoiding deadlock when buffer fills",
      "profiling with pprof: identifying heap allocations, mutex contention, and block profiling"
    ],
    "follow_up_probes": [
      "Can you write a code snippet demonstrating how a goroutine leaks when reading from an unbuffered channel whose receiver terminates early?",
      "How does Go's garbage collector (concurrent tri-color mark and sweep) achieve sub-millisecond stop-the-world pauses?"
    ],
    "question_family": "Go",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "Go",
      "evidence_sought": [
        "Goroutine leak prevention",
        "Mutex vs channel choice",
        "pprof profiling"
      ]
    }
  },
  {
    "id": "res-grpc-protobuf",
    "title": "gRPC & Protocol Buffers: Serialization, Streaming & Schema Evolution",
    "topic": "Protocols & RPC",
    "subtopic": "RPC Protocols",
    "difficulty": "Senior",
    "prompt": "You listed gRPC and Protobuf for inter-service communication. How does Protocol Buffers serialization outperform JSON in CPU efficiency and payload size, how did you manage backwards compatibility in schema evolution, and when did you use streaming RPCs?",
    "context_scenario": "Binary wire format, varints, field tags, backwards compatibility, HTTP/2 transport.",
    "expected_signals": [
      "Protobuf encodes fields using binary tag-length-value with varint encoding, stripping field names from the wire",
      "CPU efficiency: binary deserialization avoids string parsing, JSON AST construction, and number parsing",
      "schema evolution rules: NEVER change existing field tag numbers; only add new optional fields; reserve deleted tags",
      "HTTP/2 multiplexing enabling unary, client-streaming, server-streaming, and bidirectional streaming RPCs"
    ],
    "follow_up_probes": [
      "Why is changing a field number in a .proto file considered a catastrophic breaking change across microservices?",
      "How do gRPC deadlines (timeouts) propagate across a multi-hop microservice chain?"
    ],
    "question_family": "gRPC",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "gRPC",
      "evidence_sought": [
        "Binary wire format understanding",
        "Tag reservation in schema evolution",
        "Streaming RPC use cases"
      ]
    }
  },
  {
    "id": "res-ci-cd-pipelines",
    "title": "CI/CD & Deployment Strategies: Blue-Green vs Canary Releases",
    "topic": "DevOps & Delivery",
    "subtopic": "Release Engineering",
    "difficulty": "Senior",
    "prompt": "Your resume emphasizes modern CI/CD pipelines. Can you contrast Blue-Green deployments with Canary releases? In your pipeline, how did you automate automated rollbacks based on error budget or Prometheus metric breaches?",
    "context_scenario": "Zero-downtime deployment, traffic routing, automated rollback, smoke testing.",
    "expected_signals": [
      "Blue-Green switches 100% of router traffic from environment A to environment B instantly after smoke tests pass",
      "Canary deploys route small percentage (1%, 5%, 10%) of real user traffic to the new version, comparing error rates and latency against baseline",
      "automated rollback triggered if HTTP 5xx error rate or P99 latency exceeds defined threshold within evaluation window",
      "database schema migrations must remain backwards-compatible with both old and new versions (Expand-Contract / Parallel Run pattern)"
    ],
    "follow_up_probes": [
      "Why does a Blue-Green deployment require database changes to be compatible with both the Blue and Green code versions simultaneously?",
      "How does progressive traffic shifting in a Canary release protect users from subtle performance regressions?"
    ],
    "question_family": "CI/CD",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "CI/CD",
      "evidence_sought": [
        "Canary analysis",
        "Expand-contract migrations",
        "Automated rollbacks"
      ]
    }
  },
  {
    "id": "res-aws-dynamodb",
    "title": "Amazon DynamoDB: Single-Table Design & Partition Keys",
    "topic": "NoSQL Databases",
    "subtopic": "Technology Grounding",
    "difficulty": "Senior",
    "prompt": "Your resume highlights experience with Amazon DynamoDB. In your production environment, how did you evaluate the architectural trade-offs, diagnose failure modes, and ensure operational stability under heavy load?",
    "context_scenario": "Verified resume claim scenario: DynamoDB single table design, GSI, LSI, hot partition mitigation.",
    "expected_signals": [
      "demonstrated deep technical proficiency with Amazon DynamoDB",
      "ability to cite real operational metrics and architecture decisions",
      "understanding of failure modes and trade-offs"
    ],
    "follow_up_probes": [
      "What was the most difficult bug or outage you encountered with this technology?",
      "What alternative technologies did you consider, and why did you choose this one?"
    ],
    "question_family": "res-aws-dynamodb",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "Amazon DynamoDB",
      "difficulty": "Senior"
    }
  },
  {
    "id": "res-react-performance",
    "title": "React Architecture: Render Optimization, Memoization & Virtual DOM",
    "topic": "Frontend Architecture",
    "subtopic": "Technology Grounding",
    "difficulty": "Senior",
    "prompt": "Your resume highlights experience with React Architecture. In your production environment, how did you evaluate the architectural trade-offs, diagnose failure modes, and ensure operational stability under heavy load?",
    "context_scenario": "Verified resume claim scenario: useMemo, useCallback, React Compiler, reconciliation fiber tree.",
    "expected_signals": [
      "demonstrated deep technical proficiency with React Architecture",
      "ability to cite real operational metrics and architecture decisions",
      "understanding of failure modes and trade-offs"
    ],
    "follow_up_probes": [
      "What was the most difficult bug or outage you encountered with this technology?",
      "What alternative technologies did you consider, and why did you choose this one?"
    ],
    "question_family": "res-react-performance",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "React Architecture",
      "difficulty": "Senior"
    }
  },
  {
    "id": "res-cassandra-scale",
    "title": "Apache Cassandra: Wide-Column Partitioning & Tombstones",
    "topic": "NoSQL Databases",
    "subtopic": "Technology Grounding",
    "difficulty": "Senior",
    "prompt": "Your resume highlights experience with Apache Cassandra. In your production environment, how did you evaluate the architectural trade-offs, diagnose failure modes, and ensure operational stability under heavy load?",
    "context_scenario": "Verified resume claim scenario: Partition keys vs clustering columns, tombstone accumulation, compaction.",
    "expected_signals": [
      "demonstrated deep technical proficiency with Apache Cassandra",
      "ability to cite real operational metrics and architecture decisions",
      "understanding of failure modes and trade-offs"
    ],
    "follow_up_probes": [
      "What was the most difficult bug or outage you encountered with this technology?",
      "What alternative technologies did you consider, and why did you choose this one?"
    ],
    "question_family": "res-cassandra-scale",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "Apache Cassandra",
      "difficulty": "Senior"
    }
  },
  {
    "id": "res-rabbitmq-queues",
    "title": "RabbitMQ: AMQP Exchanges, Dead Letter Queues & Prefetch",
    "topic": "Message Queuing",
    "subtopic": "Technology Grounding",
    "difficulty": "Medium",
    "prompt": "Your resume highlights experience with RabbitMQ. In your production environment, how did you evaluate the architectural trade-offs, diagnose failure modes, and ensure operational stability under heavy load?",
    "context_scenario": "Verified resume claim scenario: Direct vs Topic vs Fanout exchanges, prefetch count tuning, ack modes.",
    "expected_signals": [
      "demonstrated deep technical proficiency with RabbitMQ",
      "ability to cite real operational metrics and architecture decisions",
      "understanding of failure modes and trade-offs"
    ],
    "follow_up_probes": [
      "What was the most difficult bug or outage you encountered with this technology?",
      "What alternative technologies did you consider, and why did you choose this one?"
    ],
    "question_family": "res-rabbitmq-queues",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "RabbitMQ",
      "difficulty": "Medium"
    }
  },
  {
    "id": "res-terraform-iac",
    "title": "Terraform & Infrastructure as Code: State Locking & Drift",
    "topic": "Infrastructure",
    "subtopic": "Technology Grounding",
    "difficulty": "Senior",
    "prompt": "Your resume highlights experience with Terraform & Infrastructure as Code. In your production environment, how did you evaluate the architectural trade-offs, diagnose failure modes, and ensure operational stability under heavy load?",
    "context_scenario": "Verified resume claim scenario: Remote state locking with S3 and DynamoDB, modularization, terraform plan.",
    "expected_signals": [
      "demonstrated deep technical proficiency with Terraform & Infrastructure as Code",
      "ability to cite real operational metrics and architecture decisions",
      "understanding of failure modes and trade-offs"
    ],
    "follow_up_probes": [
      "What was the most difficult bug or outage you encountered with this technology?",
      "What alternative technologies did you consider, and why did you choose this one?"
    ],
    "question_family": "res-terraform-iac",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "Terraform & Infrastructure as Code",
      "difficulty": "Senior"
    }
  },
  {
    "id": "res-oauth2-oidc",
    "title": "OAuth 2.0 & OIDC: PKCE, Token Refresh & Security Invariants",
    "topic": "Security & Auth",
    "subtopic": "Technology Grounding",
    "difficulty": "Senior",
    "prompt": "Your resume highlights experience with OAuth 2.0 & OIDC. In your production environment, how did you evaluate the architectural trade-offs, diagnose failure modes, and ensure operational stability under heavy load?",
    "context_scenario": "Verified resume claim scenario: Authorization Code flow with PKCE, JWT validation, refresh token rotation.",
    "expected_signals": [
      "demonstrated deep technical proficiency with OAuth 2.0 & OIDC",
      "ability to cite real operational metrics and architecture decisions",
      "understanding of failure modes and trade-offs"
    ],
    "follow_up_probes": [
      "What was the most difficult bug or outage you encountered with this technology?",
      "What alternative technologies did you consider, and why did you choose this one?"
    ],
    "question_family": "res-oauth2-oidc",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "OAuth 2.0 & OIDC",
      "difficulty": "Senior"
    }
  },
  {
    "id": "res-rust-memory-safety",
    "title": "Rust: Ownership, Borrow Checker, Lifetimes & Zero-Cost Abstractions",
    "topic": "Systems Programming",
    "subtopic": "Technology Grounding",
    "difficulty": "Senior",
    "prompt": "Your resume highlights experience with Rust. In your production environment, how did you evaluate the architectural trade-offs, diagnose failure modes, and ensure operational stability under heavy load?",
    "context_scenario": "Verified resume claim scenario: Borrow checker rules, Send/Sync traits, unsafe Rust boundaries.",
    "expected_signals": [
      "demonstrated deep technical proficiency with Rust",
      "ability to cite real operational metrics and architecture decisions",
      "understanding of failure modes and trade-offs"
    ],
    "follow_up_probes": [
      "What was the most difficult bug or outage you encountered with this technology?",
      "What alternative technologies did you consider, and why did you choose this one?"
    ],
    "question_family": "res-rust-memory-safety",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "Rust",
      "difficulty": "Senior"
    }
  },
  {
    "id": "res-spring-boot-internals",
    "title": "Spring Boot: Dependency Injection, AOP Proxies & Virtual Threads",
    "topic": "Backend Frameworks",
    "subtopic": "Technology Grounding",
    "difficulty": "Senior",
    "prompt": "Your resume highlights experience with Spring Boot. In your production environment, how did you evaluate the architectural trade-offs, diagnose failure modes, and ensure operational stability under heavy load?",
    "context_scenario": "Verified resume claim scenario: CGLIB vs JDK dynamic proxies, transaction management, Project Loom.",
    "expected_signals": [
      "demonstrated deep technical proficiency with Spring Boot",
      "ability to cite real operational metrics and architecture decisions",
      "understanding of failure modes and trade-offs"
    ],
    "follow_up_probes": [
      "What was the most difficult bug or outage you encountered with this technology?",
      "What alternative technologies did you consider, and why did you choose this one?"
    ],
    "question_family": "res-spring-boot-internals",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "Spring Boot",
      "difficulty": "Senior"
    }
  },
  {
    "id": "res-mongodb-sharding",
    "title": "MongoDB: Sharding, Replica Sets & Write Concerns",
    "topic": "NoSQL Databases",
    "subtopic": "Technology Grounding",
    "difficulty": "Medium",
    "prompt": "Your resume highlights experience with MongoDB. In your production environment, how did you evaluate the architectural trade-offs, diagnose failure modes, and ensure operational stability under heavy load?",
    "context_scenario": "Verified resume claim scenario: w:majority write concern, oplog replication, shard key selection.",
    "expected_signals": [
      "demonstrated deep technical proficiency with MongoDB",
      "ability to cite real operational metrics and architecture decisions",
      "understanding of failure modes and trade-offs"
    ],
    "follow_up_probes": [
      "What was the most difficult bug or outage you encountered with this technology?",
      "What alternative technologies did you consider, and why did you choose this one?"
    ],
    "question_family": "res-mongodb-sharding",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "MongoDB",
      "difficulty": "Medium"
    }
  },
  {
    "id": "res-opentelemetry-tracing",
    "title": "OpenTelemetry: Distributed Context Propagation & Spans",
    "topic": "Observability",
    "subtopic": "Technology Grounding",
    "difficulty": "Senior",
    "prompt": "Your resume highlights experience with OpenTelemetry. In your production environment, how did you evaluate the architectural trade-offs, diagnose failure modes, and ensure operational stability under heavy load?",
    "context_scenario": "Verified resume claim scenario: W3C trace context, span propagation across async message queues, sampling.",
    "expected_signals": [
      "demonstrated deep technical proficiency with OpenTelemetry",
      "ability to cite real operational metrics and architecture decisions",
      "understanding of failure modes and trade-offs"
    ],
    "follow_up_probes": [
      "What was the most difficult bug or outage you encountered with this technology?",
      "What alternative technologies did you consider, and why did you choose this one?"
    ],
    "question_family": "res-opentelemetry-tracing",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "OpenTelemetry",
      "difficulty": "Senior"
    }
  },
  {
    "id": "res-serverless-lambdas",
    "title": "Serverless & AWS Lambda: Cold Starts, Concurrency & VPC Networking",
    "topic": "Cloud Architecture",
    "subtopic": "Technology Grounding",
    "difficulty": "Medium",
    "prompt": "Your resume highlights experience with Serverless & AWS Lambda. In your production environment, how did you evaluate the architectural trade-offs, diagnose failure modes, and ensure operational stability under heavy load?",
    "context_scenario": "Verified resume claim scenario: SnapStart, provisioned concurrency, connection pooling with RDS Proxy.",
    "expected_signals": [
      "demonstrated deep technical proficiency with Serverless & AWS Lambda",
      "ability to cite real operational metrics and architecture decisions",
      "understanding of failure modes and trade-offs"
    ],
    "follow_up_probes": [
      "What was the most difficult bug or outage you encountered with this technology?",
      "What alternative technologies did you consider, and why did you choose this one?"
    ],
    "question_family": "res-serverless-lambdas",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "Serverless & AWS Lambda",
      "difficulty": "Medium"
    }
  },
  {
    "id": "res-apache-flink",
    "title": "Apache Flink: Stateful Stream Processing & Event-Time Watermarks",
    "topic": "Stream Processing",
    "subtopic": "Technology Grounding",
    "difficulty": "Staff",
    "prompt": "Your resume highlights experience with Apache Flink. In your production environment, how did you evaluate the architectural trade-offs, diagnose failure modes, and ensure operational stability under heavy load?",
    "context_scenario": "Verified resume claim scenario: Event time vs processing time, watermarks, exactly-once checkpointing.",
    "expected_signals": [
      "demonstrated deep technical proficiency with Apache Flink",
      "ability to cite real operational metrics and architecture decisions",
      "understanding of failure modes and trade-offs"
    ],
    "follow_up_probes": [
      "What was the most difficult bug or outage you encountered with this technology?",
      "What alternative technologies did you consider, and why did you choose this one?"
    ],
    "question_family": "res-apache-flink",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "Apache Flink",
      "difficulty": "Staff"
    }
  },
  {
    "id": "res-nginx-reverse-proxy",
    "title": "NGINX: Worker Architecture, Connection Tuning & TLS Offloading",
    "topic": "Web Servers",
    "subtopic": "Technology Grounding",
    "difficulty": "Medium",
    "prompt": "Your resume highlights experience with NGINX. In your production environment, how did you evaluate the architectural trade-offs, diagnose failure modes, and ensure operational stability under heavy load?",
    "context_scenario": "Verified resume claim scenario: Event-driven asynchronous worker processes, keepalive tuning, upstream load balancing.",
    "expected_signals": [
      "demonstrated deep technical proficiency with NGINX",
      "ability to cite real operational metrics and architecture decisions",
      "understanding of failure modes and trade-offs"
    ],
    "follow_up_probes": [
      "What was the most difficult bug or outage you encountered with this technology?",
      "What alternative technologies did you consider, and why did you choose this one?"
    ],
    "question_family": "res-nginx-reverse-proxy",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "NGINX",
      "difficulty": "Medium"
    }
  },
  {
    "id": "res-vault-secrets",
    "title": "HashiCorp Vault: Dynamic Secrets, Transit Encryption & AppRole",
    "topic": "Security",
    "subtopic": "Technology Grounding",
    "difficulty": "Senior",
    "prompt": "Your resume highlights experience with HashiCorp Vault. In your production environment, how did you evaluate the architectural trade-offs, diagnose failure modes, and ensure operational stability under heavy load?",
    "context_scenario": "Verified resume claim scenario: Dynamic database credentials, encryption-as-a-service, leasing and revocation.",
    "expected_signals": [
      "demonstrated deep technical proficiency with HashiCorp Vault",
      "ability to cite real operational metrics and architecture decisions",
      "understanding of failure modes and trade-offs"
    ],
    "follow_up_probes": [
      "What was the most difficult bug or outage you encountered with this technology?",
      "What alternative technologies did you consider, and why did you choose this one?"
    ],
    "question_family": "res-vault-secrets",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "HashiCorp Vault",
      "difficulty": "Senior"
    }
  },
  {
    "id": "res-nextjs-ssr",
    "title": "Next.js: App Router, Server Components & Streaming SSR",
    "topic": "Frontend Frameworks",
    "subtopic": "Technology Grounding",
    "difficulty": "Senior",
    "prompt": "Your resume highlights experience with Next.js. In your production environment, how did you evaluate the architectural trade-offs, diagnose failure modes, and ensure operational stability under heavy load?",
    "context_scenario": "Verified resume claim scenario: React Server Components (RSC), Suspense boundaries, static vs dynamic rendering.",
    "expected_signals": [
      "demonstrated deep technical proficiency with Next.js",
      "ability to cite real operational metrics and architecture decisions",
      "understanding of failure modes and trade-offs"
    ],
    "follow_up_probes": [
      "What was the most difficult bug or outage you encountered with this technology?",
      "What alternative technologies did you consider, and why did you choose this one?"
    ],
    "question_family": "res-nextjs-ssr",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "Next.js",
      "difficulty": "Senior"
    }
  },
  {
    "id": "res-envoy-proxy",
    "title": "Envoy Proxy: Service Mesh, mTLS & Filter Chains",
    "topic": "Networking & Mesh",
    "subtopic": "Technology Grounding",
    "difficulty": "Staff",
    "prompt": "Your resume highlights experience with Envoy Proxy. In your production environment, how did you evaluate the architectural trade-offs, diagnose failure modes, and ensure operational stability under heavy load?",
    "context_scenario": "Verified resume claim scenario: Service-to-service mTLS, distributed rate limiting filter, circuit breaking.",
    "expected_signals": [
      "demonstrated deep technical proficiency with Envoy Proxy",
      "ability to cite real operational metrics and architecture decisions",
      "understanding of failure modes and trade-offs"
    ],
    "follow_up_probes": [
      "What was the most difficult bug or outage you encountered with this technology?",
      "What alternative technologies did you consider, and why did you choose this one?"
    ],
    "question_family": "res-envoy-proxy",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "Envoy Proxy",
      "difficulty": "Staff"
    }
  },
  {
    "id": "res-clickhouse-olap",
    "title": "ClickHouse: Columnar Storage, Vectorized Execution & MergeTree",
    "topic": "Analytics Databases",
    "subtopic": "Technology Grounding",
    "difficulty": "Senior",
    "prompt": "Your resume highlights experience with ClickHouse. In your production environment, how did you evaluate the architectural trade-offs, diagnose failure modes, and ensure operational stability under heavy load?",
    "context_scenario": "Verified resume claim scenario: MergeTree engine family, columnar compression, real-time analytics aggregation.",
    "expected_signals": [
      "demonstrated deep technical proficiency with ClickHouse",
      "ability to cite real operational metrics and architecture decisions",
      "understanding of failure modes and trade-offs"
    ],
    "follow_up_probes": [
      "What was the most difficult bug or outage you encountered with this technology?",
      "What alternative technologies did you consider, and why did you choose this one?"
    ],
    "question_family": "res-clickhouse-olap",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "ClickHouse",
      "difficulty": "Senior"
    }
  },
  {
    "id": "res-redis-streams",
    "title": "Redis Streams: Consumer Groups, PEL & XREADGROUP",
    "topic": "Message Streaming",
    "subtopic": "Technology Grounding",
    "difficulty": "Senior",
    "prompt": "Your resume highlights experience with Redis Streams. In your production environment, how did you evaluate the architectural trade-offs, diagnose failure modes, and ensure operational stability under heavy load?",
    "context_scenario": "Verified resume claim scenario: Consumer groups, Pending Entries List (PEL), message acknowledgment vs Kafka.",
    "expected_signals": [
      "demonstrated deep technical proficiency with Redis Streams",
      "ability to cite real operational metrics and architecture decisions",
      "understanding of failure modes and trade-offs"
    ],
    "follow_up_probes": [
      "What was the most difficult bug or outage you encountered with this technology?",
      "What alternative technologies did you consider, and why did you choose this one?"
    ],
    "question_family": "res-redis-streams",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "Redis Streams",
      "difficulty": "Senior"
    }
  },
  {
    "id": "res-graphql-federation",
    "title": "GraphQL Federation: Apollo Federation, Subgraphs & Gateway Planning",
    "topic": "API Architecture",
    "subtopic": "Technology Grounding",
    "difficulty": "Staff",
    "prompt": "Your resume highlights experience with GraphQL Federation. In your production environment, how did you evaluate the architectural trade-offs, diagnose failure modes, and ensure operational stability under heavy load?",
    "context_scenario": "Verified resume claim scenario: Distributed GraphQL schema composition, query planning, entity resolution.",
    "expected_signals": [
      "demonstrated deep technical proficiency with GraphQL Federation",
      "ability to cite real operational metrics and architecture decisions",
      "understanding of failure modes and trade-offs"
    ],
    "follow_up_probes": [
      "What was the most difficult bug or outage you encountered with this technology?",
      "What alternative technologies did you consider, and why did you choose this one?"
    ],
    "question_family": "res-graphql-federation",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "GraphQL Federation",
      "difficulty": "Staff"
    }
  },
  {
    "id": "res-istio-service-mesh",
    "title": "Istio Service Mesh: Traffic Routing, Canary Deployments & Telemetry",
    "topic": "Cloud & DevOps",
    "subtopic": "Technology Grounding",
    "difficulty": "Senior",
    "prompt": "Your resume highlights experience with Istio Service Mesh. In your production environment, how did you evaluate the architectural trade-offs, diagnose failure modes, and ensure operational stability under heavy load?",
    "context_scenario": "Verified resume claim scenario: VirtualServices, DestinationRules, fault injection, Envoy sidecar injection.",
    "expected_signals": [
      "demonstrated deep technical proficiency with Istio Service Mesh",
      "ability to cite real operational metrics and architecture decisions",
      "understanding of failure modes and trade-offs"
    ],
    "follow_up_probes": [
      "What was the most difficult bug or outage you encountered with this technology?",
      "What alternative technologies did you consider, and why did you choose this one?"
    ],
    "question_family": "res-istio-service-mesh",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "Istio Service Mesh",
      "difficulty": "Senior"
    }
  },
  {
    "id": "res-snowflake-data-warehouse",
    "title": "Snowflake Data Warehouse: Virtual Warehouses & Micro-Partitioning",
    "topic": "Data Engineering",
    "subtopic": "Technology Grounding",
    "difficulty": "Senior",
    "prompt": "Your resume highlights experience with Snowflake Data Warehouse. In your production environment, how did you evaluate the architectural trade-offs, diagnose failure modes, and ensure operational stability under heavy load?",
    "context_scenario": "Verified resume claim scenario: Decoupled storage and compute, clustering keys, zero-copy cloning.",
    "expected_signals": [
      "demonstrated deep technical proficiency with Snowflake Data Warehouse",
      "ability to cite real operational metrics and architecture decisions",
      "understanding of failure modes and trade-offs"
    ],
    "follow_up_probes": [
      "What was the most difficult bug or outage you encountered with this technology?",
      "What alternative technologies did you consider, and why did you choose this one?"
    ],
    "question_family": "res-snowflake-data-warehouse",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "Snowflake Data Warehouse",
      "difficulty": "Senior"
    }
  },
  {
    "id": "res-grpc-web",
    "title": "gRPC-Web: Envoy Gateway Translation & Streaming in Browser",
    "topic": "Web Protocols",
    "subtopic": "Technology Grounding",
    "difficulty": "Medium",
    "prompt": "Your resume highlights experience with gRPC-Web. In your production environment, how did you evaluate the architectural trade-offs, diagnose failure modes, and ensure operational stability under heavy load?",
    "context_scenario": "Verified resume claim scenario: HTTP/2 to HTTP/1.1 gRPC translation, base64 payload framing, browser limits.",
    "expected_signals": [
      "demonstrated deep technical proficiency with gRPC-Web",
      "ability to cite real operational metrics and architecture decisions",
      "understanding of failure modes and trade-offs"
    ],
    "follow_up_probes": [
      "What was the most difficult bug or outage you encountered with this technology?",
      "What alternative technologies did you consider, and why did you choose this one?"
    ],
    "question_family": "res-grpc-web",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "gRPC-Web",
      "difficulty": "Medium"
    }
  },
  {
    "id": "res-postgresql-logical-replication",
    "title": "PostgreSQL: Logical Replication, CDC & Debezium",
    "topic": "Database Systems",
    "subtopic": "Technology Grounding",
    "difficulty": "Senior",
    "prompt": "Your resume highlights experience with PostgreSQL. In your production environment, how did you evaluate the architectural trade-offs, diagnose failure modes, and ensure operational stability under heavy load?",
    "context_scenario": "Verified resume claim scenario: WAL logical decoding, replication slots, Change Data Capture into Kafka.",
    "expected_signals": [
      "demonstrated deep technical proficiency with PostgreSQL",
      "ability to cite real operational metrics and architecture decisions",
      "understanding of failure modes and trade-offs"
    ],
    "follow_up_probes": [
      "What was the most difficult bug or outage you encountered with this technology?",
      "What alternative technologies did you consider, and why did you choose this one?"
    ],
    "question_family": "res-postgresql-logical-replication",
    "source_attribution": "Strop Resume Grounding Bank",
    "metadata_json": {
      "technology": "PostgreSQL",
      "difficulty": "Senior"
    }
  }
]
