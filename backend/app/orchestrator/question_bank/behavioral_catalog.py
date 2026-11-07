"""Behavioral & Leadership Curated Question Catalog.
Total Questions: 68
"""

from typing import Any

BEHAVIORAL_CATALOG: list[dict[str, Any]] = [
  {
    "id": "beh-tech-disagreement-lead",
    "title": "Disagreement with Principal Architect or Tech Lead",
    "topic": "Conflict Resolution",
    "subtopic": "Engineering Judgment",
    "difficulty": "Senior",
    "prompt": "Tell me about a time you strongly disagreed with a tech lead or senior architect on a critical design decision. How did you handle the situation, and what was the outcome?",
    "context_scenario": "Technical friction regarding architectural direction, data storage, or microservice boundaries.",
    "expected_signals": [
      "respectful and objective evaluation of opposing view using data and prototypes",
      "avoided emotional entrenchment and focused on business/engineering trade-offs",
      "demonstrated 'disagree and commit' if consensus could not be reached",
      "followed up with retrospective analysis"
    ],
    "follow_up_probes": [
      "How did you separate personal conviction from engineering pragmatism?",
      "What data or benchmarking did you use to substantiate your perspective?"
    ],
    "question_family": "Technical Conflict",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "positive_signals": [
        "Uses data and benchmarks",
        "Respectful listening",
        "Demonstrates disagree and commit"
      ],
      "negative_signals": [
        "Escalates prematurely",
        "Passive aggressive resistance",
        "Complains about hierarchy"
      ]
    }
  },
  {
    "id": "beh-code-review-stalemate",
    "title": "Resolving Code Review Stalemates",
    "topic": "Conflict Resolution",
    "subtopic": "Communication",
    "difficulty": "Medium",
    "prompt": "Describe a situation where a pull request or code review debate resulted in a prolonged stalemate. How did you resolve the deadlock?",
    "context_scenario": "Conflicting opinions on code quality, design patterns, or test coverage.",
    "expected_signals": [
      "moved discussion from async PR comments to a synchronous verbal conversation",
      "identified core underlying principle rather than stylistic preferences",
      "involved neutral third engineer or referenced team engineering conventions"
    ],
    "follow_up_probes": [
      "At what point is an async comment thread considered unproductive?",
      "How did you update team conventions to prevent similar debates?"
    ],
    "question_family": "Technical Conflict",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "positive_signals": [
        "Prefers quick verbal sync",
        "Focuses on user/team impact"
      ],
      "negative_signals": [
        "Endless PR bike-shedding",
        "Ignores reviewer feedback"
      ]
    }
  },
  {
    "id": "beh-sev1-production-incident",
    "title": "Owning a Critical Production Outage (SEV-1)",
    "topic": "Ownership & Accountability",
    "subtopic": "Blameless Culture",
    "difficulty": "Senior",
    "prompt": "Tell me about a high-severity production outage caused by your code or your team's changes. Walk me through how you discovered it, mitigated it, and handled the post-mortem.",
    "context_scenario": "System-wide customer outage, data corruption, or service degradation.",
    "expected_signals": [
      "immediate ownership without finger-pointing or hiding",
      "prioritized customer mitigation (rollback / feature flag) over finding root cause",
      "led blameless post-mortem identifying systemic safeguards (canary deploys, circuit breakers)",
      "implemented permanent architectural fix"
    ],
    "follow_up_probes": [
      "How did you communicate with executive stakeholders and customer support during the fire?",
      "What changes did you introduce to continuous delivery pipelines to ensure this specific bug can never deploy again?"
    ],
    "question_family": "Incident Ownership",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "positive_signals": [
        "Immediate rollback mindset",
        "Blameless analysis",
        "Deep systemic fixes"
      ],
      "negative_signals": [
        "Blames junior engineer",
        "Tries to debug live in production while users suffer",
        "Defensive posture"
      ]
    }
  },
  {
    "id": "beh-taking-responsibility-failure",
    "title": "Admitting and Recovering From a Strategic Engineering Failure",
    "topic": "Ownership & Accountability",
    "subtopic": "Self-Reflection",
    "difficulty": "Staff",
    "prompt": "Describe a major technical decision or project initiative you championed that ultimately failed or was cancelled. What happened, and what did you learn?",
    "context_scenario": "Large-scale refactor, framework migration, or product initiative that missed objectives.",
    "expected_signals": [
      "courage to pull the plug early rather than succumbing to sunk cost fallacy",
      "transparent retrospective communication with management",
      "distilled reusable lessons and salvaged reusable components"
    ],
    "follow_up_probes": [
      "How did you recognize that the project was failing rather than just hitting speed bumps?",
      "How did you keep team morale high after cancellation?"
    ],
    "question_family": "Leadership & Ownership",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "positive_signals": [
        "Recognizes sunk cost fallacy",
        "Takes full personal accountability",
        "Extracts clear lessons"
      ],
      "negative_signals": [
        "Blames market or product managers",
        "Denies failure"
      ]
    }
  },
  {
    "id": "beh-ambiguous-requirements",
    "title": "Delivering Under High Ambiguity & Incomplete Specs",
    "topic": "Navigating Ambiguity",
    "subtopic": "Scoping & Execution",
    "difficulty": "Senior",
    "prompt": "Tell me about a time you were given a critical technical objective with vague or contradictory requirements. How did you scope it and drive progress?",
    "context_scenario": "Executive mandate like 'Make search faster' or 'Migrate to the cloud' without technical specifications.",
    "expected_signals": [
      "interviewed end-users and stakeholders to uncover core intent",
      "deconstructed ambiguous mandate into measurable KPIs (P99 latency, SLA targets)",
      "built prototype / spike to derisk assumptions early",
      "communicated progressive milestones"
    ],
    "follow_up_probes": [
      "How did you handle stakeholders who wanted all features on Day 1?",
      "What metrics did you establish to define success?"
    ],
    "question_family": "Ambiguity",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "positive_signals": [
        "Proactive stakeholder interviews",
        "Derisks via prototypes",
        "Establishes quantifiable metrics"
      ],
      "negative_signals": [
        "Paralysis by analysis",
        "Builds wrong system in vacuum without asking"
      ]
    }
  },
  {
    "id": "beh-shifting-business-priorities",
    "title": "Pivoting When Company Priorities Radically Shift Mid-Project",
    "topic": "Navigating Ambiguity",
    "subtopic": "Adaptability",
    "difficulty": "Senior",
    "prompt": "Describe an experience where business priorities or regulatory changes suddenly forced your team to pivot or abandon months of in-flight work. How did you respond?",
    "context_scenario": "Sudden change in leadership, market downturn, or urgent compliance mandate.",
    "expected_signals": [
      "demonstrated emotional resilience and agility",
      "rapidly reassessed architecture to repurpose existing assets",
      "aligned team behind the new mission and realigned delivery milestones"
    ],
    "follow_up_probes": [
      "How did you manage technical debt created by the sudden pivot?",
      "How did you maintain developer enthusiasm?"
    ],
    "question_family": "Ambiguity",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "positive_signals": [
        "Business pragmatism",
        "Agile asset reuse",
        "Team alignment"
      ],
      "negative_signals": [
        "Bitter resentment",
        "Refusal to adapt"
      ]
    }
  },
  {
    "id": "beh-tight-deadline-scope-cut",
    "title": "Delivering Under Critical Deadlines by Cutting Scope",
    "topic": "Delivery & Execution",
    "subtopic": "Pragmatism",
    "difficulty": "Medium",
    "prompt": "Tell me about a time you faced an immovable deadline for a major product launch. How did you balance speed with code quality and technical debt?",
    "context_scenario": "Black Friday deadline, regulatory compliance date, or major conference demo.",
    "expected_signals": [
      "categorized requirements into P0 (must-have) vs P1/P2 (deferred)",
      "negotiated scope cuts with product managers using engineering estimates",
      "explicitly logged technical debt and scheduled remediation sprints post-launch"
    ],
    "follow_up_probes": [
      "How did you ensure 'temporary hacks' did not become permanent technical rot?",
      "What testing shortcuts did you refuse to compromise on?"
    ],
    "question_family": "Delivery & Quality",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "positive_signals": [
        "Transparent scope negotiation",
        "Preserves core testing guardrails",
        "Explicit debt tracking"
      ],
      "negative_signals": [
        "Cowboy coding without tests",
        "Works 100-hour weeks silently then burns out"
      ]
    }
  },
  {
    "id": "beh-tackling-legacy-tech-debt",
    "title": "Championing a Major Technical Debt Paydown",
    "topic": "Delivery & Execution",
    "subtopic": "Strategic Influence",
    "difficulty": "Staff",
    "prompt": "Describe a situation where legacy technical debt was crippling engineering velocity. How did you convince business stakeholders to invest in a major refactor or migration?",
    "context_scenario": "Monolith decomposition, obsolete framework replacement, or slow CI/CD pipelines.",
    "expected_signals": [
      "translated technical debt into business metrics (developer hours lost, deployment failure rate, customer latency)",
      "advocated incremental refactor (Strangler Fig pattern) over high-risk multi-year rewrites",
      "delivered continuous value throughout migration"
    ],
    "follow_up_probes": [
      "Why do big-bang total rewrites almost always fail?",
      "How did you measure the ROI of the technical debt paydown?"
    ],
    "question_family": "Delivery & Quality",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "positive_signals": [
        "Quantifies business impact",
        "Uses Strangler pattern",
        "Avoids big-bang rewrite traps"
      ],
      "negative_signals": [
        "Wants to rewrite in trendy language for resume",
        "Cannot articulate business value"
      ]
    }
  },
  {
    "id": "beh-mentoring-struggling-engineer",
    "title": "Coaching and Uplifting a Struggling Team Member",
    "topic": "Mentorship & Culture",
    "subtopic": "Empathy & Standards",
    "difficulty": "Senior",
    "prompt": "Tell me about a time you mentored a junior engineer or peer who was struggling to meet expectations. What was your approach, and how did they progress?",
    "context_scenario": "Performance issues with code quality, debugging speed, or confidence.",
    "expected_signals": [
      "diagnosed root cause through 1-on-1 conversations (knowledge gap vs motivation vs imposter syndrome)",
      "paired on debugging complex issues rather than simply writing the code for them",
      "provided actionable, incremental feedback with clear goals",
      "celebrated wins to rebuild confidence"
    ],
    "follow_up_probes": [
      "How did you balance your own delivery obligations while investing time in coaching?",
      "What did you do if the engineer failed to improve after coaching?"
    ],
    "question_family": "Mentorship",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "positive_signals": [
        "Patient diagnosis",
        "Teaches how to fish",
        "Constructive milestone feedback"
      ],
      "negative_signals": [
        "Takes over work and does it himself",
        "Dismissive or impatient"
      ]
    }
  },
  {
    "id": "beh-driving-engineering-standards",
    "title": "Uplifting Team-Wide Engineering Practices",
    "topic": "Mentorship & Culture",
    "subtopic": "Organizational Impact",
    "difficulty": "Staff",
    "prompt": "Describe an initiative where you improved the engineering rigor, testing culture, or operational excellence of your entire engineering organization.",
    "context_scenario": "Introducing integration testing, automated linting, canary deployments, or architecture review boards.",
    "expected_signals": [
      "led by example by building toolings, templates, and documentation",
      "showcased tangible benefits (e.g. reduced on-call pages, faster deployments)",
      "created consensus rather than mandating top-down edicts",
      "trained and empowered champions across teams"
    ],
    "follow_up_probes": [
      "How did you overcome resistance from veteran engineers who disliked the new process?",
      "How did you measure long-term adoption?"
    ],
    "question_family": "Engineering Culture",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "positive_signals": [
        "Grassroots consensus",
        "Automates enforcement via tooling",
        "Reduces on-call pain"
      ],
      "negative_signals": [
        "Heavy-handed bureaucratic mandates",
        "No follow-through"
      ]
    }
  },
  {
    "id": "beh-saying-no-to-stakeholders",
    "title": "Saying No to Powerful Stakeholders With Data",
    "topic": "Strategic Prioritization",
    "subtopic": "Executive Communication",
    "difficulty": "Senior",
    "prompt": "Tell me about a time you had to say 'no' to an executive or senior product manager who requested an ill-advised feature or unreasonable timeline. How did you navigate the conversation?",
    "context_scenario": "Feature that violated security, risked scalability, or compromised core system stability.",
    "expected_signals": [
      "explained technical and operational risks in plain business language",
      "offered viable alternative solutions that achieved 80% of stakeholder goal safely",
      "remained calm and solutions-oriented under pressure"
    ],
    "follow_up_probes": [
      "How do you differentiate between being a helpful partner and being a defensive gatekeeper?",
      "What if the executive insisted despite your warning?"
    ],
    "question_family": "Prioritization",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "positive_signals": [
        "Offers constructive alternatives",
        "Articulates risk in business impact",
        "Professional courage"
      ],
      "negative_signals": [
        "Grudgingly complies and lets system crash",
        "Hostile refusal"
      ]
    }
  },
  {
    "id": "beh-build-vs-buy",
    "title": "Evaluating Build vs Buy for Core Platform Capabilities",
    "topic": "Strategic Prioritization",
    "subtopic": "TCO Analysis",
    "difficulty": "Staff",
    "prompt": "Describe a time you evaluated whether to build an internal custom tool/framework versus adopting an open-source or commercial third-party solution.",
    "context_scenario": "Auth system, observability pipeline, search service, or workflow orchestrator.",
    "expected_signals": [
      "calculated Total Cost of Ownership (TCO): engineer maintenance hours, licensing, hosting, and compliance",
      "assessed whether the capability is a core competitive differentiator for the business",
      "evaluated vendor lock-in and migration exit strategies"
    ],
    "follow_up_probes": [
      "What hidden costs of 'building it ourselves' do engineering teams routinely underestimate?",
      "How did you validate vendor SLA reliability?"
    ],
    "question_family": "Strategic Prioritization",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "positive_signals": [
        "Rigorous TCO analysis",
        "Recognizes maintenance tax",
        "Protects core differentiator"
      ],
      "negative_signals": [
        "Not-Invented-Here (NIH) syndrome",
        "Underestimates ongoing maintenance costs"
      ]
    }
  },
  {
    "id": "beh-cross-team-friction-mid-level",
    "title": "Resolving Cross-Functional Friction Between Engineering and Product (Mid-Level)",
    "topic": "Conflict Resolution",
    "subtopic": "STAR Competencies",
    "difficulty": "Medium",
    "prompt": "Tell me about a time you encountered this challenge: Resolving Cross-Functional Friction Between Engineering and Product. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Disagreement over technical debt vs roadmap velocity.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-cross-team-friction",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Mid-Level",
      "competency": "Conflict Resolution"
    }
  },
  {
    "id": "beh-cross-team-friction-senior-engineer",
    "title": "Resolving Cross-Functional Friction Between Engineering and Product (Senior Engineer)",
    "topic": "Conflict Resolution",
    "subtopic": "STAR Competencies",
    "difficulty": "Senior",
    "prompt": "Tell me about a time you encountered this challenge: Resolving Cross-Functional Friction Between Engineering and Product. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Disagreement over technical debt vs roadmap velocity.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-cross-team-friction",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Senior Engineer",
      "competency": "Conflict Resolution"
    }
  },
  {
    "id": "beh-cross-team-friction-staff---lead",
    "title": "Resolving Cross-Functional Friction Between Engineering and Product (Staff / Lead)",
    "topic": "Conflict Resolution",
    "subtopic": "STAR Competencies",
    "difficulty": "Staff",
    "prompt": "Tell me about a time you encountered this challenge: Resolving Cross-Functional Friction Between Engineering and Product. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Disagreement over technical debt vs roadmap velocity.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-cross-team-friction",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Staff / Lead",
      "competency": "Conflict Resolution"
    }
  },
  {
    "id": "beh-code-ownership-dispute-mid-level",
    "title": "Resolving Boundary Disputes Over Service Ownership (Mid-Level)",
    "topic": "Conflict Resolution",
    "subtopic": "STAR Competencies",
    "difficulty": "Medium",
    "prompt": "Tell me about a time you encountered this challenge: Resolving Boundary Disputes Over Service Ownership. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Unclear ownership between platform team and product teams.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-code-ownership-dispute",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Mid-Level",
      "competency": "Conflict Resolution"
    }
  },
  {
    "id": "beh-code-ownership-dispute-senior-engineer",
    "title": "Resolving Boundary Disputes Over Service Ownership (Senior Engineer)",
    "topic": "Conflict Resolution",
    "subtopic": "STAR Competencies",
    "difficulty": "Senior",
    "prompt": "Tell me about a time you encountered this challenge: Resolving Boundary Disputes Over Service Ownership. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Unclear ownership between platform team and product teams.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-code-ownership-dispute",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Senior Engineer",
      "competency": "Conflict Resolution"
    }
  },
  {
    "id": "beh-code-ownership-dispute-staff---lead",
    "title": "Resolving Boundary Disputes Over Service Ownership (Staff / Lead)",
    "topic": "Conflict Resolution",
    "subtopic": "STAR Competencies",
    "difficulty": "Staff",
    "prompt": "Tell me about a time you encountered this challenge: Resolving Boundary Disputes Over Service Ownership. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Unclear ownership between platform team and product teams.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-code-ownership-dispute",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Staff / Lead",
      "competency": "Conflict Resolution"
    }
  },
  {
    "id": "beh-oncall-burnout-mid-level",
    "title": "Redesigning an Overwhelming On-Call Rotation (Mid-Level)",
    "topic": "Ownership & Incidents",
    "subtopic": "STAR Competencies",
    "difficulty": "Medium",
    "prompt": "Tell me about a time you encountered this challenge: Redesigning an Overwhelming On-Call Rotation. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Alert fatigue, frequent pages, un-actionable alarms.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-oncall-burnout",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Mid-Level",
      "competency": "Ownership & Incidents"
    }
  },
  {
    "id": "beh-oncall-burnout-senior-engineer",
    "title": "Redesigning an Overwhelming On-Call Rotation (Senior Engineer)",
    "topic": "Ownership & Incidents",
    "subtopic": "STAR Competencies",
    "difficulty": "Senior",
    "prompt": "Tell me about a time you encountered this challenge: Redesigning an Overwhelming On-Call Rotation. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Alert fatigue, frequent pages, un-actionable alarms.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-oncall-burnout",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Senior Engineer",
      "competency": "Ownership & Incidents"
    }
  },
  {
    "id": "beh-oncall-burnout-staff---lead",
    "title": "Redesigning an Overwhelming On-Call Rotation (Staff / Lead)",
    "topic": "Ownership & Incidents",
    "subtopic": "STAR Competencies",
    "difficulty": "Staff",
    "prompt": "Tell me about a time you encountered this challenge: Redesigning an Overwhelming On-Call Rotation. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Alert fatigue, frequent pages, un-actionable alarms.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-oncall-burnout",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Staff / Lead",
      "competency": "Ownership & Incidents"
    }
  },
  {
    "id": "beh-missed-sla-recovery-mid-level",
    "title": "Recovering After a Customer SLA Breach (Mid-Level)",
    "topic": "Ownership & Incidents",
    "subtopic": "STAR Competencies",
    "difficulty": "Medium",
    "prompt": "Tell me about a time you encountered this challenge: Recovering After a Customer SLA Breach. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Enterprise customer contract breach due to backend performance.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-missed-sla-recovery",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Mid-Level",
      "competency": "Ownership & Incidents"
    }
  },
  {
    "id": "beh-missed-sla-recovery-senior-engineer",
    "title": "Recovering After a Customer SLA Breach (Senior Engineer)",
    "topic": "Ownership & Incidents",
    "subtopic": "STAR Competencies",
    "difficulty": "Senior",
    "prompt": "Tell me about a time you encountered this challenge: Recovering After a Customer SLA Breach. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Enterprise customer contract breach due to backend performance.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-missed-sla-recovery",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Senior Engineer",
      "competency": "Ownership & Incidents"
    }
  },
  {
    "id": "beh-missed-sla-recovery-staff---lead",
    "title": "Recovering After a Customer SLA Breach (Staff / Lead)",
    "topic": "Ownership & Incidents",
    "subtopic": "STAR Competencies",
    "difficulty": "Staff",
    "prompt": "Tell me about a time you encountered this challenge: Recovering After a Customer SLA Breach. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Enterprise customer contract breach due to backend performance.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-missed-sla-recovery",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Staff / Lead",
      "competency": "Ownership & Incidents"
    }
  },
  {
    "id": "beh-vague-scalability-goal-mid-level",
    "title": "Architecting for 10x Growth Under Incomplete Traffic Forecasts (Mid-Level)",
    "topic": "Navigating Ambiguity",
    "subtopic": "STAR Competencies",
    "difficulty": "Medium",
    "prompt": "Tell me about a time you encountered this challenge: Architecting for 10x Growth Under Incomplete Traffic Forecasts. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Anticipating un-modeled future platform demands.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-vague-scalability-goal",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Mid-Level",
      "competency": "Navigating Ambiguity"
    }
  },
  {
    "id": "beh-vague-scalability-goal-senior-engineer",
    "title": "Architecting for 10x Growth Under Incomplete Traffic Forecasts (Senior Engineer)",
    "topic": "Navigating Ambiguity",
    "subtopic": "STAR Competencies",
    "difficulty": "Senior",
    "prompt": "Tell me about a time you encountered this challenge: Architecting for 10x Growth Under Incomplete Traffic Forecasts. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Anticipating un-modeled future platform demands.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-vague-scalability-goal",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Senior Engineer",
      "competency": "Navigating Ambiguity"
    }
  },
  {
    "id": "beh-vague-scalability-goal-staff---lead",
    "title": "Architecting for 10x Growth Under Incomplete Traffic Forecasts (Staff / Lead)",
    "topic": "Navigating Ambiguity",
    "subtopic": "STAR Competencies",
    "difficulty": "Staff",
    "prompt": "Tell me about a time you encountered this challenge: Architecting for 10x Growth Under Incomplete Traffic Forecasts. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Anticipating un-modeled future platform demands.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-vague-scalability-goal",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Staff / Lead",
      "competency": "Navigating Ambiguity"
    }
  },
  {
    "id": "beh-prototype-to-production-mid-level",
    "title": "Transitioning an Experimental Hackathon Prototype to Production (Mid-Level)",
    "topic": "Navigating Ambiguity",
    "subtopic": "STAR Competencies",
    "difficulty": "Medium",
    "prompt": "Tell me about a time you encountered this challenge: Transitioning an Experimental Hackathon Prototype to Production. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Hardening quick proof-of-concept into reliable enterprise service.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-prototype-to-production",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Mid-Level",
      "competency": "Navigating Ambiguity"
    }
  },
  {
    "id": "beh-prototype-to-production-senior-engineer",
    "title": "Transitioning an Experimental Hackathon Prototype to Production (Senior Engineer)",
    "topic": "Navigating Ambiguity",
    "subtopic": "STAR Competencies",
    "difficulty": "Senior",
    "prompt": "Tell me about a time you encountered this challenge: Transitioning an Experimental Hackathon Prototype to Production. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Hardening quick proof-of-concept into reliable enterprise service.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-prototype-to-production",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Senior Engineer",
      "competency": "Navigating Ambiguity"
    }
  },
  {
    "id": "beh-prototype-to-production-staff---lead",
    "title": "Transitioning an Experimental Hackathon Prototype to Production (Staff / Lead)",
    "topic": "Navigating Ambiguity",
    "subtopic": "STAR Competencies",
    "difficulty": "Staff",
    "prompt": "Tell me about a time you encountered this challenge: Transitioning an Experimental Hackathon Prototype to Production. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Hardening quick proof-of-concept into reliable enterprise service.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-prototype-to-production",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Staff / Lead",
      "competency": "Navigating Ambiguity"
    }
  },
  {
    "id": "beh-parallel-stream-coordination-mid-level",
    "title": "Coordinating Complex Dependencies Across Multiple Teams (Mid-Level)",
    "topic": "Delivery & Execution",
    "subtopic": "STAR Competencies",
    "difficulty": "Medium",
    "prompt": "Tell me about a time you encountered this challenge: Coordinating Complex Dependencies Across Multiple Teams. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Multi-team dependency bottleneck for major product launch.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-parallel-stream-coordination",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Mid-Level",
      "competency": "Delivery & Execution"
    }
  },
  {
    "id": "beh-parallel-stream-coordination-senior-engineer",
    "title": "Coordinating Complex Dependencies Across Multiple Teams (Senior Engineer)",
    "topic": "Delivery & Execution",
    "subtopic": "STAR Competencies",
    "difficulty": "Senior",
    "prompt": "Tell me about a time you encountered this challenge: Coordinating Complex Dependencies Across Multiple Teams. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Multi-team dependency bottleneck for major product launch.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-parallel-stream-coordination",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Senior Engineer",
      "competency": "Delivery & Execution"
    }
  },
  {
    "id": "beh-parallel-stream-coordination-staff---lead",
    "title": "Coordinating Complex Dependencies Across Multiple Teams (Staff / Lead)",
    "topic": "Delivery & Execution",
    "subtopic": "STAR Competencies",
    "difficulty": "Staff",
    "prompt": "Tell me about a time you encountered this challenge: Coordinating Complex Dependencies Across Multiple Teams. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Multi-team dependency bottleneck for major product launch.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-parallel-stream-coordination",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Staff / Lead",
      "competency": "Delivery & Execution"
    }
  },
  {
    "id": "beh-tech-debt-bankruptcy-mid-level",
    "title": "Halting Feature Work to Recover Stability After Cascading Failures (Mid-Level)",
    "topic": "Delivery & Execution",
    "subtopic": "STAR Competencies",
    "difficulty": "Medium",
    "prompt": "Tell me about a time you encountered this challenge: Halting Feature Work to Recover Stability After Cascading Failures. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Emergency stability sprint declaration.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-tech-debt-bankruptcy",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Mid-Level",
      "competency": "Delivery & Execution"
    }
  },
  {
    "id": "beh-tech-debt-bankruptcy-senior-engineer",
    "title": "Halting Feature Work to Recover Stability After Cascading Failures (Senior Engineer)",
    "topic": "Delivery & Execution",
    "subtopic": "STAR Competencies",
    "difficulty": "Senior",
    "prompt": "Tell me about a time you encountered this challenge: Halting Feature Work to Recover Stability After Cascading Failures. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Emergency stability sprint declaration.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-tech-debt-bankruptcy",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Senior Engineer",
      "competency": "Delivery & Execution"
    }
  },
  {
    "id": "beh-tech-debt-bankruptcy-staff---lead",
    "title": "Halting Feature Work to Recover Stability After Cascading Failures (Staff / Lead)",
    "topic": "Delivery & Execution",
    "subtopic": "STAR Competencies",
    "difficulty": "Staff",
    "prompt": "Tell me about a time you encountered this challenge: Halting Feature Work to Recover Stability After Cascading Failures. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Emergency stability sprint declaration.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-tech-debt-bankruptcy",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Staff / Lead",
      "competency": "Delivery & Execution"
    }
  },
  {
    "id": "beh-onboarding-excellence-mid-level",
    "title": "Overhauling Engineering Onboarding to Accelerate First Commit (Mid-Level)",
    "topic": "Mentorship & Culture",
    "subtopic": "STAR Competencies",
    "difficulty": "Medium",
    "prompt": "Tell me about a time you encountered this challenge: Overhauling Engineering Onboarding to Accelerate First Commit. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Decreasing new-hire ramp up from months to days.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-onboarding-excellence",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Mid-Level",
      "competency": "Mentorship & Culture"
    }
  },
  {
    "id": "beh-onboarding-excellence-senior-engineer",
    "title": "Overhauling Engineering Onboarding to Accelerate First Commit (Senior Engineer)",
    "topic": "Mentorship & Culture",
    "subtopic": "STAR Competencies",
    "difficulty": "Senior",
    "prompt": "Tell me about a time you encountered this challenge: Overhauling Engineering Onboarding to Accelerate First Commit. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Decreasing new-hire ramp up from months to days.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-onboarding-excellence",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Senior Engineer",
      "competency": "Mentorship & Culture"
    }
  },
  {
    "id": "beh-onboarding-excellence-staff---lead",
    "title": "Overhauling Engineering Onboarding to Accelerate First Commit (Staff / Lead)",
    "topic": "Mentorship & Culture",
    "subtopic": "STAR Competencies",
    "difficulty": "Staff",
    "prompt": "Tell me about a time you encountered this challenge: Overhauling Engineering Onboarding to Accelerate First Commit. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Decreasing new-hire ramp up from months to days.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-onboarding-excellence",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Staff / Lead",
      "competency": "Mentorship & Culture"
    }
  },
  {
    "id": "beh-inclusive-code-reviews-mid-level",
    "title": "Fostering an Inclusive, Constructive Code Review Culture (Mid-Level)",
    "topic": "Mentorship & Culture",
    "subtopic": "STAR Competencies",
    "difficulty": "Medium",
    "prompt": "Tell me about a time you encountered this challenge: Fostering an Inclusive, Constructive Code Review Culture. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Eliminating intimidating or hostile comments from senior reviewers.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-inclusive-code-reviews",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Mid-Level",
      "competency": "Mentorship & Culture"
    }
  },
  {
    "id": "beh-inclusive-code-reviews-senior-engineer",
    "title": "Fostering an Inclusive, Constructive Code Review Culture (Senior Engineer)",
    "topic": "Mentorship & Culture",
    "subtopic": "STAR Competencies",
    "difficulty": "Senior",
    "prompt": "Tell me about a time you encountered this challenge: Fostering an Inclusive, Constructive Code Review Culture. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Eliminating intimidating or hostile comments from senior reviewers.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-inclusive-code-reviews",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Senior Engineer",
      "competency": "Mentorship & Culture"
    }
  },
  {
    "id": "beh-inclusive-code-reviews-staff---lead",
    "title": "Fostering an Inclusive, Constructive Code Review Culture (Staff / Lead)",
    "topic": "Mentorship & Culture",
    "subtopic": "STAR Competencies",
    "difficulty": "Staff",
    "prompt": "Tell me about a time you encountered this challenge: Fostering an Inclusive, Constructive Code Review Culture. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Eliminating intimidating or hostile comments from senior reviewers.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-inclusive-code-reviews",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Staff / Lead",
      "competency": "Mentorship & Culture"
    }
  },
  {
    "id": "beh-retiring-deprecated-system-mid-level",
    "title": "Driving Migration Off a Critical Legacy System Everyone is Afraid to Touch (Mid-Level)",
    "topic": "Strategic Prioritization",
    "subtopic": "STAR Competencies",
    "difficulty": "Medium",
    "prompt": "Tell me about a time you encountered this challenge: Driving Migration Off a Critical Legacy System Everyone is Afraid to Touch. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Sunset plan for 10-year-old mission critical service.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-retiring-deprecated-system",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Mid-Level",
      "competency": "Strategic Prioritization"
    }
  },
  {
    "id": "beh-retiring-deprecated-system-senior-engineer",
    "title": "Driving Migration Off a Critical Legacy System Everyone is Afraid to Touch (Senior Engineer)",
    "topic": "Strategic Prioritization",
    "subtopic": "STAR Competencies",
    "difficulty": "Senior",
    "prompt": "Tell me about a time you encountered this challenge: Driving Migration Off a Critical Legacy System Everyone is Afraid to Touch. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Sunset plan for 10-year-old mission critical service.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-retiring-deprecated-system",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Senior Engineer",
      "competency": "Strategic Prioritization"
    }
  },
  {
    "id": "beh-retiring-deprecated-system-staff---lead",
    "title": "Driving Migration Off a Critical Legacy System Everyone is Afraid to Touch (Staff / Lead)",
    "topic": "Strategic Prioritization",
    "subtopic": "STAR Competencies",
    "difficulty": "Staff",
    "prompt": "Tell me about a time you encountered this challenge: Driving Migration Off a Critical Legacy System Everyone is Afraid to Touch. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Sunset plan for 10-year-old mission critical service.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-retiring-deprecated-system",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Staff / Lead",
      "competency": "Strategic Prioritization"
    }
  },
  {
    "id": "beh-cost-optimization-push-mid-level",
    "title": "Leading a Cloud Infrastructure Cost Reduction Initiative (Mid-Level)",
    "topic": "Strategic Prioritization",
    "subtopic": "STAR Competencies",
    "difficulty": "Medium",
    "prompt": "Tell me about a time you encountered this challenge: Leading a Cloud Infrastructure Cost Reduction Initiative. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Slashing AWS/GCP bill by 40% without degrading customer SLA.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-cost-optimization-push",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Mid-Level",
      "competency": "Strategic Prioritization"
    }
  },
  {
    "id": "beh-cost-optimization-push-senior-engineer",
    "title": "Leading a Cloud Infrastructure Cost Reduction Initiative (Senior Engineer)",
    "topic": "Strategic Prioritization",
    "subtopic": "STAR Competencies",
    "difficulty": "Senior",
    "prompt": "Tell me about a time you encountered this challenge: Leading a Cloud Infrastructure Cost Reduction Initiative. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Slashing AWS/GCP bill by 40% without degrading customer SLA.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-cost-optimization-push",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Senior Engineer",
      "competency": "Strategic Prioritization"
    }
  },
  {
    "id": "beh-cost-optimization-push-staff---lead",
    "title": "Leading a Cloud Infrastructure Cost Reduction Initiative (Staff / Lead)",
    "topic": "Strategic Prioritization",
    "subtopic": "STAR Competencies",
    "difficulty": "Staff",
    "prompt": "Tell me about a time you encountered this challenge: Leading a Cloud Infrastructure Cost Reduction Initiative. Detail the Situation, Task, your specific Actions, and the measurable Result.",
    "context_scenario": "Context: Slashing AWS/GCP bill by 40% without degrading customer SLA.",
    "expected_signals": [
      "clear structured STAR storytelling",
      "personal ownership and specific individual contribution ('I' vs 'we')",
      "quantifiable business or technical outcome",
      "reflective lessons learned"
    ],
    "follow_up_probes": [
      "What would you do differently if you faced the exact same situation today?",
      "How did this experience change how you collaborate with peers?"
    ],
    "question_family": "beh-cost-optimization-push",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "tier": "Staff / Lead",
      "competency": "Strategic Prioritization"
    }
  },
  {
    "id": "beh-hiring-bar-raiser",
    "title": "Upholding Hiring Standards Under Intense Hiring Pressure",
    "topic": "Mentorship & Culture",
    "subtopic": "STAR Leadership",
    "difficulty": "Senior",
    "prompt": "Tell me about a time you had to reject a candidate despite desperate team pressure to hire. Walk me through the situation, your concrete actions, and the measurable outcome.",
    "context_scenario": "Senior engineering scenario: Upholding Hiring Standards Under Intense Hiring Pressure",
    "expected_signals": [
      "STAR structure",
      "personal agency",
      "measurable result",
      "reflection"
    ],
    "follow_up_probes": [
      "What was the most difficult conversation during this process?",
      "What was the long-term impact on the team?"
    ],
    "question_family": "beh-hiring-bar-raiser",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "focus": "Mentorship & Culture",
      "difficulty": "Senior"
    }
  },
  {
    "id": "beh-security-vulnerability-response",
    "title": "Handling a Zero-Day Security Vulnerability Under Embargo",
    "topic": "Ownership & Accountability",
    "subtopic": "STAR Leadership",
    "difficulty": "Staff",
    "prompt": "Describe how you coordinated emergency patching of a critical zero-day across hundreds of services. Walk me through the situation, your concrete actions, and the measurable outcome.",
    "context_scenario": "Senior engineering scenario: Handling a Zero-Day Security Vulnerability Under Embargo",
    "expected_signals": [
      "STAR structure",
      "personal agency",
      "measurable result",
      "reflection"
    ],
    "follow_up_probes": [
      "What was the most difficult conversation during this process?",
      "What was the long-term impact on the team?"
    ],
    "question_family": "beh-security-vulnerability-response",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "focus": "Ownership & Accountability",
      "difficulty": "Staff"
    }
  },
  {
    "id": "beh-cross-timezone-collaboration",
    "title": "Leading a Critical Distributed Project Across Time Zones",
    "topic": "Navigating Ambiguity",
    "subtopic": "STAR Leadership",
    "difficulty": "Senior",
    "prompt": "How do you coordinate asynchronous architecture across US, Europe, and Asia without burning out team members? Walk me through the situation, your concrete actions, and the measurable outcome.",
    "context_scenario": "Senior engineering scenario: Leading a Critical Distributed Project Across Time Zones",
    "expected_signals": [
      "STAR structure",
      "personal agency",
      "measurable result",
      "reflection"
    ],
    "follow_up_probes": [
      "What was the most difficult conversation during this process?",
      "What was the long-term impact on the team?"
    ],
    "question_family": "beh-cross-timezone-collaboration",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "focus": "Navigating Ambiguity",
      "difficulty": "Senior"
    }
  },
  {
    "id": "beh-failing-fast-experiment",
    "title": "Running a High-Risk Experiment That Failed Fast",
    "topic": "Navigating Ambiguity",
    "subtopic": "STAR Leadership",
    "difficulty": "Medium",
    "prompt": "Describe an experiment you ran that disproved a fundamental assumption early. Walk me through the situation, your concrete actions, and the measurable outcome.",
    "context_scenario": "Senior engineering scenario: Running a High-Risk Experiment That Failed Fast",
    "expected_signals": [
      "STAR structure",
      "personal agency",
      "measurable result",
      "reflection"
    ],
    "follow_up_probes": [
      "What was the most difficult conversation during this process?",
      "What was the long-term impact on the team?"
    ],
    "question_family": "beh-failing-fast-experiment",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "focus": "Navigating Ambiguity",
      "difficulty": "Medium"
    }
  },
  {
    "id": "beh-unpopular-technical-decision",
    "title": "Enforcing an Unpopular Technical Mandate",
    "topic": "Conflict Resolution",
    "subtopic": "STAR Leadership",
    "difficulty": "Staff",
    "prompt": "Tell me about a time you had to enforce a standard (e.g. deprecating a popular framework) that peers actively disliked. Walk me through the situation, your concrete actions, and the measurable outcome.",
    "context_scenario": "Senior engineering scenario: Enforcing an Unpopular Technical Mandate",
    "expected_signals": [
      "STAR structure",
      "personal agency",
      "measurable result",
      "reflection"
    ],
    "follow_up_probes": [
      "What was the most difficult conversation during this process?",
      "What was the long-term impact on the team?"
    ],
    "question_family": "beh-unpopular-technical-decision",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "focus": "Conflict Resolution",
      "difficulty": "Staff"
    }
  },
  {
    "id": "beh-continuous-delivery-pushback",
    "title": "Moving a Risk-Averse Team From Monthly to Daily Deployments",
    "topic": "Mentorship & Culture",
    "subtopic": "STAR Leadership",
    "difficulty": "Senior",
    "prompt": "How did you overcome fear of frequent deployments in a legacy environment? Walk me through the situation, your concrete actions, and the measurable outcome.",
    "context_scenario": "Senior engineering scenario: Moving a Risk-Averse Team From Monthly to Daily Deployments",
    "expected_signals": [
      "STAR structure",
      "personal agency",
      "measurable result",
      "reflection"
    ],
    "follow_up_probes": [
      "What was the most difficult conversation during this process?",
      "What was the long-term impact on the team?"
    ],
    "question_family": "beh-continuous-delivery-pushback",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "focus": "Mentorship & Culture",
      "difficulty": "Senior"
    }
  },
  {
    "id": "beh-postmortem-blameless-culture",
    "title": "Facilitating a Contentious Blameless Post-Mortem",
    "topic": "Ownership & Accountability",
    "subtopic": "STAR Leadership",
    "difficulty": "Senior",
    "prompt": "Describe how you steered a post-mortem away from personal blame toward systemic failure analysis. Walk me through the situation, your concrete actions, and the measurable outcome.",
    "context_scenario": "Senior engineering scenario: Facilitating a Contentious Blameless Post-Mortem",
    "expected_signals": [
      "STAR structure",
      "personal agency",
      "measurable result",
      "reflection"
    ],
    "follow_up_probes": [
      "What was the most difficult conversation during this process?",
      "What was the long-term impact on the team?"
    ],
    "question_family": "beh-postmortem-blameless-culture",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "focus": "Ownership & Accountability",
      "difficulty": "Senior"
    }
  },
  {
    "id": "beh-navigating-reorg",
    "title": "Leading an Engineering Team Through an Abrupt Reorganization",
    "topic": "Navigating Ambiguity",
    "subtopic": "STAR Leadership",
    "difficulty": "Staff",
    "prompt": "How did you maintain technical continuity and morale during a major corporate restructuring? Walk me through the situation, your concrete actions, and the measurable outcome.",
    "context_scenario": "Senior engineering scenario: Leading an Engineering Team Through an Abrupt Reorganization",
    "expected_signals": [
      "STAR structure",
      "personal agency",
      "measurable result",
      "reflection"
    ],
    "follow_up_probes": [
      "What was the most difficult conversation during this process?",
      "What was the long-term impact on the team?"
    ],
    "question_family": "beh-navigating-reorg",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "focus": "Navigating Ambiguity",
      "difficulty": "Staff"
    }
  },
  {
    "id": "beh-technical-debt-triage",
    "title": "Triaging Severe Production Technical Debt During Hypergrowth",
    "topic": "Delivery & Execution",
    "subtopic": "STAR Leadership",
    "difficulty": "Senior",
    "prompt": "How did you balance shipping critical hypergrowth features while the backend was buckling under load? Walk me through the situation, your concrete actions, and the measurable outcome.",
    "context_scenario": "Senior engineering scenario: Triaging Severe Production Technical Debt During Hypergrowth",
    "expected_signals": [
      "STAR structure",
      "personal agency",
      "measurable result",
      "reflection"
    ],
    "follow_up_probes": [
      "What was the most difficult conversation during this process?",
      "What was the long-term impact on the team?"
    ],
    "question_family": "beh-technical-debt-triage",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "focus": "Delivery & Execution",
      "difficulty": "Senior"
    }
  },
  {
    "id": "beh-data-privacy-compliance",
    "title": "Driving GDPR / CCPA Compliance Refactoring",
    "topic": "Strategic Prioritization",
    "subtopic": "STAR Leadership",
    "difficulty": "Senior",
    "prompt": "Tell me about a time you had to audit and re-architect customer data storage for strict privacy regulations. Walk me through the situation, your concrete actions, and the measurable outcome.",
    "context_scenario": "Senior engineering scenario: Driving GDPR / CCPA Compliance Refactoring",
    "expected_signals": [
      "STAR structure",
      "personal agency",
      "measurable result",
      "reflection"
    ],
    "follow_up_probes": [
      "What was the most difficult conversation during this process?",
      "What was the long-term impact on the team?"
    ],
    "question_family": "beh-data-privacy-compliance",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "focus": "Strategic Prioritization",
      "difficulty": "Senior"
    }
  },
  {
    "id": "beh-open-source-contribution",
    "title": "Navigating Corporate Open Source Contribution Approvals",
    "topic": "Engineering Culture",
    "subtopic": "STAR Leadership",
    "difficulty": "Senior",
    "prompt": "Describe how you convinced legal and leadership to open-source a core internal library. Walk me through the situation, your concrete actions, and the measurable outcome.",
    "context_scenario": "Senior engineering scenario: Navigating Corporate Open Source Contribution Approvals",
    "expected_signals": [
      "STAR structure",
      "personal agency",
      "measurable result",
      "reflection"
    ],
    "follow_up_probes": [
      "What was the most difficult conversation during this process?",
      "What was the long-term impact on the team?"
    ],
    "question_family": "beh-open-source-contribution",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "focus": "Engineering Culture",
      "difficulty": "Senior"
    }
  },
  {
    "id": "beh-managing-upwards",
    "title": "Managing Upwards: Aligning Executive Expectations With Technical Realities",
    "topic": "Strategic Prioritization",
    "subtopic": "STAR Leadership",
    "difficulty": "Staff",
    "prompt": "How do you educate non-technical VPs on technical constraints without sounding dismissive? Walk me through the situation, your concrete actions, and the measurable outcome.",
    "context_scenario": "Senior engineering scenario: Managing Upwards: Aligning Executive Expectations With Technical Realities",
    "expected_signals": [
      "STAR structure",
      "personal agency",
      "measurable result",
      "reflection"
    ],
    "follow_up_probes": [
      "What was the most difficult conversation during this process?",
      "What was the long-term impact on the team?"
    ],
    "question_family": "beh-managing-upwards",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "focus": "Strategic Prioritization",
      "difficulty": "Staff"
    }
  },
  {
    "id": "beh-emergency-migration",
    "title": "Executing an Emergency Datacenter / Cloud Provider Evacuation",
    "topic": "Ownership & Accountability",
    "subtopic": "STAR Leadership",
    "difficulty": "Staff",
    "prompt": "Describe an urgent migration forced by vendor outage or contractual termination. Walk me through the situation, your concrete actions, and the measurable outcome.",
    "context_scenario": "Senior engineering scenario: Executing an Emergency Datacenter / Cloud Provider Evacuation",
    "expected_signals": [
      "STAR structure",
      "personal agency",
      "measurable result",
      "reflection"
    ],
    "follow_up_probes": [
      "What was the most difficult conversation during this process?",
      "What was the long-term impact on the team?"
    ],
    "question_family": "beh-emergency-migration",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "focus": "Ownership & Accountability",
      "difficulty": "Staff"
    }
  },
  {
    "id": "beh-customer-escalation",
    "title": "De-escalating a Furious Enterprise Customer During Outage",
    "topic": "Conflict Resolution",
    "subtopic": "STAR Leadership",
    "difficulty": "Senior",
    "prompt": "How did you speak directly with technical leads from an enterprise client whose business was halted by your bug? Walk me through the situation, your concrete actions, and the measurable outcome.",
    "context_scenario": "Senior engineering scenario: De-escalating a Furious Enterprise Customer During Outage",
    "expected_signals": [
      "STAR structure",
      "personal agency",
      "measurable result",
      "reflection"
    ],
    "follow_up_probes": [
      "What was the most difficult conversation during this process?",
      "What was the long-term impact on the team?"
    ],
    "question_family": "beh-customer-escalation",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "focus": "Conflict Resolution",
      "difficulty": "Senior"
    }
  },
  {
    "id": "beh-async-culture",
    "title": "Transforming Meeting-Heavy Culture to Documentation-First Asynchronous Workflow",
    "topic": "Engineering Culture",
    "subtopic": "STAR Leadership",
    "difficulty": "Senior",
    "prompt": "How did you reduce meeting fatigue and introduce RFC-driven design culture? Walk me through the situation, your concrete actions, and the measurable outcome.",
    "context_scenario": "Senior engineering scenario: Transforming Meeting-Heavy Culture to Documentation-First Asynchronous Workflow",
    "expected_signals": [
      "STAR structure",
      "personal agency",
      "measurable result",
      "reflection"
    ],
    "follow_up_probes": [
      "What was the most difficult conversation during this process?",
      "What was the long-term impact on the team?"
    ],
    "question_family": "beh-async-culture",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "focus": "Engineering Culture",
      "difficulty": "Senior"
    }
  },
  {
    "id": "beh-technical-dissent",
    "title": "Standing Firm on Technical Integrity Against Unreasonable Pressure",
    "topic": "Conflict Resolution",
    "subtopic": "STAR Leadership",
    "difficulty": "Staff",
    "prompt": "Tell me about a time you refused to ship insecure or unstable code despite immense commercial pressure. Walk me through the situation, your concrete actions, and the measurable outcome.",
    "context_scenario": "Senior engineering scenario: Standing Firm on Technical Integrity Against Unreasonable Pressure",
    "expected_signals": [
      "STAR structure",
      "personal agency",
      "measurable result",
      "reflection"
    ],
    "follow_up_probes": [
      "What was the most difficult conversation during this process?",
      "What was the long-term impact on the team?"
    ],
    "question_family": "beh-technical-dissent",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "focus": "Conflict Resolution",
      "difficulty": "Staff"
    }
  },
  {
    "id": "beh-cross-functional-alignment",
    "title": "Aligning Engineering, Sales, and Support Around Roadmap Priorities",
    "topic": "Navigating Ambiguity",
    "subtopic": "STAR Leadership",
    "difficulty": "Senior",
    "prompt": "How did you bridge communication gaps between engineering and commercial teams? Walk me through the situation, your concrete actions, and the measurable outcome.",
    "context_scenario": "Senior engineering scenario: Aligning Engineering, Sales, and Support Around Roadmap Priorities",
    "expected_signals": [
      "STAR structure",
      "personal agency",
      "measurable result",
      "reflection"
    ],
    "follow_up_probes": [
      "What was the most difficult conversation during this process?",
      "What was the long-term impact on the team?"
    ],
    "question_family": "beh-cross-functional-alignment",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "focus": "Navigating Ambiguity",
      "difficulty": "Senior"
    }
  },
  {
    "id": "beh-fostering-innovation",
    "title": "Creating Psychological Safety for Radical Technical Innovation",
    "topic": "Mentorship & Culture",
    "subtopic": "STAR Leadership",
    "difficulty": "Staff",
    "prompt": "How do you encourage junior and senior engineers to propose bold architectural experiments without fear of failure? Walk me through the situation, your concrete actions, and the measurable outcome.",
    "context_scenario": "Senior engineering scenario: Creating Psychological Safety for Radical Technical Innovation",
    "expected_signals": [
      "STAR structure",
      "personal agency",
      "measurable result",
      "reflection"
    ],
    "follow_up_probes": [
      "What was the most difficult conversation during this process?",
      "What was the long-term impact on the team?"
    ],
    "question_family": "beh-fostering-innovation",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "focus": "Mentorship & Culture",
      "difficulty": "Staff"
    }
  },
  {
    "id": "beh-balancing-speed-quality",
    "title": "Navigating the Pragmatic Boundary Between High Velocity and Clean Code",
    "topic": "Delivery & Execution",
    "subtopic": "STAR Leadership",
    "difficulty": "Senior",
    "prompt": "When is it acceptable to take on deliberate technical debt, and how do you prevent it from rotting the codebase? Walk me through the situation, your concrete actions, and the measurable outcome.",
    "context_scenario": "Senior engineering scenario: Navigating the Pragmatic Boundary Between High Velocity and Clean Code",
    "expected_signals": [
      "STAR structure",
      "personal agency",
      "measurable result",
      "reflection"
    ],
    "follow_up_probes": [
      "What was the most difficult conversation during this process?",
      "What was the long-term impact on the team?"
    ],
    "question_family": "beh-balancing-speed-quality",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "focus": "Delivery & Execution",
      "difficulty": "Senior"
    }
  },
  {
    "id": "beh-remote-team-cohesion",
    "title": "Building Trust and High Morale in a Fully Distributed Engineering Team",
    "topic": "Mentorship & Culture",
    "subtopic": "STAR Leadership",
    "difficulty": "Senior",
    "prompt": "How do you maintain team camaraderie, accountability, and mentorship in a 100% remote team? Walk me through the situation, your concrete actions, and the measurable outcome.",
    "context_scenario": "Senior engineering scenario: Building Trust and High Morale in a Fully Distributed Engineering Team",
    "expected_signals": [
      "STAR structure",
      "personal agency",
      "measurable result",
      "reflection"
    ],
    "follow_up_probes": [
      "What was the most difficult conversation during this process?",
      "What was the long-term impact on the team?"
    ],
    "question_family": "beh-remote-team-cohesion",
    "source_attribution": "Strop Curated Behavioral Bank",
    "metadata_json": {
      "focus": "Mentorship & Culture",
      "difficulty": "Senior"
    }
  }
]
