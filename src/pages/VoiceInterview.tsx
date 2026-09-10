import { useState, useEffect, useRef } from "react";
import { Button, Badge, LiveBadge } from "../components/ui";

type IState = "ai-speaking" | "listening" | "candidate-speaking" | "processing" | "completed";

const questions = [
  { id: 1, text: "Walk me through how you'd design the payment processing core for a system handling 100M transactions per day.", topic: "System Design", type: "Main Question" },
  { id: 2, text: "That 99.99% uptime figure — how did you actually achieve that at Razorpay? What was the hardest part operationally?", topic: "Resume Claim Verify", type: "Claim Verification" },
  { id: 3, text: "You mentioned the saga pattern — what specifically happens when the third service in a chain fails midway through a transaction?", topic: "Distributed Systems", type: "Deeper Follow-Up" },
  { id: 4, text: "If you had to choose between FoundationDB and PostgreSQL sharded manually for this use case, what drives that decision?", topic: "JD Gap Area", type: "Gap Exploration" },
];

const transcript = [
  { speaker: "AI", text: "Walk me through how you'd design the payment processing core for a system handling 100M transactions per day.", time: "0:00" },
  { speaker: "You", text: "So for a system at that scale I'd start with the write path... we use idempotency keys to handle retries... at Razorpay we handled about 2M transactions per day and the main bottleneck was actually the database write path, not the API layer.", time: "0:22" },
  { speaker: "You", text: "I'd shard the transactions table by merchant_id, use Kafka as the event bus between the payment gateway and ledger, and implement the saga pattern for cross-service consistency.", time: "0:48" },
  { speaker: "AI", text: "That 99.99% uptime figure — how did you actually achieve that at Razorpay? What was the hardest part operationally?", time: "1:20" },
];

function WaveBar({ delay }: { delay: number }) {
  return (
    <div
      className="wave-bar"
      style={{
        animationDelay: `${delay}s`,
        animationDuration: `${0.7 + Math.random() * 0.6}s`,
      }}
    />
  );
}

export default function VoiceInterview({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [state, setState] = useState<IState>("ai-speaking");
  const [qIdx, setQIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [adaptTag, setAdaptTag] = useState<string | null>(null);
  const txRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (txRef.current) txRef.current.scrollTop = txRef.current.scrollHeight;
  }, [showTranscript]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const next = () => {
    if (qIdx < questions.length - 1) {
      setState("processing");
      setTimeout(() => {
        setQIdx((n) => n + 1);
        setState("ai-speaking");
        const nq = questions[qIdx + 1];
        setAdaptTag(nq.type !== "Main Question" ? nq.type : null);
      }, 1600);
    } else setState("completed");
  };

  const q = questions[Math.min(qIdx, questions.length - 1)];

  const ringColor =
    state === "ai-speaking" ? "#818cf8" :
    state === "candidate-speaking" ? "#34d399" :
    state === "processing" ? "#fbbf24" : "#818cf8";

  if (state === "completed") {
    return (
      <div className="h-full flex items-center justify-center bg-[#0c0d13] relative overflow-hidden z-10">
        <div className="flex flex-col items-center text-center gap-6 max-w-md relative z-10 anim-scale-in p-8">
          <div className="w-24 h-24 rounded-[26px] bg-[rgba(52,211,153,0.12)] border border-[rgba(52,211,153,0.25)] flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <div>
            <h2 className="text-4xl font-heading font-bold text-white mb-2">Interview Complete</h2>
            <p className="text-[#9a9ca8]">{questions.length} questions · {fmt(elapsed)}</p>
          </div>
          <div className="glass-panel rounded-[22px] p-4 w-full border border-[rgba(251,191,36,0.2)]">
            <div className="flex items-center gap-2 text-[#fbbf24] text-sm font-semibold mb-2">
              <div className="w-2 h-2 rounded-full bg-[#fbbf24]" style={{ animation: "pulse-dot 1s ease infinite" }} />
              Analyzing your responses…
            </div>
            <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#fbbf24] to-[#f97316] rounded-full w-3/5" style={{ animation: "shimmer-move 1.5s ease-in-out infinite" }} />
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <Button variant="glow" size="lg" className="w-full" onClick={() => onNavigate("interview-report")}>View Full Report</Button>
            <Button variant="secondary" onClick={() => onNavigate("interview-setup")}>Start Another Session</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-[#0c0d13] relative overflow-hidden text-[#f5f6fa] z-10">
      <div className="flex-1 flex flex-col relative z-10">
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#1e2029]">
          <div className="flex items-center gap-3">
            <LiveBadge label="RECORDING · LIVE" />
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-heading font-bold text-white uppercase">Staff Technical Round</span>
              <span className="text-[#4b5060]">/</span>
              <span className="text-xs text-[#9a9ca8]">Stripe Payments Core Calibration</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#9a9ca8]">
            <span>QUESTION {Math.min(qIdx + 1, questions.length)} / {questions.length}</span>
            <span className="text-white font-bold bg-[#1a1b24] border border-[#232430] px-3 py-1 rounded-lg">{fmt(elapsed)}</span>
            <Button variant="secondary" size="xs" onClick={() => setShowTranscript((v) => !v)}>
              {showTranscript ? "Hide Transcript" : "Live Transcript"}
            </Button>
            <Button variant="danger" size="xs" onClick={() => setConfirmEnd(true)}>End Round</Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-10 gap-8">
          {adaptTag && (
            <div className="px-5 py-2 rounded-full bg-[#151622] border border-[rgba(34,211,238,0.25)] text-[#67e8f9] text-xs font-semibold anim-fade-up">
              {adaptTag} — adapting to your response
            </div>
          )}

          <div className="relative flex items-center justify-center">
            {state === "ai-speaking" && (
              <>
                <div className="absolute w-[190px] h-[190px] rounded-full border border-[rgba(129,140,248,0.4)]" style={{ animation: "ping-ring 2s ease-in-out infinite" }} />
                <div className="absolute w-[160px] h-[160px] rounded-full border border-[rgba(129,140,248,0.4)]" style={{ animation: "ping-ring 2s ease-in-out infinite", animationDelay: "0.5s" }} />
              </>
            )}
            {state === "candidate-speaking" && (
              <div className="absolute w-44 h-44 rounded-full border border-[rgba(52,211,153,0.35)]" style={{ animation: "ping-ring 1.5s ease-in-out infinite" }} />
            )}

            <div
              className="relative w-32 h-32 rounded-full flex flex-col items-center justify-center gap-2 transition-all duration-500"
              style={{
                border: `2px solid ${ringColor}66`,
                boxShadow: `0 0 60px ${ringColor}55`,
                background: `radial-gradient(circle, ${ringColor}24 0%, transparent 70%)`,
              }}
            >
              {(state === "ai-speaking" || state === "candidate-speaking") ? (
                <div className="flex items-end gap-0.5" style={{ color: ringColor, height: 32 }}>
                  {Array.from({ length: 6 }, (_, i) => (
                    <WaveBar key={i} delay={i * 0.08} />
                  ))}
                </div>
              ) : state === "processing" ? (
                <div className="w-8 h-8">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={ringColor} strokeWidth="1.5" style={{ animation: "spin 1s linear infinite" }}>
                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                </div>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={ringColor} strokeWidth="1.5">
                  <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3" />
                </svg>
              )}
            </div>
          </div>

          <div className="glass-panel-glow max-w-2xl w-full p-7 rounded-[26px] anim-scale-in relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-[#818cf8] bg-[#1a1c2e] border border-[rgba(129,140,248,0.3)] px-2 py-0.5 rounded-md">
                  QUESTION {Math.min(qIdx + 1, questions.length)}
                </span>
                <Badge variant="indigo">{q.topic}</Badge>
                {q.type !== "Main Question" && <Badge variant="cyan">{q.type}</Badge>}
              </div>
              <span className="text-[10px] text-[#6b7280] font-heading">EVALUATION IN PROGRESS</span>
            </div>
            <p className="text-lg sm:text-xl font-semibold text-white leading-relaxed">{q.text}</p>
          </div>

          <div className="flex items-center gap-5">
            <button
              onClick={() => setMuted((m) => !m)}
              className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                muted
                  ? "bg-[rgba(244,63,94,0.15)] border border-[rgba(244,63,94,0.35)] text-[#fb7185]"
                  : "bg-[#151622] border border-[#232430] text-[#9a9ca8] hover:text-white"
              }`}
            >
              {muted ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 1l22 22M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 20v4M8 24h8" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
                </svg>
              )}
            </button>

            <Button
              variant="glow"
              size="lg"
              onClick={next}
              disabled={state === "processing"}
              className="px-9"
            >
              {state === "processing" ? "Generating next question…" :
               qIdx < questions.length - 1 ? "Next Question →" : "Finish Interview"}
            </Button>

            <button
              onClick={() => setState(state === "candidate-speaking" ? "listening" : "candidate-speaking")}
              className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center border transition-all cursor-pointer ${
                state === "candidate-speaking"
                  ? "bg-[rgba(52,211,153,0.15)] border-[rgba(52,211,153,0.35)] text-[#34d399]"
                  : "bg-[#151622] border-[#232430] text-[#9a9ca8] hover:text-white"
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
              </svg>
            </button>
          </div>

          {muted && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[rgba(244,63,94,0.1)] border border-[rgba(244,63,94,0.2)] rounded-full text-xs text-[#fb7185] font-semibold">
              <div className="w-1.5 h-1.5 rounded-full bg-[#fb7185]" style={{ animation: "pulse-dot 1s ease infinite" }} />
              Microphone muted — your response is not being recorded
            </div>
          )}
        </div>
      </div>

      {showTranscript && (
        <div className="w-80 shrink-0 border-l border-[#1e2029] flex flex-col bg-[#0c0d13]/95 backdrop-blur-2xl">
          <div className="px-4 py-3 border-b border-[#232430] flex items-center justify-between">
            <span className="text-sm font-bold text-white">Transcript</span>
            <Badge variant="emerald" dot>Live</Badge>
          </div>
          <div ref={txRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {transcript.map((l, i) => (
              <div key={i} className={`flex flex-col gap-1 ${l.speaker === "You" ? "items-end" : ""}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold font-mono ${l.speaker === "AI" ? "text-[#818cf8]" : "text-[#34d399]"}`}>{l.speaker}</span>
                  <span className="text-xs text-[#6b7280]">{l.time}</span>
                </div>
                <div className={`text-xs leading-relaxed rounded-2xl px-3 py-2.5 max-w-60 ${
                  l.speaker === "AI" ? "bg-[#151622] text-[#9a9ca8] border border-[#232430]" : "bg-[rgba(129,140,248,0.12)] text-[#c7d2fe] border border-[rgba(129,140,248,0.2)]"
                }`}>
                  {l.text}
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5 items-end" style={{ color: "#818cf8" }}>
                {[0, 0.1, 0.2].map((d, i) => (
                  <div key={i} className="w-1.5 rounded-full bg-current" style={{ height: 4 + i * 4, animation: `wave 0.8s ease-in-out ${d}s infinite` }} />
                ))}
              </div>
              <span className="text-xs text-[#6b7280] italic">Transcribing…</span>
            </div>
          </div>
        </div>
      )}

      {confirmEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="glass-panel rounded-[26px] p-8 max-w-sm w-full anim-scale-in">
            <h3 className="text-xl font-heading font-bold text-white mb-2">End interview?</h3>
            <p className="text-sm text-[#9a9ca8] mb-6">{"You've completed"} {Math.min(qIdx + 1, questions.length)} of {questions.length} questions. Ending now will generate a partial report.</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmEnd(false)}>Continue</Button>
              <Button variant="danger" className="flex-1" onClick={() => setState("completed")}>End Now</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
