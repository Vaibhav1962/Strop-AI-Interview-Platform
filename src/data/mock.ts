export const mockUser = {
  id: "u_01",
  name: "Arjun Sharma",
  email: "arjun.sharma@gmail.com",
  avatar: null,
  role: "Senior Software Engineer",
  experience: "5 years",
  targetRole: "Staff Software Engineer",
  targetCompany: "Stripe",
  joinedAt: "2024-11-15",
  interviewsCompleted: 12,
  readinessScore: 74,
};

export const mockResume = {
  parsed: true,
  filename: "arjun_sharma_resume.pdf",
  uploadedAt: "2025-09-01",
  name: "Arjun Sharma",
  email: "arjun.sharma@gmail.com",
  phone: "+91 98765 43210",
  location: "Bengaluru, India",
  summary:
    "Senior software engineer with 5 years of experience building distributed systems and APIs at scale. Strong background in Go, Python, and cloud-native infrastructure.",
  experience: [
    {
      id: "e1",
      title: "Senior Software Engineer",
      company: "Razorpay",
      duration: "Jan 2022 – Present",
      bullets: [
        "Led design of a payment orchestration layer handling 2M+ transactions/day with 99.99% uptime",
        "Reduced API latency by 40% through connection pooling and query optimization",
        "Mentored a team of 4 engineers; conducted 50+ technical interviews",
      ],
    },
    {
      id: "e2",
      title: "Software Engineer",
      company: "Flipkart",
      duration: "Jun 2019 – Dec 2021",
      bullets: [
        "Built microservices in Go for inventory management serving 10M+ SKUs",
        "Implemented distributed caching with Redis reducing database load by 60%",
      ],
    },
  ],
  education: [
    {
      id: "ed1",
      degree: "B.Tech in Computer Science",
      institution: "IIT Bombay",
      year: "2019",
      gpa: "8.7/10",
    },
  ],
  skills: [
    "Go", "Python", "Java", "Distributed Systems", "Kubernetes",
    "AWS", "PostgreSQL", "Redis", "Kafka", "Docker", "gRPC", "REST APIs",
    "System Design", "Microservices",
  ],
  projects: [
    {
      id: "p1",
      name: "OpenTelemetry Collector Plugin",
      description: "Built a custom exporter for OTel Collector to route traces to internal systems",
      tech: ["Go", "OpenTelemetry", "gRPC"],
    },
  ],
  certifications: ["AWS Solutions Architect – Associate (2023)"],
  claims: [
    { id: "c1", text: "2M+ transactions/day with 99.99% uptime", status: "unverified", source: "e1" },
    { id: "c2", text: "Reduced API latency by 40%", status: "verified", source: "e1" },
    { id: "c3", text: "10M+ SKUs inventory management", status: "weak", source: "e2" },
    { id: "c4", text: "Reduced database load by 60%", status: "unverified", source: "e2" },
    { id: "c5", text: "Mentored a team of 4 engineers", status: "unverified", source: "e1" },
    { id: "c6", text: "Conducted 50+ technical interviews", status: "unverified", source: "e1" },
  ],
};

export const mockJD = {
  parsed: true,
  title: "Staff Software Engineer – Payments Infrastructure",
  company: "Stripe",
  location: "Remote / San Francisco",
  type: "Full-time",
  experience: "7+ years",
  requiredSkills: [
    "Go", "Distributed Systems", "High-availability systems",
    "PostgreSQL", "Kafka", "Kubernetes", "System Design", "gRPC",
  ],
  preferredSkills: [
    "Rust", "FoundationDB", "Terraform", "Formal verification",
  ],
  responsibilities: [
    "Design and build core payments infrastructure handling billions of transactions",
    "Lead cross-team technical initiatives and set engineering direction",
    "Drive incident response and post-mortem culture",
    "Mentor and grow a team of 6–10 engineers",
  ],
  qualifications: [
    "7+ years of backend engineering experience",
    "Demonstrated experience owning large-scale distributed systems",
    "Strong CS fundamentals (algorithms, data structures, OS)",
    "Experience with financial systems or payments is a plus",
  ],
  technologies: ["Go", "Rust", "Kafka", "PostgreSQL", "FoundationDB", "Kubernetes", "Terraform"],
};

export const mockMatchAnalysis = {
  overallScore: 71,
  technicalFit: 78,
  experienceFit: 65,
  skillFit: 74,
  matchingSkills: ["Go", "Distributed Systems", "PostgreSQL", "Kafka", "Kubernetes", "gRPC", "System Design"],
  partialSkills: ["High-availability systems", "Microservices"],
  missingSkills: ["Rust", "FoundationDB", "Terraform", "Formal verification", "Financial systems at Stripe scale"],
  strongMatches: [
    { jdItem: "Go expertise", resumeEvidence: "5 years Go development at Razorpay and Flipkart" },
    { jdItem: "Distributed systems", resumeEvidence: "Payment orchestration layer, inventory microservices" },
    { jdItem: "Kafka", resumeEvidence: "Listed in skills; used in projects" },
  ],
  gaps: [
    { jdItem: "Rust", severity: "medium", recommendation: "Build small Rust projects; study ownership model" },
    { jdItem: "FoundationDB", severity: "high", recommendation: "Read Stripe engineering blog; study FDB architecture" },
    { jdItem: "7+ years experience", severity: "medium", recommendation: "Highlight scope and impact of current role" },
  ],
  recommendations: [
    "Emphasize transaction volume and uptime numbers more prominently",
    "Add a project using Terraform for infrastructure-as-code",
    "Research Stripe's FoundationDB usage and be ready to discuss",
  ],
};

export const mockInterviewSessions = [
  {
    id: "s1",
    date: "2025-09-05",
    type: "Technical",
    duration: "48 min",
    score: 76,
    status: "completed",
    targetRole: "Staff Software Engineer",
    company: "Stripe",
    strengths: ["System Design", "Go Concurrency"],
    weaknesses: ["Distributed consensus", "Cost analysis"],
    questions: 8,
  },
  {
    id: "s2",
    date: "2025-08-28",
    type: "Behavioral",
    duration: "35 min",
    score: 68,
    status: "completed",
    targetRole: "Staff Software Engineer",
    company: "Stripe",
    strengths: ["Leadership narrative", "Conflict resolution"],
    weaknesses: ["STAR structure", "Quantified outcomes"],
    questions: 6,
  },
  {
    id: "s3",
    date: "2025-08-20",
    type: "Mixed",
    duration: "62 min",
    score: 71,
    status: "completed",
    targetRole: "Staff Software Engineer",
    company: "Stripe",
    strengths: ["API design", "Communication"],
    weaknesses: ["Complexity analysis", "Edge cases"],
    questions: 10,
  },
  {
    id: "s4",
    date: "2025-08-10",
    type: "Coding",
    duration: "55 min",
    score: 64,
    status: "completed",
    targetRole: "Staff Software Engineer",
    company: "Stripe",
    strengths: ["Problem decomposition"],
    weaknesses: ["Time complexity", "Code quality"],
    questions: 3,
  },
];

export const mockReport = {
  sessionId: "s1",
  date: "2025-09-05",
  type: "Technical",
  duration: "48 min",
  overallScore: 76,
  scores: {
    technical: 78,
    behavioral: 65,
    communication: 80,
    evidenceUsage: 72,
    starPerformance: 60,
  },
  answers: [
    {
      id: "a1",
      questionNumber: 1,
      question: "Walk me through how you would design the payment processing core for a system like Stripe, handling 100M transactions per day.",
      answerSummary: "Arjun described a queue-based architecture with idempotency keys, discussed horizontal sharding of the transactions table by merchant_id, and mentioned using saga pattern for distributed transactions.",
      scores: {
        relevance: 8,
        technicalCorrectness: 7,
        communication: 8,
        evidenceUsage: 9,
        overall: 8,
      },
      transcript: "So for a system at that scale I'd start with the write path... we use idempotency keys to handle retries... at Razorpay we handled about 2M transactions per day and the main bottleneck was actually the database write path, not the API layer. I'd shard the transactions table by merchant_id, use Kafka as the event bus between the payment gateway and the ledger service, and implement the saga pattern for cross-service consistency. For 100M per day you're looking at roughly 1200 TPS average, peak maybe 5x that, so you need your DB writes to be sub-10ms at P99.",
      evidenceHighlights: [
        { text: "at Razorpay we handled about 2M transactions per day", reason: "Strong resume-backed evidence" },
        { text: "shard the transactions table by merchant_id", reason: "Correct technical approach" },
        { text: "1200 TPS average, peak maybe 5x that", reason: "Good quantitative reasoning" },
      ],
      strengths: ["Strong resume evidence integration", "Correct technical choices", "Quantitative reasoning"],
      improvements: ["Did not discuss consistency models (eventual vs strong)", "Missing mention of idempotency at DB level"],
      strongerAnswer: "Add discussion of ACID vs BASE tradeoffs at this scale, and mention FoundationDB or similar for distributed transactions.",
    },
    {
      id: "a2",
      questionNumber: 2,
      question: "How would you approach achieving 99.999% uptime for the payment core?",
      answerSummary: "Discussed multi-AZ deployments, circuit breakers, graceful degradation, and mentioned their own 99.99% track record.",
      scores: {
        relevance: 7,
        technicalCorrectness: 8,
        communication: 7,
        evidenceUsage: 7,
        overall: 7,
      },
      transcript: "We achieved 99.99% uptime at Razorpay, which is four nines... for five nines you're talking about 5 minutes of downtime per year. I'd focus on eliminating single points of failure through active-active multi-AZ, circuit breakers at service boundaries, and graceful degradation. The hardest part is actually planned maintenance — doing zero-downtime deployments and schema migrations.",
      evidenceHighlights: [
        { text: "We achieved 99.99% uptime at Razorpay", reason: "Direct claim verification" },
        { text: "5 minutes of downtime per year", reason: "Correct quantitative understanding" },
      ],
      strengths: ["Demonstrated understanding of five nines challenge", "Good practical operational knowledge"],
      improvements: ["Could discuss chaos engineering", "No mention of SLO/SLA frameworks"],
      strongerAnswer: "Discuss SLO error budgets, chaos engineering practices, and incident response runbooks.",
    },
    {
      id: "a3",
      questionNumber: 3,
      question: "Tell me about a time you led a technically complex initiative and how you handled disagreement within the team.",
      answerSummary: "Described migration from synchronous to async payment processing. STAR structure was partially followed.",
      scores: {
        relevance: 8,
        technicalCorrectness: 7,
        communication: 8,
        evidenceUsage: 6,
        starPerformance: 6,
        overall: 7,
      },
      transcript: "We needed to migrate our synchronous payment flow to async because latency was killing the conversion rate... There was disagreement about whether to use Kafka or a database-backed queue. I ran a bake-off, presented data to the team, and we aligned on Kafka. The migration took 3 months and we reduced p99 latency from 800ms to 120ms.",
      evidenceHighlights: [
        { text: "reduced p99 latency from 800ms to 120ms", reason: "Strong quantified outcome" },
      ],
      strengths: ["Quantified the result", "Showed data-driven decision making"],
      improvements: ["Situation was vague — did not establish business impact upfront", "Action section was thin"],
      strongerAnswer: "Open with the business context (conversion rate impact), then structure: Situation → Task → Action (your specific decisions) → Result (latency + revenue impact).",
    },
  ],
  topicsCoVered: ["System Design", "Distributed Systems", "Payments Architecture", "Leadership", "Async Processing"],
  topicsNotCovered: ["FoundationDB", "Formal verification", "Cost modeling", "Capacity planning"],
  skillsDemonstrated: ["Go", "Kafka", "Distributed Systems", "PostgreSQL", "System Design"],
  skillsNeedingPractice: ["FoundationDB", "Rust", "Distributed consensus (Raft/Paxos)", "STAR framework"],
  resumeClaimsTested: ["2M+ transactions/day", "Reduced API latency by 40%", "Mentored team of 4"],
  resumeClaimsVerified: ["Reduced API latency by 40%"],
  resumeClaimsWeak: ["2M+ transactions/day"],
  resumeClaimsUnverified: ["Mentored team of 4"],
  nextRecommendation: "Technical deep-dive on distributed consensus and FoundationDB architecture",
};

export const mockProgressData = {
  sessions: [
    { date: "Aug 10", overall: 64, technical: 60, behavioral: 58, communication: 72 },
    { date: "Aug 20", overall: 71, technical: 68, behavioral: 63, communication: 76 },
    { date: "Aug 28", overall: 68, technical: 65, behavioral: 72, communication: 74 },
    { date: "Sep 05", overall: 76, technical: 78, behavioral: 65, communication: 80 },
  ],
  skillProgress: [
    { skill: "System Design", score: 78, trend: "+8", status: "strong" },
    { skill: "Go / Concurrency", score: 82, trend: "+5", status: "strong" },
    { skill: "Communication", score: 80, trend: "+12", status: "improving" },
    { skill: "Distributed Systems", score: 74, trend: "+6", status: "improving" },
    { skill: "STAR Framework", score: 55, trend: "+3", status: "weak" },
    { skill: "Distributed Consensus", score: 42, trend: "0", status: "weak" },
    { skill: "Cost Analysis", score: 38, trend: "-2", status: "weak" },
    { skill: "FoundationDB", score: 20, trend: "0", status: "weak" },
  ],
  evidenceTrend: [
    { date: "Aug 10", score: 58 },
    { date: "Aug 20", score: 64 },
    { date: "Aug 28", score: 68 },
    { date: "Sep 05", score: 72 },
  ],
  starTrend: [
    { date: "Aug 10", score: 42 },
    { date: "Aug 20", score: 50 },
    { date: "Aug 28", score: 55 },
    { date: "Sep 05", score: 60 },
  ],
};

export const mockKnowledgeGraph = {
  nodes: [
    { id: "go", label: "Go", category: "language", status: "demonstrated", strength: 82 },
    { id: "python", label: "Python", category: "language", status: "unverified", strength: 55 },
    { id: "distributed", label: "Distributed Systems", category: "domain", status: "demonstrated", strength: 74 },
    { id: "kafka", label: "Kafka", category: "tech", status: "demonstrated", strength: 70 },
    { id: "postgres", label: "PostgreSQL", category: "tech", status: "demonstrated", strength: 68 },
    { id: "redis", label: "Redis", category: "tech", status: "weak", strength: 45 },
    { id: "k8s", label: "Kubernetes", category: "tech", status: "unverified", strength: 40 },
    { id: "grpc", label: "gRPC", category: "tech", status: "demonstrated", strength: 65 },
    { id: "system-design", label: "System Design", category: "skill", status: "demonstrated", strength: 78 },
    { id: "leadership", label: "Technical Leadership", category: "skill", status: "weak", strength: 52 },
    { id: "star", label: "STAR Framework", category: "skill", status: "weak", strength: 55 },
    { id: "rust", label: "Rust", category: "language", status: "unverified", strength: 0 },
    { id: "fdb", label: "FoundationDB", category: "tech", status: "unverified", strength: 0 },
    { id: "payments", label: "Payments Architecture", category: "domain", status: "demonstrated", strength: 76 },
  ],
};

export const mockTraining = [
  {
    id: "t1",
    type: "practice_topic",
    title: "Distributed Consensus (Raft/Paxos)",
    reason: "Consistently missed in technical rounds — 0/3 questions answered correctly across sessions",
    priority: "high",
    estimatedTime: "45 min",
    action: "Start Practice Interview",
    tag: "Technical",
  },
  {
    id: "t2",
    type: "verify_claim",
    title: "Verify: 2M transactions/day claim",
    reason: "This claim appeared twice in interviews but was only partially supported — strengthen your answer with specific architecture details",
    priority: "high",
    estimatedTime: "20 min",
    action: "Practice This Claim",
    tag: "Resume Claim",
  },
  {
    id: "t3",
    type: "behavioral",
    title: "Improve STAR Structure in Behavioral Answers",
    reason: "STAR score is 60/100 — situation and result components are consistently weak",
    priority: "medium",
    estimatedTime: "30 min",
    action: "Behavioral Drill",
    tag: "Behavioral",
  },
  {
    id: "t4",
    type: "jd_gap",
    title: "Learn FoundationDB Fundamentals",
    reason: "FoundationDB is a core Stripe technology listed in the JD and never appeared in any session",
    priority: "medium",
    estimatedTime: "60 min",
    action: "Technical Session",
    tag: "JD Gap",
  },
  {
    id: "t5",
    type: "coding",
    title: "Practice Distributed Locking Problems",
    reason: "Coding sessions show weakness in concurrency and locking scenarios",
    priority: "medium",
    estimatedTime: "45 min",
    action: "Coding Practice",
    tag: "Coding",
  },
  {
    id: "t6",
    type: "communication",
    title: "Reduce Filler Words and Pace",
    reason: "Average 14 filler words per minute — target is below 6 — affects overall communication score",
    priority: "low",
    estimatedTime: "20 min",
    action: "Speech Analytics Review",
    tag: "Communication",
  },
];

export const mockSpeechAnalytics = {
  wordsPerMinute: 138,
  fillerWords: { count: 42, perMinute: 14, words: ["um", "uh", "like", "you know"] },
  pauseDuration: { average: 1.2, longest: 4.8 },
  speakingDuration: { total: "38:24", candidateTime: "26:15", interviewerTime: "12:09" },
  pitchVariation: "moderate",
  responseLatency: { average: 2.1, p95: 5.4 },
  insights: [
    "Filler word rate is 2.3x above target — primary words are 'um' and 'uh' before complex answers",
    "Speaking pace is healthy at 138 WPM — within the 120–160 WPM optimal range",
    "Long pause at question 4 (4.8s) — may signal uncertainty on FoundationDB topic",
    "Response latency is good overall — considered and structured",
  ],
};

export const mockCodingProblem = {
  id: "cp1",
  title: "Design a Rate Limiter",
  difficulty: "Medium",
  timeLimit: 45,
  description: `Design and implement a rate limiter that supports multiple strategies.

A rate limiter restricts how many requests a user can make in a given time window. Your implementation should be thread-safe and efficient.

**Requirements:**
- Support token bucket and sliding window algorithms
- Handle concurrent requests safely
- Return whether a request should be allowed

**Follow-up questions from interviewer:**
- What are the tradeoffs between the two algorithms?
- How would you extend this to a distributed system?`,
  constraints: ["1 ≤ capacity ≤ 10^6", "1 ≤ refillRate ≤ 10^4", "Thread-safe implementation required"],
  examples: [
    {
      input: "RateLimiter(10, 1) — capacity=10 tokens, refill 1/sec\nallow('user1') → true (9 tokens remaining)\nallow('user1') 11 times in 1s → false on 11th",
      output: "true (10 times), false (1 time)",
    },
  ],
  starterCode: `package main

import (
    "sync"
    "time"
)

type TokenBucket struct {
    mu       sync.Mutex
    tokens   float64
    capacity float64
    refill   float64 // tokens per second
    lastTime time.Time
}

func NewTokenBucket(capacity, refillRate float64) *TokenBucket {
    return &TokenBucket{
        tokens:   capacity,
        capacity: capacity,
        refill:   refillRate,
        lastTime: time.Now(),
    }
}

func (tb *TokenBucket) Allow() bool {
    tb.mu.Lock()
    defer tb.mu.Unlock()

    // TODO: refill tokens based on elapsed time
    // TODO: check if a token is available
    // TODO: consume token if available

    return false
}
`,
};

export const mockPanelInterviewers = [
  { id: "i1", name: "Sarah Chen", role: "Technical Lead", avatar: "SC", color: "#3b7ef8", focus: "System design, Go, distributed systems" },
  { id: "i2", name: "Marcus Webb", role: "Engineering Manager", avatar: "MW", color: "#10b981", focus: "Leadership, cross-team collaboration, mentorship" },
  { id: "i3", name: "Priya Iyer", role: "Staff Engineer", avatar: "PI", color: "#f59e0b", focus: "Coding, algorithms, code quality" },
];
