import { useState } from "react";
import { Button, GlassCard, Badge, Tabs, Textarea, FileDropZone } from "../components/ui";
import { mockJD } from "../data/mock";

export default function JobDescription({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [tab, setTab] = useState("parsed");
  const [inputMode, setInputMode] = useState<"paste" | "upload">("paste");
  const [raw, setRaw] = useState(mockJD.responsibilities.join("\n\n"));
  const [saved, setSaved] = useState(true);

  return (
    <div className="px-5 sm:px-8 lg:px-12 py-8 max-w-5xl mx-auto">
      <div style={{ opacity: 0, animation: "fadeUp 0.5s ease forwards" }}>
        <div className="text-xs font-bold text-[#60a5fa] uppercase tracking-wider mb-2">Target Role</div>
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold text-[#f5f6fa]">Job Description</h1>
            <p className="text-[#9a9ca8] mt-1">{saved ? `${mockJD.title} @ ${mockJD.company}` : "No JD loaded yet"}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={() => setSaved(false)}>Replace</Button>
            <Button variant="glow" size="sm" onClick={() => onNavigate("match-analysis")}>Match Resume →</Button>
          </div>
        </div>
      </div>

      {!saved ? (
        <GlassCard className="p-6" animDelay={0.1}>
          <div className="flex gap-2 mb-5">
            {(["paste", "upload"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setInputMode(m)}
                className="px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all cursor-pointer"
                style={{
                  background: inputMode === m ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
                  color: inputMode === m ? "#818cf8" : "#64748b",
                }}
              >
                {m === "paste" ? "Paste Text" : "Upload File"}
              </button>
            ))}
          </div>
          {inputMode === "paste" ? (
            <>
              <Textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder="Paste the full job description here..."
                rows={12}
                className="mb-4"
              />
              <Button variant="glow" className="w-full" onClick={() => setSaved(true)}>Analyze JD →</Button>
            </>
          ) : (
            <FileDropZone accept=".pdf,.docx,.txt" onFile={() => setSaved(true)} />
          )}
        </GlassCard>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { l: "Required Skills", v: mockJD.requiredSkills.length, c: "#818cf8" },
              { l: "Preferred Skills", v: mockJD.preferredSkills.length, c: "#60a5fa" },
              { l: "Responsibilities", v: mockJD.responsibilities.length, c: "#10b981" },
              { l: "Technologies", v: mockJD.technologies.length, c: "#818cf8" },
            ].map((s, i) => (
              <GlassCard key={s.l} className="p-4 text-center" animDelay={0.1 + i * 0.05}>
                <div className="text-3xl font-black mb-0.5" style={{ color: s.c }}>{s.v}</div>
                <div className="text-xs font-mono text-slate-500 uppercase tracking-wider">{s.l}</div>
              </GlassCard>
            ))}
          </div>

          <div className="mb-5">
            <Tabs
              tabs={[
                { id: "parsed", label: "Parsed Info" },
                { id: "skills", label: "Skills" },
                { id: "responsibilities", label: "Responsibilities" },
              ]}
              active={tab}
              onChange={setTab}
            />
          </div>

          {tab === "parsed" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GlassCard className="p-5" animDelay={0.1}>
                <h3 className="text-sm font-bold text-white mb-3">Role Details</h3>
                <div className="flex flex-col gap-2">
                  {[
                    { l: "Company", v: mockJD.company },
                    { l: "Title", v: mockJD.title },
                    { l: "Experience", v: mockJD.experience },
                    { l: "Location", v: mockJD.location },
                    { l: "Type", v: mockJD.type },
                  ].map((f) => (
                    <div key={f.l} className="flex justify-between py-2 border-b border-white/8 last:border-0">
                      <span className="text-xs font-mono text-slate-600 uppercase tracking-wider">{f.l}</span>
                      <span className="text-sm font-semibold text-slate-200">{f.v}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
              <GlassCard className="p-5" animDelay={0.15}>
                <h3 className="text-sm font-bold text-white mb-3">Qualifications</h3>
                <div className="flex flex-col gap-2">
                  {mockJD.qualifications.map((q, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-400 py-1.5 border-b border-white/8 last:border-0">
                      <span className="text-rose-400 shrink-0">·</span>
                      {q}
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          )}

          {tab === "skills" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: "Required Skills", skills: mockJD.requiredSkills, variant: "indigo" as const },
                { title: "Preferred Skills", skills: mockJD.preferredSkills, variant: "slate" as const },
              ].map((group, gi) => (
                <GlassCard key={group.title} className="p-5" animDelay={0.1 + gi * 0.1}>
                  <h3 className="text-sm font-bold text-white mb-3">{group.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    {group.skills.map((s, i) => (
                      <div key={s} style={{ opacity: 0, animation: `scaleIn 0.3s ease ${0.1 + i * 0.03}s forwards` }}>
                        <Badge variant={group.variant}>{s}</Badge>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          {tab === "responsibilities" && (
            <GlassCard className="p-5" animDelay={0.1}>
              <div className="flex flex-col gap-3">
                {mockJD.responsibilities.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-2.5 border-b border-white/8 last:border-0"
                    style={{ opacity: 0, animation: `fadeUp 0.4s ease ${0.1 + i * 0.04}s forwards` }}
                  >
                    <div className="w-5 h-5 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-mono text-indigo-400">{i + 1}</span>
                    </div>
                    <p className="text-sm text-slate-400">{r}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </>
      )}
    </div>
  );
}
