import { useState, useMemo } from "react";
import { Segmented } from "../components/ui";
import { getUserResume, getUserJD, cleanCandidateName } from "../lib/userDocuments";
import { computeAccurateMatch, getActiveJdMatchReport, type ResumeQuality } from "../lib/jdMatcher";

const sevCls = (s: string) => (s === "critical" ? "ob-err" : s === "high" ? "ob-warn" : "");

const STATUS_CHIP: Record<string, { cls: string; label: string }> = {
  good: { cls: "ob-ok", label: "clean" },
  warn: { cls: "ob-warn", label: "needs work" },
  bad: { cls: "ob-err", label: "fix first" },
};

function QualityPanel({ quality }: { quality?: ResumeQuality | null }) {
  if (!quality) {
    return (
      <div className="ob-card mt-4 hover:!translate-y-0 text-center py-12">
        <div className="text-[16px] mb-1.5">No writing check for this match</div>
        <p className="ob-tx3 text-[13px] m-0 max-w-[46ch] mx-auto">
          Matches saved earlier do not include one. Run the match again, with a parsed resume uploaded, to check grammar, bullets and buzzwords.
        </p>
      </div>
    );
  }
  const tone = quality.score >= 80 ? "var(--ob-ok)" : quality.score >= 60 ? "var(--ob-wn)" : "var(--ob-er)";
  return (
    <div className="grid gap-4 mt-4">
      <div className="ob-card hover:!translate-y-0 flex flex-wrap gap-8 items-center !p-6">
        <div className="shrink-0">
          <div className="text-[44px] font-medium tracking-[-0.04em] leading-none" style={{ color: tone }}>
            {quality.score}
            <span className="text-xl ob-tx3">/100</span>
          </div>
          <div className="ob-lb mt-1.5">writing score</div>
        </div>
        <div className="flex-[1_1_300px] min-w-0">
          <p className="m-0 text-[15.5px] leading-[1.6] tracking-[-0.01em]">{quality.summary}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="ob-chip ob-sq">{quality.stats.withNumbers}/{quality.stats.bullets} bullets with numbers</span>
            <span className="ob-chip ob-sq">{quality.stats.grammarIssues} grammar</span>
            <span className="ob-chip ob-sq">{quality.stats.buzzwords} buzzword lines</span>
          </div>
        </div>
      </div>

      {quality.checks.map((c) => {
        const chip = STATUS_CHIP[c.status] || STATUS_CHIP.warn;
        return (
          <div key={c.id} className="ob-card hover:!translate-y-0">
            <div className="flex justify-between items-start gap-3 flex-wrap">
              <div>
                <div className="text-[16px] tracking-[-0.01em]">{c.title}</div>
                {c.hint && <div className="ob-tx3 text-[12.5px] mt-0.5">{c.hint}</div>}
              </div>
              <span className={`ob-chip ob-sq ${chip.cls}`}>{c.issues.length ? `${c.issues.length} · ${chip.label}` : chip.label}</span>
            </div>
            {c.issues.length === 0 ? (
              <div className="mt-3 ob-tx2 text-[13px]">Nothing to fix here.</div>
            ) : (
              <div className="mt-2">
                {c.issues.map((it, i) => (
                  <div key={i} className="py-3.5 border-t border-ob-ln">
                    {it.quote && (
                      <div className="border-l-2 pl-3 text-[12.5px] italic ob-tx2 leading-relaxed" style={{ borderColor: "var(--ob-ln3)" }}>
                        "{it.quote}"
                      </div>
                    )}
                    <p className="m-0 mt-2 text-[13.5px]">{it.problem}</p>
                    {it.fix && (
                      <p className="m-0 mt-1.5 text-[13px] ob-tx2">
                        <span className="ob-lb mr-2 ob-txa">Try</span>
                        {it.fix}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MatchAnalysis({ onNavigate }: { onNavigate: (p: string) => void }) {
  const userResume = getUserResume();
  const userJD = getUserJD();
  const [activeReport] = useState(() => getActiveJdMatchReport());
  const [tab, setTab] = useState<"technical" | "quality">("technical");
  const [hoverRow, setHoverRow] = useState<number | null>(null);

  const analysis = useMemo(() => {
    if (activeReport && activeReport.analysis) return activeReport.analysis;
    if (userJD) return computeAccurateMatch(userResume, userJD);
    return null;
  }, [activeReport, userResume, userJD]);

  if (!analysis) {
    return (
      <div className="mx-auto w-full max-w-[760px] px-5 pt-8 pb-16 text-center">
        <div className="ob-card hover:!translate-y-0 py-14">
          <div className="ob-lb ob-txa">Match analysis</div>
          <h2 className="text-[22px] font-medium tracking-[-0.02em] mt-3 mb-2.5">No job description matched yet</h2>
          <p className="ob-tx2 max-w-[44ch] mx-auto mb-6">
            Paste or upload a job description to compare its requirements against your resume.
          </p>
          <button type="button" className="ob-btn ob-pr" onClick={() => onNavigate("job-description")}>
            Match a job description
          </button>
        </div>
      </div>
    );
  }

  const rawCompany = (activeReport && activeReport.jdCompany) || analysis.jdCompany || userJD?.company || "";
  const company = /^(target company|the company)$/i.test(rawCompany.trim()) ? "" : rawCompany.trim();
  const title = (activeReport && activeReport.jdTitle) || analysis.jdTitle || userJD?.title || "Target role";
  const candidate = cleanCandidateName(analysis.extractedResumeName || userResume?.name || "Candidate");
  const score = Math.round(analysis.overallScore);
  const matrix = analysis.skillMatrix || [];
  const evidenced = matrix.filter((m) => m.matched);
  const unsupported = matrix.filter((m) => !m.matched);
  const graphRows = [...evidenced.slice(0, 7), ...unsupported.slice(0, 3)];
  const rowH = 35;
  const svgH = Math.max(120, graphRows.length * rowH + 20);
  const evidenceBoxes = Array.from(
    new Set(evidenced.slice(0, 7).map((m) => m.sourceProject || "Skills section"))
  ).slice(0, 4);

  const fits = [
    { l: "Technical fit", v: Math.round(analysis.technicalFit) },
    { l: "Skill fit", v: Math.round(analysis.skillFit) },
    { l: "Experience fit", v: Math.round(analysis.experienceFit) },
  ];

  return (
    <div className="mx-auto w-full max-w-[1160px] px-5 sm:px-[clamp(20px,4vw,56px)] pt-2 pb-16 text-[14px] leading-[1.55]">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="flex items-center gap-3 mb-5 font-mono text-xs ob-tx3">
            <span>1 Job description</span>
            <i className="inline-block w-9 h-px bg-ob-ln2" />
            <b className="ob-tx font-medium">2 Match analysis</b>
          </div>
          <div className="ob-rise ob-lb" style={{ ["--i" as string]: 0 }}>
            {candidate} ↔ {title}{company ? ` · ${company}` : ""}
          </div>
        </div>
        <div className="ob-rise flex flex-wrap gap-2.5" style={{ ["--i" as string]: 3 }}>
          <button type="button" className="ob-btn ob-btn-lg" onClick={() => onNavigate("job-description")}>Edit job description</button>
        </div>
      </div>

      {/* Score + verdict */}
      <div className="ob-card ob-rise flex flex-wrap gap-9 items-center !p-7 mt-[30px] hover:!translate-y-0" style={{ ["--i" as string]: 4 }}>
        <div className="relative w-[156px] h-[156px] shrink-0">
          <svg viewBox="0 0 100 100" width="156" height="156" aria-hidden="true">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--ob-ln)" strokeWidth="4" />
            <circle className="ob-rg" cx="50" cy="50" r="42" fill="none" stroke="var(--ob-ac)" strokeWidth="4" strokeLinecap="round" pathLength={100} strokeDasharray={`${score} 100`} transform="rotate(-90 50 50)" />
          </svg>
          <div className="absolute inset-0 grid place-items-center content-center text-center">
            <div className="text-[44px] font-medium tracking-[-0.04em] leading-none">
              <span className="ob-cnt" style={{ ["--t" as string]: score }} />
              <span className="text-xl ob-tx3">%</span>
            </div>
            <div className="ob-lb mt-1.5">match</div>
          </div>
        </div>
        <div className="flex-[1_1_320px] min-w-0">
          <div className="ob-lb ob-txa">Verdict</div>
          <p className="text-[17px] leading-[1.6] mt-2.5 mb-0 max-w-[56ch] tracking-[-0.01em]">{analysis.executiveVerdict}</p>
        </div>
        <div className="flex-[1_1_280px] grid gap-3.5 text-[13px]">
          {fits.map((f, i) => (
            <div key={f.l} className="grid grid-cols-[110px_1fr_28px] gap-3 items-center">
              <span className="ob-tx2">{f.l}</span>
              <div className="ob-bar"><i style={{ width: `${Math.min(100, f.v)}%`, ["--i" as string]: i + 1, background: f.v < 70 ? "var(--ob-wn)" : undefined }} /></div>
              <span className="ob-mo">{f.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="ob-rise mt-5" style={{ ["--i" as string]: 5 }}>
        <Segmented
          label="Analysis sections"
          value={tab}
          onChange={setTab}
          options={[
            { id: "technical", label: "Technical alignment" },
            { id: "quality", label: "Resume quality" },
          ]}
        />
      </div>

      {tab === "technical" && (
        <>
      {/* Requirement graph */}
      {graphRows.length > 0 && (
        <div className="ob-card ob-rise mt-4 !px-[22px] !pt-[22px] !pb-3 hover:!translate-y-0" style={{ ["--i" as string]: 5 }}>
          <div className="flex justify-between flex-wrap gap-2">
            <span className="ob-lb">Requirement graph</span>
            <span className="ob-mo text-[11.5px] ob-tx3"><span className="ob-txa">━</span> evidenced &nbsp;<span style={{ color: "var(--ob-wn)" }}>┅</span> unsupported</span>
          </div>
          {/* Hovering a requirement brightens its link and its evidence, and quiets the rest. */}
          <svg viewBox={`0 0 760 ${svgH}`} width="100%" className="block mt-2" role="img" aria-label={`${evidenced.length} requirements linked to resume evidence, ${unsupported.length} with no evidence`} onMouseLeave={() => setHoverRow(null)}>
            {graphRows.map((m, i) => {
              const y = 30 + i * rowH;
              const boxIdx = evidenceBoxes.indexOf(m.sourceProject || "Skills section");
              const by = 30 + Math.max(0, boxIdx) * 60;
              const fade = { opacity: hoverRow === null || hoverRow === i ? 1 : 0.22, transition: "opacity 0.35s var(--ob-ease)" };
              return m.matched ? (
                <g key={`l${i}`} style={fade}>
                  <path className="ob-lk" pathLength={1} style={{ ["--i" as string]: i }} d={`M210 ${y}C340 ${y} 380 ${by} 520 ${by}`} fill="none" stroke="var(--ob-ac)" strokeOpacity={hoverRow === i ? 1 : 0.55} strokeWidth={hoverRow === i ? 1.6 : 1.2} />
                </g>
              ) : (
                <path key={`l${i}`} style={fade} d={`M210 ${y}L330 ${y}`} fill="none" stroke="var(--ob-wn)" strokeWidth="1.2" strokeDasharray="3 3" />
              );
            })}
            <g fontFamily="Inter,sans-serif" fontSize="13">
              {graphRows.map((m, i) => {
                const y = 30 + i * rowH;
                return (
                  <g key={`n${i}`} onMouseEnter={() => setHoverRow(i)} style={{ opacity: hoverRow === null || hoverRow === i ? 1 : 0.35, transition: "opacity 0.35s var(--ob-ease)" }}>
                    <rect x="0" y={y - rowH / 2} width={m.matched ? 215 : 430} height={rowH} fill="transparent" />
                    <circle cx="198" cy={y} r="5" fill={m.matched ? "var(--ob-ac)" : "var(--ob-bg1)"} stroke={m.matched ? undefined : "var(--ob-wn)"} strokeDasharray={m.matched ? undefined : "2 2"} />
                    <text x="184" y={y + 4} textAnchor="end" fill={m.matched ? "var(--ob-tx)" : "var(--ob-wn)"}>{m.skill.length > 22 ? m.skill.slice(0, 21) + "…" : m.skill}</text>
                    {!m.matched && <text x="336" y={y + 4} fontFamily="JetBrains Mono,monospace" fontSize="11" fill="var(--ob-wn)">no evidence</text>}
                  </g>
                );
              })}
              {evidenceBoxes.map((label, i) => {
                const hovered = hoverRow !== null ? graphRows[hoverRow] : null;
                const lit = !hovered || (hovered.matched && (hovered.sourceProject || "Skills section") === label);
                return (
                <g key={label} style={{ opacity: lit ? 1 : 0.3, transition: "opacity 0.35s var(--ob-ease)" }}>
                  <rect x="520" y={12 + i * 60} width="220" height="36" rx="8" fill="var(--ob-card)" stroke="var(--ob-ln2)" />
                  <text x="534" y={35 + i * 60} fill="var(--ob-tx)">{label.length > 28 ? label.slice(0, 27) + "…" : label}</text>
                </g>
                );
              })}
            </g>
          </svg>
        </div>
      )}

      {/* Gaps + alignments */}
      <div className="grid gap-4 mt-4 grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))]">
        <div className="ob-card ob-rise hover:!translate-y-0" style={{ ["--i" as string]: 6 }}>
          <div className="flex justify-between items-baseline">
            <span className="ob-lb">Gaps to close</span>
            <span className="ob-mo text-[11.5px] ob-tx3">{analysis.gaps.length}</span>
          </div>
          {analysis.gaps.length ? (
            <div className="mt-2">
              {analysis.gaps.map((g, i) => (
                <div key={i} className="ob-pop py-3.5 border-t border-ob-ln first:border-t-0" style={{ ["--i" as string]: i * 3 + 14 }}>
                  <div className="flex justify-between items-start gap-3">
                    <span className="text-[14.5px]">{g.jdRequirement}</span>
                    <span className={`ob-chip ob-sq shrink-0 ${sevCls(g.severity)}`}>{g.severity}</span>
                  </div>
                  <p className="mt-1.5 mb-0 ob-tx2 text-[13px]">{g.recommendation}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 ob-tx2 text-[13.5px]">No critical gaps found. Your resume addresses every required competency.</div>
          )}
        </div>

        <div className="ob-card ob-rise hover:!translate-y-0" style={{ ["--i" as string]: 7 }}>
          <div className="flex justify-between items-baseline">
            <span className="ob-lb">Strong alignment</span>
            <span className="ob-mo text-[11.5px] ob-tx3">{analysis.strongMatches.length}</span>
          </div>
          <div className="mt-2">
            {analysis.strongMatches.length === 0 && <div className="mt-3 ob-tx3 text-[13px]">No strong matches found yet.</div>}
            {analysis.strongMatches.map((h, i) => (
              <div key={i} className="ob-pop py-3.5 border-t border-ob-ln first:border-t-0" style={{ ["--i" as string]: i * 3 + 14 }}>
                <div className="flex justify-between items-start gap-3">
                  <span className="text-[14.5px]">{h.jdRequirement}</span>
                  <span className="ob-chip ob-sq ob-ok shrink-0">{h.strength}</span>
                </div>
                <p className="mt-1.5 mb-0 ob-tx2 text-[13px]">{h.resumeEvidence}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
        </>
      )}

      {tab === "quality" && <QualityPanel quality={analysis.resumeQuality} />}
    </div>
  );
}
