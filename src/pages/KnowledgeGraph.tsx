import { useState } from "react";
import { Button, GlassCard, Badge, ProgressBar } from "../components/ui";
import { mockKnowledgeGraph, mockResume } from "../data/mock";

type KNode = (typeof mockKnowledgeGraph.nodes)[number];
type StatusKey = "demonstrated" | "weak" | "unverified";

const statusMeta: Record<StatusKey, { color: string; border: string; glow: string; bg: string; label: string }> = {
  demonstrated: { color: "#10b981", border: "rgba(16,185,129,0.3)", glow: "rgba(16,185,129,0.2)", bg: "rgba(16,185,129,0.08)", label: "Demonstrated" },
  weak: { color: "#f59e0b", border: "rgba(245,158,11,0.3)", glow: "rgba(245,158,11,0.15)", bg: "rgba(245,158,11,0.08)", label: "Weak Evidence" },
  unverified: { color: "#475569", border: "rgba(71,85,105,0.3)", glow: "transparent", bg: "rgba(71,85,105,0.08)", label: "Unverified" },
};

const catColors: Record<string, string> = {
  language: "#818cf8", domain: "#34d399", tech: "#60a5fa", skill: "#f59e0b",
};

export default function KnowledgeGraph({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [selected, setSelected] = useState<KNode | null>(null);
  const [filter, setFilter] = useState<"all" | StatusKey>("all");

  const nodes = filter === "all" ? mockKnowledgeGraph.nodes : mockKnowledgeGraph.nodes.filter((n) => n.status === filter);
  const counts = {
    demonstrated: mockKnowledgeGraph.nodes.filter((n) => n.status === "demonstrated").length,
    weak: mockKnowledgeGraph.nodes.filter((n) => n.status === "weak").length,
    unverified: mockKnowledgeGraph.nodes.filter((n) => n.status === "unverified").length,
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 py-8 max-w-6xl mx-auto">
      <div style={{ opacity: 0, animation: "fadeUp 0.5s ease forwards" }}>
        <div className="text-xs font-bold text-[#60a5fa] uppercase tracking-wider mb-2">Intelligence</div>
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-heading font-bold text-[#f5f6fa]">Skills & Knowledge</h1>
            <p className="text-[#9a9ca8] mt-1">Your persistent skill model — built from resume + verified through interviews</p>
          </div>
          <Button variant="glow" size="sm" onClick={() => onNavigate("training")}>Practice Weak Skills</Button>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {(["demonstrated", "weak", "unverified"] as StatusKey[]).map((s, i) => {
          const m = statusMeta[s];
          return (
            <button
              key={s}
              onClick={() => setFilter(filter === s ? "all" : s)}
              className="rounded-3xl p-5 text-left transition-all cursor-pointer"
              style={{
                opacity: 0,
                animation: `fadeUp 0.4s ease ${0.1 + i * 0.06}s forwards`,
                background: filter === s ? m.bg : "rgba(255,255,255,0.03)",
                border: `1px solid ${filter === s ? m.border : "rgba(255,255,255,0.07)"}`,
                boxShadow: filter === s ? `0 0 24px ${m.glow}` : "none",
              }}
            >
              <div className="text-4xl font-black mb-1" style={{ color: m.color }}>{counts[s]}</div>
              <div className="text-sm font-semibold" style={{ color: m.color }}>{m.label}</div>
              <div className="text-xs text-slate-500 mt-1">
                {s === "demonstrated" ? "Backed by interview evidence" :
                 s === "weak" ? "Discussed but not proven" : "Not yet tested"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Category legend */}
      <div className="flex items-center gap-4 flex-wrap mb-5">
        {Object.entries(catColors).map(([cat, col]) => (
          <div key={cat} className="flex items-center gap-2 text-xs text-slate-500 capitalize">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col }} />
            {cat}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Node constellation */}
        <GlassCard className="col-span-12 lg:col-span-8 p-6" animDelay={0.15}>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-8 py-4">
            {nodes.map((node, i) => {
              const m = statusMeta[node.status as StatusKey];
              const catCol = catColors[node.category] || "#475569";
              const isSelected = selected?.id === node.id;
              return (
                <div
                  key={node.id}
                  onClick={() => setSelected(isSelected ? null : node)}
                  className="flex flex-col items-center gap-2 cursor-pointer group"
                  style={{ opacity: 0, animation: `scaleIn 0.4s ease ${0.2 + i * 0.04}s forwards` }}
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-black transition-all duration-200 group-hover:scale-110"
                    style={{
                      border: `2px solid ${isSelected ? catCol : m.color}`,
                      background: isSelected ? `${catCol}15` : m.bg,
                      color: isSelected ? catCol : m.color,
                      boxShadow: isSelected
                        ? `0 0 24px ${catCol}40, 0 0 48px ${catCol}20`
                        : `0 0 12px ${m.glow}`,
                    }}
                  >
                    {node.strength > 0 ? node.strength : "?"}
                  </div>
                  <span className="text-xs text-slate-400 text-center leading-tight max-w-16">{node.label}</span>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: catCol }} />
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Detail panel */}
        <div className="col-span-12 lg:col-span-4">
          {selected ? (
            <GlassCard className="p-6 sticky top-20" animDelay={0}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-black text-white">{selected.label}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={selected.status === "demonstrated" ? "emerald" : selected.status === "weak" ? "amber" : "slate"}>
                      {statusMeta[selected.status as StatusKey].label}
                    </Badge>
                    <span className="text-xs text-slate-500 capitalize">{selected.category}</span>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-600 hover:text-white transition-colors cursor-pointer w-7 h-7 flex items-center justify-center rounded-xl hover:bg-white/8">×</button>
              </div>

              {selected.strength > 0 && (
                <div className="mb-5">
                  <div className="flex justify-between text-xs text-slate-500 mb-2">
                    <span>Demonstrated Strength</span>
                    <span className="font-mono font-bold text-white">{selected.strength}/100</span>
                  </div>
                  <ProgressBar
                    value={selected.strength}
                    gradient={selected.status === "demonstrated"}
                    color={selected.status === "weak" ? "#f59e0b" : "#475569"}
                    height={6}
                  />
                </div>
              )}

              <div className="flex flex-col gap-4 mb-5">
                {[
                  { label: "Resume Source", text: mockResume.skills.includes(selected.label) ? `Listed in skills — ${mockResume.filename}` : "Inferred from work experience context" },
                  { label: "Interview History", text: selected.status === "demonstrated" ? "Tested in sessions s1, s3 — answered with specifics" : selected.status === "weak" ? "Came up in s2 — answer lacked depth" : "Not yet tested in any session" },
                  { label: "Recommended Action", text: selected.status === "demonstrated" ? "Maintain before your Stripe interview" : "Schedule a targeted practice session" },
                ].map((f) => (
                  <div key={f.label}>
                    <div className="text-xs font-mono text-slate-600 uppercase tracking-wider mb-1">{f.label}</div>
                    <p className="text-xs text-slate-400 leading-relaxed">{f.text}</p>
                  </div>
                ))}
              </div>

              <Button
                variant={selected.status === "demonstrated" ? "secondary" : "glow"}
                size="sm"
                className="w-full"
                onClick={() => onNavigate("interview-setup")}
              >
                {selected.status === "demonstrated" ? "Practice to Maintain" : `Practice ${selected.label} →`}
              </Button>
            </GlassCard>
          ) : (
            <GlassCard className="p-6 flex flex-col items-center justify-center gap-4 min-h-48 text-center" animDelay={0.2}>
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">Click any skill node to inspect its status, evidence, and recommended practice</p>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
