import { useState } from "react";
import { Button, GlassCard, Badge } from "../components/ui";
import { mockResume, mockMatchAnalysis } from "../data/mock";

type IType = "technical" | "behavioral" | "mixed" | "coding" | "project" | "situational";
type IMode = "standard" | "strict" | "panel";

export default function InterviewSetup({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [step, setStep] = useState<"config" | "briefing">("config");
  const [type, setType] = useState<IType>("technical");
  const [mode, setMode] = useState<IMode>("standard");
  const [difficulty, setDifficulty] = useState("medium");
  const [duration, setDuration] = useState(45);
  const [focus, setFocus] = useState<string[]>([]);
  const [includeClaims, setIncludeClaims] = useState(true);

  const types: { id: IType; label: string; desc: string; color: string }[] = [
    { id: "technical", label: "Technical", desc: "System design, architecture, CS fundamentals", color: "#818cf8" },
    { id: "behavioral", label: "Behavioral", desc: "STAR stories, leadership, collaboration", color: "#10b981" },
    { id: "mixed", label: "Mixed", desc: "Combined technical and behavioral", color: "#60a5fa" },
    { id: "coding", label: "Coding", desc: "Live coding with an AI interviewer", color: "#818cf8" },
    { id: "project", label: "Project-Based", desc: "Deep dive into your resume projects", color: "#f59e0b" },
    { id: "situational", label: "Situational", desc: "Hypothetical scenarios and tradeoffs", color: "#f43f5e" },
  ];

  const weakAreas = mockMatchAnalysis.gaps.map((g) => g.jdItem);

  if (step === "briefing") {
    return (
      <div className="px-5 sm:px-8 lg:px-12 py-8 max-w-xl mx-auto">
        <div style={{ opacity: 0, animation: "fadeUp 0.5s ease forwards" }}>
          <div className="text-xs font-bold text-[#60a5fa] uppercase tracking-wider mb-2">Ready to begin</div>
          <h1 className="text-4xl font-heading font-bold text-[#f5f6fa] mb-8">Interview Briefing</h1>
        </div>

        <GlassCard className="p-8 mb-5" gradient="indigo" animDelay={0.1}>
          {/* AI Interviewer avatar */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)", boxShadow: "0 0 24px rgba(99,102,241,0.2)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8">
                <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-white">AI Interviewer</div>
              <div className="text-sm text-slate-400 mt-0.5">Adaptive · Evidence-grounded · Personalized</div>
            </div>
            <Badge variant="emerald" dot className="ml-auto">Ready</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            {[
              { l: "Type", v: types.find((t) => t.id === type)?.label },
              { l: "Mode", v: mode.charAt(0).toUpperCase() + mode.slice(1) },
              { l: "Difficulty", v: difficulty.charAt(0).toUpperCase() + difficulty.slice(1) },
              { l: "Duration", v: `~${duration} min` },
            ].map((f) => (
              <div key={f.l}>
                <div className="text-xs font-mono text-slate-600 uppercase tracking-wider mb-0.5">{f.l}</div>
                <div className="text-sm font-bold text-white">{f.v}</div>
              </div>
            ))}
          </div>

          {focus.length > 0 && (
            <div className="mb-5">
              <div className="text-xs font-mono text-slate-600 uppercase tracking-wider mb-2">Focus Areas</div>
              <div className="flex flex-wrap gap-1.5">
                {focus.map((s) => <Badge key={s} variant="indigo">{s}</Badge>)}
              </div>
            </div>
          )}

          <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/8">
            <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">What to expect</div>
            <ul className="flex flex-col gap-1.5 text-xs text-slate-400">
              <li>· Questions adapt in real-time to the quality of your answers</li>
              <li>· Resume claims may be verified during the session</li>
              <li>· Your microphone will be used — ensure it is working</li>
              {mode === "strict" && <li className="text-rose-400">· Strict mode: visible timers and interruptions are active</li>}
              {mode === "panel" && <li className="text-cyan-400">· Panel mode: 3 interviewers will take turns questioning</li>}
            </ul>
          </div>
        </GlassCard>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setStep("config")}>← Back</Button>
          <Button
            variant="glow"
            size="lg"
            className="flex-1"
            onClick={() => onNavigate(type === "coding" ? "coding-interview" : "voice-interview")}
          >
            Begin Interview →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 sm:px-8 lg:px-12 py-8 max-w-4xl mx-auto">
      <div style={{ opacity: 0, animation: "fadeUp 0.5s ease forwards" }}>
        <div className="text-xs font-bold text-[#60a5fa] uppercase tracking-wider mb-2">New Session</div>
        <h1 className="text-4xl font-heading font-bold text-[#f5f6fa] mb-8">Configure Interview</h1>
      </div>

      {/* Interview Types */}
      <div className="mb-8">
        <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">Interview Type</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {types.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className="text-left p-4 rounded-2xl border transition-all cursor-pointer group"
              style={{
                opacity: 0,
                animation: `fadeUp 0.4s ease ${0.05 + i * 0.05}s forwards`,
                background: type === t.id ? `${t.color}10` : "rgba(255,255,255,0.03)",
                borderColor: type === t.id ? `${t.color}40` : "rgba(255,255,255,0.07)",
                boxShadow: type === t.id ? `0 0 24px ${t.color}15` : "none",
              }}
            >
              <div className="w-8 h-8 rounded-xl mb-3 flex items-center justify-center" style={{ background: `${t.color}15` }}>
                <div className="w-2 h-2 rounded-full" style={{ background: t.color }} />
              </div>
              <div className="font-bold text-sm mb-1" style={{ color: type === t.id ? t.color : "#f1f5f9" }}>{t.label}</div>
              <div className="text-xs text-slate-500">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Mode */}
        <div>
          <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">Mode</div>
          <div className="flex flex-col gap-2">
            {([
              { id: "standard", label: "Standard", desc: "Realistic pacing, adaptive questions", tag: null },
              { id: "strict", label: "Strict Mode", desc: "Time limits, interruptions, pressure", tag: "High pressure" },
              { id: "panel", label: "Panel Mode", desc: "Three AI interviewers, different roles", tag: "Multi-interviewer" },
            ] as const).map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className="text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3"
                style={{
                  background: mode === m.id ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.03)",
                  borderColor: mode === m.id ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.07)",
                }}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${mode === m.id ? "border-indigo-400" : "border-slate-700"}`}>
                  {mode === m.id && <div className="w-2 h-2 rounded-full bg-indigo-400" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${mode === m.id ? "text-indigo-300" : "text-slate-200"}`}>{m.label}</span>
                    {m.tag && <Badge variant={m.tag === "High pressure" ? "rose" : "cyan"}>{m.tag}</Badge>}
                  </div>
                  <div className="text-xs text-slate-500">{m.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div>
          <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">Options</div>
          <div className="flex flex-col gap-3">
            {/* Difficulty */}
            <div className="glass rounded-2xl p-4">
              <div className="text-xs text-slate-500 mb-2">Difficulty</div>
              <div className="flex gap-2">
                {["easy", "medium", "hard"].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer"
                    style={{
                      background: difficulty === d ? (d === "easy" ? "rgba(16,185,129,0.15)" : d === "medium" ? "rgba(99,102,241,0.15)" : "rgba(244,63,94,0.15)") : "rgba(255,255,255,0.04)",
                      color: difficulty === d ? (d === "easy" ? "#10b981" : d === "medium" ? "#818cf8" : "#f43f5e") : "#64748b",
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="glass rounded-2xl p-4">
              <div className="text-xs text-slate-500 mb-2">Duration: <span className="text-white font-bold">{duration} min</span></div>
              <input
                type="range" min={15} max={90} step={15} value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: "#6366f1" }}
              />
              <div className="flex justify-between text-xs text-slate-600 mt-1"><span>15m</span><span>90m</span></div>
            </div>

            {/* Claims toggle */}
            <div
              className="flex items-center gap-3 glass rounded-2xl p-4 cursor-pointer"
              onClick={() => setIncludeClaims((v) => !v)}
            >
              <div className={`w-10 h-6 rounded-full transition-all relative ${includeClaims ? "bg-indigo-500" : "bg-white/10"}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${includeClaims ? "left-5" : "left-1"}`} />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-200">Test resume claims</div>
                <div className="text-xs text-slate-500">{mockResume.claims.filter((c) => c.status !== "verified").length} unverified claims available</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Focus areas */}
      <div className="mb-8">
        <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">Focus Areas (optional)</div>
        <div className="flex flex-wrap gap-2">
          {[...weakAreas, ...mockMatchAnalysis.missingSkills.slice(0, 4)].map((s) => (
            <button
              key={s}
              onClick={() => setFocus((f) => f.includes(s) ? f.filter((x) => x !== s) : [...f, s])}
              className="px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer"
              style={{
                background: focus.includes(s) ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
                borderColor: focus.includes(s) ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.08)",
                color: focus.includes(s) ? "#818cf8" : "#64748b",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <Button variant="glow" size="lg" className="w-full" onClick={() => setStep("briefing")}>
        Continue to Briefing →
      </Button>
    </div>
  );
}
