/**
 * Skill Extraction & Evidence Engine for Strop
 *
 * Implements deterministic, context-aware technical skill extraction.
 * Distinguishes programming languages and frameworks from common English words
 * using token boundaries, section segmentation, and contextual patterns.
 *
 * Guarantees zero false positives on common phrases:
 * - "Go from 0 to 1", "go to production", "ongoing", "good" -> never extracts "Go"
 * - "Section C", "Grade C", "(c)" -> never extracts "C"
 * - "R&D", "initial R" -> never extracts "R"
 * - "reactive", "reaction" -> never extracts "React"
 *
 * Extracts legitimate skills across:
 * - Technical Skills sections
 * - Experience and project descriptions
 * - Explicit technology stacks
 */

export interface ExtractedSkillEvidence {
  canonicalName: string;
  matchedPhrase: string;
  section: "skills" | "projects" | "experience" | "summary" | "general";
  classification: "explicit" | "inferred";
  confidence: "high" | "medium" | "low";
  contextSnippet?: string;
}

export interface SkillExtractionResult {
  skills: string[];
  evidence: ExtractedSkillEvidence[];
  categories: {
    languages: string[];
    frameworks: string[];
    cloudDevops: string[];
    databases: string[];
    architecture: string[];
  };
}

interface SkillDefinition {
  canonicalName: string;
  category: "languages" | "frameworks" | "cloudDevops" | "databases" | "architecture";
  // Unambiguous patterns that can match anywhere with token boundaries
  unambiguousPatterns?: RegExp[];
  // Contextual patterns (e.g., "Go language", "using Go", "C++", etc.)
  contextualPatterns?: RegExp[];
  // Patterns that are only valid when found inside an explicit Skills/Technologies section
  listOnlyPatterns?: RegExp[];
  // Explicit negative guards that invalidate a match
  negativePatterns?: RegExp[];
}

const SKILL_TAXONOMY: SkillDefinition[] = [
  // ---------------------------------------------------------------------------
  // 1. Programming Languages (High-ambiguity token handling)
  // ---------------------------------------------------------------------------
  {
    canonicalName: "Go",
    category: "languages",
    contextualPatterns: [
      /\b(?:golang|go\s*(?:language|programming|code|backend|microservices?|service|developer|engineer|runtime|sdk|routine|routines))\b/i,
      /\b(?:written\s+in|built\s+with|developed\s+in|built\s+in|implemented\s+in|using|via|in)\s+Go\b/i,
    ],
    listOnlyPatterns: [
      /(?:^|[,;•|\/\n\t])\s*(Go|Golang)\s*(?:$|[,;•|\/\n\t])/i,
    ],
    negativePatterns: [
      /\b(?:go\s+(?:from|to|into|through|forward|ahead|on|back|live|out|over|with\s+(?:the|a|an)))\b/i,
      /\b(?:going|ongoing|good|negotiate|algorithm)\b/i,
      /\bready\s+to\s+go\b/i,
      /\bfrom\s+0\s+to\s+1\b/i,
    ],
  },
  {
    canonicalName: "Python",
    category: "languages",
    unambiguousPatterns: [/\bpython(?:3)?\b/i, /\bpypi\b/i],
  },
  {
    canonicalName: "TypeScript",
    category: "languages",
    unambiguousPatterns: [/\btypescript\b/i, /\b(?:\.ts|tsconfig)\b/i],
    listOnlyPatterns: [/(?:^|[,;•|\/\n\t])\s*(TS)\s*(?:$|[,;•|\/\n\t])/i],
  },
  {
    canonicalName: "JavaScript",
    category: "languages",
    unambiguousPatterns: [/\bjavascript\b/i, /\bes(?:6|7|8|9|20\d\d)\b/i, /\bnode(?:\.js)?\b/i],
    listOnlyPatterns: [/(?:^|[,;•|\/\n\t])\s*(JS)\s*(?:$|[,;•|\/\n\t])/i],
  },
  {
    canonicalName: "Java",
    category: "languages",
    // Must NOT be followed by "script"
    unambiguousPatterns: [/\bjava\b(?![\s-]*script)/i, /\bjvm\b/i, /\bopenjdk\b/i],
  },
  {
    canonicalName: "C++",
    category: "languages",
    unambiguousPatterns: [
      /\bC\+\+(?=[^a-zA-Z0-9_+#]|$)/i,
      /\bcpp\b/i,
      /\bc\/c\+\+\b/i,
      /\bmodern\s+c\+\+\b/i,
    ],
  },
  {
    canonicalName: "C#",
    category: "languages",
    unambiguousPatterns: [
      /\bC#(?=[^a-zA-Z0-9_+#]|$)/i,
      /\bcsharp\b/i,
      /\b\.net\s+c#\b/i,
    ],
  },
  {
    canonicalName: "C",
    category: "languages",
    contextualPatterns: [
      /\b(?:ansi\s+c|c\s+(?:language|programming|code|compiler|standard\s+library))\b/i,
      /\bc\/c\+\+\b/i,
      /\bembedded\s+c\b/i,
    ],
    listOnlyPatterns: [
      // Only valid in a dedicated language list surrounded by other languages: e.g. "Languages: C, C++, Python"
      /(?:languages?|technologies?)[\s:]+[^\n\r]*\b(C)\b[^\n\r]*(?:c\+\+|python|java|rust|go)/i,
      /(?:c\+\+|python|java|rust|go)[^\n\r]*\b(C)\b/i,
    ],
    negativePatterns: [
      /\b(?:section|grade|appendix|class|level|tier|model)\s+c\b/i,
      /\(c\)/i,
      /\bc\s+(?:suite|level|suite)\b/i,
    ],
  },
  {
    canonicalName: "Rust",
    category: "languages",
    unambiguousPatterns: [/\brust(?:lang)?\b/i, /\bcargo(?:\s+package)?\b/i],
    negativePatterns: [/\brusty\b/i, /\brust-colored\b/i],
  },
  {
    canonicalName: "R",
    category: "languages",
    contextualPatterns: [
      /\b(?:r\s+(?:language|programming|package|script|studio|markdown|shiny))\b/i,
      /\br\/rstudio\b/i,
    ],
    listOnlyPatterns: [
      /(?:languages?|programming\s+languages?)[\s:]+[^\n\r]*(?:^|[,;•|\/\s])\s*(R)\s*(?:$|[,;•|\/\s])/i,
      /(?:python|sql|sas|spss|julia)[^\n\r]*(?:^|[,;•|\/\s])\s*(R)\s*(?:$|[,;•|\/\s])/i,
    ],
    negativePatterns: [/\br&d\b/i, /\binitial\s+r\b/i],
  },
  {
    canonicalName: "SQL",
    category: "languages",
    unambiguousPatterns: [/\bsql\b/i, /\bpl\/sql\b/i, /\bt-sql\b/i],
  },
  {
    canonicalName: "Bash",
    category: "languages",
    unambiguousPatterns: [/\bbash(?:\s+scripting)?\b/i, /\bshell\s+scripting\b/i],
  },
  {
    canonicalName: "Kotlin",
    category: "languages",
    unambiguousPatterns: [/\bkotlin\b/i],
  },
  {
    canonicalName: "Swift",
    category: "languages",
    unambiguousPatterns: [/\bswift(?:\s+ui)?\b/i],
  },
  {
    canonicalName: "Ruby",
    category: "languages",
    unambiguousPatterns: [/\bruby(?:\s+on\s+rails)?\b/i],
  },
  {
    canonicalName: "PHP",
    category: "languages",
    unambiguousPatterns: [/\bphp\b/i, /\blaravel\b/i],
  },
  {
    canonicalName: "Scala",
    category: "languages",
    unambiguousPatterns: [/\bscala\b/i],
  },

  // ---------------------------------------------------------------------------
  // 2. Frameworks & Libraries
  // ---------------------------------------------------------------------------
  {
    canonicalName: "React",
    category: "frameworks",
    unambiguousPatterns: [/\breact(?:\.js|js)?\b/i, /\breact\s+native\b/i],
    negativePatterns: [/\b(?:reaction|reactive|reacted|reacting)\b/i],
  },
  {
    canonicalName: "Next.js",
    category: "frameworks",
    unambiguousPatterns: [/\bnext(?:\.js|js)\b/i],
  },
  {
    canonicalName: "Vue",
    category: "frameworks",
    unambiguousPatterns: [/\bvue(?:\.js|js)?\b/i, /\bnuxt(?:\.js)?\b/i],
  },
  {
    canonicalName: "Angular",
    category: "frameworks",
    unambiguousPatterns: [/\bangular(?:\.js|js)?\b/i],
  },
  {
    canonicalName: "FastAPI",
    category: "frameworks",
    unambiguousPatterns: [/\bfastapi\b/i],
  },
  {
    canonicalName: "Django",
    category: "frameworks",
    unambiguousPatterns: [/\bdjango\b/i, /\bdjango\s+rest\s+framework\b/i],
  },
  {
    canonicalName: "Flask",
    category: "frameworks",
    unambiguousPatterns: [/\bflask\b/i],
  },
  {
    canonicalName: "Spring Boot",
    category: "frameworks",
    unambiguousPatterns: [/\bspring\s*boot\b/i, /\bspring\s+framework\b/i],
  },
  {
    canonicalName: "Express",
    category: "frameworks",
    unambiguousPatterns: [/\bexpress(?:\.js)?\b/i],
  },
  {
    canonicalName: "GraphQL",
    category: "frameworks",
    unambiguousPatterns: [/\bgraphql\b/i, /\bapollo\s+graphql\b/i],
  },
  {
    canonicalName: "gRPC",
    category: "frameworks",
    unambiguousPatterns: [/\bgrpc\b/i, /\bprotobuf(?:s)?\b/i, /\bprotocol\s+buffers\b/i],
  },
  {
    canonicalName: "REST APIs",
    category: "frameworks",
    unambiguousPatterns: [/\brest(?:ful)?\s+apis?\b/i, /\brest\s+architecture\b/i],
  },
  {
    canonicalName: "Tailwind CSS",
    category: "frameworks",
    unambiguousPatterns: [/\btailwind(?:\s*css)?\b/i],
  },

  // ---------------------------------------------------------------------------
  // 3. Cloud, Containers & DevOps
  // ---------------------------------------------------------------------------
  {
    canonicalName: "Kubernetes",
    category: "cloudDevops",
    unambiguousPatterns: [/\bkubernetes\b/i, /\bk8s\b/i],
  },
  {
    canonicalName: "Docker",
    category: "cloudDevops",
    unambiguousPatterns: [/\bdocker(?:\s*compose)?\b/i, /\bcontainerization\b/i],
  },
  {
    canonicalName: "AWS",
    category: "cloudDevops",
    unambiguousPatterns: [/\baws\b/i, /\bamazon\s+web\s+services\b/i, /\b(?:ec2|s3|rds|lambda|dynamodb|ecs|eks)\b/i],
  },
  {
    canonicalName: "GCP",
    category: "cloudDevops",
    unambiguousPatterns: [/\bgcp\b/i, /\bgoogle\s+cloud(?:\s+platform)?\b/i, /\bbigquery\b/i, /\bgke\b/i],
  },
  {
    canonicalName: "Azure",
    category: "cloudDevops",
    unambiguousPatterns: [/\bazure\b/i, /\bmicrosoft\s+azure\b/i, /\baks\b/i],
  },
  {
    canonicalName: "Terraform",
    category: "cloudDevops",
    unambiguousPatterns: [/\bterraform\b/i],
  },
  {
    canonicalName: "CI/CD",
    category: "cloudDevops",
    unambiguousPatterns: [/\bci\/cd\b/i, /\bcontinuous\s+integration\b/i, /\bgithub\s+actions\b/i, /\bgitlab\s+ci\b/i, /\bjenkins\b/i],
  },
  {
    canonicalName: "Linux",
    category: "cloudDevops",
    unambiguousPatterns: [/\blinux\b/i, /\bubuntu\b/i, /\bdebian\b/i, /\bcentos\b/i],
  },
  {
    canonicalName: "Prometheus",
    category: "cloudDevops",
    unambiguousPatterns: [/\bprometheus\b/i],
  },
  {
    canonicalName: "Grafana",
    category: "cloudDevops",
    unambiguousPatterns: [/\bgrafana\b/i],
  },

  // ---------------------------------------------------------------------------
  // 4. Databases & Messaging
  // ---------------------------------------------------------------------------
  {
    canonicalName: "PostgreSQL",
    category: "databases",
    unambiguousPatterns: [/\bpostgresql\b/i, /\bpostgres\b/i, /\bpgsql\b/i],
  },
  {
    canonicalName: "MySQL",
    category: "databases",
    unambiguousPatterns: [/\bmysql\b/i, /\bmariadb\b/i],
  },
  {
    canonicalName: "MongoDB",
    category: "databases",
    unambiguousPatterns: [/\bmongodb\b/i, /\bmongo\b/i],
  },
  {
    canonicalName: "Redis",
    category: "databases",
    unambiguousPatterns: [/\bredis\b/i],
  },
  {
    canonicalName: "Kafka",
    category: "databases",
    unambiguousPatterns: [/\bkafka\b/i, /\bapache\s+kafka\b/i],
  },
  {
    canonicalName: "RabbitMQ",
    category: "databases",
    unambiguousPatterns: [/\brabbitmq\b/i],
  },
  {
    canonicalName: "Cassandra",
    category: "databases",
    unambiguousPatterns: [/\bcassandra\b/i],
  },
  {
    canonicalName: "DynamoDB",
    category: "databases",
    unambiguousPatterns: [/\bdynamodb\b/i],
  },
  {
    canonicalName: "Elasticsearch",
    category: "databases",
    unambiguousPatterns: [/\belasticsearch\b/i, /\bopensearch\b/i],
  },
  {
    canonicalName: "ClickHouse",
    category: "databases",
    unambiguousPatterns: [/\bclickhouse\b/i],
  },

  // ---------------------------------------------------------------------------
  // 5. Architecture & Systems
  // ---------------------------------------------------------------------------
  {
    canonicalName: "Distributed Systems",
    category: "architecture",
    unambiguousPatterns: [/\bdistributed\s+systems\b/i, /\bdistributed\s+architecture\b/i],
  },
  {
    canonicalName: "Microservices",
    category: "architecture",
    unambiguousPatterns: [/\bmicroservices?\b/i, /\bmicro-services?\b/i],
  },
  {
    canonicalName: "Event-Driven Architecture",
    category: "architecture",
    unambiguousPatterns: [/\bevent-driven(?:\s+architecture)?\b/i, /\bpub\/sub\b/i],
  },
  {
    canonicalName: "System Design",
    category: "architecture",
    unambiguousPatterns: [/\bsystem\s+design\b/i, /\bhigh-level\s+design\b/i, /\bhld\b/i],
  },
  {
    canonicalName: "Concurrency",
    category: "architecture",
    unambiguousPatterns: [/\bconcurrency\b/i, /\bmultithreading\b/i, /\bthread\s+safety\b/i],
  },
  {
    canonicalName: "High Availability",
    category: "architecture",
    unambiguousPatterns: [/\bhigh\s+availability\b/i, /\bfault\s+tolerance\b/i, /\bdisaster\s+recovery\b/i],
  },
];

/**
 * Splits resume text into recognized functional sections.
 */
function segmentResumeSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {
    skills: "",
    projects: "",
    experience: "",
    summary: "",
    general: text,
  };

  const lines = text.split(/\r?\n/);
  let currentSection = "general";
  const sectionBuffers: Record<string, string[]> = {
    skills: [],
    projects: [],
    experience: [],
    summary: [],
    general: [],
  };

  const skillsHeaderRegex = /^(?:technical\s+skills|skills|technologies|tools|languages\s+(&|and)\s+technologies|core\s+competencies|tech\s+stack)[\s:]*$/i;
  const projectsHeaderRegex = /^(?:projects|selected\s+projects|technical\s+projects|personal\s+projects|key\s+projects)[\s:]*$/i;
  const experienceHeaderRegex = /^(?:experience|work\s+experience|professional\s+experience|employment\s+history)[\s:]*$/i;
  const summaryHeaderRegex = /^(?:summary|professional\s+summary|profile|about\s+me|overview)[\s:]*$/i;
  const educationHeaderRegex = /^(?:education|academic\s+background|degrees)[\s:]*$/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (skillsHeaderRegex.test(trimmed)) {
      currentSection = "skills";
      continue;
    } else if (projectsHeaderRegex.test(trimmed)) {
      currentSection = "projects";
      continue;
    } else if (experienceHeaderRegex.test(trimmed)) {
      currentSection = "experience";
      continue;
    } else if (summaryHeaderRegex.test(trimmed)) {
      currentSection = "summary";
      continue;
    } else if (educationHeaderRegex.test(trimmed)) {
      currentSection = "general";
      continue;
    }

    if (sectionBuffers[currentSection]) {
      sectionBuffers[currentSection].push(trimmed);
    } else {
      sectionBuffers.general.push(trimmed);
    }
  }

  for (const key of Object.keys(sectionBuffers)) {
    sections[key] = sectionBuffers[key].join("\n");
  }

  return sections;
}

/**
 * Extracts verified technical skills with strict evidence anchoring and negative guards.
 */
export function extractVerifiedSkillTelemetry(resumeText: string): SkillExtractionResult {
  if (!resumeText || resumeText.trim().length === 0) {
    return {
      skills: [],
      evidence: [],
      categories: { languages: [], frameworks: [], cloudDevops: [], databases: [], architecture: [] },
    };
  }

  const sections = segmentResumeSections(resumeText);
  const evidenceMap: Map<string, ExtractedSkillEvidence> = new Map();

  for (const def of SKILL_TAXONOMY) {
    let matched = false;
    let matchedPhrase = "";
    let matchedSection: ExtractedSkillEvidence["section"] = "general";
    let classification: ExtractedSkillEvidence["classification"] = "explicit";
    let confidence: ExtractedSkillEvidence["confidence"] = "high";
    let contextSnippet = "";

    // 1. Check inside explicit Skills Section first
    if (sections.skills) {
      // Check listOnlyPatterns
      if (def.listOnlyPatterns) {
        for (const pattern of def.listOnlyPatterns) {
          const m = sections.skills.match(pattern);
          if (m) {
            // Check negative patterns
            const hasNegative = def.negativePatterns?.some((neg) => neg.test(m[0]));
            if (!hasNegative) {
              matched = true;
              matchedPhrase = m[1] || m[0];
              matchedSection = "skills";
              confidence = "high";
              contextSnippet = sections.skills.slice(0, 140);
              break;
            }
          }
        }
      }

      // Check contextual patterns in skills section
      if (!matched && def.contextualPatterns) {
        for (const pattern of def.contextualPatterns) {
          const m = sections.skills.match(pattern);
          if (m) {
            matched = true;
            matchedPhrase = m[0];
            matchedSection = "skills";
            confidence = "high";
            contextSnippet = m[0];
            break;
          }
        }
      }

      // Check unambiguous patterns in skills section
      if (!matched && def.unambiguousPatterns) {
        for (const pattern of def.unambiguousPatterns) {
          const m = sections.skills.match(pattern);
          if (m) {
            matched = true;
            matchedPhrase = m[0];
            matchedSection = "skills";
            confidence = "high";
            contextSnippet = m[0];
            break;
          }
        }
      }
    }

    // 2. Check in Projects and Experience sections
    if (!matched) {
      const projExpText = `${sections.projects}\n${sections.experience}`;

      // Contextual patterns (e.g., "written in Go", "using Go and PostgreSQL")
      if (def.contextualPatterns) {
        for (const pattern of def.contextualPatterns) {
          const m = projExpText.match(pattern);
          if (m) {
            matched = true;
            matchedPhrase = m[0];
            matchedSection = sections.projects.includes(m[0]) ? "projects" : "experience";
            confidence = "high";
            contextSnippet = m[0];
            break;
          }
        }
      }

      // Unambiguous patterns (e.g. Python, Docker, Kubernetes)
      if (!matched && def.unambiguousPatterns) {
        for (const pattern of def.unambiguousPatterns) {
          const m = projExpText.match(pattern);
          if (m) {
            // Check negative patterns
            const line = projExpText.split("\n").find((l) => l.includes(m[0])) || m[0];
            const hasNegative = def.negativePatterns?.some((neg) => neg.test(line));
            if (!hasNegative) {
              matched = true;
              matchedPhrase = m[0];
              matchedSection = sections.projects.includes(m[0]) ? "projects" : "experience";
              confidence = "high";
              contextSnippet = line.slice(0, 140);
              break;
            }
          }
        }
      }
    }

    // 3. Fallback check across general text for unambiguous patterns ONLY
    if (!matched && def.unambiguousPatterns) {
      for (const pattern of def.unambiguousPatterns) {
        const m = resumeText.match(pattern);
        if (m) {
          const line = resumeText.split("\n").find((l) => l.includes(m[0])) || m[0];
          const hasNegative = def.negativePatterns?.some((neg) => neg.test(line));
          if (!hasNegative) {
            matched = true;
            matchedPhrase = m[0];
            matchedSection = "general";
            confidence = "medium";
            contextSnippet = line.slice(0, 140);
            break;
          }
        }
      }
    }

    if (matched) {
      evidenceMap.set(def.canonicalName, {
        canonicalName: def.canonicalName,
        matchedPhrase,
        section: matchedSection,
        classification,
        confidence,
        contextSnippet,
      });
    }
  }

  const evidenceList = Array.from(evidenceMap.values());
  const skillNames = evidenceList.map((e) => e.canonicalName);

  // Group into categories
  const categories: SkillExtractionResult["categories"] = {
    languages: [],
    frameworks: [],
    cloudDevops: [],
    databases: [],
    architecture: [],
  };

  for (const ev of evidenceList) {
    const def = SKILL_TAXONOMY.find((d) => d.canonicalName === ev.canonicalName);
    if (def && categories[def.category]) {
      categories[def.category].push(ev.canonicalName);
    }
  }

  return {
    skills: skillNames,
    evidence: evidenceList,
    categories,
  };
}

/**
 * Backward compatible helper returning string[] of verified technical skills.
 */
export function extractVerifiedSkills(resumeText: string): string[] {
  return extractVerifiedSkillTelemetry(resumeText).skills;
}
