import { useState } from "react";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { GlassCard, Badge, Tabs, ProgressBar } from "../components/ui";
import { mockProgressData, mockInterviewSessions, mockSpeechAnalytics } from "../data/mock";

export default function Progress({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [tab, setTab] = useState("scores");

  const ttip = {
    contentStyle: { background: "rgba(21,22,34,0.95)", border: "1px solid #232430", borderRadius: 12, fontSize: 11, fontFamily: "JetBrains Mono", color: "#f5f6fa" },
    cursor: { stroke: "rgba(99,102,241,0.2)" },
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 py-8 max-w-6xl mx-auto">
      <div style={{ opacity: 0, animation: "fadeUp 0.5s ease forwards" }}>
        <div className="text-xs font-bold text-[#60a5fa] uppercase tracking-wider mb-2">Analytics</div>
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-heading font-bold text-[#f5f6fa]">Progress</h1>
            <p className="text-[#9a9ca8] mt-1">Tracking improvement across {mockInterviewSessions.length} sessions</p>
          </div>
          <div className="flex gap-4 text-right">
            {[
              { l: "Best Score", v: "76", c: "#818cf8" },
              { l: "Avg Improvement", v: "+4.0/session", c: "#10b981" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-xs font-mono text-slate-500 uppercase tracking-wider">{s.l}</div>
                <div className="text-xl font-black mt-0.5" style={{ color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <Tabs
          tabs={[
            { id: "scores", label: "Score Trends" },
            { id: "skills", label: "Skills" },
            { id: "speech", label: "Speech" },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === "scores" && (
        <div className="flex flex-col gap-4">
          <GlassCard className="p-6" animDelay={0.1}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-white">All Dimensions Over Time</h3>
                <p className="text-xs text-slate-500 mt-0.5">4 sessions · {mockInterviewSessions[0].date} → {mockInterviewSessions[mockInterviewSessions.length - 1].date}</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                {[{ l: "Overall", c: "#818cf8" }, { l: "Technical", c: "#60a5fa" }, { l: "Behavioral", c: "#10b981" }, { l: "Communication", c: "#34d399" }].map((x) => (
                  <div key={x.l} className="flex items-center gap-1.5 text-slate-500">
                    <div className="w-3 h-0.5 rounded-full" style={{ background: x.c }} />
                    {x.l}
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={mockProgressData.sessions} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gPO" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis domain={[55, 95]} tick={{ fill: "#475569", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <Tooltip {...ttip} />
                <Area type="monotone" dataKey="overall" stroke="#818cf8" strokeWidth={2.5} fill="url(#gPO)" name="Overall" dot={{ r: 4, fill: "#818cf8", strokeWidth: 0 }} />
                <Line type="monotone" dataKey="technical" stroke="#60a5fa" strokeWidth={1.5} dot={false} name="Technical" strokeDasharray="4 2" />
                <Line type="monotone" dataKey="behavioral" stroke="#10b981" strokeWidth={1.5} dot={false} name="Behavioral" strokeDasharray="4 2" />
                <Line type="monotone" dataKey="communication" stroke="#34d399" strokeWidth={1.5} dot={false} name="Communication" strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassCard className="p-5" animDelay={0.15}>
              <h3 className="text-sm font-bold text-white mb-4">Evidence Usage</h3>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={mockProgressData.evidenceTrend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[40, 90]} tick={{ fill: "#475569", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                  <Tooltip {...ttip} />
                  <Line type="monotone" dataKey="score" stroke="#818cf8" strokeWidth={2} dot={{ r: 3, fill: "#818cf8", strokeWidth: 0 }} name="Evidence Score" />
                </LineChart>
              </ResponsiveContainer>
            </GlassCard>
            <GlassCard className="p-5" animDelay={0.2}>
              <h3 className="text-sm font-bold text-white mb-4">STAR Framework</h3>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={mockProgressData.starTrend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[30, 80]} tick={{ fill: "#475569", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                  <Tooltip {...ttip} />
                  <Line type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: "#f59e0b", strokeWidth: 0 }} name="STAR Score" />
                </LineChart>
              </ResponsiveContainer>
            </GlassCard>
          </div>
        </div>
      )}

      {tab === "skills" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassCard className="p-5" animDelay={0.1}>
            <h3 className="text-sm font-bold text-white mb-4">Skill Scores</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockProgressData.skillProgress} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 110 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "#475569", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="skill" tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "Outfit" }} axisLine={false} tickLine={false} />
                <Tooltip {...ttip} />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} name="Score"
                  fill="url(#barGrad)"
                />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
          <GlassCard className="p-5" animDelay={0.15}>
            <h3 className="text-sm font-bold text-white mb-4">Status & Trend</h3>
            <div className="flex flex-col gap-3">
              {mockProgressData.skillProgress.map((s, i) => (
                <div key={s.skill} style={{ opacity: 0, animation: `fadeUp 0.4s ease ${0.2 + i * 0.05}s forwards` }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-slate-300 font-medium">{s.skill}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono font-bold ${s.trend.startsWith("+") ? "text-emerald-400" : s.trend === "0" ? "text-slate-600" : "text-rose-400"}`}>{s.trend}</span>
                      <Badge variant={s.status === "strong" ? "emerald" : s.status === "improving" ? "indigo" : "rose"}>{s.status}</Badge>
                    </div>
                  </div>
                  <ProgressBar
                    value={s.score}
                    gradient={false}
                    color={s.status === "strong" ? "#10b981" : s.status === "improving" ? "#818cf8" : "#f43f5e"}
                    height={5}
                  />
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {tab === "speech" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-4">
            {[
              { l: "Words/Minute", v: mockSpeechAnalytics.wordsPerMinute, target: "120–160", ok: true, unit: "wpm" },
              { l: "Filler Words/min", v: mockSpeechAnalytics.fillerWords.perMinute, target: "< 6", ok: false, unit: "/min" },
              { l: "Avg Response Latency", v: mockSpeechAnalytics.responseLatency.average, target: "1–3s", ok: true, unit: "sec" },
              { l: "Avg Pause", v: mockSpeechAnalytics.pauseDuration.average, target: "< 2s", ok: true, unit: "sec" },
            ].map((m, i) => (
              <GlassCard key={m.l} className="p-4 flex items-center gap-4" animDelay={0.1 + i * 0.05}>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black ${m.ok ? "bg-emerald-400/10 text-emerald-400" : "bg-rose-400/10 text-rose-400"}`}>
                  {m.v}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-200">{m.l}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Target: {m.target} {m.unit}</div>
                </div>
                <Badge variant={m.ok ? "emerald" : "rose"}>{m.ok ? "On target" : "Needs work"}</Badge>
              </GlassCard>
            ))}
          </div>
          <GlassCard className="p-5" animDelay={0.15}>
            <h3 className="text-sm font-bold text-white mb-4">Top Filler Words</h3>
            <div className="flex flex-wrap gap-2 mb-5">
              {mockSpeechAnalytics.fillerWords.words.map((w) => <Badge key={w} variant="rose">{w}</Badge>)}
            </div>
            <div className="flex flex-col gap-2">
              {mockSpeechAnalytics.insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-slate-400 py-2 border-b border-white/8 last:border-0">
                  <span className="font-mono text-indigo-400 shrink-0">{String(i + 1).padStart(2, "0")}.</span>
                  {ins}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
