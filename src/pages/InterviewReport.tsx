import { useState } from "react";
import { Button, GlassCard, Badge, ScoreRing, ScoreBar, Tabs, ProgressBar } from "../components/ui";
import { mockReport } from "../data/mock";

export default function InterviewReport({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [tab, setTab] = useState("answers");
  const [expanded, setExpanded] = useState<string | null>("a1");

  return (
    <div className="px-5 sm:px-8 lg:px-12 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div style={{ opacity: 0, animation: "fadeUp 0.5s ease forwards" }}>
        <div className="text-xs font-bold text-[#60a5fa] uppercase tracking-wider mb-2">{mockReport.type} · {mockReport.date} · {mockReport.duration}</div>
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-heading font-bold text-[#f5f6fa]">Interview Report</h1>
            <p className="text-[#9a9ca8] mt-1">Target: Staff Software Engineer @ Stripe</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={() => onNavigate("interview-setup")}>Retry Weak Areas</Button>
            <Button variant="glow" size="sm" onClick={() => onNavigate("training")}>Training Plan →</Button>
          </div>
        </div>
      </div>

      {/* Score ring + dimension bars */}
      <div className="grid grid-cols-12 gap-4 mb-8">
        <GlassCard className="col-span-12 sm:col-span-5 lg:col-span-3 p-8 flex flex-col items-center gap-4 justify-center" gradient="indigo" animDelay={0.1}>
          <ScoreRing score={mockReport.overallScore} size={130} strokeWidth={10} />
          <div className="text-center">
            <div className="text-xs font-mono text-slate-500 uppercase tracking-widest">Overall Score</div>
            <div className="text-xs text-slate-500 mt-1">Top 28% of candidates</div>
          </div>
        </GlassCard>

        <GlassCard className="col-span-12 sm:col-span-7 lg:col-span-5 p-6" animDelay={0.15}>
          <h3 className="text-sm font-bold text-white mb-4">Dimension Breakdown</h3>
          <div className="flex flex-col gap-3">
            {[
              { l: "Technical", v: mockReport.scores.technical, c: "#818cf8" },
              { l: "Behavioral", v: mockReport.scores.behavioral, c: "#10b981" },
              { l: "Communication", v: mockReport.scores.communication, c: "#60a5fa" },
              { l: "Evidence Usage", v: mockReport.scores.evidenceUsage, c: "#818cf8" },
              { l: "STAR Framework", v: mockReport.scores.starPerformance, c: "#f59e0b" },
            ].map((s) => (
              <div key={s.l} className="flex items-center gap-3">
                <span className="text-sm text-slate-400 w-32 shrink-0">{s.l}</span>
                <ProgressBar value={s.v} gradient={false} color={s.c} height={5} />
                <span className="text-xs font-mono font-bold w-7 text-right" style={{ color: s.c }}>{s.v}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="col-span-12 lg:col-span-4 p-6" animDelay={0.2}>
          <h3 className="text-sm font-bold text-white mb-4">Key Signals</h3>
          <div className="flex flex-col gap-3 mb-5">
            <div className="text-xs font-mono text-slate-500 uppercase tracking-wider">Strengths</div>
            {["Strong resume evidence", "Quantitative reasoning", "System design fundamentals"].map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
                {s}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 pt-4 border-t border-white/8">
            <div className="text-xs font-mono text-slate-500 uppercase tracking-wider">Gaps</div>
            {["Consistency models missing", "STAR structure incomplete", "FoundationDB not covered"].map((w, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                {w}
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="mb-6">
        <Tabs
          tabs={[
            { id: "answers", label: "Answer Scoring", badge: mockReport.answers.length },
            { id: "evidence", label: "Transcript Evidence" },
            { id: "skills", label: "Skills & Claims" },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === "answers" && (
        <div className="flex flex-col gap-4">
          {mockReport.answers.map((a, ai) => {
            const color = a.scores.overall >= 7 ? "#10b981" : a.scores.overall >= 5 ? "#f59e0b" : "#f43f5e";
            return (
              <GlassCard key={a.id} className="overflow-hidden" animDelay={0.1 + ai * 0.05}>
                <button
                  className="w-full flex items-start gap-4 p-5 hover:bg-white/[0.02] transition-all cursor-pointer text-left"
                  onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black shrink-0"
                    style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}
                  >
                    {a.scores.overall}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-slate-600">Q{a.questionNumber}</span>
                      <span className="text-sm font-semibold text-slate-200 line-clamp-1">{a.question}</span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">{a.answerSummary}</p>
                  </div>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"
                    className={`transition-transform shrink-0 mt-1 ${expanded === a.id ? "rotate-90" : ""}`}
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>

                {expanded === a.id && (
                  <div className="px-5 pb-6 border-t border-white/8">
                    <div className="mt-5 mb-5">
                      <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">Score breakdown (0–10)</div>
                      <div className="flex flex-col gap-2.5">
                        <ScoreBar score={a.scores.relevance} label="Relevance" />
                        <ScoreBar score={a.scores.technicalCorrectness} label="Technical Accuracy" />
                        <ScoreBar score={a.scores.communication} label="Communication" />
                        <ScoreBar score={a.scores.evidenceUsage} label="Evidence Usage" />
                        {a.scores.starPerformance !== undefined && <ScoreBar score={a.scores.starPerformance} label="STAR Structure" />}
                      </div>
                    </div>

                    {a.evidenceHighlights.length > 0 && (
                      <div className="mb-5">
                        <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">Transcript Evidence</div>
                        <div className="flex flex-col gap-2">
                          {a.evidenceHighlights.map((e, i) => (
                            <div key={i} className="rounded-2xl p-4" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)" }}>
                              <div className="text-xs font-semibold text-indigo-400 mb-1.5">{e.reason}</div>
                              <p className="text-sm text-slate-300">
                                "…<mark className="rounded px-0.5 not-italic" style={{ background: "rgba(99,102,241,0.3)", color: "#a5b4fc" }}>{e.text}</mark>…"
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="rounded-2xl p-4" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
                        <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-2">What you did well</div>
                        {a.strengths.map((s, i) => <p key={i} className="text-xs text-slate-300 mb-1">+ {s}</p>)}
                      </div>
                      <div className="rounded-2xl p-4" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                        <div className="text-xs font-mono text-amber-400 uppercase tracking-wider mb-2">What was missing</div>
                        {a.improvements.map((s, i) => <p key={i} className="text-xs text-slate-300 mb-1">! {s}</p>)}
                      </div>
                    </div>
                    <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/8">
                      <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1.5">A stronger answer would demonstrate</div>
                      <p className="text-xs text-slate-400">{a.strongerAnswer}</p>
                    </div>
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}

      {tab === "evidence" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-400">Every score is backed by specific passages from your interview transcript.</p>
          {mockReport.answers.map((a, ai) => (
            <GlassCard key={a.id} className="p-5" animDelay={0.1 + ai * 0.05}>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="slate" className="font-mono">Q{a.questionNumber}</Badge>
                <span className="text-sm font-semibold text-slate-200 truncate">{a.question}</span>
              </div>
              <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/8 mb-3">
                <div className="text-xs font-mono text-slate-600 uppercase tracking-wider mb-2">Your answer</div>
                <p className="text-sm text-slate-400 leading-relaxed">{a.transcript}</p>
              </div>
              <div className="flex flex-col gap-2">
                {a.evidenceHighlights.map((e, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-mono text-indigo-400">{i + 1}</span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-300">"<span style={{ color: "#818cf8" }}>{e.text}</span>"</p>
                      <p className="text-xs text-slate-500 mt-0.5">{e.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {tab === "skills" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassCard className="p-5" animDelay={0.1}>
            <h3 className="text-sm font-bold text-white mb-4">Skills Demonstrated</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {mockReport.skillsDemonstrated.map((s) => <Badge key={s} variant="emerald">{s}</Badge>)}
            </div>
            <h3 className="text-sm font-bold text-white mb-3">Needs Practice</h3>
            <div className="flex flex-wrap gap-2">
              {mockReport.skillsNeedingPractice.map((s) => <Badge key={s} variant="rose">{s}</Badge>)}
            </div>
          </GlassCard>
          <GlassCard className="p-5" animDelay={0.15}>
            <h3 className="text-sm font-bold text-white mb-4">Resume Claims Tested</h3>
            <div className="flex flex-col gap-2">
              {[
                ...mockReport.resumeClaimsVerified.map((c) => ({ c, s: "verified" })),
                ...mockReport.resumeClaimsWeak.map((c) => ({ c, s: "weak" })),
                ...mockReport.resumeClaimsUnverified.map((c) => ({ c, s: "untested" })),
              ].map(({ c, s }) => (
                <div key={c} className="flex items-center gap-3 py-2 border-b border-white/8 last:border-0">
                  <Badge variant={s === "verified" ? "emerald" : s === "weak" ? "amber" : "slate"}>{s}</Badge>
                  <span className="text-xs text-slate-400">{c}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
