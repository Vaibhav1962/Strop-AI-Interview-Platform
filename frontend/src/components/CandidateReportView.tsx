import { useState, useRef, useEffect, useMemo } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Button, Badge } from "./ui";
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
    <div className="rounded-2xl p-6 bg-[#161614] border border-white/10 shadow-sm lg:sticky lg:top-4">
      <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
      <p className="text-xs text-[#aaa89f] mt-0.5 mb-3">{subtitle}</p>
      {data.length >= 3 ? (
        <>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="68%" data={data}>
                <PolarGrid stroke="#374151" strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="dimension" tick={{ fill: "#b4b2a9", fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 4]} tickCount={5} stroke="#4b5563" tick={{ fontSize: 9, fill: "#6f6d66" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46", borderRadius: "0.5rem", fontSize: "11px", color: "#fff" }}
                  formatter={(v: any) => [`${v} / 4 · ${LEVEL_WORDS[Math.round(Number(v))] || ""}`, "Level"]}
                />
                <Radar name="Level" dataKey="level" stroke="#e6dfcc" fill="#e6dfcc" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <ul className="list-none m-0 mt-2 p-0 grid gap-1.5">
            {data.map((d) => (
              <li key={d.dimension} className="flex items-center justify-between gap-3 text-[12.5px]">
                <span className="text-[#d3d1c9]">{d.dimension}</span>
                <span className="flex items-center gap-2">
                  <span className="flex gap-[3px]" aria-hidden="true">
                    {[1, 2, 3, 4].map((n) => (
                      <i key={n} className={`block w-3.5 h-1.5 rounded-sm ${n <= d.level ? "bg-[#e6dfcc]" : "bg-white/10"}`} />
                    ))}
                  </span>
                  <span className="font-mono text-[11px] text-[#8f8d85] w-[72px] text-right">{LEVEL_WORDS[Math.round(d.level)]}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="h-48 grid place-items-center text-center text-xs text-[#8f8d85] px-6">{emptyNote}</div>
      )}
    </div>
  );
}

function ScrollSection({ dot, title, children }: { dot: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dot}`} />
        <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Example({ quote, tone }: { quote: string; tone: "good" | "bad" }) {
  return (
    <div className={`mt-2 border-l-2 pl-3 py-0.5 text-[12px] italic leading-relaxed ${tone === "good" ? "border-emerald-500/50 text-emerald-300/80" : "border-amber-500/50 text-amber-300/80"}`}>
      <span className="not-italic font-mono text-[10px] uppercase tracking-wider opacity-70 mr-1.5">Example</span>
      "{quote}"
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-xs text-[#8f8d85]">{children}</p>;
}

const CARD_TONES = {
  emerald: { box: "bg-emerald-500/[0.04] border-emerald-500/20", title: "text-emerald-400", quote: "good" as const },
  amber: { box: "bg-amber-500/[0.04] border-amber-500/20", title: "text-amber-400", quote: "bad" as const },
  blue: { box: "bg-blue-500/[0.04] border-blue-500/20", title: "text-blue-400", quote: "good" as const },
};

/** One card design for every feedback item, so the three sections read as a single list. */
function FeedbackCard({
  tone,
  title,
  body,
  chip,
  quote,
  note,
  action,
}: {
  tone: keyof typeof CARD_TONES;
  title: string;
  body?: string;
  chip?: string;
  quote?: string;
  note?: string;
  action?: React.ReactNode;
}) {
  const t = CARD_TONES[tone];
  const norm = (x?: string) => (x || "").toLowerCase().replace(/\W+/g, " ").trim();
  const duplicate = !body || norm(body) === norm(title) || norm(body).startsWith(norm(title));
  return (
    <div className={`p-4 rounded-xl border ${t.box}`}>
      <div className="flex items-start justify-between gap-3">
        <div className={`text-[13px] leading-snug ${duplicate ? "text-[#d3d1c9]" : `font-bold ${t.title}`}`}>{duplicate ? body || title : title}</div>
        {chip && <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 text-[#aaa89f] border border-white/10">{chip}</span>}
      </div>
      {!duplicate && <p className="m-0 mt-1.5 text-[13px] text-[#d3d1c9] leading-relaxed">{body}</p>}
      {quote && <Example quote={quote} tone={t.quote} />}
      {note && <p className="m-0 mt-1.5 text-[12px] text-[#8f8d85] leading-relaxed">What this shows: {note}</p>}
      {action && <div className="mt-2.5">{action}</div>}
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
  const handleJumpToTurn = (turnIndex?: number, timeStr?: string) => {
    setActiveTab("transcript");
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
    <div className="w-full max-w-[1400px] mx-auto flex flex-col gap-6 font-sans text-[#ebe9e2] pb-16">
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {data.track}
            </span>
            <span className="text-xs text-[#aaa89f]">
              {data.date} · {data.formattedDuration}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
            Interview Assessment Report
          </h1>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {session?.id && onDownloadPdf && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePdfClick}
              disabled={isDownloadingPdf}
              className="text-xs flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>{isDownloadingPdf ? "Exporting..." : "Export PDF"}</span>
            </Button>
          )}


          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#aaa89f] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Close Report"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Tab Switcher: Technical vs Communication ── */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#161614] border border-white/10">
        <button
          onClick={() => setActiveTab("technical")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "technical"
              ? "bg-[#e6dfcc] text-[#121211]"
              : "text-[#aaa89f] hover:text-white hover:bg-white/5"
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <span>Technical Assessment</span>
        </button>

        <button
          onClick={() => setActiveTab("communication")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "communication"
              ? "bg-[#e6dfcc] text-[#121211]"
              : "text-[#aaa89f] hover:text-white hover:bg-white/5"
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Communication & Delivery</span>
        </button>

        <button
          onClick={() => setActiveTab("transcript")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "transcript"
              ? "bg-[#e6dfcc] text-[#121211]"
              : "text-[#aaa89f] hover:text-white hover:bg-white/5"
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="14" y2="18" />
          </svg>
          <span>Transcript ({data.transcript.length})</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: TECHNICAL ASSESSMENT                                            */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab !== "transcript" && tooShort && (
        <div className="rounded-2xl bg-[#161614] border border-white/10 p-8 sm:p-10 text-center space-y-3">
          <div className="mx-auto w-11 h-11 rounded-full border border-white/15 grid place-items-center text-[#aaa89f] text-lg">i</div>
          <h2 className="text-xl font-heading font-semibold text-white">Not enough interview to assess</h2>
          <p className="text-sm text-[#aaa89f] max-w-[56ch] mx-auto">{tooShortReason}</p>
          <p className="text-xs text-[#8f8d85] max-w-[56ch] mx-auto">
            No skill ratings were given, so nothing here is guessed. Run a longer session and you will get the full report.
          </p>
        </div>
      )}

      {activeTab === "technical" && !tooShort && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left: scrolling feedback */}
            <div className="lg:col-span-7 rounded-2xl bg-[#161614] border border-white/10 shadow-sm overflow-hidden">
              <div className="max-h-[720px] overflow-y-auto overflow-x-hidden p-6 space-y-8">
                <ScrollSection dot="bg-emerald-500" title="What went well">
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
                          <button type="button" onClick={() => handleJumpToTurn(st.turnIndex, st.timestamp)} className="font-mono text-[10.5px] text-emerald-400 cursor-pointer bg-transparent border-0 p-0 hover:underline">
                            {st.timestamp || "Evidence"} →
                          </button>
                        ) : undefined
                      }
                    />
                  ))}
                </ScrollSection>

                <ScrollSection dot="bg-amber-500" title="What didn't go as well">
                  {data.improvements.length === 0 && <EmptyNote>No major gaps were recorded for this session.</EmptyNote>}
                  {data.improvements.map((imp, idx) => (
                    <FeedbackCard
                      key={idx}
                      tone="amber"
                      title={imp.title}
                      body={imp.struggle}
                      quote={imp.quote ? imp.quote.slice(0, 190) : undefined}
                      note={imp.evidenceNote}
                      action={
                        imp.quote ? (
                          <button type="button" onClick={() => handleJumpToTurn(imp.turnIndex, imp.timestamp)} className="font-mono text-[10.5px] text-amber-400 cursor-pointer bg-transparent border-0 p-0 hover:underline">
                            {imp.timestamp || "Evidence"} →
                          </button>
                        ) : undefined
                      }
                    />
                  ))}
                </ScrollSection>

                <ScrollSection dot="bg-blue-500" title="Key improvements">
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
          <div className="rounded-2xl border border-white/10 bg-[#161614] overflow-hidden shadow-sm">
            <button
              onClick={() => setShowDeepEvidence((prev) => !prev)}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <div>
                  <span className="text-xs sm:text-sm font-bold text-white block">
                    Detailed Scoring Criteria & Evidence
                  </span>
                  <span className="text-xs text-[#aaa89f] block mt-0.5">
                    Inspect specific competency indicators, transcript quotations, and observations
                  </span>
                </div>
              </div>
              <svg
                className={`w-4 h-4 text-[#aaa89f] transition-transform duration-200 ${showDeepEvidence ? "rotate-180" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showDeepEvidence && (
              <div className="p-5 sm:p-6 border-t border-white/10 space-y-4">
                <div className="space-y-3">
                  {data.dimensions.map((dim) => (
                    <div key={dim.id} className="p-4 rounded-xl border border-white/10 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-bold text-white">
                          {dim.name}
                        </span>
                        <span className="text-xs font-mono text-blue-400">
                          {dim.levelLabel}
                        </span>
                      </div>

                      <p className="text-xs text-[#d3d1c9] leading-relaxed bg-white/[0.02] p-3 rounded-lg border border-white/5">
                        {dim.observation}
                      </p>

                      {dim.quotes.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-mono uppercase text-[#aaa89f]">
                            Transcript Evidence Quotes:
                          </span>
                          {dim.quotes.map((q, qi) => (
                            <div
                              key={qi}
                              onClick={() => handleJumpToTurn(q.turnIndex, q.timestamp)}
                              className="p-2.5 rounded-lg bg-indigo-50/50 bg-white/[0.02] border-l-2 border-indigo-500 text-xs cursor-pointer hover:bg-indigo-50 hover:bg-white/[0.05] transition-colors"
                            >
                              <div className="italic text-[#d3d1c9]">
                                "{q.quote}"
                              </div>
                              <div className="text-[10px] text-blue-400 mt-1 flex items-center justify-between">
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
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-[#aaa89f] space-y-1">
                    <span className="font-mono text-[10px] uppercase font-bold text-[#aaa89f] block">
                      Evaluation Scope & Limitations:
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-7 rounded-2xl bg-[#161614] border border-white/10 shadow-sm overflow-hidden">
              <div className="max-h-[720px] overflow-y-auto overflow-x-hidden p-6 space-y-8">
                <ScrollSection dot="bg-emerald-500" title="What went well">
                  {(data.communication.wentWell || []).length === 0 && <EmptyNote>No clear communication strengths were recorded.</EmptyNote>}
                  {(data.communication.wentWell || []).map((w, idx) => (
                    <FeedbackCard key={idx} tone="emerald" title={w.title} body={w.detail} quote={w.quote} />
                  ))}
                </ScrollSection>

                <ScrollSection dot="bg-amber-500" title="What didn't go as well">
                  {(data.communication.needsWork || []).length === 0 && <EmptyNote>No communication problems stood out.</EmptyNote>}
                  {(data.communication.needsWork || []).map((w, idx) => (
                    <FeedbackCard key={idx} tone="amber" title={w.title} body={w.detail} quote={w.quote} />
                  ))}
                </ScrollSection>

                <ScrollSection dot="bg-blue-500" title="Advice">
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
        <div className="rounded-2xl border border-white/10 bg-[#161614] p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-white/5">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
                <span>Synchronized Audio & Chronological Transcript</span>
              </h3>
              <p className="text-xs text-[#aaa89f] mt-0.5">
                Click any dialogue line to seek audio and follow along
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSpeakerFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  speakerFilter === "all"
                    ? "bg-blue-600 text-[#0d0d0c]"
                    : "text-[#aaa89f] hover:bg-white/5"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSpeakerFilter("Candidate")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  speakerFilter === "Candidate"
                    ? "bg-blue-600 text-[#0d0d0c]"
                    : "text-[#aaa89f] hover:bg-white/5"
                }`}
              >
                Candidate
              </button>
              <button
                onClick={() => setSpeakerFilter("Alex")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  speakerFilter === "Alex"
                    ? "bg-blue-600 text-[#0d0d0c]"
                    : "text-[#aaa89f] hover:bg-white/5"
                }`}
              >
                Alex
              </button>
            </div>
          </div>

          {/* Audio Player or Transcript Navigation */}
          {session?.audio_url ? (
            <div className="p-4 rounded-2xl apple-glass flex flex-col gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTogglePlay}
                  className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-[#0d0d0c] flex items-center justify-center shrink-0 shadow-md shadow-blue-600/30 cursor-pointer transition-transform active:scale-95"
                >
                  {isPlaying ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={() => handleSeek(currentTime - 10)}
                  className="text-xs font-mono px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#aaa89f] cursor-pointer"
                  title="Back 10s"
                >
                  -10s
                </button>

                <div className="flex-1 flex items-center gap-2">
                  <span className="text-xs font-mono text-[#aaa89f] w-10 text-right">
                    {formatSeconds(currentTime)}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max={totalDuration}
                    value={currentTime}
                    onChange={(e) => handleSeek(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-xs font-mono text-[#aaa89f] w-10">
                    {formatSeconds(totalDuration)}
                  </span>
                </div>

                <button
                  onClick={() => handleSeek(currentTime + 10)}
                  className="text-xs font-mono px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#aaa89f] cursor-pointer"
                  title="Forward 10s"
                >
                  +10s
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl apple-glass flex items-center justify-between gap-3 text-xs text-[#aaa89f] shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="font-medium text-[#d3d1c9]">Interactive Transcript Navigator</span>
                <span className="hidden sm:inline text-[#aaa89f]">· Click any turn or quote citation to inspect evidence</span>
              </div>
              <span className="text-[11px] font-mono text-[#aaa89f] shrink-0">
                {(initialTranscript?.length || 0)} turns recorded
              </span>
            </div>
          )}

          {/* Transcript Search Bar */}
          <div>
            <input
              type="text"
              placeholder="Search transcript..."
              value={transcriptSearch}
              onChange={(e) => setTranscriptSearch(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#20201e] border border-white/10 text-xs placeholder:text-[#475569] focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Scrollable Dialogue List */}
          <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1">
            {filteredTranscript.map((t, idx) => {
              const isCandidate = t.speaker === "Candidate";
              const isHighlighted = activeTurnHighlight !== null && t.turnIndex === activeTurnHighlight;

              return (
                <div
                  key={idx}
                  ref={(el) => {
                    if (t.turnIndex !== undefined) {
                      transcriptItemRefs.current[t.turnIndex] = el;
                    }
                  }}
                  onClick={() => handleJumpToTurn(t.turnIndex, t.time)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isHighlighted
                      ? "bg-blue-500/10 border-blue-500 ring-1 ring-blue-500/40"
                      : isCandidate
                      ? "bg-[#20201e] border-white/5 hover:border-blue-500/30"
                      : "bg-blue-50/40 bg-blue-950/20 border-blue-100 border-blue-900/30 hover:border-blue-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          isCandidate
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-blue-500/10 text-blue-700 text-blue-400"
                        }`}
                      >
                        {isCandidate ? "Candidate" : "Alex (Interviewer)"}
                      </span>
                      {t.turnIndex !== undefined && (
                        <span className="text-[10px] font-mono text-[#8f8d85]">
                          Turn {t.turnIndex}
                        </span>
                      )}
                    </div>

                    {t.time && (
                      <span className="text-[11px] font-mono text-[#aaa89f] hover:text-blue-500">
                        {t.time}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#2a2c38] text-[#d3d1c9] leading-relaxed font-sans">
                    {t.text}
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
