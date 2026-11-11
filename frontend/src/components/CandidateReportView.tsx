import { useState, useRef, useEffect, useMemo } from "react";
import { Segmented } from "./ui";
import SkillRadar from "./SkillRadar";
import {
  normalizeReportForCandidate,
  type NormalizedCandidateReport,
  type CandidateReportDimension,
} from "../lib/reportNormalizer";

interface CandidateReportViewProps {
  report: any;
  session?: {
    id: string;
    track?: string;
    title?: string;
    date?: string;
    formattedDuration?: string;
    duration_seconds?: number;
    audio_url?: string;
    startedAt?: string;
  };
  transcript?: any[];
  onClose?: () => void;
  onNavigate?: (page: string) => void;
  onDownloadPdf?: (sessionId: string, title?: string) => Promise<void>;
}

type RadarPoint = { dimension: string; level: number; fullMark: number };

const LEVEL_WORDS = ["", "Developing", "Working", "Fluent", "Expert"];

function RadarPanel({ title, subtitle, data, emptyNote }: { title: string; subtitle: string; data: RadarPoint[]; emptyNote: string }) {
  return (
    <div className="rounded-[14px] p-6 bg-ob-bg2 border border-ob-ln lg:sticky lg:top-4">
      <div className="ob-lb">{title}</div>
      <p className="text-[12.5px] text-ob-tx3 mt-1.5 mb-2">{subtitle}</p>
      {data.length >= 3 ? (
        <>
          <SkillRadar data={data} />
          <ul className="list-none m-0 mt-3 p-0">
            {data.map((d, i) => (
              <li key={d.dimension} className="ob-pop flex items-center justify-between gap-3 py-2 border-t border-ob-ln text-[12.5px]" style={{ ["--i" as string]: i + 8 }}>
                <span className="text-ob-soft min-w-0 truncate">{d.dimension}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="flex gap-[3px]" aria-hidden="true">
                    {[1, 2, 3, 4].map((n) => (
                      <i key={n} className={`block w-3.5 h-[3px] rounded-sm ${n <= d.level ? (d.level <= 1 ? "bg-ob-hot" : "bg-ob-ac") : "bg-ob-ln"}`} />
                    ))}
                  </span>
                  <span className="font-mono text-[11px] text-ob-tx3 w-[72px] text-right">{LEVEL_WORDS[Math.round(d.level)]}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="h-48 grid place-items-center text-center text-[12.5px] text-ob-tx3 px-6">{emptyNote}</div>
      )}
    </div>
  );
}

function ScrollSection({ dot, title, children }: { dot: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="w-[7px] h-[7px] rounded-full" style={{ background: dot }} />
        <h2 className="m-0 ob-lb">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Example({ quote }: { quote: string }) {
  return (
    <div className="mt-3 border-l-2 border-ob-ln3 pl-3 text-[12.5px] italic leading-relaxed text-ob-tx2">
      <span className="not-italic font-mono text-[11px] uppercase tracking-[0.12em] text-ob-tx3 mr-2">Example</span>
      "{quote}"
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-[12.5px] text-ob-tx3">{children}</p>;
}

const TONE = { ok: "var(--ob-ok)", warn: "var(--ob-wn)", accent: "var(--ob-ac)" } as const;
const CARD_TONES = { emerald: TONE.ok, amber: TONE.warn, blue: TONE.accent };

/** One card design for every feedback item, so the three sections read as a single list. */
function FeedbackCard({
  tone,
  title,
  body,
  chip,
  quote,
  note,
  why,
  better,
  action,
}: {
  tone: keyof typeof CARD_TONES;
  title: string;
  body?: string;
  chip?: string;
  quote?: string;
  note?: string;
  /** Only rendered when the evaluator supplied it. */
  why?: string;
  better?: string;
  action?: React.ReactNode;
}) {
  const c = CARD_TONES[tone];
  const norm = (x?: string) => (x || "").toLowerCase().replace(/\W+/g, " ").trim();
  const duplicate = !body || norm(body) === norm(title) || norm(body).startsWith(norm(title));
  return (
    <div className="p-4 rounded-[12px] border border-ob-ln bg-ob-card" style={{ borderLeft: `2px solid ${c}` }}>
      <div className="flex items-start justify-between gap-3">
        <div className={`text-[14px] leading-snug ${duplicate ? "text-ob-soft" : "font-medium"}`} style={duplicate ? undefined : { color: c }}>{duplicate ? body || title : title}</div>
        {chip && <span className="ob-chip ob-sq shrink-0">{chip}</span>}
      </div>
      {!duplicate && <p className="m-0 mt-1.5 text-[13.5px] text-ob-tx2 leading-relaxed">{body}</p>}
      {quote && <Example quote={quote} />}
      {note && <p className="m-0 mt-2 text-[12px] text-ob-tx3 leading-relaxed">What this shows: {note}</p>}
      {why && <p className="m-0 mt-2 text-[12.5px] text-ob-tx2 leading-relaxed"><span className="ob-lb mr-2">Why it matters</span>{why}</p>}
      {better && <p className="m-0 mt-2 text-[12.5px] text-ob-tx2 leading-relaxed"><span className="ob-lb ob-txa mr-2">Try</span>{better}</p>}
      {action && <div className="mt-2.5">{action}</div>}
    </div>
  );
}

const BADGE_TONE: Record<string, string> = {
  emerald: "var(--ob-ok)",
  amber: "var(--ob-wn)",
  rose: "var(--ob-er)",
  indigo: "var(--ob-ac)",
  slate: "var(--ob-tx3)",
};

/** The evaluator's verdict for the whole session, with how much of the rubric the interview reached. */
function VerdictCard({ a }: { a: NormalizedCandidateReport["overallAssessment"] }) {
  const tone = BADGE_TONE[a.badgeVariant] || BADGE_TONE.slate;
  const pct = Math.max(0, Math.min(100, Math.round(a.coveragePct)));
  return (
    <div className="ob-card ob-enter !p-6 grid gap-x-10 gap-y-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-center hover:!translate-y-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="ob-lb">Overall</span>
          <span className="ob-chip ob-sq" style={{ color: tone, borderColor: `color-mix(in srgb, ${tone} 40%, transparent)` }}>{a.calibrationSignal}</span>
        </div>
        {a.summary && <p className="m-0 mt-3 text-[15px] leading-[1.65] tracking-[-0.005em] text-ob-soft max-w-[62ch]">{a.summary}</p>}
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="ob-lb">Rubric reached</span>
          <span className="ob-mo text-[11.5px] text-ob-tx3">{a.demonstratedCount} of {a.totalCompetencies} demonstrated</span>
        </div>
        <div className="text-[34px] font-medium tracking-[-0.03em] leading-none mt-3">
          <span key={pct} className="ob-cnt" style={{ ["--t" as string]: pct }} aria-hidden="true" />
          <span className="sr-only">{pct}</span>
          <span className="text-[18px] text-ob-tx3">%</span>
        </div>
        <div className="ob-bar mt-3"><i style={{ width: `${pct}%` }} /></div>
      </div>
    </div>
  );
}

/** Words, speaking time, pace and verbal tics, straight from the transcript and the backend telemetry. */
function DeliveryStrip({ c }: { c: NormalizedCandidateReport["communication"] }) {
  const t = c.telemetry;
  const hasPace = t.wpm > 0;
  const tics = Object.entries(t.fillerBreakdown || {}).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const cells: { label: string; value: React.ReactNode; sub?: React.ReactNode }[] = [
    { label: "Speaking time", value: <>{t.speakingMinutes}<span className="text-[15px] text-ob-tx3"> min</span></>, sub: "your side of the call" },
    { label: "Words", value: t.totalWords.toLocaleString(), sub: "spoken by you" },
    {
      label: "Pace",
      value: hasPace ? <>{Math.round(t.wpm)}<span className="text-[15px] text-ob-tx3"> wpm</span></> : "—",
      sub: hasPace ? t.wpmAssessment : "not enough speech to measure",
    },
    {
      label: "Fillers and tics",
      value: t.totalWords >= 40 ? t.fillerCount : "—",
      sub: tics.length ? tics.map(([w, n]) => `"${w}" ${n}x`).join(", ") : t.totalWords >= 40 ? "none stood out" : "too little speech to judge",
    },
  ];
  return (
    <div className="ob-enter grid grid-cols-2 lg:grid-cols-4 gap-px rounded-[12px] border border-ob-ln bg-ob-ln overflow-hidden">
      {cells.map((x) => (
        <div key={x.label} className="bg-ob-card px-5 py-[18px] min-w-0">
          <div className="ob-lb">{x.label}</div>
          <div className="text-[28px] font-medium tracking-[-0.03em] mt-2 leading-[1.15]">{x.value}</div>
          {x.sub && <div className="text-[12px] text-ob-tx3 mt-1.5 leading-snug">{x.sub}</div>}
        </div>
      ))}
    </div>
  );
}

export default function CandidateReportView({
  report,
  session,
  transcript: initialTranscript,
  onClose,
  onNavigate,
  onDownloadPdf,
}: CandidateReportViewProps) {
  const [activeTab, setActiveTab] = useState<"technical" | "communication" | "transcript">("technical");
  const [showDeepEvidence, setShowDeepEvidence] = useState(false);
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [speakerFilter, setSpeakerFilter] = useState<"all" | "Candidate" | "Alex">("all");
  const [activeTurnHighlight, setActiveTurnHighlight] = useState<number | null>(null);
  const [highlightQuote, setHighlightQuote] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptItemRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Normalize report data into candidate-focused architecture
  const data: NormalizedCandidateReport = useMemo(() => {
    return normalizeReportForCandidate(
      report,
      {
        track: session?.track,
        title: session?.title,
        date: session?.date,
        duration: session?.formattedDuration,
        durationSeconds: session?.duration_seconds,
        startedAt: session?.startedAt,
      },
      initialTranscript
    );
  }, [report, session, initialTranscript]);

  const tooShort = Boolean((data.rawReport as any)?.insufficient_data);
  const tooShortReason: string =
    (data.rawReport as any)?.insufficient_reason || "This session was too short to assess fairly.";

  const totalDuration = data.durationSeconds || 1200;

  // Handle seeking to a specific turn / timestamp
  const handleJumpToTurn = (turnIndex?: number, timeStr?: string, quote?: string) => {
    setActiveTab("transcript");
    setHighlightQuote(quote || null);
    if (turnIndex !== undefined) {
      setActiveTurnHighlight(turnIndex);
      setTimeout(() => {
        const el = transcriptItemRefs.current[turnIndex];
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);
    }

    if (timeStr) {
      const parts = timeStr.split(":").map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const secs = parts[0] * 60 + parts[1];
        handleSeek(secs);
      }
    }
  };

  const handleSeek = (seconds: number) => {
    const clamped = Math.max(0, Math.min(seconds, totalDuration));
    setCurrentTime(clamped);
    if (audioRef.current && session?.audio_url) {
      audioRef.current.currentTime = clamped;
    }
  };

  const handleTogglePlay = () => {
    if (session?.audio_url && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    } else {
      // Toggle simulated playback timer if audio unavailable
      setIsPlaying((prev) => !prev);
    }
  };

  useEffect(() => {
    let interval: any;
    if (isPlaying && (!session?.audio_url || !audioRef.current)) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            return totalDuration;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalDuration, session?.audio_url]);

  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handlePdfClick = async () => {
    if (!onDownloadPdf || !session?.id) return;
    try {
      setIsDownloadingPdf(true);
      await onDownloadPdf(session.id, data.title);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Filtered Transcript
  const filteredTranscript = useMemo(() => {
    return data.transcript.filter((item) => {
      if (speakerFilter !== "all" && item.speaker !== speakerFilter) return false;
      if (transcriptSearch) {
        return item.text.toLowerCase().includes(transcriptSearch.toLowerCase());
      }
      return true;
    });
  }, [data.transcript, speakerFilter, transcriptSearch]);

  return (
    <div className="w-full max-w-[1400px] mx-auto flex flex-col gap-6 font-sans text-ob-tx pb-16">
      {/* ── Hidden HTML5 Audio Element if URL Available ── */}
      {session?.audio_url && (
        <audio
          ref={audioRef}
          src={session.audio_url}
          onTimeUpdate={(e) => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* ── Top Header & Actions ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="ob-chip ob-live">{data.track}</span>
            <span className="ob-mo text-[11.5px] text-ob-tx3">
              {data.date} · {data.formattedDuration}
            </span>
          </div>
          <h1 className="m-0 mt-3 text-[clamp(24px,2.8vw,32px)] font-medium tracking-[-0.03em] leading-[1.1] text-ob-tx">
            Interview report
          </h1>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {session?.id && onDownloadPdf && (
            <button type="button" className="ob-btn ob-sm" onClick={handlePdfClick} disabled={isDownloadingPdf}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {isDownloadingPdf ? "Exporting..." : "Export PDF"}
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close report"
              className="w-8 h-8 rounded-[7px] grid place-items-center text-ob-tx3 hover:bg-ob-bg3 hover:text-ob-tx transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Section switcher ── */}
      <Segmented
        full
        label="Report sections"
        value={activeTab}
        onChange={setActiveTab}
        options={[
          { id: "technical", label: "Technical" },
          { id: "communication", label: "Communication" },
          { id: "transcript", label: <>Transcript <span className="ob-mo text-[11px] opacity-60">{data.transcript.length}</span></> },
        ]}
      />

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: TECHNICAL ASSESSMENT                                            */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab !== "transcript" && tooShort && (
        <div className="rounded-[14px] bg-ob-bg2 border border-ob-ln p-8 sm:p-10 text-center space-y-3">
          <div className="mx-auto w-11 h-11 rounded-full border border-ob-ln2 grid place-items-center text-ob-tx2 text-lg">i</div>
          <h2 className="text-xl font-medium text-ob-tx">Not enough interview to assess</h2>
          <p className="text-sm text-ob-tx2 max-w-[56ch] mx-auto">{tooShortReason}</p>
          <p className="text-xs text-ob-tx3 max-w-[56ch] mx-auto">
            No skill ratings were given, so nothing here is guessed. Run a longer session and you will get the full report.
          </p>
        </div>
      )}

      {activeTab === "technical" && !tooShort && (
        <div className="ob-enter space-y-6">
          {/* Legacy reports carry placeholder summary numbers, so the verdict is only shown for real evaluations. */}
          {data.isBars && (
            <VerdictCard
              a={{
                ...data.overallAssessment,
                // The normalizer substitutes a canned sentence when the evaluator wrote no summary; do not show that as a verdict.
                summary: (data.rawReport as any)?.executive_summary?.trim() ? data.overallAssessment.summary : "",
              }}
            />
          )}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left: scrolling feedback */}
            <div className="lg:col-span-7 rounded-[14px] bg-ob-bg2 border border-ob-ln overflow-hidden">
              <div className="max-h-[720px] overflow-y-auto overflow-x-hidden p-6 space-y-8">
                <ScrollSection dot="var(--ob-ok)" title="What went well">
                  {data.strengths.length === 0 && <EmptyNote>No standout strengths were recorded for this session.</EmptyNote>}
                  {data.strengths.map((st, idx) => (
                    <FeedbackCard
                      key={idx}
                      tone="emerald"
                      title={st.title}
                      body={st.explanation}
                      quote={st.quote ? st.quote.slice(0, 190) : undefined}
                      note={st.evidenceNote}
                      action={
                        st.quote ? (
                          <button type="button" onClick={() => handleJumpToTurn(st.turnIndex, st.timestamp, st.quote)} className="font-mono text-[11px] text-ob-ok cursor-pointer bg-transparent border-0 p-0 hover:underline">
                            {st.timestamp || "Evidence"} →
                          </button>
                        ) : undefined
                      }
                    />
                  ))}
                </ScrollSection>

                <ScrollSection dot="var(--ob-wn)" title="What didn't go as well">
                  {data.improvements.length === 0 && <EmptyNote>No major gaps were recorded for this session.</EmptyNote>}
                  {data.improvements.map((imp, idx) => (
                    <FeedbackCard
                      key={idx}
                      tone="amber"
                      title={imp.title}
                      body={imp.struggle}
                      quote={imp.quote ? imp.quote.slice(0, 190) : undefined}
                      note={imp.evidenceNote}
                      why={imp.whyItMatters || undefined}
                      better={imp.betterApproach || undefined}
                      action={
                        imp.quote ? (
                          <button type="button" onClick={() => handleJumpToTurn(imp.turnIndex, imp.timestamp, imp.quote)} className="font-mono text-[11px] text-ob-wn cursor-pointer bg-transparent border-0 p-0 hover:underline">
                            {imp.timestamp || "Evidence"} →
                          </button>
                        ) : undefined
                      }
                    />
                  ))}
                </ScrollSection>

                <ScrollSection dot="var(--ob-ac)" title="Key improvements">
                  {data.recommendations.length === 0 && <EmptyNote>No practice recommendations were generated.</EmptyNote>}
                  {data.recommendations.map((rec, idx) => (
                    <FeedbackCard
                      key={idx}
                      tone="blue"
                      title={rec.topic}
                      body={rec.practiceTask}
                      chip={rec.priority}
                    />
                  ))}
                </ScrollSection>
              </div>
            </div>

            {/* Right: radar */}
            <div className="lg:col-span-5">
              <RadarPanel
                title="Skill profile"
                subtitle={`How you did on each ${data.track} skill that came up`}
                data={data.radarData}
                emptyNote="Not enough of the interview was covered to draw a profile. Three or more skills need evidence."
              />
            </div>
          </div>

          {/* ── Progressive Disclosure Accordion: In-Depth BARS Rubrics ── */}
          <div className="rounded-[14px] border border-ob-ln bg-ob-bg2 overflow-hidden">
            <button
              onClick={() => setShowDeepEvidence((prev) => !prev)}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-ob-ov/[0.03] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-ob-ac" />
                <div>
                  <span className="text-xs sm:text-sm font-medium text-ob-tx block">
                    Detailed scoring criteria and evidence
                  </span>
                  <span className="text-xs text-ob-tx2 block mt-0.5">
                    Inspect specific competency indicators, transcript quotations, and observations
                  </span>
                </div>
              </div>
              <svg
                className={`w-4 h-4 text-ob-tx2 transition-transform duration-200 ${showDeepEvidence ? "rotate-180" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showDeepEvidence && (
              <div className="ob-enter p-5 sm:p-6 border-t border-ob-ln space-y-4">
                <div className="space-y-3">
                  {data.dimensions.map((dim) => (
                    <div key={dim.id} className="p-4 rounded-xl border border-ob-ln space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-medium text-ob-tx">
                          {dim.name}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-mono text-ob-ac">{dim.levelLabel}</span>
                          {!dim.isUnassessed && (
                            <span className="ob-chip ob-sq" style={{ color: BADGE_TONE[dim.badgeVariant] || BADGE_TONE.slate, height: 22, fontSize: 11 }}>{dim.statusBadge}</span>
                          )}
                        </span>
                      </div>

                      {dim.observation && (
                        <p className="text-xs text-ob-soft leading-relaxed bg-ob-ov/[0.02] p-3 rounded-lg border border-ob-ln">
                          {dim.observation}
                        </p>
                      )}

                      {dim.quotes.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-mono uppercase text-ob-tx2">
                            Transcript evidence
                          </span>
                          {dim.quotes.map((q, qi) => (
                            <div
                              key={qi}
                              onClick={() => handleJumpToTurn(q.turnIndex, q.timestamp, q.quote)}
                              className="p-2.5 rounded-lg bg-ob-ov/[0.02] border-l-2 border-ob-ln3 text-xs cursor-pointer hover:bg-ob-ov/[0.05] transition-colors"
                            >
                              <div className="italic text-ob-soft">
                                "{q.quote}"
                              </div>
                              <div className="text-[11px] text-ob-ac mt-1 flex items-center justify-between">
                                <span>Turn {q.turnIndex} · {q.speaker}</span>
                                <span>{q.timestamp ? `Seek ${q.timestamp}` : q.relevance} →</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {data.rawReport && (data.rawReport as any).evaluation_limitations?.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-ob-ov/[0.02] border border-ob-ln text-xs text-ob-tx2 space-y-1">
                    <span className="font-mono text-[11px] uppercase font-bold text-ob-tx2 block">
                      Evaluation scope and limitations
                    </span>
                    {(data.rawReport as any).evaluation_limitations.map((lim: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <span>•</span>
                        <span>{lim}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: COMMUNICATION & DELIVERY                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "communication" && !tooShort && (
        <div className="ob-enter space-y-6">
          <DeliveryStrip c={data.communication} />
          {/* The evaluator's own read of delivery, only when it wrote one (the normalizer otherwise fills a default). */}
          {(data.rawReport as any)?.communication_and_deliberation && (
            <div className="ob-card !p-5 hover:!translate-y-0 flex flex-wrap items-start gap-x-6 gap-y-2">
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="ob-lb">Delivery</span>
                {(data.rawReport as any)?.communication_scorecard?.overall_rating && (
                  <span className="ob-chip ob-sq">{(data.rawReport as any).communication_scorecard.overall_rating}</span>
                )}
              </div>
              <p className="m-0 flex-[1_1_360px] min-w-0 text-[14px] leading-[1.65] text-ob-soft">{(data.rawReport as any).communication_and_deliberation}</p>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-7 rounded-[14px] bg-ob-bg2 border border-ob-ln overflow-hidden">
              <div className="max-h-[720px] overflow-y-auto overflow-x-hidden p-6 space-y-8">
                <ScrollSection dot="var(--ob-ok)" title="What went well">
                  {(data.communication.wentWell || []).length === 0 && <EmptyNote>No clear communication strengths were recorded.</EmptyNote>}
                  {(data.communication.wentWell || []).map((w, idx) => (
                    <FeedbackCard key={idx} tone="emerald" title={w.title} body={w.detail} quote={w.quote} />
                  ))}
                </ScrollSection>

                <ScrollSection dot="var(--ob-wn)" title="What didn't go as well">
                  {(data.communication.needsWork || []).length === 0 && <EmptyNote>No communication problems stood out.</EmptyNote>}
                  {(data.communication.needsWork || []).map((w, idx) => (
                    <FeedbackCard key={idx} tone="amber" title={w.title} body={w.detail} quote={w.quote} />
                  ))}
                </ScrollSection>

                <ScrollSection dot="var(--ob-ac)" title="Advice">
                  {data.communication.coachingTips.map((tip, idx) => (
                    <FeedbackCard key={idx} tone="blue" title={tip} />
                  ))}
                </ScrollSection>
              </div>
            </div>

            <div className="lg:col-span-5">
              <RadarPanel
                title="Delivery profile"
                subtitle="How you came across, from your spoken answers"
                data={data.communication.radar || []}
                emptyNote="Not enough spoken answers were recorded to draw a delivery profile."
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* INTEGRATED AUDIO PLAYER & SYNCHRONIZED TRANSCRIPT DRAWER               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "transcript" && (
        <div className="ob-enter rounded-[14px] border border-ob-ln bg-ob-bg2 p-5 sm:p-6 space-y-4">
          <div className="flex items-end justify-between gap-3 flex-wrap pb-4 border-b border-ob-ln">
            <div>
              <div className="ob-lb">Transcript</div>
              <p className="m-0 text-[12.5px] text-ob-tx3 mt-1.5">
                {session?.audio_url ? "Select a line to hear it in the recording." : "Select a line to mark it. Evidence links from the report land here."}
              </p>
            </div>

            <Segmented
              quiet
              label="Filter by speaker"
              value={speakerFilter}
              onChange={setSpeakerFilter}
              options={[
                { id: "all", label: "All" },
                { id: "Candidate", label: "You" },
                { id: "Alex", label: "Alex" },
              ]}
            />
          </div>

          {/* Audio player, when a recording exists */}
          {session?.audio_url && (
            <div className="flex items-center gap-3 px-3.5 py-3 rounded-[12px] border border-ob-ln bg-ob-card">
              <button
                type="button"
                onClick={handleTogglePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="w-9 h-9 rounded-full bg-ob-ac hover:bg-ob-achi text-ob-onac grid place-items-center shrink-0 cursor-pointer transition-[background-color,transform] duration-200 active:scale-95"
              >
                {isPlaying ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 ml-0.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
              </button>

              <button type="button" onClick={() => handleSeek(currentTime - 10)} className="ob-btn ob-sm ob-mo" style={{ height: 28, padding: "0 9px" }} title="Back 10s">-10s</button>

              <div className="flex-1 flex items-center gap-2.5 min-w-0">
                <span className="ob-mo text-[11.5px] text-ob-tx2 w-10 text-right tabular-nums">{formatSeconds(currentTime)}</span>
                <input
                  type="range"
                  min="0"
                  max={totalDuration}
                  value={currentTime}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  aria-label="Seek"
                  className="flex-1 min-w-0 h-1 rounded-full appearance-none cursor-pointer"
                />
                <span className="ob-mo text-[11.5px] text-ob-tx3 w-10 tabular-nums">{formatSeconds(totalDuration)}</span>
              </div>

              <button type="button" onClick={() => handleSeek(currentTime + 10)} className="ob-btn ob-sm ob-mo" style={{ height: 28, padding: "0 9px" }} title="Forward 10s">+10s</button>
            </div>
          )}

          <input
            type="text"
            placeholder="Search transcript"
            aria-label="Search transcript"
            value={transcriptSearch}
            onChange={(e) => setTranscriptSearch(e.target.value)}
            className="ob-input"
          />

          {/* Dialogue */}
          <div className="ob-scroll max-h-[28rem] overflow-y-auto pr-1">
            {filteredTranscript.length === 0 && <div className="py-10 text-center text-[13px] text-ob-tx3">No lines match.</div>}
            {filteredTranscript.map((t, idx) => {
              const isCandidate = t.speaker === "Candidate";
              const isHighlighted = activeTurnHighlight !== null && t.turnIndex === activeTurnHighlight;
              // When an evidence link brought us here, underline the quoted words inside the turn.
              let body: React.ReactNode = t.text;
              if (isHighlighted && highlightQuote) {
                const needle = highlightQuote.replace(/[.…]+$/, "").trim().slice(0, 80).toLowerCase();
                const at = needle.length > 8 ? t.text.toLowerCase().indexOf(needle) : -1;
                if (at >= 0) {
                  body = (
                    <>
                      {t.text.slice(0, at)}
                      <span className="ob-uline text-ob-tx">{t.text.slice(at, at + needle.length)}</span>
                      {t.text.slice(at + needle.length)}
                    </>
                  );
                }
              }

              return (
                <div
                  key={idx}
                  ref={(el) => {
                    if (t.turnIndex !== undefined) {
                      transcriptItemRefs.current[t.turnIndex] = el;
                    }
                  }}
                  onClick={() => handleJumpToTurn(t.turnIndex, t.time)}
                  className={`grid grid-cols-[76px_minmax(0,1fr)] gap-4 px-3 py-4 border-t border-ob-ln first:border-t-0 rounded-[10px] cursor-pointer transition-[background-color,box-shadow] duration-500 ${
                    isHighlighted ? "bg-[rgb(var(--ob-ac-rgb)/0.07)] shadow-[inset_0_0_0_1px_rgb(var(--ob-ac-rgb)/0.26)]" : "hover:bg-[rgb(var(--ob-ac-rgb)/0.04)]"
                  }`}
                >
                  <div className="ob-mo text-[11px] uppercase tracking-[0.08em] font-medium" style={{ color: isCandidate ? "var(--ob-ac)" : "var(--ob-tx3)" }}>
                    {isCandidate ? "You" : "Alex"}
                    {t.time && <span className="block mt-1 normal-case tracking-normal font-normal text-ob-tx3">{t.time}</span>}
                  </div>
                  <p className="m-0 text-[13.5px] leading-[1.65]" style={{ color: isCandidate ? "var(--ob-tx2)" : "var(--ob-tx)" }}>
                    {body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
