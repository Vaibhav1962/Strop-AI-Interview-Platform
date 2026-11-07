import type { ConversationTurn } from "../hooks/useQwenResponse";
import type { UserResumeData } from "./userDocuments";
import { getCurrentUserId } from "./api";

export interface SpeechAcousticsAnalysis {
  wpm: number;
  wpmRating: "Optimal" | "Slightly Rushed" | "Hesitant" | "Moderate";
  stutterCount: number;
  totalFillerWords: number;
  fillerRatioPercent: number;
  fillerBreakdown: { word: string; count: number }[];
  toneScore: number;
  toneLabel: string;
  toneSummary: string;
  vocalCoachingTips: string[];
}

export interface TechnicalProwessAnalysis {
  overallScore: number;
  competencyLevel: "Principal" | "Staff" | "Senior" | "Mid-Level" | "Developing";
  architectureDepth: number;
  tradeoffAnalysis: number;
  edgeCaseHandling: number;
  productionReliability: number;
  communicationClarity: number;
  executiveSummary: string;
  strengths: string[];
  gaps: string[];
  recommendedRoadmap: string[];
}

export interface QuestionTurnEvaluation {
  id: string;
  questionNumber: number;
  topicTitle: string;
  interviewerQuestion: string;
  candidateAnswer: string;
  score: number; // 0 - 10
  keyPositiveSignals: string[];
  areasToRefine: string[];
  architecturalCoaching: string;
}

export interface ComprehensiveInterviewReport {
  id: string;
  date: string;
  durationSeconds: number;
  formattedDuration: string;
  candidateName: string;
  resumeFilename: string;
  interviewTrack: string;
  targetRole: string;
  technical: TechnicalProwessAnalysis;
  speech: SpeechAcousticsAnalysis;
  questionEvaluations: QuestionTurnEvaluation[];
  rawTranscript: ConversationTurn[];
}

const FILLER_PATTERNS = [
  { word: "um / uh", regex: /\b(um|uh|umm|uhh)\b/gi },
  { word: "like", regex: /\b(like)\b/gi },
  { word: "you know / yk", regex: /\b(you know|yk)\b/gi },
  { word: "basically", regex: /\b(basically)\b/gi },
  { word: "actually", regex: /\b(actually)\b/gi },
  { word: "sort of / kind of", regex: /\b(sort of|kind of)\b/gi },
  { word: "i mean", regex: /\b(i mean)\b/gi },
];

/**
 * Analyzes speech acoustics, filler words, stutter, WPM, and vocal tone
 */
export function analyzeSpeech(
  candidateTurns: ConversationTurn[],
  durationSeconds: number
): SpeechAcousticsAnalysis {
  const fullText = candidateTurns.map((t) => t.text).join(" ");
  const words = fullText.split(/\s+/).filter((w) => w.length > 0);
  const totalWordCount = Math.max(1, words.length);

  // Approximate candidate speaking time (typically 50-60% of total interview time)
  const speakingMinutes = Math.max(0.5, (durationSeconds * 0.55) / 60);
  const wpm = Math.round(totalWordCount / speakingMinutes);

  let wpmRating: "Optimal" | "Slightly Rushed" | "Hesitant" | "Moderate" = "Optimal";
  if (wpm > 165) wpmRating = "Slightly Rushed";
  else if (wpm < 110) wpmRating = "Hesitant";
  else if (wpm >= 120 && wpm <= 155) wpmRating = "Optimal";
  else wpmRating = "Moderate";

  // Filler words detection
  let totalFillers = 0;
  const fillerBreakdown: { word: string; count: number }[] = [];

  for (const item of FILLER_PATTERNS) {
    const matches = fullText.match(item.regex);
    const count = matches ? matches.length : 0;
    if (count > 0) {
      fillerBreakdown.push({ word: item.word, count });
      totalFillers += count;
    }
  }

  // Stutter detection: repeated adjacent words (e.g. "we we", "the the") or hyphenated stutter "w-we"
  const stutterMatches = fullText.match(/\b([a-zA-Z]+)\s+\1\b|\b[a-zA-Z]-[a-zA-Z]+\b/gi);
  const stutterCount = stutterMatches ? stutterMatches.length : 0;

  const fillerRatioPercent = Math.min(15, Math.round((totalFillers / totalWordCount) * 1000) / 10);

  // Tone & Confidence computation
  let toneScore = 85;
  if (fillerRatioPercent > 5) toneScore -= 12;
  else if (fillerRatioPercent > 3) toneScore -= 6;

  if (stutterCount > 4) toneScore -= 8;
  else if (stutterCount > 1) toneScore -= 4;

  if (wpmRating === "Optimal") toneScore += 7;
  else if (wpmRating === "Hesitant") toneScore -= 5;

  toneScore = Math.max(50, Math.min(96, toneScore));

  let toneLabel = "Confident & Structured";
  let toneSummary =
    "Delivered answers with steady composure, logical progression, and technical authority.";

  if (toneScore >= 88) {
    toneLabel = "Authoritative & Poised";
    toneSummary =
      "Exhibited high technical gravitas, crisp delivery, minimal hesitations, and assertive systems justification.";
  } else if (toneScore < 70) {
    toneLabel = "Hesitant Under Cross-Examination";
    toneSummary =
      "Showed noticeable hesitation during deep architectural probing, with pacing fluctuations and recurring filler markers.";
  }

  const vocalCoachingTips: string[] = [];
  if (fillerRatioPercent > 3) {
    vocalCoachingTips.push(
      `Reduce reflexive verbal fillers (${fillerBreakdown[0]?.word || "filler words"}). Replace filler sounds with deliberate 1-second strategic pauses before explaining complex architectures.`
    );
  }
  if (wpmRating === "Slightly Rushed") {
    vocalCoachingTips.push(
      "Your speaking rate exceeded 165 WPM. Slow your cadence by 15% when describing state recovery or database failure modes to ensure the interviewer follows your operational reasoning."
    );
  } else if (wpmRating === "Hesitant") {
    vocalCoachingTips.push(
      "Pacing was slightly guarded (< 110 WPM). Practice modular STAR technical structuring to build momentum when outlining high-level service topologies."
    );
  }
  if (stutterCount > 2) {
    vocalCoachingTips.push(
      "Minor word repetition detected during multi-step failure scenarios. Take a breath and articulate one system boundary at a time."
    );
  }
  if (vocalCoachingTips.length === 0) {
    vocalCoachingTips.push(
      "Excellent vocal modulation and cadence. Your steady tone conveys deep technical confidence and senior engineering leadership."
    );
  }

  return {
    wpm,
    wpmRating,
    stutterCount,
    totalFillerWords: totalFillers,
    fillerRatioPercent,
    fillerBreakdown,
    toneScore,
    toneLabel,
    toneSummary,
    vocalCoachingTips,
  };
}

/**
 * Analyzes technical depth, architecture tradeoffs, and edge case resilience
 */
export function analyzeTechnicalProwess(
  candidateTurns: ConversationTurn[],
  candidateName: string,
  track: string,
  resumeSkills: string[]
): TechnicalProwessAnalysis {
  const fullText = candidateTurns.map((t) => t.text).join(" ").toLowerCase();

  // Keyword indicators of senior architectural maturity
  const scaleSignals = ["rps", "qps", "throughput", "latency", "horizontal", "sharding", "partition", "caching", "redis"];
  const reliabilitySignals = ["failover", "circuit breaker", "idempotent", "retry", "backoff", "outage", "replication", "deadlock"];
  const tradeoffSignals = ["tradeoff", "compromise", "overhead", "consistency", "acid", "eventual", "cap theorem", "memory footprint"];
  const edgeCaseSignals = ["split-brain", "network partition", "poison pill", "timeout", "rebalance", "crash", "lag"];

  const countSignals = (signals: string[]) =>
    signals.reduce((acc, s) => (fullText.includes(s) ? acc + 1 : acc), 0);

  const scaleCount = countSignals(scaleSignals);
  const reliabilityCount = countSignals(reliabilitySignals);
  const tradeoffCount = countSignals(tradeoffSignals);
  const edgeCaseCount = countSignals(edgeCaseSignals);

  const architectureDepth = Math.min(96, Math.max(62, 70 + scaleCount * 4));
  const productionReliability = Math.min(95, Math.max(60, 68 + reliabilityCount * 4.5));
  const tradeoffAnalysis = Math.min(94, Math.max(58, 65 + tradeoffCount * 5));
  const edgeCaseHandling = Math.min(95, Math.max(55, 62 + edgeCaseCount * 5.5));
  const communicationClarity = Math.min(95, Math.max(65, 75 + Math.min(18, candidateTurns.length * 3)));

  const overallScore = Math.round(
    architectureDepth * 0.28 +
      productionReliability * 0.24 +
      tradeoffAnalysis * 0.24 +
      edgeCaseHandling * 0.14 +
      communicationClarity * 0.1
  );

  let competencyLevel: "Principal" | "Staff" | "Senior" | "Mid-Level" | "Developing" = "Senior";
  if (overallScore >= 88) competencyLevel = "Staff";
  else if (overallScore >= 93) competencyLevel = "Principal";
  else if (overallScore >= 72) competencyLevel = "Senior";
  else if (overallScore >= 58) competencyLevel = "Mid-Level";
  else competencyLevel = "Developing";

  const strengths: string[] = [];
  const gaps: string[] = [];

  if (scaleCount >= 3) {
    strengths.push("High-throughput scaling models & distributed data partitioning.");
  } else {
    gaps.push("Deep exploration of data sharding and storage replication lag under peak traffic.");
  }

  if (tradeoffCount >= 2) {
    strengths.push("Clear articulation of CAP theorem tradeoffs (consistency vs availability).");
  } else {
    gaps.push("Explicit quantification of memory and network latency overhead in architectural choices.");
  }

  if (reliabilityCount >= 2) {
    strengths.push("Defensive resiliency patterns (graceful degradation, exponential backoff, circuit breaking).");
  } else {
    gaps.push("Disaster recovery and zero-downtime failover orchestration during multi-region partition.");
  }

  if (strengths.length < 3) {
    strengths.push("Structured operational thinking and grounding in candidate resume technologies.");
  }

  const executiveSummary = `${candidateName} demonstrated ${competencyLevel}-level engineering capabilities in the ${track} interview. During architectural probing, they effectively navigated systems design tradeoffs, articulating service boundaries with concrete awareness of production realities. When challenged on consistency and edge-case failure modes, they demonstrated sound reasoning, with strong potential for staff-level scope by further quantifying replication latencies and disaster recovery boundaries.`;

  const recommendedRoadmap = [
    "Master Distributed Consensus & State Machine Replication (Raft/Paxos leader election & log compaction).",
    "Deep-dive into Database Isolation Anomalies (Dirty reads, non-repeatable reads, phantom reads, MVCC).",
    "Refine High-Scale Caching Topologies (Cache stampede prevention, dual-write consistency, Redis Cluster hash slots).",
  ];

  return {
    overallScore,
    competencyLevel,
    architectureDepth,
    tradeoffAnalysis,
    edgeCaseHandling,
    productionReliability,
    communicationClarity,
    executiveSummary,
    strengths,
    gaps,
    recommendedRoadmap,
  };
}

/**
 * Evaluates individual turn-by-turn question answers
 */
export function evaluateQuestions(
  transcript: ConversationTurn[],
  topics: string[]
): QuestionTurnEvaluation[] {
  const evaluations: QuestionTurnEvaluation[] = [];

  let qCount = 0;
  for (let i = 0; i < transcript.length; i++) {
    const turn = transcript[i];
    if (turn.speaker === "Alex" && i + 1 < transcript.length && transcript[i + 1].speaker === "Candidate") {
      qCount++;
      const candidateTurn = transcript[i + 1];
      const topicTitle = topics[qCount - 1] || `Technical Area ${qCount}`;

      const answerLength = candidateTurn.text.split(" ").length;
      const score = Math.min(10, Math.max(6, Math.round(5 + Math.min(4.5, answerLength / 18))));

      evaluations.push({
        id: `q-${qCount}`,
        questionNumber: qCount,
        topicTitle: topicTitle.split(":")[0] || `Question ${qCount}`,
        interviewerQuestion: turn.text,
        candidateAnswer: candidateTurn.text,
        score,
        keyPositiveSignals: [
          "Directly engaged with core architectural premise",
          "Addressed system scale and deployment considerations",
        ],
        areasToRefine: [
          "Could further substantiate with specific p99 latency figures and failure budget metrics",
        ],
        architecturalCoaching:
          "Highlight specific operational tradeoffs earlier in your explanation before moving into component topology.",
      });
    }
  }

  return evaluations;
}

export function getReportStorageKey(userId?: string | null): string | null {
  const uid = userId || getCurrentUserId();
  return uid ? `interviewiq_${uid}_latest_report` : null;
}

export function getReportHistoryKey(userId?: string | null): string | null {
  const uid = userId || getCurrentUserId();
  return uid ? `interviewiq_${uid}_reports_history` : null;
}

export function generateReport(
  candidateName: string,
  resumeData: UserResumeData,
  track: string,
  durationSeconds: number,
  transcript: ConversationTurn[],
  topics: string[]
): ComprehensiveInterviewReport {
  const candidateTurns = transcript.filter((t) => t.speaker === "Candidate");

  const speech = analyzeSpeech(candidateTurns, durationSeconds);
  const technical = analyzeTechnicalProwess(candidateTurns, candidateName, track, resumeData.skills || []);
  const questionEvaluations = evaluateQuestions(transcript, topics);

  const m = Math.floor(durationSeconds / 60);
  const s = durationSeconds % 60;
  const formattedDuration = `${m}m ${String(s).padStart(2, "0")}s`;

  const report: ComprehensiveInterviewReport = {
    id: `rep-${Date.now()}`,
    date: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    durationSeconds,
    formattedDuration,
    candidateName,
    resumeFilename: resumeData.filename || "resume.pdf",
    interviewTrack: track,
    targetRole: resumeData.headline || `${track} Specialist`,
    technical,
    speech,
    questionEvaluations,
    rawTranscript: transcript,
  };

  // Persist locally for active user
  try {
    const sKey = getReportStorageKey();
    const hKey = getReportHistoryKey();
    if (sKey && hKey) {
      localStorage.setItem(sKey, JSON.stringify(report));
      const historyRaw = localStorage.getItem(hKey);
      const historyList = historyRaw ? JSON.parse(historyRaw) : [];
      historyList.unshift(report);
      localStorage.setItem(hKey, JSON.stringify(historyList.slice(0, 20)));
    }
  } catch (err) {
    console.warn("[reportGenerator] Failed to save to localStorage:", err);
  }

  return report;
}

export function getLatestReport(userId?: string): ComprehensiveInterviewReport | null {
  const key = getReportStorageKey(userId);
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function getAllReports(userId?: string): ComprehensiveInterviewReport[] {
  const key = getReportHistoryKey(userId);
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function getReportById(id: string, userId?: string): ComprehensiveInterviewReport | null {
  const all = getAllReports(userId);
  return all.find((r) => r.id === id) || getLatestReport(userId);
}

export function setLatestReport(report: ComprehensiveInterviewReport, userId?: string): void {
  const key = getReportStorageKey(userId);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(report));
  } catch {}
}

export function getSelectedReportIdKey(userId?: string | null): string | null {
  const uid = userId || getCurrentUserId();
  return uid ? `interviewiq_${uid}_selected_report_id` : null;
}

export function getSelectedReportId(userId?: string): string | null {
  const key = getSelectedReportIdKey(userId);
  if (!key) return null;
  return localStorage.getItem(key);
}

export function setSelectedReportId(id: string, userId?: string): void {
  const key = getSelectedReportIdKey(userId);
  if (!key) return;
  localStorage.setItem(key, id);
}

export function clearSelectedReportId(userId?: string): void {
  const key = getSelectedReportIdKey(userId);
  if (!key) return;
  localStorage.removeItem(key);
}

