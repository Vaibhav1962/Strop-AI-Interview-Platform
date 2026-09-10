import { GlassCard, Badge, ScoreRing, ProgressBar, Button } from "../components/ui";
import { mockMatchAnalysis, mockJD, mockResume } from "../data/mock";

export default function MatchAnalysis({ onNavigate }: { onNavigate: (p: string) => void }) {
  const gaps = mockMatchAnalysis.gaps;
  const hits = mockMatchAnalysis.strongMatches;

  return (
    <div className="px-5 sm:px-8 lg:px-12 py-8 max-w-5xl mx-auto">
      <div style={{ opacity: 0, animation: "fadeUp 0.5s ease forwards" }}>
        <div className="text-xs font-bold text-[#60a5fa] uppercase tracking-wider mb-2">Analysis</div>
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold text-[#f5f6fa]">Match Analysis</h1>
            <p className="text-[#9a9ca8] mt-1">{mockResume.filename} ↔ {mockJD.company} · {mockJD.title}</p>
          </div>
          <Button variant="glow" size="sm" onClick={() => onNavigate("interview-setup")}>Practice Gaps →</Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 mb-6">
        <GlassCard className="col-span-12 sm:col-span-4 lg:col-span-3 flex flex-col items-center justify-center p-8 gap-4" gradient="indigo" animDelay={0.1}>
          <ScoreRing score={mockMatchAnalysis.overallScore} size={120} strokeWidth={10} />
          <div className="text-center">
            <div className="text-xs font-mono text-slate-500 uppercase tracking-widest">Overall Match</div>
            <div className="text-xs text-slate-500 mt-1">{mockMatchAnalysis.overallScore >= 70 ? "Strong candidate" : "Room to grow"}</div>
          </div>
        </GlassCard>

        <GlassCard className="col-span-12 sm:col-span-8 lg:col-span-5 p-6" animDelay={0.15}>
          <h3 className="text-sm font-bold text-white mb-4">Dimension Match</h3>
          <div className="flex flex-col gap-3">
            {[
              { l: "Technical Fit", v: mockMatchAnalysis.technicalFit, c: "#818cf8" },
              { l: "Experience Fit", v: mockMatchAnalysis.experienceFit, c: "#60a5fa" },
              { l: "Skill Fit", v: mockMatchAnalysis.skillFit, c: "#818cf8" },
              { l: "Matching Skills", v: mockMatchAnalysis.matchingSkills.length * 9, c: "#10b981" },
            ].map((d) => (
              <div key={d.l} className="flex items-center gap-3">
                <span className="text-sm text-slate-400 w-36 shrink-0">{d.l}</span>
                <ProgressBar value={d.v} gradient={false} color={d.c} height={5} />
                <span className="text-xs font-mono font-bold w-8 text-right" style={{ color: d.c }}>{d.v}%</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="col-span-12 lg:col-span-4 p-6" animDelay={0.2}>
          <h3 className="text-sm font-bold text-white mb-4">Quick Summary</h3>
          <div className="flex flex-col gap-2 mb-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-emerald-500/15 flex items-center justify-center text-emerald-400">✓</div>
              {hits.length} strong alignment areas
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-rose-500/15 flex items-center justify-center text-rose-400">!</div>
              {gaps.length} gaps to address before interview
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-500/15 flex items-center justify-center text-amber-400">?</div>
              {mockMatchAnalysis.missingSkills.length} skills to acquire or demonstrate
            </div>
          </div>
          <div className="text-xs text-slate-500 leading-relaxed rounded-2xl p-3 bg-white/[0.03] border border-white/8">
            {mockMatchAnalysis.overallScore >= 70
              ? "Strong foundation. Focus on demonstrating depth in FoundationDB and distributed systems."
              : "Key gaps exist. Targeted practice will significantly improve your readiness."}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <GlassCard className="p-5" animDelay={0.25}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-rose-500/15 flex items-center justify-center text-rose-400 text-sm">!</div>
            <h3 className="text-sm font-bold text-white">Gaps to Close</h3>
          </div>
          <div className="flex flex-col gap-3">
            {gaps.map((g, i) => (
              <div
                key={g.jdItem}
                className="rounded-2xl p-4"
                style={{
                  opacity: 0,
                  animation: `fadeUp 0.4s ease ${0.3 + i * 0.06}s forwards`,
                  background: "rgba(244,63,94,0.05)",
                  border: "1px solid rgba(244,63,94,0.12)",
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-sm font-semibold text-rose-200">{g.jdItem}</span>
                  <Badge variant={g.severity === "high" ? "rose" : "amber"}>{g.severity}</Badge>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{g.recommendation}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-5" animDelay={0.3}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 text-sm">✓</div>
            <h3 className="text-sm font-bold text-white">Strong Alignment</h3>
          </div>
          <div className="flex flex-col gap-3">
            {hits.map((h, i) => (
              <div
                key={h.jdItem}
                className="rounded-2xl p-4"
                style={{
                  opacity: 0,
                  animation: `fadeUp 0.4s ease ${0.35 + i * 0.06}s forwards`,
                  background: "rgba(16,185,129,0.05)",
                  border: "1px solid rgba(16,185,129,0.12)",
                }}
              >
                <div className="text-sm font-semibold text-emerald-200 mb-1">{h.jdItem}</div>
                <p className="text-xs text-slate-500">{h.resumeEvidence}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-5" animDelay={0.35}>
        <h3 className="text-sm font-bold text-white mb-3">Skills to Acquire or Demonstrate</h3>
        <div className="flex flex-wrap gap-2">
          {mockMatchAnalysis.missingSkills.map((s) => (
            <button
              key={s}
              onClick={() => onNavigate("training")}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer hover:border-indigo-500/40 hover:text-indigo-300"
              style={{ background: "rgba(99,102,241,0.06)", borderColor: "rgba(99,102,241,0.15)", color: "#94a3b8" }}
            >
              {s} →
            </button>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
