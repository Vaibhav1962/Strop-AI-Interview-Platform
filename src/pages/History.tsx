import { useState } from "react";
import { GlassCard, Badge, Button, Input } from "../components/ui";
import { mockInterviewSessions } from "../data/mock";

export default function History({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "Technical" | "Behavioral" | "Mixed" | "Coding">("all");

  const sessions = mockInterviewSessions.filter((s) => {
    const matchType = filter === "all" || s.type === filter;
    const matchSearch = search === "" || s.type.toLowerCase().includes(search.toLowerCase()) || s.date.includes(search);
    return matchType && matchSearch;
  });

  const avgScore = Math.round(mockInterviewSessions.reduce((a, s) => a + s.score, 0) / mockInterviewSessions.length);
  const best = Math.max(...mockInterviewSessions.map((s) => s.score));

  return (
    <div className="px-5 sm:px-8 lg:px-12 py-8 max-w-4xl mx-auto">
      <div style={{ opacity: 0, animation: "fadeUp 0.5s ease forwards" }}>
        <div className="text-xs font-bold text-[#60a5fa] uppercase tracking-wider mb-2">History</div>
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold text-[#f5f6fa]">Interview History</h1>
            <p className="text-[#9a9ca8] mt-1">{mockInterviewSessions.length} sessions completed</p>
          </div>
          <Button variant="glow" size="sm" onClick={() => onNavigate("interview-setup")}>New Session +</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { l: "Sessions", v: mockInterviewSessions.length, c: "#818cf8" },
          { l: "Avg Score", v: avgScore, c: "#60a5fa" },
          { l: "Best Score", v: best, c: "#10b981" },
        ].map((s, i) => (
          <GlassCard key={s.l} className="p-4 text-center" animDelay={0.1 + i * 0.05}>
            <div className="text-3xl font-black mb-0.5" style={{ color: s.c }}>{s.v}</div>
            <div className="text-xs font-mono text-slate-500 uppercase tracking-wider">{s.l}</div>
          </GlassCard>
        ))}
      </div>

      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <Input
          placeholder="Search sessions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-56"
        />
        <div className="flex gap-2 flex-wrap">
          {(["all", "Technical", "Behavioral", "Mixed", "Coding"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              style={{
                background: filter === f ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
                color: filter === f ? "#818cf8" : "#64748b",
                border: `1px solid ${filter === f ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {sessions.map((session, i) => {
          const scoreColor = session.score >= 70 ? "#10b981" : session.score >= 55 ? "#f59e0b" : "#f43f5e";
          return (
            <GlassCard key={session.id} className="p-5 cursor-pointer" hover animDelay={0.1 + i * 0.07}>
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shrink-0"
                  style={{ background: `${scoreColor}15`, color: scoreColor, border: `1px solid ${scoreColor}25` }}
                >
                  {session.score}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-white">{session.type}</span>
                    <Badge variant="slate">{session.company}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="font-mono">{session.date}</span>
                    <span>{session.duration}</span>
                    <span>{session.questions} questions</span>
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-3 shrink-0">
                  {session.strengths.slice(0, 2).map((s) => (
                    <Badge key={s} variant="emerald">{s}</Badge>
                  ))}
                </div>

                <Button
                  variant="secondary"
                  size="xs"
                  className="shrink-0"
                  onClick={() => onNavigate("interview-report")}
                >
                  Report
                </Button>
              </div>

              {session.weaknesses.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/8 flex gap-3 flex-wrap">
                  {session.weaknesses.slice(0, 2).map((w) => (
                    <span key={w} className="text-xs text-rose-400/60">· {w}</span>
                  ))}
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
