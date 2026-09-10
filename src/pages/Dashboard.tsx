import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button, GlassCard, Badge, ScoreRing, BigMetric, ProgressBar, useAnimateIn } from "../components/ui";
import { mockUser, mockInterviewSessions, mockProgressData, mockTraining, mockResume } from "../data/mock";

export default function Dashboard({ onNavigate }: { onNavigate: (p: string) => void }) {
  const ready = useAnimateIn(100);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!ready) return;
    let start = 0;
    const end = mockUser.readinessScore;
    const step = () => {
      start += 3;
      if (start >= end) { setCount(end); return; }
      setCount(start);
      requestAnimationFrame(step);
    };
    const t = setTimeout(() => requestAnimationFrame(step), 600);
    return () => clearTimeout(t);
  }, [ready]);

  const ttip = {
    contentStyle: { background: "rgba(10,14,26,0.95)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, fontSize: 11, fontFamily: "JetBrains Mono", color: "#f1f5f9", boxShadow: "0 12px 32px rgba(0,0,0,0.6)" },
    cursor: { stroke: "rgba(99,102,241,0.3)" },
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 py-8 max-w-[1400px] mx-auto">
      <div className="mb-7" style={{ opacity: 0, animation: "fadeUp 0.6s ease 0.05s forwards" }}>
        <div className="text-[11px] font-bold text-[#60a5fa] uppercase tracking-wider mb-2.5 flex items-center gap-2">
          <span className="w-[7px] h-[7px] rounded-full bg-[#34d399]" style={{ animation: "pulseDot 2s ease-in-out infinite" }} />
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · Readiness overview
        </div>
        <h1 className="text-[32px] sm:text-4xl font-heading font-bold text-white tracking-tight">
          Welcome back, {mockUser.name.split(" ")[0]}.
        </h1>
        <p className="text-[#9a9ca8] mt-2 text-sm sm:text-base max-w-[60ch]">Your target interview with Stripe is in 14 days. Here&apos;s where you stand.</p>
      </div>

      {/* BENTO GRID */}
      <div className="grid grid-cols-12 gap-4">

        {/* ── Readiness Score (hero cell) ── */}
        <GlassCard className="col-span-12 sm:col-span-6 lg:col-span-3 p-8 flex flex-col justify-between min-h-72" gradient="indigo" animDelay={0.1}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Readiness</span>
            <Badge variant="indigo">Stripe SE</Badge>
          </div>
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="relative">
              <ScoreRing score={ready ? mockUser.readinessScore : 0} size={130} strokeWidth={10} />
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 text-center">+8 points since last week</p>
          </div>
        </GlassCard>

        {/* ── Score counters (2×2) ── */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-5 grid grid-cols-2 gap-4">
          {[
            { label: "Avg Score", value: "72", unit: "", trend: "+8", sub: "Last 4 sessions", color: "gradient" as const, delay: 0.15 },
            { label: "Resume Fit", value: "71", unit: "%", trend: "+5%", sub: "vs Stripe JD", color: "cyan" as const, delay: 0.2 },
            { label: "Sessions", value: `${mockUser.interviewsCompleted}`, unit: "", trend: undefined, sub: "All time", color: "white" as const, delay: 0.25 },
            { label: "Open Tasks", value: `${mockTraining.filter(t => t.priority === "high").length}`, unit: "", trend: "2 high priority", sub: "Training plan", color: "amber" as const, delay: 0.3 },
          ].map((m) => (
            <GlassCard key={m.label} className="p-5" animDelay={m.delay}>
              <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">{m.label}</div>
              <BigMetric value={m.value} unit={m.unit} color={m.color} trend={m.trend} />
              <p className="text-xs text-slate-500 mt-2">{m.sub}</p>
            </GlassCard>
          ))}
        </div>

        {/* ── CTA card ── */}
        <GlassCard
          className="col-span-12 lg:col-span-4 p-7 flex flex-col justify-between relative overflow-hidden cursor-pointer group"
          gradient="violet"
          hover
          onClick={() => onNavigate("interview-setup")}
          animDelay={0.15}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-violet-500/8 to-transparent pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full bg-violet-500/10 blur-2xl" />
          <div>
            <Badge variant="gradient" dot>Recommended</Badge>
            <h3 className="text-xl font-black text-white mt-4 mb-2 leading-tight">Technical Deep-Dive on Distributed Consensus</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{"Consistently missed in 3/3 sessions. This is your biggest gap before the Stripe interview."}</p>
          </div>
          <Button variant="glow" size="md" className="w-full mt-6 group-hover:shadow-indigo-500/50">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            Start Practice Session
          </Button>
        </GlassCard>

        {/* ── Score trend chart ── */}
        <GlassCard className="col-span-12 lg:col-span-8 p-6" animDelay={0.2}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-white">Score Progression</h3>
              <p className="text-xs text-slate-500 mt-0.5">Across all dimensions over 4 sessions</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              {[
                { label: "Overall", color: "#818cf8" },
                { label: "Technical", color: "#60a5fa" },
                { label: "Communication", color: "#34d399" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 rounded-full" style={{ background: l.color }} />
                  <span className="text-slate-500">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mockProgressData.sessions} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gO" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <YAxis domain={[55, 95]} tick={{ fill: "#475569", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <Tooltip {...ttip} />
              <Area type="monotone" dataKey="overall" stroke="#818cf8" strokeWidth={2.5} fill="url(#gO)" name="Overall" dot={{ r: 4, fill: "#818cf8", strokeWidth: 0 }} />
              <Area type="monotone" dataKey="technical" stroke="#60a5fa" strokeWidth={1.5} fill="none" name="Technical" dot={false} strokeDasharray="4 2" />
              <Area type="monotone" dataKey="communication" stroke="#34d399" strokeWidth={1.5} fill="none" name="Communication" dot={false} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* ── Performance radials ── */}
        <GlassCard className="col-span-12 lg:col-span-4 p-6" animDelay={0.25}>
          <h3 className="text-base font-bold text-white mb-5">Performance</h3>
          <div className="flex flex-col gap-3">
            {[
              { label: "Technical", value: 78, color: "#818cf8" },
              { label: "Behavioral", value: 65, color: "#10b981" },
              { label: "Communication", value: 80, color: "#60a5fa" },
              { label: "Evidence", value: 72, color: "#818cf8" },
              { label: "STAR", value: 60, color: "#f59e0b" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="text-sm text-slate-400 w-28 shrink-0">{s.label}</span>
                <ProgressBar value={s.value} gradient={false} color={s.color} height={5} />
                <span className="text-xs font-mono font-bold w-7 text-right" style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* ── Recent Sessions ── */}
        <GlassCard className="col-span-12 lg:col-span-8 p-6" animDelay={0.3}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-white">Recent Sessions</h3>
            <Button variant="ghost" size="xs" onClick={() => onNavigate("history")}>View all →</Button>
          </div>
          <div className="flex flex-col gap-2">
            {mockInterviewSessions.slice(0, 4).map((s, i) => (
              <div
                key={s.id}
                onClick={() => onNavigate("interview-report")}
                className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/[0.04] cursor-pointer transition-all group"
                style={{ opacity: 0, animation: `fadeUp 0.4s ease ${0.3 + i * 0.07}s forwards` }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                  style={{
                    background: s.score >= 75 ? "rgba(16,185,129,0.15)" : s.score >= 60 ? "rgba(245,158,11,0.15)" : "rgba(244,63,94,0.15)",
                    color: s.score >= 75 ? "#10b981" : s.score >= 60 ? "#f59e0b" : "#f43f5e",
                  }}
                >
                  {s.score}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-200">{s.type} Interview</span>
                    <Badge variant={s.type === "Technical" ? "indigo" : s.type === "Behavioral" ? "emerald" : "slate"}>{s.type}</Badge>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.date} · {s.duration}</div>
                </div>
                <div className="text-right text-xs hidden md:block">
                  <div className="text-emerald-400">↑ {s.strengths[0]}</div>
                  <div className="text-rose-400 mt-0.5">↓ {s.weaknesses[0]}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" className="group-hover:text-slate-300 transition-colors shrink-0">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* ── Skills needing work ── */}
        <GlassCard className="col-span-12 lg:col-span-4 p-6" animDelay={0.35}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-white">Needs Work</h3>
            <Button variant="ghost" size="xs" onClick={() => onNavigate("training")}>Training →</Button>
          </div>
          <div className="flex flex-col gap-3">
            {mockProgressData.skillProgress.filter((s) => s.status === "weak").map((s, i) => (
              <div
                key={s.skill}
                className="flex items-center gap-3"
                style={{ opacity: 0, animation: `fadeUp 0.4s ease ${0.35 + i * 0.06}s forwards` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-300 font-medium">{s.skill}</span>
                    <span className="text-xs font-mono text-rose-400 font-bold">{s.score}</span>
                  </div>
                  <ProgressBar value={s.score} gradient={false} color="#f43f5e" height={4} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-white/8">
            <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">Resume Claims</h4>
            <div className="flex flex-col gap-1.5">
              {mockResume.claims.slice(0, 3).map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-xs">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.status === "verified" ? "bg-emerald-400" : c.status === "weak" ? "bg-amber-400" : "bg-slate-600"}`} />
                  <span className="text-slate-400 truncate">{c.text}</span>
                  <Badge variant={c.status === "verified" ? "emerald" : c.status === "weak" ? "amber" : "slate"} className="ml-auto shrink-0">{c.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* ── Training recommendations strip ── */}
        <div className="col-span-12" style={{ opacity: 0, animation: "fadeUp 0.5s ease 0.4s forwards" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white">Training Plan</h3>
            <Button variant="ghost" size="xs" onClick={() => onNavigate("training")}>All tasks →</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {mockTraining.slice(0, 3).map((t, i) => (
              <div
                key={t.id}
                className="glass rounded-2xl p-4 hover:bg-white/[0.04] transition-all cursor-pointer group"
                onClick={() => onNavigate(t.type === "coding" ? "coding-interview" : "interview-setup")}
                style={{ opacity: 0, animation: `fadeUp 0.4s ease ${0.42 + i * 0.08}s forwards` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <Badge variant={t.priority === "high" ? "rose" : t.priority === "medium" ? "amber" : "slate"}>{t.priority}</Badge>
                  <span className="text-xs text-slate-600 font-mono">{t.estimatedTime}</span>
                </div>
                <p className="text-sm font-semibold text-slate-200 leading-snug mb-1">{t.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{t.reason}</p>
                <div className="mt-3 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors">
                  {t.action} →
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
