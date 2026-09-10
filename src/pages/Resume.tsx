import { useState } from "react";
import { Button, GlassCard, Badge, Tabs, FileDropZone } from "../components/ui";
import { mockResume } from "../data/mock";

export default function Resume({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [tab, setTab] = useState("overview");
  const [uploaded, setUploaded] = useState(true);

  return (
    <div className="px-5 sm:px-8 lg:px-12 py-8 max-w-5xl mx-auto">
      <div style={{ opacity: 0, animation: "fadeUp 0.5s ease forwards" }}>
        <div className="text-xs font-bold text-[#60a5fa] uppercase tracking-wider mb-2">Documents</div>
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold text-[#f5f6fa]">Resume</h1>
            <p className="text-[#9a9ca8] mt-1">{uploaded ? mockResume.filename : "No resume uploaded yet"}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={() => setUploaded(false)}>Replace</Button>
            <Button variant="glow" size="sm" onClick={() => onNavigate("match-analysis")}>Analyze vs JD →</Button>
          </div>
        </div>
      </div>

      {!uploaded ? (
        <GlassCard className="p-8" animDelay={0.1}>
          <FileDropZone
            accept=".pdf,.docx"
            onFile={() => setUploaded(true)}
          />
        </GlassCard>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { l: "Claims", v: mockResume.claims.length, c: "#818cf8" },
              { l: "Verified", v: mockResume.claims.filter((c) => c.status === "verified").length, c: "#10b981" },
              { l: "Unverified", v: mockResume.claims.filter((c) => c.status === "unverified").length, c: "#f59e0b" },
              { l: "Skills", v: mockResume.skills.length, c: "#60a5fa" },
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
                { id: "overview", label: "Overview" },
                { id: "claims", label: "Claims", badge: mockResume.claims.length },
                { id: "skills", label: "Skills" },
                { id: "experience", label: "Experience" },
              ]}
              active={tab}
              onChange={setTab}
            />
          </div>

          {tab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GlassCard className="p-5" animDelay={0.1}>
                <h3 className="text-sm font-bold text-white mb-3">Document Info</h3>
                <div className="flex flex-col gap-2">
                  {[
                    { l: "File", v: mockResume.filename },
                    { l: "Name", v: mockResume.name },
                    { l: "Location", v: mockResume.location },
                    { l: "Uploaded", v: mockResume.uploadedAt },
                  ].map((f) => (
                    <div key={f.l} className="flex justify-between py-2 border-b border-white/8 last:border-0">
                      <span className="text-xs font-mono text-slate-600 uppercase tracking-wider">{f.l}</span>
                      <span className="text-sm font-semibold text-slate-200">{f.v}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
              <GlassCard className="p-5" animDelay={0.15}>
                <h3 className="text-sm font-bold text-white mb-3">AI Summary</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{mockResume.summary}</p>
              </GlassCard>
            </div>
          )}

          {tab === "claims" && (
            <div className="flex flex-col gap-3">
              {mockResume.claims.map((claim, i) => (
                <GlassCard key={claim.id} className="p-4 flex items-start gap-4" animDelay={0.1 + i * 0.04}>
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-black"
                    style={{
                      background: claim.status === "verified" ? "rgba(16,185,129,0.15)" : claim.status === "unverified" ? "rgba(245,158,11,0.15)" : "rgba(99,102,241,0.15)",
                      color: claim.status === "verified" ? "#10b981" : claim.status === "unverified" ? "#f59e0b" : "#818cf8",
                    }}
                  >
                    {claim.status === "verified" ? "✓" : claim.status === "unverified" ? "?" : "~"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className="text-sm text-slate-200 flex-1">{claim.text}</span>
                      <Badge variant={claim.status === "verified" ? "emerald" : claim.status === "unverified" ? "amber" : "indigo"}>
                        {claim.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Source: experience {claim.source}</p>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          {tab === "skills" && (
            <GlassCard className="p-5" animDelay={0.1}>
              <div className="flex flex-wrap gap-2">
                {mockResume.skills.map((s, i) => (
                  <div
                    key={s}
                    className="px-3 py-1.5 rounded-xl text-sm font-semibold"
                    style={{
                      opacity: 0,
                      animation: `scaleIn 0.3s ease ${0.1 + i * 0.03}s forwards`,
                      background: "rgba(99,102,241,0.08)",
                      border: "1px solid rgba(99,102,241,0.15)",
                      color: "#a5b4fc",
                    }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {tab === "experience" && (
            <div className="flex flex-col gap-4">
              {mockResume.experience.map((exp, i) => (
                <GlassCard key={exp.id} className="p-5" animDelay={0.1 + i * 0.07}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="font-bold text-white">{exp.title}</div>
                      <div className="text-sm text-slate-400">{exp.company}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono text-slate-500">{exp.duration}</div>
                    </div>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {exp.bullets.map((b, bi) => (
                      <li key={bi} className="text-xs text-slate-400 flex gap-2">
                        <span className="text-indigo-500 shrink-0">·</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
