import { useState } from "react";
import { Button, GlassCard, Badge } from "../components/ui";
import { mockTraining } from "../data/mock";

const tagVariant: Record<string, "indigo" | "violet" | "cyan" | "emerald" | "amber" | "rose" | "slate"> = {
  "Technical": "indigo",
  "Behavioral": "emerald",
  "JD Gap": "violet",
  "Resume Claim": "cyan",
  "Coding": "amber",
  "Communication": "rose",
};

export default function Training({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <div className="px-5 sm:px-8 lg:px-12 py-8 max-w-5xl mx-auto">
      <div style={{ opacity: 0, animation: "fadeUp 0.5s ease forwards" }}>
        <div className="text-xs font-bold text-[#60a5fa] uppercase tracking-wider mb-2">Learning</div>
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold text-[#f5f6fa]">Training Plan</h1>
            <p className="text-[#9a9ca8] mt-1">Personalized to your skill gaps and target role at Stripe</p>
          </div>
          <Button variant="glow" size="sm" onClick={() => onNavigate("interview-setup")}>Practice Now →</Button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { l: "Items", v: mockTraining.length, c: "#818cf8" },
          { l: "High Priority", v: mockTraining.filter((t) => t.priority === "high").length, c: "#f43f5e" },
          { l: "Est. Total", v: "3h 20m", c: "#10b981" },
        ].map((s, i) => (
          <GlassCard key={s.l} className="p-4 text-center" animDelay={0.1 + i * 0.05}>
            <div className="text-3xl font-black mb-0.5" style={{ color: s.c }}>{s.v}</div>
            <div className="text-xs font-mono text-slate-500 uppercase tracking-wider">{s.l}</div>
          </GlassCard>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {mockTraining.map((item, i) => {
          const priorityColor = item.priority === "high" ? "#f43f5e" : item.priority === "medium" ? "#f59e0b" : "#475569";
          return (
            <GlassCard key={item.id} className="p-5" animDelay={0.1 + i * 0.06} hover>
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black shrink-0"
                  style={{ background: `${priorityColor}15`, color: priorityColor, border: `1px solid ${priorityColor}25` }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 flex-wrap mb-2">
                    <h3 className="font-bold text-white text-base">{item.title}</h3>
                    <Badge variant={item.priority === "high" ? "rose" : item.priority === "medium" ? "amber" : "slate"}>
                      {item.priority}
                    </Badge>
                    <Badge variant={tagVariant[item.tag] ?? "slate"}>{item.tag}</Badge>
                  </div>
                  <p className="text-sm text-slate-400 mb-3 leading-relaxed">{item.reason}</p>
                  <div className="text-xs font-mono text-slate-600">Est. {item.estimatedTime}</div>
                </div>
                <Button
                  variant="glow"
                  size="xs"
                  className="shrink-0"
                  onClick={() => onNavigate(item.type === "coding" ? "coding-interview" : "interview-setup")}
                >
                  {item.action}
                </Button>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
