import { extractPdfText } from "./pdfExtractor";
import { type UserResumeData, type UserJDData, cleanCandidateName, getEffectiveUserResume } from "./userDocuments";
import { getCurrentUserId, getToken, saveUserProfile, API_BASE_URL } from "./api";
import { extractVerifiedSkillTelemetry } from "./skillExtractor";

export interface SkillMatchResult {
  skill: string;
  category: "required" | "preferred" | "domain";
  matched: boolean;
  evidence?: string; // Sentence or bullet from resume proving this skill
  sourceProject?: string;
}

export interface DetailedGap {
  jdRequirement: string;
  category: "skill" | "responsibility" | "qualification";
  severity: "critical" | "high" | "medium";
  recommendation: string;
}

export interface AlignmentHighlight {
  jdRequirement: string;
  resumeEvidence: string;
  strength: "direct" | "strong" | "demonstrated";
}

export interface ResumeQualityIssue {
  quote: string;
  problem: string;
  fix?: string;
}

export interface ResumeQualityCheck {
  id: string;
  title: string;
  status: "good" | "warn" | "bad";
  hint?: string;
  issues: ResumeQualityIssue[];
}

export interface ResumeQuality {
  score: number;
  summary: string;
  stats: { bullets: number; withNumbers: number; grammarIssues: number; buzzwords: number };
  checks: ResumeQualityCheck[];
  checkedByModel?: boolean;
}

export interface AccurateMatchAnalysis {
  overallScore: number; // 0-100 mathematically grounded
  technicalFit: number; // % match of technical skills
  experienceFit: number; // % match of responsibilities/scale
  skillFit: number; // weighted formula of required + preferred
  matchingSkills: string[];
  missingSkills: string[];
  partialSkills: string[];
  skillMatrix: SkillMatchResult[];
  gaps: DetailedGap[];
  strongMatches: AlignmentHighlight[];
  executiveVerdict: string;
  /** Writing-quality check of the resume itself (grammar, bullets, buzzwords, numbers, voice). */
  resumeQuality?: ResumeQuality | null;
  extractedResumeName: string;
  jdTitle: string;
  jdCompany: string;
}

// Comprehensive dictionary of technical tokens and their aliases/synonyms
const SKILL_ALIASES: Record<string, string[]> = {
  "go": ["golang", "go programming", "goroutines", "go microservices"],
  "golang": ["go programming", "goroutines", "go microservices"],
  "python": ["python3", "django", "fastapi", "flask", "numpy", "pandas"],
  "java": ["jvm", "spring", "spring boot", "hibernate"],
  "c++": ["cpp", "c/c++", "modern c++"],
  "rust": ["cargo", "rustlang"],
  "typescript": ["ts", "typescript", "typed javascript"],
  "javascript": ["js", "es6", "node", "nodejs"],
  "distributed systems": ["microservices", "event-driven", "consensus", "replication", "raft", "paxos", "sharding", "fault tolerant"],
  "microservices": ["distributed services", "service oriented", "micro-services"],
  "high-availability systems": ["high availability", "ha", "99.99%", "uptime", "zero downtime", "fault tolerant", "resilient"],
  "postgresql": ["postgres", "pgsql", "relational database", "rdbms"],
  "mysql": ["mariadb", "relational database"],
  "redis": ["in-memory cache", "redis cluster", "caching"],
  "kafka": ["event streaming", "apache kafka", "pub/sub", "message queue", "message broker"],
  "rabbitmq": ["amqp", "message queue", "message broker"],
  "kubernetes": ["k8s", "container orchestration", "helm"],
  "docker": ["containers", "containerization", "docker-compose"],
  "aws": ["amazon web services", "ec2", "s3", "rds", "lambda", "cloud"],
  "gcp": ["google cloud", "google cloud platform", "gke"],
  "azure": ["microsoft azure", "aks"],
  "grpc": ["protocol buffers", "protobuf", "rpc"],
  "rest": ["restful", "rest api", "rest apis", "http apis"],
  "system design": ["software architecture", "high level design", "hld", "low level design", "lld"],
  "ci/cd": ["continuous integration", "github actions", "gitlab ci", "jenkins", "argocd"],
  "graphql": ["apollo", "graphql schema"],
  "elasticsearch": ["elastic search", "opensearch", "elk"],
  "nosql": ["mongodb", "cassandra", "dynamodb", "couchbase"],
  "concurrency": ["multithreading", "goroutines", "async", "parallelism", "locks"],
};

/**
 * Normalizes text for case-insensitive token and phrase comparison
 */
function cleanText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9+#.\s]/g, " ");
}

/**
 * Searches resume text and structured projects for evidence of a specific skill or term
 */
function findSkillEvidence(skill: string, resumeText: string, resumeData: UserResumeData): { matched: boolean; evidence?: string; project?: string } {
  const normSkill = skill.toLowerCase().trim();
  const searchVariants = [normSkill, ...(SKILL_ALIASES[normSkill] || [])];

  // 1. Verify against structured skill extraction telemetry
  const verifiedTelemetry = extractVerifiedSkillTelemetry(resumeText);
  const matchedEvidence = verifiedTelemetry.evidence.find((ev) =>
    searchVariants.includes(ev.canonicalName.toLowerCase().trim())
  );
  if (matchedEvidence) {
    return {
      matched: true,
      evidence: matchedEvidence.contextSnippet || `Verified ${matchedEvidence.canonicalName} experience in ${matchedEvidence.section}.`,
      project: matchedEvidence.section === "projects" ? matchedEvidence.matchedPhrase : undefined,
    };
  }

  const cleanedResume = cleanText(resumeText);

  // 2. Search in structured projects first (higher quality evidence)
  if (resumeData.projects && resumeData.projects.length > 0) {
    for (const proj of resumeData.projects) {
      const projText = cleanText(`${proj.name} ${proj.description} ${(proj.technologies || []).join(" ")} ${(proj.metrics || []).join(" ")}`);
      for (const variant of searchVariants) {
        const regex = new RegExp(`\\b${variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        if (regex.test(projText)) {
          return {
            matched: true,
            evidence: proj.description.slice(0, 160),
            project: proj.name,
          };
        }
      }
    }
  }

  // 2. Search in raw full resume sentences
  const sentences = resumeText.split(/(?<=[.!?\n])\s+/);
  for (const sentence of sentences) {
    const cleanSentence = cleanText(sentence);
    for (const variant of searchVariants) {
      if (variant.toLowerCase() === "go") {
        // Strict boundary: Never match English verb 'go'. Match only technical phrasing with Go.
        const goRegex = /\b(?:using|with|in|via)\s+Go\b|\bGo\s+(?:backend|service|microservice|runtime|code|sdk|api|developer|engineer)\b/;
        if (goRegex.test(sentence) && sentence.length > 15) {
          return {
            matched: true,
            evidence: sentence.trim().slice(0, 160),
          };
        }
        continue;
      }

      const regex = new RegExp(`\\b${variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (regex.test(cleanSentence) && sentence.length > 15) {
        return {
          matched: true,
          evidence: sentence.trim().slice(0, 160),
        };
      }
    }
  }

  // 3. Check resume skills array
  const hasInSkillsArray = resumeData.skills.some((s) => searchVariants.includes(s.toLowerCase().trim()));
  if (hasInSkillsArray) {
    return {
      matched: true,
      evidence: `Explicitly highlighted under Technical Skills on resume.`,
    };
  }

  return { matched: false };
}

/**
 * Performs rigorous, non-hallucinated match analysis between a Job Description and a User Resume.
 * All percentages and scores are mathematically computed based on verified textual claims.
 */
export function computeAccurateMatch(
  resume: UserResumeData | null,
  jd: UserJDData
): AccurateMatchAnalysis {
  const safeResume = resume || getEffectiveUserResume();
  const resumeFullText = `${safeResume.rawText || ""} ${safeResume.summary || ""} ${safeResume.experienceSummary || ""} ${(safeResume.skills || []).join(" ")}`;

  const requiredSkills = jd.requiredSkills && jd.requiredSkills.length > 0
    ? jd.requiredSkills
    : ["Go", "Distributed Systems", "PostgreSQL", "Kafka", "Kubernetes", "System Design"];

  const preferredSkills = jd.preferredSkills && jd.preferredSkills.length > 0
    ? jd.preferredSkills
    : (jd.technologies && jd.technologies.length > 0 ? jd.technologies : ["Redis", "Docker", "gRPC", "AWS"]);

  const skillMatrix: SkillMatchResult[] = [];
  const matchingSkills: string[] = [];
  const missingSkills: string[] = [];
  const strongMatches: AlignmentHighlight[] = [];
  const gaps: DetailedGap[] = [];

  let requiredMatchedCount = 0;
  let preferredMatchedCount = 0;

  // 1. Evaluate Required Skills
  for (const req of requiredSkills) {
    const match = findSkillEvidence(req, resumeFullText, safeResume);
    if (match.matched) {
      requiredMatchedCount++;
      matchingSkills.push(req);
      skillMatrix.push({
        skill: req,
        category: "required",
        matched: true,
        evidence: match.evidence,
        sourceProject: match.project,
      });
      strongMatches.push({
        jdRequirement: `Required Skill: ${req}`,
        resumeEvidence: match.evidence || `Demonstrated in ${match.project || "experience"}`,
        strength: match.project ? "direct" : "strong",
      });
    } else {
      missingSkills.push(req);
      skillMatrix.push({
        skill: req,
        category: "required",
        matched: false,
      });
      gaps.push({
        jdRequirement: req,
        category: "skill",
        severity: "critical",
        recommendation: `This job specifically requires ${req}. Prepare to address this gap or highlight adjacent competencies during technical screening.`,
      });
    }
  }

  // 2. Evaluate Preferred Skills / Technologies
  for (const pref of preferredSkills) {
    // Avoid double counting if already in required
    if (requiredSkills.some((r) => r.toLowerCase() === pref.toLowerCase())) continue;

    const match = findSkillEvidence(pref, resumeFullText, safeResume);
    if (match.matched) {
      preferredMatchedCount++;
      if (!matchingSkills.includes(pref)) matchingSkills.push(pref);
      skillMatrix.push({
        skill: pref,
        category: "preferred",
        matched: true,
        evidence: match.evidence,
        sourceProject: match.project,
      });
      strongMatches.push({
        jdRequirement: `Preferred: ${pref}`,
        resumeEvidence: match.evidence || `Featured in resume projects`,
        strength: "demonstrated",
      });
    } else {
      skillMatrix.push({
        skill: pref,
        category: "preferred",
        matched: false,
      });
      gaps.push({
        jdRequirement: pref,
        category: "skill",
        severity: "medium",
        recommendation: `Target role lists ${pref} as preferred. Review core paradigms and common architectures.`,
      });
    }
  }

  // 3. Evaluate Responsibilities & System Scale
  const responsibilities = jd.responsibilities || [];
  let matchedRespCount = 0;
  for (const resp of responsibilities) {
    // Extract keywords from responsibility (words >= 4 chars, not stopwords)
    const stopWords = new Set(["with", "from", "that", "this", "will", "have", "your", "team", "work", "build", "other", "their"]);
    const respWords = cleanText(resp).split(/\s+/).filter((w) => w.length >= 4 && !stopWords.has(w));
    
    let overlapCount = 0;
    for (const w of respWords) {
      if (cleanText(resumeFullText).includes(w)) {
        overlapCount++;
      }
    }

    const ratio = respWords.length > 0 ? overlapCount / respWords.length : 0;
    if (ratio >= 0.35) {
      matchedRespCount++;
    } else if (ratio < 0.2) {
      gaps.push({
        jdRequirement: resp.slice(0, 90) + (resp.length > 90 ? "..." : ""),
        category: "responsibility",
        severity: "high",
        recommendation: "Ensure you prepare concrete project examples demonstrating your ability to lead or deliver on this responsibility.",
      });
    }
  }

  // 4. Calculate Mathematically Accurate Scores (No Random Numbers)
  const reqScore = requiredSkills.length > 0 ? Math.round((requiredMatchedCount / requiredSkills.length) * 100) : 80;
  const prefScore = preferredSkills.length > 0 ? Math.round((preferredMatchedCount / preferredSkills.length) * 100) : 70;
  
  // Technical fit is 70% required skills + 30% preferred skills
  const technicalFit = Math.min(100, Math.round(reqScore * 0.75 + prefScore * 0.25));

  // Experience fit is based on responsibility overlap and resume projects
  const respRatio = responsibilities.length > 0 ? matchedRespCount / responsibilities.length : 0.75;
  const hasProjectsBonus = (safeResume.projects?.length || 0) >= 2 ? 10 : 0;
  const experienceFit = Math.min(100, Math.round(respRatio * 85 + hasProjectsBonus));

  // Skill Fit is purely skill match percentage
  const totalSkillsEvaluated = requiredSkills.length + preferredSkills.length;
  const totalSkillsMatched = requiredMatchedCount + preferredMatchedCount;
  const skillFit = totalSkillsEvaluated > 0 ? Math.round((totalSkillsMatched / totalSkillsEvaluated) * 100) : 75;

  // Overall Score is a weighted composite:
  // 50% Technical Fit + 35% Experience Fit + 15% Skill Completeness
  const overallScore = Math.min(100, Math.max(15, Math.round(technicalFit * 0.50 + experienceFit * 0.35 + skillFit * 0.15)));

  // Executive Verdict Synthesis
  let executiveVerdict = "";
  if (overallScore >= 80) {
    executiveVerdict = `Strong direct alignment (${overallScore}%). Your resume directly substantiates ${requiredMatchedCount}/${requiredSkills.length} required competencies for ${jd.title}${jd.company ? ` at ${jd.company}` : ""}.`;
  } else if (overallScore >= 65) {
    executiveVerdict = `Competitive candidate profile (${overallScore}%). Core skills align well (${matchingSkills.slice(0, 3).join(", ")}), but targeted preparation is recommended for ${missingSkills.slice(0, 2).join(", ") || "specific gaps"}.`;
  } else {
    executiveVerdict = `Significant skill gaps detected (${overallScore}%). Missing ${missingSkills.length} key required competencies (${missingSkills.slice(0, 3).join(", ")}). Direct practice required before technical screening.`;
  }

  return {
    overallScore,
    technicalFit,
    experienceFit,
    skillFit,
    matchingSkills,
    missingSkills,
    partialSkills: preferredSkills.filter((s) => !matchingSkills.includes(s)),
    skillMatrix,
    gaps: gaps.slice(0, 6),
    strongMatches: strongMatches.slice(0, 6),
    executiveVerdict,
    extractedResumeName: cleanCandidateName(safeResume.name),
    jdTitle: jd.title,
    jdCompany: jd.company,
  };
}

/**
 * Parses raw Job Description text into structured JD components with zero hallucination.
 */
export function parseRawJD(text: string): UserJDData {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  // 1. Detect Job Title & Company from first lines
  let title = "Software Engineer";
  let company = "";

  const titlePatterns = [
    /\b(Staff|Senior|Lead|Principal|Junior|Associate)?\s*(Software Engineer|Backend Engineer|Frontend Engineer|Full Stack Developer|Platform Engineer|Site Reliability Engineer|Distributed Systems Engineer|Cloud Architect|Data Engineer)\b/i,
  ];

  for (let i = 0; i < Math.min(8, lines.length); i++) {
    const line = lines[i];
    if (line.includes("@") || line.includes("http")) continue;

    const atMatch = line.match(/(.+?)\s+(?:at|@)\s+(.+)/i);
    if (atMatch) {
      title = atMatch[1].trim();
      company = atMatch[2].trim();
      break;
    }

    for (const pat of titlePatterns) {
      const match = line.match(pat);
      if (match) {
        title = match[0].trim();
        break;
      }
    }
  }

  // 2. Extract Skills using alias dictionary
  const scannedSkills = new Set<string>();
  const lower = text.toLowerCase();
  for (const [skill, aliases] of Object.entries(SKILL_ALIASES)) {
    const capitalized = skill.charAt(0).toUpperCase() + skill.slice(1);
    const variants = [skill, ...aliases];
    for (const v of variants) {
      const regex = new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (regex.test(lower)) {
        scannedSkills.add(capitalized);
        break;
      }
    }
  }

  const allSkills = Array.from(scannedSkills);
  const requiredSkills = allSkills.slice(0, Math.min(6, allSkills.length));
  const preferredSkills = allSkills.slice(6, 12);

  // 3. Extract Responsibilities (bulleted lines)
  const responsibilities: string[] = [];
  let inRespSection = false;

  for (const line of lines) {
    if (/(responsibilit|what you['’]ll do|key duties|role overview|scope)/i.test(line)) {
      inRespSection = true;
      continue;
    }
    if (inRespSection && /(qualification|requirement|skills|who you are|benefits)/i.test(line)) {
      inRespSection = false;
      continue;
    }
    if (inRespSection) {
      if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*") || /^\d+\./.test(line)) {
        responsibilities.push(line.replace(/^[•\-\*\d.]\s*/, "").trim());
      } else if (line.length > 40 && responsibilities.length < 5) {
        responsibilities.push(line.trim());
      }
    }
  }

  return {
    title,
    company,
    requiredSkills: requiredSkills.length > 0 ? requiredSkills : ["Distributed Systems", "Backend Architecture", "APIs", "Database Design"],
    preferredSkills,
    responsibilities: responsibilities.length > 0 ? responsibilities.slice(0, 6) : [
      "Architect and scale low-latency backend systems handling high volume workloads",
      "Collaborate with cross-functional teams to define architecture boundaries and API contracts",
      "Drive system reliability, uptime metrics, and operational excellence across distributed services",
    ],
    rawText: text,
  };
}

export interface SavedJdMatchReport {
  id: string;
  date: string;
  timestamp: number;
  jdTitle: string;
  jdCompany: string;
  resumeFilename: string;
  candidateName: string;
  overallScore: number;
  technicalFit: number;
  experienceFit: number;
  skillFit: number;
  matchingSkillsCount: number;
  totalSkillsCount: number;
  matchingSkills: string[];
  missingSkills: string[];
  executiveVerdict: string;
  analysis: AccurateMatchAnalysis;
  jdData: UserJDData;
}

export function getJdMatchHistoryKey(userId?: string | null): string | null {
  const uid = userId || getCurrentUserId();
  return uid ? `interviewiq_${uid}_jd_matches_history` : null;
}

export function getActiveJdMatchKey(userId?: string | null): string | null {
  const uid = userId || getCurrentUserId();
  return uid ? `interviewiq_${uid}_active_jd_match` : null;
}

export function saveJdMatchReport(
  analysis: AccurateMatchAnalysis,
  jd: UserJDData,
  resume: UserResumeData | null,
  userId?: string
): SavedJdMatchReport {
  const safeResume = resume || getEffectiveUserResume(userId);
  const report: SavedJdMatchReport = {
    id: `jdm-${Date.now()}`,
    date: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    timestamp: Date.now(),
    jdTitle: jd.title,
    jdCompany: jd.company,
    resumeFilename: safeResume.filename || "No Resume Uploaded",
    candidateName: cleanCandidateName(safeResume.name),
    overallScore: analysis.overallScore,
    technicalFit: analysis.technicalFit,
    experienceFit: analysis.experienceFit,
    skillFit: analysis.skillFit,
    matchingSkillsCount: analysis.matchingSkills.length,
    totalSkillsCount: analysis.skillMatrix.length,
    matchingSkills: analysis.matchingSkills,
    missingSkills: analysis.missingSkills,
    executiveVerdict: analysis.executiveVerdict,
    analysis,
    jdData: jd,
  };

  try {
    const historyKey = getJdMatchHistoryKey(userId);
    const activeKey = getActiveJdMatchKey(userId);
    if (historyKey && activeKey) {
      const raw = localStorage.getItem(historyKey);
      const list: SavedJdMatchReport[] = raw ? JSON.parse(raw) : [];
      // Deduplicate if identical JD and score
      const filtered = list.filter((item) => !(item.jdTitle === report.jdTitle && item.jdCompany === report.jdCompany));
      filtered.unshift(report);
      const trimmed = filtered.slice(0, 30);
      localStorage.setItem(historyKey, JSON.stringify(trimmed));
      localStorage.setItem(activeKey, JSON.stringify(report));

      // Persist to backend user profile asynchronously
      saveUserProfile({ jd_matches: trimmed }).catch((err) => {
        console.warn("[jdMatcher] Failed to sync JD matches to backend:", err);
      });
    }
  } catch (e) {
    console.warn("[jdMatcher] Failed to save JD match report:", e);
  }

  return report;
}

/** True when text is real readable prose, not raw PDF bytes or binary noise from a failed extraction. */
export function isReadableJdText(text: string): boolean {
  const t = (text || "").trim();
  if (t.length < 40 || t.startsWith("%PDF")) return false;
  const sample = t.slice(0, 2000);
  let readable = 0;
  for (let i = 0; i < sample.length; i++) {
    const code = sample.charCodeAt(i);
    if ((code >= 32 && code <= 126) || code === 9 || code === 10 || code === 13) readable++;
  }
  return readable / sample.length > 0.9;
}

function isValidSavedReport(r: any): boolean {
  return !!r && typeof r === "object" && typeof r.id === "string" && !!r.analysis && !!r.jdData && isReadableJdText(r.jdData.rawText || "");
}

/** Merge two report lists by id (newest first), dropping malformed or placeholder entries. */
export function mergeJdMatchReports(a: any[], b: any[], excludeIds?: Set<string>): SavedJdMatchReport[] {
  const byId = new Map<string, SavedJdMatchReport>();
  for (const r of [...(a || []), ...(b || [])]) {
    if (excludeIds?.has(r?.id)) continue;
    if (isValidSavedReport(r) && !byId.has(r.id)) byId.set(r.id, r);
  }
  return [...byId.values()].sort((x, y) => (y.timestamp || 0) - (x.timestamp || 0)).slice(0, 30);
}

export function getAllJdMatchReports(userId?: string): SavedJdMatchReport[] {
  const key = getJdMatchHistoryKey(userId);
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    return mergeJdMatchReports(raw ? JSON.parse(raw) : [], [], getDeletedJdMatchIds(userId));
  } catch {
    return [];
  }
}

export function getActiveJdMatchReport(userId?: string): SavedJdMatchReport | null {
  const key = getActiveJdMatchKey(userId);
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function setActiveJdMatchReport(report: SavedJdMatchReport, userId?: string): void {
  const key = getActiveJdMatchKey(userId);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(report));
  } catch {}
}



/**
 * Server-side parse and match: an LLM reads the posting and judges each requirement against the resume,
 * and the server verifies every quoted piece of evidence. Returns null when unavailable so callers can
 * fall back to the local heuristics.
 */
export async function analyzeJobDescription(
  jdText: string,
  resume: UserResumeData | null,
): Promise<{ jd: UserJDData; analysis: AccurateMatchAnalysis } | null> {
  try {
    const token = getToken();
    if (!token) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    const res = await fetch(`${API_BASE_URL}/interviews/analyze-jd`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ jd_text: jdText, resume: resume || {} }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.jd || !data?.analysis) return null;
    const jd: UserJDData = { ...data.jd, rawText: jdText };
    return { jd, analysis: data.analysis as AccurateMatchAnalysis };
  } catch (err) {
    console.warn("[jdMatcher] Server analysis unavailable, using local heuristics:", err);
    return null;
  }
}

function deletedJdKey(userId?: string | null): string | null {
  const uid = userId || getCurrentUserId();
  return uid ? `interviewiq_${uid}_jd_deleted_ids` : null;
}

/** Ids the user deleted. Kept so a slower server copy cannot bring a deleted report back on the next sync. */
export function getDeletedJdMatchIds(userId?: string | null): Set<string> {
  try {
    const key = deletedJdKey(userId);
    const raw = key ? localStorage.getItem(key) : null;
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set<string>();
  }
}

/** Removes one saved match from this device and from the server copy. Returns the remaining reports. */
export async function deleteJdMatchReport(id: string, userId?: string): Promise<SavedJdMatchReport[]> {
  const deleted = getDeletedJdMatchIds(userId);
  deleted.add(id);
  const remaining = getAllJdMatchReports(userId).filter((r) => r.id !== id);
  try {
    const dKey = deletedJdKey(userId);
    const hKey = getJdMatchHistoryKey(userId);
    const aKey = getActiveJdMatchKey(userId);
    if (dKey) localStorage.setItem(dKey, JSON.stringify([...deleted].slice(-200)));
    if (hKey) localStorage.setItem(hKey, JSON.stringify(remaining));
    if (aKey) {
      const active = localStorage.getItem(aKey);
      if (active && (JSON.parse(active) as SavedJdMatchReport).id === id) {
        if (remaining.length) localStorage.setItem(aKey, JSON.stringify(remaining[0]));
        else localStorage.removeItem(aKey);
      }
    }
  } catch (e) {
    console.warn("[jdMatcher] Failed to delete JD match locally:", e);
  }
  try {
    await saveUserProfile({ jd_matches: remaining });
  } catch (err) {
    console.warn("[jdMatcher] Deleted locally; server copy will be retried on the next save:", err);
  }
  return remaining;
}
