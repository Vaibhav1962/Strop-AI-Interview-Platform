import { Button, usePresence, useDialogA11y } from "../components/ui";
import CandidateReportView from "../components/CandidateReportView";
import { useState, useEffect } from "react";
import {
  type ComprehensiveInterviewReport,
  setSelectedReportId,
  clearSelectedReportId,
  getSelectedReportId,
  getReportStorageKey,
  getReportHistoryKey,
} from "../lib/reportGenerator";
import {
  getAllJdMatchReports,
  deleteJdMatchReport,
  setActiveJdMatchReport,
  type SavedJdMatchReport,
} from "../lib/jdMatcher";
import { cleanSessionTitle, realSessionSeconds } from "../lib/sessionMetrics";
import { setUserJD } from "../lib/userDocuments";
import {
  listInterviewSessions,
  getInterviewSession,
  deleteInterviewSession,
  resetInterviewSessions,
  type InterviewSession,
} from "../lib/api";
import {
  type BarsEvaluationReport,
  getOrchestratorEvaluation,
  getOrchestratorSession,
  listOrchestratorSessions,
  deleteOrchestratorSession,
  resetOrchestratorSessions,
  isBarsReport,
  downloadOrchestratorSessionPdf,
  evaluateOrchestratorSessionAsync,
} from "../lib/orchestratorClient";

interface UnifiedHistorySession {
  id: string;
  title: string;
  track: string;
  date: string;
  durationSeconds: number;
  formattedDuration: string;
  overallScore: number | null;
  competencyLevel: string;
  evaluationStatus?: "idle" | "processing" | "completed" | "failed";
  questionCount: number;
  transcriptCount: number;
  report?: ComprehensiveInterviewReport | BarsEvaluationReport | null;
  isBars: boolean;
  hasCandidateTurns: boolean;
  strengths: string[];
  audio_url?: string;
  startedAt?: string;
  problemTitle?: string;
}

export default function History({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [activeTab, setActiveTab] = useState<"interviews" | "jd-matches">("interviews");
  const [search, setSearch] = useState("");
  const [selectedTrackFilter, setSelectedTrackFilter] = useState("all");
  const [interviewSessions, setInterviewSessions] = useState<UnifiedHistorySession[]>([]);
  const [jdMatchReports, setJdMatchReports] = useState<SavedJdMatchReport[]>([]);
  const [expandedJdId, setExpandedJdId] = useState<string | null>(null);
  const [detailModal, setDetailModal] = useState<{
    session: UnifiedHistorySession;
    lines: any[];
    report?: ComprehensiveInterviewReport | BarsEvaluationReport | null;
  } | null>(null);
  const [modalTab, setModalTab] = useState<
    "bars_rubrics" | "bars_visuals" | "bars_growth" | "bars_timeline" | "bars_comms" | "technical" | "speech" | "questions" | "transcript"
  >("bars_rubrics");
  const [confirmReset, setConfirmReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [loading, setLoading] = useState(true);
  const resetDlg = usePresence(confirmReset);
  const resetRef = useDialogA11y<HTMLDivElement>(confirmReset, () => setConfirmReset(false));
  const detail = usePresence(detailModal);

  const handleDownloadPdf = async (sessionId: string, title?: string) => {
    try {
      setIsDownloadingPdf(true);
      await downloadOrchestratorSessionPdf(sessionId, `${title || "Strop-Report"}.pdf`);
    } catch (e: any) {
      console.error("[History] PDF download failed:", e);
      alert(`Could not download PDF report: ${e.message || e}`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleRetryEvaluation = async (sessionId: string) => {
    try {
      setRetryingId(sessionId);
      await evaluateOrchestratorSessionAsync(sessionId, true);
      fetchSessions();
    } catch (e: any) {
      console.error("[History] Retry evaluation failed:", e);
    } finally {
      setRetryingId(null);
    }
  };

  const fetchSessions = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [orchRes, legacyRes] = await Promise.allSettled([
        listOrchestratorSessions(),
        listInterviewSessions(),
      ]);

      const orchSessions = orchRes.status === "fulfilled" ? orchRes.value : [];
      const legacySessions = legacyRes.status === "fulfilled" ? legacyRes.value : [];

      const sessionMap = new Map<string, UnifiedHistorySession>();

      // 1. Process orchestrator sessions (authoritative modern engine)
      for (const os of orchSessions) {
        const memory = os.working_memory || {};
        const durationSec = realSessionSeconds(os, memory);
        const m = Math.floor(durationSec / 60);
        const s = durationSec % 60;
        const formattedDuration = `${m}m ${String(s).padStart(2, "0")}s`;
        const candTurns = (os.transcript || []).filter(
          (t: any) => t.speaker === "Candidate" || t.speaker === "You"
        );

        let dt = "Recent";
        if (os.created_at) {
          try {
            dt = new Date(os.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
          } catch {}
        }

        const report = memory.evaluation_report || null;
        const isBars = Boolean(report && isBarsReport(report));
        const evalStatus = os.evaluation_status || (report ? "completed" : "idle");

        let compLevel = "Incomplete";
        if (evalStatus === "completed" && report) {
          compLevel = report.calibration_signal || "Completed";
        } else if (evalStatus === "processing") {
          compLevel = "Evaluating...";
        } else if (evalStatus === "failed") {
          compLevel = "Evaluation Paused";
        } else if (candTurns.length > 0) {
          compLevel = "Ready for Evaluation";
        }

        const strengths = report?.key_technical_strengths || [];

        sessionMap.set(String(os.id), {
          id: String(os.id),
          title: cleanSessionTitle(os.title),
          track: os.track || "System Design",
          date: dt,
          durationSeconds: durationSec,
          formattedDuration,
          overallScore: null,
          competencyLevel: compLevel,
          evaluationStatus: evalStatus,
          questionCount: Math.max(candTurns.length, 1),
          transcriptCount: os.transcript?.length || 0,
          report: report as any,
          isBars: true,
          hasCandidateTurns: candTurns.length > 0,
          strengths,
          startedAt: os.created_at,
          problemTitle: memory?.dsa_problem?.title || undefined,
        });
      }

      // 2. Process legacy sessions for older interviews not in orchestrator
      for (const bs of legacySessions) {
        const sid = String(bs.id);
        const existing = sessionMap.get(sid);
        if (existing) {
          // If legacy has report and orchestrator memory didn't have it attached, attach it
          if (!existing.report && bs.report) {
            existing.report = bs.report as any;
            if (isBarsReport(bs.report)) {
              existing.isBars = true;
              existing.competencyLevel = (bs.report as any).calibration_signal || existing.competencyLevel;
            }
          }
          if (bs.overall_score !== null && bs.overall_score !== undefined && existing.overallScore === null) {
            existing.overallScore = bs.overall_score;
          }
          if (bs.duration_seconds && !existing.durationSeconds) {
            existing.durationSeconds = bs.duration_seconds;
            const m = Math.floor(bs.duration_seconds / 60);
            const s = bs.duration_seconds % 60;
            existing.formattedDuration = `${m}m ${String(s).padStart(2, "0")}s`;
          }
          continue;
        }

        const m = Math.floor(bs.duration_seconds / 60);
        const s = bs.duration_seconds % 60;
        const formattedDuration = `${m}m ${String(s).padStart(2, "0")}s`;
        const candTurns = (bs.transcript || []).filter(
          (t: any) => t.speaker === "You" || t.speaker === "Candidate"
        );

        let dt = "Recent";
        if (bs.created_at) {
          try {
            dt = new Date(bs.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
          } catch {}
        }

        const isBars = isBarsReport(bs.report);

        sessionMap.set(sid, {
          id: sid,
          title: cleanSessionTitle(bs.title),
          track: bs.track || (bs.title.includes("Technical") ? "System Design" : "Full-Stack"),
          date: dt,
          durationSeconds: bs.duration_seconds,
          formattedDuration,
          overallScore: bs.overall_score ?? null,
          competencyLevel: isBars
            ? (bs.report as any).calibration_signal
            : bs.competency_level || (candTurns.length > 0 ? "Evaluated" : "Incomplete"),
          questionCount: bs.question_count || 4,
          transcriptCount: bs.transcript?.length || 0,
          report: (bs.report as any) || null,
          isBars,
          hasCandidateTurns: candTurns.length > 0,
          strengths: bs.strengths || [],
        });
      }

      const unified = Array.from(sessionMap.values());
      setInterviewSessions(unified);
      if (!isBackground) setLoading(false);

      const preselectedId = getSelectedReportId();
      if (preselectedId) {
        const match = unified.find((s) => s.id === preselectedId);
        if (match) {
          handleOpenInterviewReport(match);
        }
      }
    } catch (err) {
      console.warn("[History] Error loading sessions:", err);
      setInterviewSessions([]);
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    const refreshJds = () => setJdMatchReports(getAllJdMatchReports());
    refreshJds();
    window.addEventListener("interviewiq-profile-synced", refreshJds);
    window.addEventListener("focus", refreshJds);
    fetchSessions();

    const handleRefresh = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (!custom.detail || custom.detail === "history") {
        fetchSessions();
      }
    };
    window.addEventListener("interviewiq-navigate", handleRefresh);
    window.addEventListener("interviewiq-refresh-history", handleRefresh);
    return () => {
      window.removeEventListener("interviewiq-profile-synced", refreshJds);
      window.removeEventListener("focus", refreshJds);
      window.removeEventListener("interviewiq-navigate", handleRefresh);
      window.removeEventListener("interviewiq-refresh-history", handleRefresh);
    };
  }, []);

  // Auto-poll if any interview session is currently being evaluated in the background
  useEffect(() => {
    const hasPending = interviewSessions.some(
      (s) =>
        s.evaluationStatus === "processing" ||
        s.competencyLevel === "Evaluating..." ||
        s.competencyLevel === "Evaluating Competencies..."
    );
    if (!hasPending) return;
    const interval = setInterval(() => {
      fetchSessions(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [interviewSessions]);

  // Filtered Interviews
  const filteredInterviews = interviewSessions.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.track || "").toLowerCase().includes(q) ||
      (r.title || "").toLowerCase().includes(q) ||
      (r.date || "").toLowerCase().includes(q) ||
      (r.competencyLevel || "").toLowerCase().includes(q)
    );
  });

  // Filtered JD Matches
  const filteredJdMatches = jdMatchReports.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (m.jdTitle || "").toLowerCase().includes(q) ||
      (m.jdCompany || "").toLowerCase().includes(q) ||
      (m.date || "").toLowerCase().includes(q) ||
      (m.matchingSkills || []).some((s) => s.toLowerCase().includes(q))
    );
  });

  // Interview stats
  const evaluatedInterviews = interviewSessions.filter((s) => s.overallScore !== null);
  const avgInterviewScore =
    evaluatedInterviews.length > 0
      ? Math.round(
          evaluatedInterviews.reduce((a, s) => a + (s.overallScore || 0), 0) /
            evaluatedInterviews.length
        )
      : null;
  const bestInterviewScore =
    evaluatedInterviews.length > 0
      ? Math.max(...evaluatedInterviews.map((s) => s.overallScore || 0))
      : null;

  // JD Match stats
  const avgJdScore =
    jdMatchReports.length > 0
      ? Math.round(
          jdMatchReports.reduce((a, s) => a + (s.overallScore || 0), 0) /
            jdMatchReports.length
        )
      : 0;
  const bestJdScore =
    jdMatchReports.length > 0
      ? Math.max(...jdMatchReports.map((s) => s.overallScore || 0))
      : 0;

  const handleDeleteJdMatch = async (id: string) => {
    setDeletingId(id);
    try {
      setJdMatchReports(await deleteJdMatchReport(id));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSession = async (id: string) => {
    setDeletingId(id);
    try {
      await Promise.allSettled([
        deleteOrchestratorSession(id),
        deleteInterviewSession(id),
      ]);
      setInterviewSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Failed to delete interview session:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleResetHistory = async () => {
    setIsResetting(true);
    try {
      await Promise.allSettled([
        resetOrchestratorSessions(),
        resetInterviewSessions(),
      ]);
      const sKey = getReportStorageKey();
      const hKey = getReportHistoryKey();
      if (sKey) localStorage.removeItem(sKey);
      if (hKey) localStorage.removeItem(hKey);
      clearSelectedReportId();
      setInterviewSessions([]);
      setConfirmReset(false);
    } catch (err) {
      console.error("Failed to reset history:", err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleOpenInterviewReport = async (session: UnifiedHistorySession) => {
    setSelectedReportId(session.id);
    let lines = (session.report as any)?.rawTranscript || [];
    let report = session.report || null;
    let startedAt = session.startedAt;

    // The live session record keeps real timestamps; the older table only has placeholders.
    try {
      const live = await getOrchestratorSession(session.id);
      if (live?.transcript?.length) lines = live.transcript;
      if (live?.created_at) startedAt = live.created_at;
    } catch {
      /* fall back to the older record below */
    }

    if (!report) {
      try {
        const bars = await getOrchestratorEvaluation(session.id);
        if (bars) report = bars as any;
      } catch (e) {
        console.warn("[History] Orchestrator evaluation not found yet:", e);
      }
    }

    if (!lines.length || !report) {
      try {
        const fullSession = await getInterviewSession(session.id);
        if (fullSession) {
          if (fullSession.transcript && !lines.length) lines = fullSession.transcript;
          if (fullSession.report && !report) report = fullSession.report as any;
        }
      } catch (e) {
        console.warn("[History] Failed to fetch session details from legacy API:", e);
      }
    }

    if (!lines.length) {
      try {
        const os = await getOrchestratorSession(session.id);
        if (os?.transcript) lines = os.transcript;
      } catch (e) {
        console.warn("[History] Failed to fetch orchestrator session transcript:", e);
      }
    }

    setDetailModal({
      session: { ...session, startedAt },
      lines,
      report,
    });
    setModalTab(isBarsReport(report) ? "bars_rubrics" : report ? "technical" : "transcript");
  };

  const handleOpenJdMatch = (report: SavedJdMatchReport) => {
    setActiveJdMatchReport(report);
    setUserJD(report.jdData);
    onNavigate("match-analysis");
  };

  const trackKey = (raw: string) => {
    const t = (raw || "").toLowerCase();
    if (t.includes("dsa") || t.includes("algorithm")) return "dsa";
    if (t.includes("system")) return "system-design";
    if (t.includes("core") || t.includes("cs")) return "core-cs";
    if (t.includes("behav")) return "behavioral";
    if (t.includes("resume")) return "resume";
    return "other";
  };
  const visibleSessions = filteredInterviews.filter(
    (s) => selectedTrackFilter === "all" || trackKey(s.track) === selectedTrackFilter
  );
  const isEvaluating = (s: UnifiedHistorySession) =>
    s.evaluationStatus === "processing" || s.competencyLevel === "Evaluating..." || s.competencyLevel === "Evaluating Competencies...";
  const evaluatedCount = interviewSessions.filter((s) => s.report && !isEvaluating(s)).length;
  const evaluatingCount = interviewSessions.filter(isEvaluating).length;
  const pausedCount = interviewSessions.filter((s) => s.evaluationStatus === "failed").length;

  const FILTERS = [
    { id: "all", label: "All tracks" },
    { id: "dsa", label: "DSA" },
    { id: "system-design", label: "System design" },
    { id: "core-cs", label: "Core CS" },
    { id: "behavioral", label: "Behavioral" },
    { id: "resume", label: "Resume technical" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1160px] px-5 sm:px-[clamp(20px,4vw,56px)] pt-2 pb-16 text-[14px] leading-[1.55]">
      {/* Tabs: interviews vs resume / job matches */}
      <div className="ob-rise flex gap-1 border-b border-ob-ln" style={{ ["--i" as string]: 3 }} role="tablist" aria-label="Archive sections">
        {([
          { id: "interviews", label: "Interviews", n: interviewSessions.length },
          { id: "jd-matches", label: "Resume & JD matches", n: jdMatchReports.length },
        ] as const).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => {
              setActiveTab(t.id);
              setSearch("");
            }}
            className={`relative h-11 px-4 text-[13.5px] cursor-pointer transition-colors duration-300 -mb-px border-b ${
              activeTab === t.id ? "text-ob-tx border-ob-ac" : "ob-tx3 border-transparent hover:text-ob-tx"
            }`}
          >
            {t.label}
            <span className="ob-mo text-[11px] ml-2 ob-tx3">{t.n}</span>
          </button>
        ))}
      </div>

      {/* Search + track filters */}
      <div className="ob-rise flex gap-3 flex-wrap items-center mt-6 mb-5" style={{ ["--i" as string]: 3 }}>
        <div className="relative flex-[1_1_240px] max-w-[340px]">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--ob-tx3)" strokeWidth="1.8" strokeLinecap="round" className="absolute left-3.5 top-[14px]" aria-hidden="true">
            <circle cx="11" cy="11" r="6" />
            <path d="M20 20l-4-4" />
          </svg>
          <input
            className="ob-input !h-[42px] !pl-[38px]"
            style={{ background: "var(--ob-card)" }}
            aria-label="Search"
            placeholder={activeTab === "interviews" ? "Search sessions" : "Search job matches"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={`flex gap-1.5 flex-wrap ${activeTab === "interviews" ? "" : "hidden"}`} role="group" aria-label="Filter by track">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={selectedTrackFilter === f.id}
              onClick={() => setSelectedTrackFilter(f.id)}
              className={`h-[38px] px-3.5 border rounded-[9px] text-[13px] cursor-pointer transition duration-300 ${
                selectedTrackFilter === f.id
                  ? "bg-[rgb(var(--ob-ac-rgb)/0.07)] border-[rgb(var(--ob-ac-rgb)/0.26)] text-ob-tx"
                  : "border-ob-ln2 text-ob-tx2 hover:text-ob-tx hover:border-ob-ln3"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "jd-matches" ? (
        <div className="ob-rise border-b border-ob-ln" style={{ ["--i" as string]: 4 }}>
          {filteredJdMatches.length === 0 ? (
            <div className="py-14 text-center border-t border-ob-ln">
              <div className="text-[17px] mb-1.5">{jdMatchReports.length === 0 ? "No resume matches yet" : "No matches found"}</div>
              <div className="ob-tx3 text-[13px] mb-5">
                {jdMatchReports.length === 0
                  ? "Analyze a job description against your resume and the report is saved here."
                  : "Try a different search."}
              </div>
              {jdMatchReports.length === 0 && (
                <button type="button" className="ob-btn ob-pr" onClick={() => onNavigate("job-description")}>Analyze a job</button>
              )}
            </div>
          ) : (
            filteredJdMatches.map((m, i) => (
              <div
                key={m.id}
                className={`grid grid-cols-1 sm:grid-cols-[84px_minmax(0,1fr)_200px_240px] gap-x-4 gap-y-2 items-center px-2 py-[18px] border-t border-ob-ln transition-colors duration-300 hover:bg-[rgb(var(--ob-ac-rgb)/0.04)] ${deletingId === m.id ? "ob-collapse" : ""}`}
                style={deletingId === m.id ? undefined : { animation: `ob-rise 0.7s var(--ob-ease) ${0.1 + i * 0.05}s both` }}
              >
                <span className="ob-mo text-xs ob-tx3 whitespace-nowrap">{(m.date || "").replace(/,\s*\d{4}$/, "")}</span>
                <span className="min-w-0">
                  <span className="block text-[15px] truncate">{m.jdTitle}</span>
                  <span className="block ob-tx3 text-[12.5px] truncate">
                    {[m.jdCompany, m.resumeFilename].filter(Boolean).join(" · ")} · {m.matchingSkillsCount}/{m.totalSkillsCount} skills matched
                  </span>
                </span>
                <span className="grid grid-cols-[1fr_32px] gap-2.5 items-center">
                  <span className="ob-bar"><i style={{ width: `${Math.min(100, m.overallScore)}%`, ["--i" as string]: i }} /></span>
                  <span className="ob-mo text-xs text-right">{Math.round(m.overallScore)}</span>
                </span>
                <span className="flex items-center gap-2 sm:justify-end">
                  <button type="button" className="ob-btn ob-sm" onClick={() => handleOpenJdMatch(m)}>Report</button>
                  <button
                    type="button"
                    onClick={() => handleDeleteJdMatch(m.id)}
                    disabled={deletingId === m.id}
                    aria-label={`Delete ${m.jdTitle}`}
                    title="Delete match"
                    className="w-8 h-8 grid place-items-center rounded-[7px] text-ob-tx3 hover:text-ob-hot hover:bg-ob-bg3 transition-colors cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      ) : (
      <div className="flex flex-wrap gap-4 items-start">
        {/* Sessions */}
        <div className="ob-rise flex-[999_1_600px] min-w-0 border-b border-ob-ln" style={{ ["--i" as string]: 4 }}>
          {loading ? (
            <div role="status" aria-label="Loading your archive">
              {[0, 1, 2, 3].map((k) => (
                <div key={k} className="grid grid-cols-[84px_minmax(0,1fr)_96px] gap-x-4 items-center px-2 py-[18px] border-t border-ob-ln">
                  <span className="ob-sk" style={{ width: 52, height: 12 }} />
                  <span className="grid gap-2">
                    <span className="ob-sk" style={{ width: `${62 - k * 9}%`, height: 14 }} />
                    <span className="ob-sk" style={{ width: `${34 - k * 4}%`, height: 11 }} />
                  </span>
                  <span className="ob-sk justify-self-end" style={{ width: 72, height: 28 }} />
                </div>
              ))}
            </div>
          ) : visibleSessions.length === 0 ? (
            <div className="py-14 text-center border-t border-ob-ln">
              <div className="text-[17px] mb-1.5">{interviewSessions.length === 0 ? "No interviews yet" : "No sessions match"}</div>
              <div className="ob-tx3 text-[13px] mb-5">
                {interviewSessions.length === 0
                  ? "Start a session with Alex. Transcripts and reports will appear here."
                  : "Try a different search or track filter."}
              </div>
              {interviewSessions.length === 0 && (
                <button type="button" className="ob-btn ob-pr" onClick={() => onNavigate("interview-setup")}>Start an interview</button>
              )}
            </div>
          ) : (
            visibleSessions.map((session, i) => {
              const evaluating = isEvaluating(session);
              const failed = session.evaluationStatus === "failed" || session.competencyLevel === "Evaluation Paused" || session.competencyLevel === "Evaluation Failed";
              const ready = session.competencyLevel === "Ready for Evaluation";
              return (
                <div
                  key={session.id}
                  className={`grid grid-cols-1 sm:grid-cols-[84px_minmax(0,1fr)_240px] gap-x-4 gap-y-2 items-center px-2 py-[18px] border-t border-ob-ln transition-colors duration-300 hover:bg-[rgb(var(--ob-ac-rgb)/0.04)] ${deletingId === session.id ? "ob-collapse" : ""}`}
                  style={deletingId === session.id ? undefined : { animation: `ob-rise 0.7s var(--ob-ease) ${0.1 + i * 0.05}s both` }}
                >
                  <span className="ob-mo text-xs ob-tx3 whitespace-nowrap">{session.date.replace(/,\s*\d{4}$/, "")}</span>
                  <span className="min-w-0">
                    <span className="block text-[15px] truncate">{session.title}</span>
                    <span className="block ob-tx3 text-[12.5px]">
                      {session.formattedDuration} · {session.transcriptCount} turns
                      {session.problemTitle ? ` · ${session.problemTitle}` : ""}
                      {evaluating ? " · Evaluating report" : failed ? " · Evaluation paused" : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 sm:justify-end">
                    {evaluating ? (
                      <span className="relative group inline-flex">
                        <button type="button" className="ob-btn ob-sm ob-shim" disabled aria-disabled="true" aria-describedby={`gen-${session.id}`} style={{ opacity: 0.75, cursor: "not-allowed" }}>
                          Report
                        </button>
                        <span
                          id={`gen-${session.id}`}
                          role="tooltip"
                          className="pointer-events-none absolute right-0 bottom-full mb-2 w-56 rounded-lg border border-ob-ln2 bg-ob-card px-3 py-2 text-center text-[11.5px] leading-snug ob-tx2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 shadow-[0_8px_24px_-8px_rgb(var(--ob-sh)/0.8)]"
                        >
                          Generating report. Estimated time 5–10 minutes.
                        </span>
                      </span>
                    ) : failed || ready ? (
                      <>
                        <button type="button" className="ob-btn ob-pr ob-sm" disabled={retryingId === session.id} onClick={() => handleRetryEvaluation(session.id)}>
                          {retryingId === session.id ? "Working..." : failed ? "Retry" : "Evaluate"}
                        </button>
                        <button type="button" className="ob-btn ob-sm" onClick={() => handleOpenInterviewReport(session)}>Transcript</button>
                      </>
                    ) : (
                      <button type="button" className="ob-btn ob-sm" onClick={() => handleOpenInterviewReport(session)}>
                        {session.report ? "Report" : "Transcript"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteSession(session.id)}
                      disabled={deletingId === session.id}
                      aria-label={`Delete ${session.title}`}
                      title="Delete session"
                      className="w-8 h-8 grid place-items-center rounded-[7px] text-ob-tx3 hover:text-ob-hot hover:bg-ob-bg3 transition-colors cursor-pointer"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
      )}

      {/* Reset History Confirmation Modal */}
      {resetDlg.shown && (
        <div className={`fixed inset-0 bg-ob-bg/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${resetDlg.closing ? "ob-exit-fade" : "anim-fade-in"}`}>
          <div ref={resetRef} role="dialog" aria-modal="true" aria-label="Reset history" className={`bg-ob-bg2 border border-ob-ln rounded-2xl max-w-md w-full p-6 flex flex-col gap-4 text-center ${resetDlg.closing ? "ob-exit" : "ob-enter"}`}>
            <div className="w-12 h-12 rounded-full border border-[rgba(255,106,61,0.4)] text-ob-hot flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-medium text-ob-tx">
                Reset interview history?
              </h3>
              <p className="text-xs text-ob-tx2 mt-2 leading-relaxed">
                This will permanently remove all interview sessions, evaluations, and transcripts from the backend database for your account. Future interviews will begin from a fresh baseline.
              </p>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 py-2.5 rounded-xl border border-ob-ln bg-ob-bg3 hover:bg-ob-ov/5 text-xs font-medium text-ob-soft transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResetHistory}
                disabled={isResetting}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-[rgba(255,106,61,0.6)] text-ob-hot hover:bg-[rgba(255,106,61,0.08)]"
              >
                {isResetting ? "Resetting..." : "Reset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Assessment & Transcript Inspection Modal */}
      {detail.shown && ((dm) => (
        <div className={`fixed inset-0 z-50 bg-ob-bg/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 print:p-0 print:bg-white print:fixed-none ${detail.closing ? "ob-exit-fade" : "anim-fade-in"}`}>
          <style>{`
            @media print {
              body { background: white !important; color: black !important; }
              .no-print, nav, header, aside { display: none !important; }
              .print-modal { max-height: none !important; overflow: visible !important; border: none !important; box-shadow: none !important; }
            }
          `}</style>
          <div className={`bg-ob-bg2 border border-ob-ln rounded-[18px] max-w-[1500px] w-[96vw] max-h-[92vh] flex flex-col overflow-hidden print-modal ${detail.closing ? "ob-exit" : "ob-enter"}`}>
            <div className="p-5 sm:p-7 overflow-y-auto flex-1">
              {dm.report ? (
                <CandidateReportView
                  report={dm.report}
                  session={{
                    id: dm.session.id,
                    track: dm.session.track,
                    title: dm.session.title,
                    date: dm.session.date,
                    formattedDuration: dm.session.formattedDuration,
                    duration_seconds: dm.session.durationSeconds,
                    audio_url: dm.session.audio_url,
                    startedAt: dm.session.startedAt,
                  }}
                  transcript={dm.lines}
                  onClose={() => {
                    setDetailModal(null);
                    clearSelectedReportId();
                  }}
                  onNavigate={onNavigate}
                  onDownloadPdf={handleDownloadPdf}
                />
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-4 pb-4 border-b border-ob-ln">
                    <div>
                      <h2 className="text-xl font-medium text-ob-tx">
                        {dm.session.title}
                      </h2>
                      <p className="text-xs text-ob-tx2 mt-1">
                        {dm.session.track} · {dm.session.date} · {dm.session.formattedDuration}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setDetailModal(null);
                        clearSelectedReportId();
                      }}
                      className="p-2 rounded-xl text-ob-tx2 hover:text-ob-tx hover:bg-ob-ov/5 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 flex items-center justify-between gap-4">
                    <div>
                      <span className="font-bold block mb-0.5">Evaluation Status: {dm.session.competencyLevel}</span>
                      <span>The full assessment report is not yet finalized. You can review the raw transcript below.</span>
                    </div>
                    {dm.session.evaluationStatus === "failed" && (
                      <Button
                        variant="glow"
                        size="xs"
                        onClick={() => handleRetryEvaluation(dm.session.id)}
                        disabled={retryingId === dm.session.id}
                      >
                        {retryingId === dm.session.id ? "Retrying..." : "Retry Evaluation"}
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-ob-tx2">
                      Interview Transcript ({dm.lines.length} Turns)
                    </h3>
                    <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                      {dm.lines.map((line: any, idx: number) => {
                        const isAi = line.speaker === "Alex" || line.speaker === "AI" || line.speaker === "Interviewer";
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border text-xs ${
                              isAi
                                ? "bg-transparent border-ob-ln"
                                : "bg-ob-bg3 border-ob-ln"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1 text-[11px] font-mono font-semibold text-ob-tx2">
                              <span>{isAi ? "Alex (Interviewer)" : "Candidate"}</span>
                              <span>{line.time || ""}</span>
                            </div>
                            <p className="leading-relaxed text-ob-soft">{line.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))(detail.shown)}
    </div>
  );
}
