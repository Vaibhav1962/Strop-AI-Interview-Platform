import { useState, useEffect, useMemo } from "react";
import { getUserResume, cleanCandidateName } from "../lib/userDocuments";
import { type AuthUser, listInterviewSessions, type InterviewSession } from "../lib/api";
import { listOrchestratorSessions } from "../lib/orchestratorClient";
import { realSessionSeconds, interviewerQuestionCount } from "../lib/sessionMetrics";
import { getActiveJdMatchKey, isReadableJdText, type SavedJdMatchReport } from "../lib/jdMatcher";

interface DashboardProps {
  onNavigate: (page: string) => void;
  user?: AuthUser | null;
}

const TRACKS: { id: string; label: string }[] = [
  { id: "dsa", label: "Algorithms & DSA" },
  { id: "system-design", label: "System design" },
  { id: "cs-fundamentals", label: "Core CS" },
  { id: "behavioral", label: "Behavioral" },
  { id: "resume", label: "Resume technical" },
];

/** Normalises the many spellings the backend/legacy records use for a track. */
function trackId(raw?: string | null): string {
  const t = (raw || "").toLowerCase();
  if (t.includes("dsa") || t.includes("algorithm")) return "dsa";
  if (t.includes("system")) return "system-design";
  if (t.includes("core") || t.includes("cs")) return "cs-fundamentals";
  if (t.includes("behav")) return "behavioral";
  if (t.includes("resume")) return "resume";
  return "other";
}

function formatMinutes(seconds: number): string {
  if (!seconds || seconds <= 0) return "under 1 min";
  const m = Math.round(seconds / 60);
  return m < 1 ? "under 1 min" : `${m} min`;
}

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** Plain-language recap built from the competency results (the report's own summary line is boilerplate). */
function summarizeReport(rep?: Record<string, any> | null): string {
  if (!rep) return "";
  if (rep.insufficient_data) return rep.insufficient_reason || "This session was too short to assess.";
  const evals: any[] = Array.isArray(rep.competency_evaluations) ? rep.competency_evaluations : [];
  const total = rep.coverage_summary?.total_competencies ?? evals.length;
  if (!evals.length && !total) return "";
  const solid = evals.filter((e) => /demonstrated/i.test(e.evidence_classification || "")).map((e) => e.competency_name);
  const gaps = evals.filter((e) => !/demonstrated/i.test(e.evidence_classification || "")).map((e) => e.competency_name);
  const parts: string[] = [];
  if (solid.length) {
    parts.push(
      `Showed solid evidence in ${solid.length} of ${total} areas, including ${solid.slice(0, 2).join(" and ")}.`,
    );
  }
  if (gaps.length) {
    parts.push(`Needs more work on ${gaps.slice(0, 2).join(" and ")}.`);
  }
  const unassessed = rep.coverage_summary?.insufficient_coverage_count || 0;
  if (unassessed > 0) parts.push(`${unassessed} ${unassessed === 1 ? "area was" : "areas were"} not reached in the time available.`);
  return parts.join(" ");
}

function readJdMatch(uid?: string): SavedJdMatchReport | null {
  try {
    const key = getActiveJdMatchKey(uid);
    const raw = key ? localStorage.getItem(key) : null;
    const parsed = raw ? (JSON.parse(raw) as SavedJdMatchReport) : null;
    return parsed && isReadableJdText((parsed as any).jdData?.rawText || "") ? parsed : null;
  } catch {
    return null;
  }
}

export default function Dashboard({ onNavigate, user }: DashboardProps) {
  const uid = user?.id ? String(user.id) : undefined;
  const [resumeData, setResumeData] = useState(() => getUserResume(uid));
  const [jdMatch, setJdMatch] = useState<SavedJdMatchReport | null>(() => readJdMatch(uid));
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  const targetRoleKey = uid ? `interviewiq_${uid}_target_role` : "interviewiq_target_role";
  const targetCompanyKey = uid ? `interviewiq_${uid}_target_company` : "interviewiq_target_company";
  const [targetRole, setTargetRole] = useState(() => localStorage.getItem(targetRoleKey) || "");
  const [targetCompany, setTargetCompany] = useState(() => localStorage.getItem(targetCompanyKey) || "");

  useEffect(() => {
    const sync = () => {
      setResumeData(getUserResume(uid));
      setJdMatch(readJdMatch(uid));
      setTargetRole(localStorage.getItem(targetRoleKey) || "");
      setTargetCompany(localStorage.getItem(targetCompanyKey) || "");
    };
    window.addEventListener("interviewiq-profile-synced", sync);
    return () => window.removeEventListener("interviewiq-profile-synced", sync);
  }, [uid, targetRoleKey, targetCompanyKey]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      listInterviewSessions().catch(() => [] as InterviewSession[]),
      listOrchestratorSessions().catch(() => []),
    ])
      .then(([legacy, orch]) => {
        if (!mounted) return;
        // The older table never stored real durations or question counts; take them from the live session records.
        const orchById = new Map<string, any>((orch || []).map((o: any) => [String(o.id), o]));
        const merged = (legacy || []).map((s) => {
          const o = orchById.get(String(s.id));
          if (!o) return s;
          const secs = realSessionSeconds(o);
          const qs = interviewerQuestionCount(o);
          // The legacy row is not updated when evaluation finishes; the report lives on the live session.
          const rep = o.working_memory?.evaluation_report;
          return {
            ...s,
            duration_seconds: secs || s.duration_seconds || 0,
            question_count: qs || s.question_count || 0,
            ...(rep
              ? {
                  report: rep,
                  competency_level: rep.calibration_signal || s.competency_level,
                }
              : {}),
          };
        });
        // Sessions that never got past the greeting are not practice.
        setSessions(merged.filter((s) => (s.question_count || 0) >= 2 || s.report));
        setLoading(false);
      })
      .catch(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [uid, refreshTick]);

  // Right after an interview the report is still being written: refresh every few seconds until it shows up
  useEffect(() => {
    let flagged = 0;
    try {
      flagged = Number(sessionStorage.getItem("iq_eval_pending") || 0);
    } catch {}
    if (!flagged) return;
    if (sessions[0]?.report || Date.now() - flagged > 5 * 60 * 1000) {
      try {
        sessionStorage.removeItem("iq_eval_pending");
      } catch {}
      return;
    }
    const timer = setTimeout(() => setRefreshTick((n) => n + 1), 6000);
    return () => clearTimeout(timer);
  }, [sessions, refreshTick]);

  const candidateName = cleanCandidateName(user?.full_name || resumeData?.name || "Candidate");
  const firstName = candidateName.split(" ")[0] || "Candidate";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });

  const stats = useMemo(() => {
    const byTrack: Record<string, number> = {};
    let seconds = 0;
    let questions = 0;
    for (const s of sessions) {
      const id = trackId(s.track);
      byTrack[id] = (byTrack[id] || 0) + 1;
      seconds += s.duration_seconds || 0;
      questions += s.question_count || 0;
    }
    const covered = TRACKS.filter((t) => byTrack[t.id]).length;
    const untried = TRACKS.filter((t) => !byTrack[t.id]);
    const maxCount = Math.max(1, ...TRACKS.map((t) => byTrack[t.id] || 0));
    return { byTrack, seconds, questions, covered, untried, maxCount };
  }, [sessions]);

  const evaluatedCount = useMemo(() => sessions.filter((s) => s.report).length, [sessions]);
  const totalMinutes = Math.round(stats.seconds / 60);
  const avgMinutes = sessions.length ? Math.round(stats.seconds / 60 / sessions.length) : 0;

  // Track coverage is a daily goal: which of the tracks have been practiced since local midnight.
  const todayStats = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const done = new Set<string>();
    for (const s of sessions) {
      if (new Date(s.created_at).getTime() >= start.getTime()) done.add(trackId(s.track));
    }
    const covered = TRACKS.filter((t) => done.has(t.id)).length;
    const remaining = TRACKS.filter((t) => !done.has(t.id));
    return { covered, remaining };
  }, [sessions]);

  // Minutes practiced per day over a fixed 14-day window, so the chart stays the same size however many sessions there are.
  const chartPoints = useMemo(() => {
    const DAYS = 14;
    const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const todayMs = dayStart(new Date());
    const mins = new Array<number>(DAYS).fill(0);
    for (const s of sessions) {
      const idx = DAYS - 1 - Math.round((todayMs - dayStart(new Date(s.created_at))) / 86_400_000);
      if (idx >= 0 && idx < DAYS) mins[idx] += (s.duration_seconds || 0) / 60;
    }
    const pts = mins.map((m) => Math.round(m));
    const total = pts.reduce((a, b) => a + b, 0);
    if (total === 0) return null;
    const dates = pts.map((_, i) => new Date(todayMs - (DAYS - 1 - i) * 86_400_000));
    const max = Math.max(...pts, 10);
    const left = 40;
    const right = 570;
    const x = (i: number) => left + (i * (right - left)) / (DAYS - 1);
    const y = (v: number) => 180 - (v / max) * 140;
    const line = pts.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join("");
    const area = `${line}L${right} 180L${left} 180Z`;
    const activeDays = pts.filter((v) => v > 0).length;
    return { pts, dates, max, left, right, x, y, line, area, total, activeDays };
  }, [sessions]);

  const lastSession = sessions[0] || null;
  const lastSummary = lastSession ? summarizeReport(lastSession.report) : "";
  const reportPending = (() => {
    try {
      return Boolean(sessionStorage.getItem("iq_eval_pending")) && !lastSession?.report;
    } catch {
      return false;
    }
  })();
  const lastTrack = lastSession ? TRACKS.find((t) => t.id === trackId(lastSession.track))?.label : undefined;
  const lastDate = lastSession
    ? new Date(lastSession.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short" })
    : "";

  const skills = resumeData?.skills || [];
  const matching = jdMatch?.matchingSkills || [];
  const missing = jdMatch?.missingSkills || [];
  const hasResume = Boolean(resumeData && (resumeData.filename || skills.length > 0));
  const ringPct = (todayStats.covered / TRACKS.length) * 100;


  const nextTitle = missing.length
    ? `Close the gap on ${missing.slice(0, 2).join(" and ")}`
    : stats.untried.length
    ? `Try the ${stats.untried[0].label} track`
    : "Run a mixed session";
  const nextBody = missing.length
    ? `${missing.slice(0, 4).join(", ")} ${missing.length > 1 ? "are" : "is"} named in your target job description but not yet shown on your resume.`
    : stats.untried.length
    ? `You have not practiced ${stats.untried.map((t) => t.label).join(", ")} yet. Covering every track gives a more complete picture.`
    : "You have covered every track. Repeat the one that felt weakest while it is fresh.";

  return (
    <div className="mx-auto w-full max-w-[1160px] px-5 sm:px-[clamp(20px,4vw,56px)] pt-2 pb-16 text-[14px] leading-[1.55]">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="ob-rise ob-lb" style={{ ["--i" as string]: 0 }}>{today}</div>
          <h1 className="ob-rise text-[clamp(28px,3.4vw,38px)] font-medium tracking-[-0.03em] leading-[1.1] mt-2 mb-2.5" style={{ ["--i" as string]: 1 }}>
            {greeting()}, {firstName}.
          </h1>
          <p className="ob-rise ob-tx2 max-w-[62ch] m-0" style={{ ["--i" as string]: 2 }}>
            {loading
              ? "Loading your sessions..."
              : sessions.length === 0
              ? "No sessions yet. Run your first interview and your progress will build here."
              : `${sessions.length} ${sessions.length === 1 ? "session" : "sessions"} recorded across ${stats.covered} of ${TRACKS.length} tracks, ${formatMinutes(stats.seconds)} of practice so far.`}
          </p>
        </div>
        <div className="ob-rise flex flex-wrap gap-2.5" style={{ ["--i" as string]: 3 }}>
          <button type="button" className="ob-btn ob-btn-lg" onClick={() => onNavigate("compiler")}>Code sandbox</button>
          <button type="button" className="ob-btn ob-pr ob-btn-lg" onClick={() => onNavigate("interview-setup")}>Start interview</button>
        </div>
      </div>

      {/* Quick links */}
      <div className="ob-rise flex flex-wrap gap-2 mt-[26px] mb-7" style={{ ["--i" as string]: 4 }}>
        <button type="button" className="ob-ql" onClick={() => onNavigate("resume")}>Update resume</button>
        <button type="button" className="ob-ql" onClick={() => onNavigate("job-description")}>Analyze a new job</button>
        <button type="button" className="ob-ql" onClick={() => onNavigate("history")}>Review past sessions</button>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))]">
        <div className="ob-card ob-rise flex items-center gap-[22px]" style={{ ["--i" as string]: 5 }}>
          <div className="relative w-32 h-32 shrink-0">
            <svg viewBox="0 0 100 100" width="128" height="128" aria-hidden="true">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#2b2b28" strokeWidth="4" />
              <circle className="ob-rg" cx="50" cy="50" r="42" fill="none" stroke="#e6dfcc" strokeWidth="4" strokeLinecap="round" pathLength={100} strokeDasharray={`${ringPct} 100`} transform="rotate(-90 50 50)" />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-[34px] font-medium tracking-[-0.03em]">
              <span className="ob-cnt" style={{ ["--t" as string]: todayStats.covered }} />
              <span className="sr-only">{todayStats.covered} of {TRACKS.length} tracks today</span>
            </div>
          </div>
          <div>
            <div className="ob-lb">Today's coverage</div>
            <div className="text-[15px] mt-2 mb-1">{todayStats.covered} of {TRACKS.length} practiced today</div>
            <div className="ob-mo text-xs ob-tx3">{todayStats.remaining.length ? `Next: ${todayStats.remaining[0].label}` : "Every track covered today"}</div>
          </div>
        </div>

        <button type="button" onClick={() => onNavigate("job-description")} className="ob-card ob-rise block text-left cursor-pointer" style={{ ["--i" as string]: 6 }}>
          <div className="ob-lb">Resume ↔ job alignment</div>
          {jdMatch ? (
            <>
              <div className="text-[44px] font-medium tracking-[-0.035em] mt-2.5 mb-1.5">
                <span className="ob-cnt" style={{ ["--t" as string]: Math.round(jdMatch.overallScore) }} />
                <span className="text-[22px] ob-tx3">%</span>
              </div>
              <div className="ob-bar"><i style={{ width: `${Math.min(100, jdMatch.overallScore)}%` }} /></div>
              <div className="ob-tx3 text-[12.5px] mt-3">{[jdMatch.jdCompany, jdMatch.jdTitle].filter(Boolean).join(" · ")}</div>
            </>
          ) : (
            <>
              <div className="text-[15px] mt-3 mb-1.5">No job analyzed yet</div>
              <div className="ob-tx3 text-[12.5px]">Paste a job description to see how your resume lines up.</div>
              <span className="ob-mo text-[11.5px] ob-txa inline-block mt-3">Analyze a job →</span>
            </>
          )}
        </button>

        <div className="ob-card ob-rise" style={{ ["--i" as string]: 7 }}>
          <div className="flex justify-between items-baseline">
            <span className="ob-lb">Sessions by track</span>
            <span className="ob-mo ob-tx3 text-xs">{stats.questions} questions</span>
          </div>
          <div className="grid gap-2.5 text-[12.5px] mt-4">
            {TRACKS.map((t, i) => {
              const n = stats.byTrack[t.id] || 0;
              return (
                <div key={t.id} className="grid grid-cols-[110px_1fr_20px] gap-2.5 items-center">
                  <span className="ob-tx2 truncate">{t.label}</span>
                  <div className="ob-bar"><i style={{ width: `${(n / stats.maxCount) * 100}%`, ["--i" as string]: i }} /></div>
                  <span className="ob-mo">{n}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Headline stats */}
      <div className="grid gap-4 mt-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Sessions", value: sessions.length, suffix: "" },
          { label: "Reports ready", value: evaluatedCount, suffix: "" },
          { label: "Total practice", value: totalMinutes, suffix: " min" },
          { label: "Avg session", value: avgMinutes, suffix: " min" },
        ].map((m, i) => (
          <div key={m.label} className="ob-card ob-rise" style={{ ["--i" as string]: 8 + i }}>
            <div className="ob-lb">{m.label}</div>
            <div className="text-[30px] font-medium tracking-[-0.03em] mt-2.5">
              {m.value}<span className="text-[16px] ob-tx3">{m.suffix}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + next step */}
      <div className="grid gap-4 mt-4 grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))]">
        <div className="ob-card ob-rise" style={{ ["--i" as string]: 8 }}>
          <div className="flex justify-between items-baseline flex-wrap gap-2">
            <span className="ob-lb">Daily practice time</span>
            <span className="ob-mo text-[11.5px] ob-tx3">minutes per day, last 14 days</span>
          </div>
          {chartPoints ? (
            <svg viewBox="0 0 600 220" width="100%" className="block mt-3.5" role="img" aria-label={`Minutes practiced per day over the last 14 days: ${chartPoints.pts.join(", ")}`}>
              <g stroke="#2b2b28" strokeWidth="1">
                <path d={`M${chartPoints.left} 40H${chartPoints.right}M${chartPoints.left} 110H${chartPoints.right}`} strokeDasharray="2 4" />
                <path d={`M${chartPoints.left} 180H${chartPoints.right}`} />
              </g>
              <g fontFamily="JetBrains Mono,monospace" fontSize="10.5" fill="#8f8d85" textAnchor="end">
                <text x="32" y="44">{chartPoints.max}</text>
                <text x="32" y="114">{Math.round(chartPoints.max / 2)}</text>
                <text x="32" y="184">0</text>
              </g>
              <path d={chartPoints.area} fill="#e6dfcc" fillOpacity=".07" className="ob-fade" />
              <path className="ob-lk" pathLength={1} d={chartPoints.line} fill="none" stroke="#e6dfcc" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              <g className="ob-fade">
                {chartPoints.pts.map((v, i) => {
                  if (!v) return null;
                  const last = i === chartPoints.pts.length - 1;
                  return <circle key={i} cx={chartPoints.x(i)} cy={chartPoints.y(v)} r={last ? 5 : 3.5} fill={last ? "#e6dfcc" : "#121211"} stroke="#e6dfcc" strokeWidth="2" />;
                })}
              </g>
              <g fontFamily="JetBrains Mono,monospace" fontSize="10" fill="#8f8d85" textAnchor="middle">
                {[0, 4, 8, 13].map((i) => (
                  <text key={i} x={chartPoints.x(i)} y="202" textAnchor={i === 0 ? "start" : i === 13 ? "end" : "middle"}>
                    {i === 13 ? "Today" : chartPoints.dates[i].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </text>
                ))}
              </g>
            </svg>
          ) : (
            <div className="grid place-items-center h-[180px] ob-tx3 text-[13px] text-center">
              No practice in the last 14 days. Run a session and it will show up here.
            </div>
          )}
        </div>

        <div className="ob-card ob-rise flex flex-col justify-between gap-5" style={{ ["--i" as string]: 9 }}>
          <div>
            <div className="ob-lb ob-txa">Recommended next</div>
            <h2 className="text-[22px] font-medium tracking-[-0.02em] mt-3 mb-2.5 leading-[1.25]">{nextTitle}</h2>
            <p className="m-0 ob-tx2">{nextBody}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {missing.length > 0 && <span className="ob-chip ob-sq ob-warn">JD gap</span>}
              {stats.untried.length > 0 && <span className="ob-chip ob-sq">New track</span>}
              <span className="ob-chip ob-sq">30 min</span>
            </div>
          </div>
          <button type="button" className="ob-btn ob-pr ob-btn-lg self-start" onClick={() => onNavigate("interview-setup")}>Begin session</button>
        </div>
      </div>

      {/* Last session recap */}
      {lastSession && (
        <div className="ob-card ob-rise mt-4" style={{ ["--i" as string]: 10 }}>
          <div className="flex justify-between items-baseline flex-wrap gap-2">
            <span className="ob-lb">Last session</span>
            <button type="button" onClick={() => onNavigate("history")} className="ob-mo text-[11.5px] ob-txa cursor-pointer">View history →</button>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-5 mt-3">
            <div className="min-w-0">
              <h2 className="text-[20px] font-medium tracking-[-0.02em] m-0">{lastSession.title}</h2>
              <div className="ob-mo text-xs ob-tx3 mt-1.5">
                {[lastTrack, lastDate, formatMinutes(lastSession.duration_seconds), lastSession.question_count ? `${lastSession.question_count} questions` : ""].filter(Boolean).join(" · ")}
              </div>
            </div>
          </div>
          <p className={`m-0 mt-3.5 text-[13.5px] ${lastSummary ? "ob-tx2" : "ob-tx3"}`}>
            {lastSummary || (reportPending ? "Alex is writing up your report. It will appear here in a moment." : "The report for this session is not ready yet.")}
          </p>
        </div>
      )}

      {/* Skills */}
      <div className="grid gap-4 mt-4 grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))]">
        <div className="ob-card ob-rise" style={{ ["--i" as string]: 10 }}>
          <div className="ob-lb mb-4">Skills</div>
          {!hasResume ? (
            <div className="ob-tx3 text-[13px]">Upload your resume and your skills appear here.
              <button type="button" onClick={() => onNavigate("resume")} className="ob-mo text-[11.5px] ob-txa ml-2 cursor-pointer">Upload →</button>
            </div>
          ) : (
            <div className="grid gap-3.5 text-[13px]">
              <div className="flex flex-wrap gap-1.5">
                {(matching.length ? matching : skills).slice(0, 14).map((s) => (
                  <span key={s} className="ob-chip ob-sq ob-ok">{s}</span>
                ))}
              </div>
              {missing.length > 0 && (
                <>
                  <div className="h-px bg-[#2b2b28] my-1" />
                  <div className="ob-lb">Needs practice (gaps vs. target job)</div>
                  <div className="flex flex-wrap gap-1.5">
                    {missing.slice(0, 10).map((s) => (
                      <span key={s} className="ob-chip ob-sq ob-warn">{s}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
