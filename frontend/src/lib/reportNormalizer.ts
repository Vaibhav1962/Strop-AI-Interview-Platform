import { cleanSessionTitle } from "./sessionMetrics";
import { ticStats, capLevel, fillerLevel, paceLevel } from "./deliveryScoring";
import type { BarsEvaluationReport, CompetencyEvaluation } from "./orchestratorClient";
import type { ComprehensiveInterviewReport } from "./reportGenerator";

export interface CandidateReportDimension {
  id: string;
  name: string;
  barsLevel: number | null; // 1-4, or null if unassessed
  levelLabel: string; // e.g. "Level 3 · Senior" or "Unassessed"
  statusBadge: string; // "Demonstrated" | "Weak Evidence" | "Unassessed" | "Contradictory"
  badgeVariant: "emerald" | "indigo" | "amber" | "rose" | "slate";
  observation: string;
  isUnassessed: boolean;
  quotes: {
    turnIndex: number;
    speaker: string;
    quote: string;
    relevance: string;
    timestamp?: string;
  }[];
}

export interface CandidateReportStrength {
  title: string;
  explanation: string;
  turnIndex?: number;
  timestamp?: string;
  quote?: string;
  evidenceNote?: string;
}

export interface CandidateReportImprovement {
  title: string;
  struggle: string;
  whyItMatters: string;
  betterApproach: string;
  turnIndex?: number;
  timestamp?: string;
  quote?: string;
  evidenceNote?: string;
}

export interface CandidateReportRecommendation {
  topic: string;
  practiceTask: string;
  learningOutcome: string;
  priority: "High" | "Medium" | "Essential";
}

export interface CandidateReportCommunication {
  overallRating: string;
  summary: string;
  telemetry: {
    totalWords: number;
    speakingMinutes: number;
    wpm: number;
    wpmAssessment: string;
    fillerCount: number;
    fillerBreakdown?: Record<string, number>;
  };
  dimensions: {
    id: string;
    name: string;
    rating: string;
    observation: string;
    quote?: string;
  }[];
  coachingTips: string[];
  /** Concrete radar axes for the delivery tab (0-4 scale). */
  radar?: RadarPointWithDetail[];
  wentWell?: { title: string; detail: string; quote?: string }[];
  needsWork?: { title: string; detail: string; quote?: string }[];
}

/** Why an axis got its score and what would raise it; shown when an axis is picked on the radar. */
export interface RadarDetail {
  why: string;
  quote?: string;
  /** What was missing, wrong or imprecise. */
  gaps: string[];
  /** Concrete next steps. */
  improve: string[];
  /** What the next level up asks for, from the rubric. */
  nextLevel?: string;
}

export type RadarPointWithDetail = { dimension: string; level: number; fullMark: number; detail?: RadarDetail };

export interface NormalizedCandidateReport {
  track: string;
  title: string;
  date: string;
  formattedDuration: string;
  durationSeconds: number;
  overallAssessment: {
    headline: string;
    summary: string;
    calibrationSignal: string;
    coveragePct: number;
    demonstratedCount: number;
    totalCompetencies: number;
    badgeVariant: "emerald" | "indigo" | "amber" | "rose" | "slate";
  };
  dimensions: CandidateReportDimension[];
  radarData: RadarPointWithDetail[];
  strengths: CandidateReportStrength[];
  improvements: CandidateReportImprovement[];
  recommendations: CandidateReportRecommendation[];
  communication: CandidateReportCommunication;
  transcript: {
    speaker: "Alex" | "Candidate" | string;
    text: string;
    time?: string;
    turnIndex?: number;
  }[];
  isBars: boolean;
  rawReport?: BarsEvaluationReport | ComprehensiveInterviewReport | null;
}

function formatTurnTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Short, concrete radar axis labels per evaluator competency id. */
const RADAR_LABELS: Record<string, string> = {
  // DSA
  problem_clarification: "Clarifying",
  data_structure_and_algorithm_selection: "Data Structures",
  solution_correctness: "Correctness",
  time_and_space_complexity: "Complexity",
  edge_case_identification: "Edge Cases",
  code_quality_and_implementation: "Code Quality",
  debugging_and_optimization: "Debugging",
  // System design
  scope_and_quantitative_estimation: "Scoping & Sizing",
  system_architecture_and_data_flow: "Architecture",
  data_modeling_and_storage: "Data & Storage",
  distributed_consistency_and_transactions: "Consistency",
  resilience_and_failure_recovery: "Resilience",
  tradeoff_analysis_and_retrospective: "Trade-offs",
  // Core CS
  os_internals_and_memory: "OS & Memory",
  networking_and_protocols: "Networking",
  concurrency_and_synchronization: "Concurrency",
  database_engine_internals: "Databases",
  technical_depth_and_rigor: "Systems Reasoning",
  systems_troubleshooting: "Troubleshooting",
  // Behavioral
  ownership_and_accountability: "Ownership",
  technical_leadership_and_collaboration: "Collaboration",
  conflict_resolution: "Conflict Handling",
  handling_ambiguity_and_crisis: "Crisis Handling",
  communication_and_star_structure: "Story Structure",
  retrospective_growth_and_learning: "Reflection",
  // Resume technical
  resume_project_architecture: "Project Design",
  technical_depth_and_claims: "Technical Depth",
  production_incident_recovery: "Incident Recovery",
  scaling_tradeoffs_and_evolution: "Scaling",
  // Staff
  strategic_technical_vision: "Vision",
  rfc_craft_and_stakeholder_influence: "RFC & Influence",
  cross_functional_alignment: "Alignment",
  engineering_governance_and_standards: "Governance",
};

/** Axes that describe how the candidate reacted to hints, not a skill of the track, so they stay off the radar. */
const NOT_RADAR_AXES = new Set(["hint_responsiveness"]);

const COMM_IMPROVE: Record<string, string> = {
  clarity: "Name the exact thing before describing it (the data structure, the API, the number). Say the noun instead of \"it\" or \"this\", and finish each sentence before starting the next.",
  structure: "Open every answer with the conclusion in one sentence, then give two or three supporting points. Say \"first, second, third\" so the listener can follow.",
  conciseness: "Answer the question asked in about 45 seconds, then stop and let the interviewer pull for more. Cut restating the question and repeated caveats.",
  verbal_fluency: "Pause silently instead of filling the gap. Practise answers out loud and record yourself, aiming for 125 to 165 words per minute.",
  confidence: "State your decision, then your reason, without hedges like \"I think\" or \"maybe\". When unsure, say exactly what you are unsure about.",
  technical_communication: "Explain the mechanism step by step with a tiny concrete example (a specific input and output) before generalising.",
  responsiveness: "Answer the question you were asked first. When the interviewer gives a hint or correction, say how it changes your approach.",
};

const COMM_AXIS_LABELS: Record<string, string> = {
  clarity: "Clarity",
  structure: "Structure",
  conciseness: "Conciseness",
  verbal_fluency: "Fluency",
  confidence: "Confidence",
  technical_communication: "Tech Explaining",
  responsiveness: "Listening",
};

function ratingToLevel(rating: string): number {
  const r = (rating || "").toLowerCase();
  if (r.includes("exemplary")) return 4;
  if (r.includes("strong")) return 3;
  if (r.includes("adequate")) return 2;
  return 1;
}

const BUZZWORDS = [
  "leverage", "robust", "seamless", "scalable", "best practices", "cutting-edge", "cutting edge", "synergy",
  "holistic", "paradigm", "state of the art", "game changer", "end-to-end", "optimal", "efficient",
];
const HEDGES = ["basically", "kind of", "sort of", "i guess", "maybe", "probably", "simply", "i think", "you know", "like,"];

function snippetAround(text: string, idx: number, len: number): string {
  const start = Math.max(0, idx - 45);
  const end = Math.min(text.length, idx + len + 60);
  return (start > 0 ? "..." : "") + text.slice(start, end).trim() + (end < text.length ? "..." : "");
}

/** Counts vague / hedging phrases in the candidate's own words and keeps one real sentence as the example. */
function findSpeechPatterns(turns: string[]): { kind: "buzzword" | "hedge"; term: string; count: number; example: string }[] {
  const out: { kind: "buzzword" | "hedge"; term: string; count: number; example: string }[] = [];
  const scan = (terms: string[], kind: "buzzword" | "hedge") => {
    for (const term of terms) {
      let count = 0;
      let example = "";
      for (const t of turns) {
        const lower = t.toLowerCase();
        let from = 0;
        let idx = lower.indexOf(term, from);
        while (idx !== -1) {
          count++;
          if (!example) example = snippetAround(t, idx, term.length);
          from = idx + term.length;
          idx = lower.indexOf(term, from);
        }
      }
      if (count >= 2) out.push({ kind, term: term.replace(/,$/, ""), count, example });
    }
  };
  scan(BUZZWORDS, "buzzword");
  scan(HEDGES, "hedge");
  return out.sort((a, b) => b.count - a.count).slice(0, 4);
}


const STOP = new Set(["with", "that", "this", "from", "their", "into", "were", "have", "been", "when", "which", "also", "about", "across", "while"]);

function tokens(text: string): Set<string> {
  return new Set(
    (text || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3 && !STOP.has(w)),
  );
}

/** Finds the interview quote that best supports a summary line (a strength or a gap) by comparing wording. */
function bestEvidence(
  text: string,
  comps: CompetencyEvaluation[],
  kind: "strength" | "gap",
): { quote: string; turnIndex?: number; note?: string } | null {
  const want = tokens(text);
  if (want.size === 0) return null;
  let best: { score: number; comp: CompetencyEvaluation } | null = null;
  for (const c of comps) {
    if (!(c.evidence_quotes || []).length || c.competency_id === "hint_responsiveness") continue;
    const pool = [...(kind === "strength" ? c.strengths || [] : c.gaps_or_limitations || []), c.competency_name || ""].join(" ");
    const have = tokens(pool);
    let score = 0;
    want.forEach((w) => {
      if (have.has(w)) score++;
    });
    if (kind === "gap" && (c.gaps_or_limitations || []).length && score > 0) score += 1;
    if (!best || score > best.score) best = { score, comp: c };
  }
  if (!best || best.score === 0) return null;
  const quotes = best.comp.evidence_quotes || [];
  const q = quotes.find((x) => /candidate|you/i.test(x.speaker || "")) || quotes[0];
  if (!q?.quote) return null;
  return { quote: String(q.quote), turnIndex: q.turn_index, note: (q.relevance || "").replace(/^(shows|show|demonstrates)\s+/i, "") || undefined };
}


export function normalizeReportForCandidate(
  report: any,
  sessionMeta?: {
    track?: string;
    title?: string;
    date?: string;
    duration?: string;
    durationSeconds?: number;
    startedAt?: string;
  },
  transcriptLines?: any[]
): NormalizedCandidateReport {
  const isBars = Boolean(
    report && (report.calibration_signal || report.competency_evaluations || report.coverage_summary)
  );

  const rawTrack = report?.track || sessionMeta?.track || "Technical Interview";
  const track = rawTrack.replace(/_/g, " ");
  const title = cleanSessionTitle(report?.title || sessionMeta?.title || `${track} Assessment`);
  const date = sessionMeta?.date || (report?.evaluated_at ? new Date(report.evaluated_at).toLocaleDateString() : "Recent Session");
  const durationSeconds = sessionMeta?.durationSeconds || 1200;
  const formattedDuration = sessionMeta?.duration || formatTurnTime(durationSeconds);

  // Normalize Transcript Lines
  const transcript: { speaker: string; text: string; time?: string; turnIndex?: number }[] = [];
  const linesSource = transcriptLines || report?.rawTranscript || [];
  // Times are measured from the interview start. Fall back to the earliest stored timestamp.
  const stamps = linesSource.map((t: any) => Date.parse(t?.timestamp || "")).filter((n: number) => !Number.isNaN(n));
  const startedMs = sessionMeta?.startedAt ? Date.parse(sessionMeta.startedAt) : NaN;
  const startMs = !Number.isNaN(startedMs) ? startedMs : stamps.length ? Math.min(...stamps) : NaN;
  linesSource.forEach((t: any, idx: number) => {
    const speaker = t.speaker === "Alex" || t.speaker === "AI" || t.speaker === "Interviewer" ? "Alex" : "Candidate";
    const text = t.text || t.content || "";
    const turnIndex = t.turn_index ?? t.turnIndex ?? idx;
    // A stored "00:00" is a placeholder from older sessions, not a real time. Never invent one.
    let time: string | undefined = t.time && t.time !== "00:00" ? t.time : undefined;
    if (!time && t.timestamp && !Number.isNaN(startMs)) {
      const ts = Date.parse(t.timestamp);
      if (!Number.isNaN(ts)) time = formatTurnTime(Math.max(0, Math.round((ts - startMs) / 1000)));
    }
    if (text.trim()) {
      transcript.push({ speaker, text, time, turnIndex });
    }
  });

  const getTimestampForTurn = (tIndex?: number): string | undefined => {
    if (tIndex === undefined) return undefined;
    const match = transcript.find((l) => l.turnIndex === tIndex);
    return match?.time;
  };

  if (isBars) {
    const bars = report as BarsEvaluationReport;
    const sig = bars.calibration_signal || "Solid Evidence in Covered Areas";
    
    let badgeVariant: "emerald" | "indigo" | "amber" | "rose" | "slate" = "indigo";
    if (sig.includes("Strong")) badgeVariant = "emerald";
    else if (sig.includes("Solid")) badgeVariant = "indigo";
    else if (sig.includes("Mixed")) badgeVariant = "amber";
    else if (sig.includes("Inconclusive")) badgeVariant = "slate";
    else badgeVariant = "rose";

    // 1. Overall Headline & Clean Summary
    const executiveSummary = (bars.executive_summary || "").trim();
    const cleanSummary = executiveSummary.length > 300 
      ? executiveSummary.slice(0, 300).replace(/\.[^.]*$/, ".")
      : executiveSummary || "Performance demonstrated solid technical grounding across core problem dimensions.";

    // 2. Track Dimensions
    const dimensions: CandidateReportDimension[] = [];
    const radarData: RadarPointWithDetail[] = [];

    (bars.competency_evaluations || []).forEach((c: CompetencyEvaluation) => {
      const isUnassessed = c.evidence_classification === "Insufficient coverage" || c.bars_level === null;
      const isWeak = c.evidence_classification === "Weak evidence";
      const isDemonstrated = c.evidence_classification === "Demonstrated competence";
      const isContradictory = c.evidence_classification === "Contradictory evidence";

      let statusBadge = "Demonstrated";
      let dVariant: "emerald" | "indigo" | "amber" | "rose" | "slate" = "emerald";

      if (isUnassessed) {
        statusBadge = "Unassessed";
        dVariant = "slate";
      } else if (isWeak) {
        statusBadge = "Needs Refinement";
        dVariant = "amber";
      } else if (isContradictory) {
        statusBadge = "Inconsistent Evidence";
        dVariant = "rose";
      }

      let levelLabel = "Unassessed";
      if (c.bars_level) {
        const labels: Record<number, string> = {
          1: "Level 1 · Developing",
          2: "Level 2 · Working Knowledge",
          3: "Level 3 · Senior Fluent",
          4: "Level 4 · Staff Calibrated",
        };
        levelLabel = labels[c.bars_level] || `Level ${c.bars_level}`;
      }

      const quotes = (c.evidence_quotes || []).map((q) => ({
        turnIndex: q.turn_index,
        speaker: q.speaker,
        quote: q.quote,
        relevance: q.relevance,
        timestamp: getTimestampForTurn(q.turn_index),
      }));

      dimensions.push({
        id: c.competency_id,
        name: c.competency_name,
        barsLevel: c.bars_level,
        levelLabel,
        statusBadge,
        badgeVariant: dVariant,
        observation: c.behavioral_observation || c.bars_anchor,
        isUnassessed,
        quotes,
      });

      // Include in radar data only if assessed (avoid plotting unassessed as zero!)
      if (c.bars_level !== null && !isUnassessed && !NOT_RADAR_AXES.has(c.competency_id)) {
        const nextLevel = c.next_level_anchor ? String(c.next_level_anchor).replace(/^Level\s*\d:\s*/i, "") : undefined;
        const candidateQuote = (c.evidence_quotes || []).find((x) => /candidate|you/i.test(x.speaker || "")) || (c.evidence_quotes || [])[0];
        const gaps = (c.gaps_or_limitations || []).filter(Boolean);
        radarData.push({
          dimension: RADAR_LABELS[c.competency_id] || c.competency_name.split(/[&,]/)[0].trim().slice(0, 16),
          level: c.bars_level,
          fullMark: 4,
          detail: {
            why: [
              c.behavioral_observation || c.bars_anchor,
              ...(c.strengths || []).slice(0, 2).map((x) => `Worked: ${x}`),
              ...gaps.filter((g) => /^Rated lower/i.test(g)),
            ].filter(Boolean).join(" "),
            quote: candidateQuote?.quote,
            gaps,
            improve: [
              ...gaps.filter((g) => !/^Rated lower/i.test(g)).slice(0, 2).map((g) => `Cover what was missing: ${g}`),
              ...(nextLevel ? [`To reach Level ${c.bars_level + 1}: ${nextLevel}`] : ["Already at the top of the scale. Keep backing every claim with a number or a proof."]),
            ],
            nextLevel,
          },
        });
      }
    });

    // 3. Top Strengths (max 3)
    const strengths: CandidateReportStrength[] = [];
    const rawStrengths = bars.key_technical_strengths || [];
    
    rawStrengths.slice(0, 3).forEach((s) => {
      const ev = bestEvidence(s, bars.competency_evaluations || [], "strength");
      strengths.push({
        title: s.split(":")[0].replace(/^[0-9.]+\s*/, ""),
        explanation: s.includes(":") ? s.split(":").slice(1).join(":").trim() : s,
        turnIndex: ev?.turnIndex,
        timestamp: getTimestampForTurn(ev?.turnIndex),
        quote: ev?.quote,
        evidenceNote: ev?.note,
      });
    });

    // Fallback if key_technical_strengths was empty
    if (strengths.length === 0) {
      bars.competency_evaluations?.forEach((c) => {
        if (strengths.length < 3 && c.strengths?.length) {
          strengths.push({
            title: c.competency_name,
            explanation: c.strengths[0],
            turnIndex: c.evidence_quotes?.[0]?.turn_index,
            timestamp: getTimestampForTurn(c.evidence_quotes?.[0]?.turn_index),
            quote: c.evidence_quotes?.[0]?.quote,
          });
        }
      });
    }

    // 4. Areas to Improve (max 3 high-impact areas)
    const improvements: CandidateReportImprovement[] = [];
    const rawGaps = bars.key_technical_weaknesses || [];

    rawGaps.slice(0, 3).forEach((g) => {
      const parts = g.split(":");
      const title = parts[0].replace(/^[0-9.]+\s*/, "").trim();
      const struggle = parts.length > 1 ? parts.slice(1).join(":").trim() : g;

      const ev = bestEvidence(g, bars.competency_evaluations || [], "gap");
      improvements.push({
        title,
        struggle,
        whyItMatters: "",
        betterApproach: "",
        turnIndex: ev?.turnIndex,
        timestamp: getTimestampForTurn(ev?.turnIndex),
        quote: ev?.quote,
        evidenceNote: ev?.note,
      });
    });

    // If weaknesses were sparse, check competency gaps
    if (improvements.length === 0) {
      bars.competency_evaluations?.forEach((c) => {
        if (improvements.length < 3 && c.gaps_or_limitations?.length && c.evidence_classification !== "Insufficient coverage") {
          improvements.push({
            title: c.competency_name,
            struggle: c.gaps_or_limitations[0],
            whyItMatters: "",
            betterApproach: "",
          });
        }
      });
    }

    // 5. Recommended Practice (Grounded roadmap)
    const recommendations: CandidateReportRecommendation[] = [];
    const growthPlan = bars.actionable_growth_plan || [];

    growthPlan.slice(0, 3).forEach((planItem, idx) => {
      const parts = planItem.split(":");
      const topic = parts[0].replace(/^[0-9.]+\s*/, "").trim();
      const practiceTask = parts.length > 1 ? parts.slice(1).join(":").trim() : planItem;

      recommendations.push({
        topic: topic || `Core Skill Drill #${idx + 1}`,
        practiceTask,
        learningOutcome: "Build reflex-level fluency in recognizing problem patterns and explaining trade-offs concisely.",
        priority: idx === 0 ? "High" : "Medium",
      });
    });

    if (recommendations.length === 0) {
      recommendations.push({
        topic: `${track} System Modeling`,
        practiceTask: "Complete timed mock rounds focusing on structuring answers within the first 60 seconds.",
        learningOutcome: "Crisp communication and confident milestone progression.",
        priority: "High",
      });
    }

    // 6. Communication Summary & Telemetry
    const commsCard = bars.communication_scorecard;
    const commDims = (commsCard?.dimensions || []).map((d) => ({
      id: d.dimension_id,
      name: d.name,
      rating: d.rating,
      observation: d.observation,
      quote: d.evidence_quote || undefined,
    }));

    const telemetry = commsCard?.telemetry || {
      total_words: transcript.filter((t) => t.speaker === "Candidate").reduce((acc, t) => acc + t.text.split(/\s+/).length, 0),
      candidate_speaking_minutes: Math.round(durationSeconds * 0.55 / 60 * 10) / 10,
      estimated_wpm: 0,
      filler_word_count: 0,
    };

    let wpmAssessment = "Comfortable pace (125-165 WPM target)";
    if (telemetry.estimated_wpm > 165) wpmAssessment = "Rapid pace · Consider pausing between major points";
    else if (telemetry.estimated_wpm < 125 && telemetry.estimated_wpm > 0) wpmAssessment = "Deliberate pace · Can increase momentum on familiar topics";

    const candidateTurns = transcript.filter((t) => t.speaker === "Candidate").map((t) => t.text);
    const patterns = findSpeechPatterns(candidateTurns);

    // Evidence from the transcript, not the model's default rating: verbal tics cap the axes they make unreliable.
    const tics = ticStats(candidateTurns);
    const levelOf = (d: { id: string; rating: string }) => capLevel(ratingToLevel(d.rating), d.id, tics.rate);

    const topTics = Object.entries(tics.breakdown || {})
      .sort((x, y) => y[1] - x[1])
      .slice(0, 3)
      .map(([w, n]) => `"${w}" ${n}x`)
      .join(", ");
    const commRadar: RadarPointWithDetail[] = commDims.map((d) => {
      const level = levelOf(d);
      const held = level < ratingToLevel(d.rating);
      return {
        dimension: COMM_AXIS_LABELS[d.id] || d.name.split(/[&,]/)[0].trim().slice(0, 14),
        level,
        fullMark: 4,
        detail: {
          why: `${d.observation}${held ? ` Held below the first read because of verbal tics in your answers${topTics ? ` (${topTics})` : ""}.` : ""}`,
          quote: d.quote,
          gaps: [],
          improve: [COMM_IMPROVE[d.id] || "Practise this out loud and listen back for where it slips.", ...(level < 4 ? [`To reach Level ${level + 1}: do this in every answer, not just the strong ones.`] : [])],
        },
      };
    });
    const pace = telemetry.estimated_wpm > 0 ? paceLevel(telemetry.estimated_wpm) : null;
    if (pace !== null) {
      commRadar.push({
        dimension: "Pace",
        level: pace,
        fullMark: 4,
        detail: {
          why: `You spoke at about ${telemetry.estimated_wpm} words per minute. ${wpmAssessment}`,
          gaps: pace < 4 ? [wpmAssessment] : [],
          improve: ["Aim for 125 to 165 words per minute: record one answer, count the words, and adjust.", "Slow down on the key decision and speed up on familiar background."],
        },
      });
    }
    if (tics.rate !== null) {
      commRadar.push({
        dimension: "Filler Control",
        level: fillerLevel(tics.rate),
        fullMark: 4,
        detail: {
          why: `${Math.round(tics.weighted)} filler or hedge words in ${tics.words} words (${tics.rate.toFixed(1)} per 100)${topTics ? `: ${topTics}` : ""}.`,
          gaps: tics.rate >= 1 ? [`${tics.rate.toFixed(1)} fillers per 100 words`] : [],
          improve: ["Replace each filler with a silent one-beat pause.", topTics ? `Watch for your top habits: ${topTics}.` : "Keep it up; re-check after your next session."],
        },
      });
    }

    const wentWell: { title: string; detail: string; quote?: string }[] = commDims
      .filter((d) => levelOf(d) >= 3)
      .map((d) => ({ title: d.name, detail: d.observation, quote: d.quote }));
    const needsWork: { title: string; detail: string; quote?: string }[] = commDims
      .filter((d) => levelOf(d) <= 2)
      .map((d) => ({ title: d.name, detail: d.observation, quote: d.quote }));
    for (const pat of patterns) {
      needsWork.push({
        title: pat.kind === "buzzword" ? `Leaned on the buzzword "${pat.term}"` : `Hedged with "${pat.term}"`,
        detail:
          pat.kind === "buzzword"
            ? `You used "${pat.term}" ${pat.count} times without saying what it meant in your solution. Interviewers hear this as a claim with nothing behind it.`
            : `"${pat.term}" came up ${pat.count} times. It softens points you actually know and makes answers sound less certain than they are.`,
        quote: pat.example,
      });
    }
    if (tics.rate !== null) {
      const top = Object.entries(tics.breakdown)
        .sort((x, y) => y[1] - x[1])
        .slice(0, 3)
        .map(([w, n]) => `"${w}" ${n}x`)
        .join(", ");
      const total = Math.round(tics.weighted);
      if (tics.rate >= 1.0) {
        needsWork.push({
          title: "Filler words and verbal tics",
          detail: `${total} filler or hedge words in ${tics.words} words (${tics.rate.toFixed(1)} per 100)${top ? `: ${top}` : ""}.`,
        });
      } else if (tics.rate < 0.5) {
        wentWell.push({ title: "Controlled delivery", detail: `Only ${total} filler or hedge words across ${tics.words} words.` });
      }
    }
    if (pace !== null && pace <= 2) {
      needsWork.push({ title: "Speaking pace", detail: wpmAssessment });
    } else if (pace === 4) {
      wentWell.push({ title: "Speaking pace", detail: `${telemetry.estimated_wpm} words per minute sits in the comfortable 125-165 range.` });
    }

    const advice: string[] = [];
    for (const pat of patterns) {
      advice.push(
        pat.kind === "buzzword"
          ? `Replace "${pat.term}" with the concrete fact behind it, for example the data structure, the number or the trade-off you chose.`
          : `Drop "${pat.term}" and state the point directly. A short pause reads as more confident than a hedge.`,
      );
    }
    for (const d of commDims.filter((x) => levelOf(x) <= 2)) {
      advice.push(`${d.name}: ${d.observation}`);
    }
    advice.push(
      "Lead with the decision, then the reasoning. For example: 'I will use a hash map keyed by the sorted string, because ...'.",
      "Signpost transitions out loud ('First the constraints, then the baseline, then the optimization') so the interviewer can follow your plan.",
    );

    const communication: CandidateReportCommunication = {
      overallRating: commsCard?.overall_rating || "Strong",
      summary: bars.communication_and_deliberation || "Candidate articulated technical concepts clearly with structured problem exploration.",
      telemetry: {
        totalWords: telemetry.total_words,
        speakingMinutes: telemetry.candidate_speaking_minutes,
        wpm: telemetry.estimated_wpm,
        wpmAssessment,
        fillerCount: Math.round(tics.weighted),
        fillerBreakdown: tics.breakdown,
      },
      dimensions: commDims,
      coachingTips: advice.slice(0, 6),
      radar: commRadar,
      wentWell,
      needsWork,
    };

    return {
      track,
      title,
      date,
      formattedDuration,
      durationSeconds,
      overallAssessment: {
        headline: sig,
        summary: cleanSummary,
        calibrationSignal: sig,
        coveragePct: bars.coverage_summary?.coverage_percentage || 0,
        demonstratedCount: bars.coverage_summary?.demonstrated_count || 0,
        totalCompetencies: bars.coverage_summary?.total_competencies || dimensions.length,
        badgeVariant,
      },
      dimensions,
      radarData,
      strengths,
      improvements,
      recommendations,
      communication,
      transcript,
      isBars: true,
      rawReport: bars,
    };
  }

  // Fallback for Legacy Reports
  return {
    track,
    title,
    date,
    formattedDuration,
    durationSeconds,
    overallAssessment: {
      headline: "Legacy Session Summary",
      summary: report?.technical?.executiveSummary || "Session preserved from historical evaluation archive.",
      calibrationSignal: "Historical Assessment",
      coveragePct: 75,
      demonstratedCount: 4,
      totalCompetencies: 5,
      badgeVariant: "indigo",
    },
    dimensions: [
      {
        id: "legacy_tech",
        name: "Technical Depth & Architecture",
        barsLevel: 3,
        levelLabel: "Level 3 · Senior Fluent",
        statusBadge: "Demonstrated",
        badgeVariant: "emerald",
        observation: "Strong comprehension of architectural fundamentals and system constraints.",
        isUnassessed: false,
        quotes: [],
      },
    ],
    radarData: [
      { dimension: "Technical Depth", level: 3, fullMark: 4 },
      { dimension: "Trade-offs", level: 3, fullMark: 4 },
      { dimension: "Edge Cases", level: 2, fullMark: 4 },
      { dimension: "Clarity", level: 3, fullMark: 4 },
    ],
    strengths: [
      { title: "System Fundamentals", explanation: "Clear explanation of dataflow and component isolation." },
    ],
    improvements: [
      {
        title: "Edge Condition Validation",
        struggle: "Walked through happy path without probing network partitions.",
        whyItMatters: "Interviews calibrate for production failure readiness.",
        betterApproach: "Specify timeout, circuit breaker, and retry policies.",
      },
    ],
    recommendations: [
      {
        topic: "Distributed Reliability",
        practiceTask: "Review consensus algorithms and split-brain recovery.",
        learningOutcome: "Confidence during edge-case probes.",
        priority: "High",
      },
    ],
    communication: {
      overallRating: "Strong",
      summary: "Communication was direct and focused on core deliverables.",
      telemetry: {
        totalWords: 450,
        speakingMinutes: 3.5,
        wpm: 130,
        wpmAssessment: "Optimal Cadence",
        fillerCount: 1,
      },
      dimensions: [],
      coachingTips: ["Maintain structured responses with clear summaries."],
    },
    transcript,
    isBars: false,
    rawReport: report,
  };
}

