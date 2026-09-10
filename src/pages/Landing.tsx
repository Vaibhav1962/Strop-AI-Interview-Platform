import { useState, useEffect } from "react";
import { Button, Modal } from "../components/ui";

type AuthMode = "none" | "login" | "signup";

const STEPS = [
  { n: "01", title: "Set your target", body: "Upload your resume and the job description. We map what the role actually needs." },
  { n: "02", title: "Practice under pressure", body: "Voice interviews with follow-ups that don't let vague answers slide." },
  { n: "03", title: "See the evidence", body: "Every score links back to the exact line you said — no black-box ratings." },
  { n: "04", title: "Close the gap", body: "A short training plan targets only what's actually holding your score back." },
];

const METHOD = [
  { tag: "Technical", tone: "blue" as const, title: "Architecture & depth", body: "Do you understand the tradeoffs, or just the buzzwords? We probe until we know." },
  { tag: "Behavioral", tone: "amber" as const, title: "Ownership & credibility", body: "Your resume claims get checked against how you actually describe the work." },
  { tag: "Verbal", tone: "emerald" as const, title: "Clarity under pressure", body: "Pace, hedging, and how well you land an answer when the clock is running." },
];

const tagCls: Record<string, string> = {
  blue: "bg-[rgba(59,130,246,0.16)] text-[#93c5fd]",
  amber: "bg-[rgba(251,191,36,0.16)] text-[#fcd34d]",
  emerald: "bg-[rgba(52,211,153,0.16)] text-[#6ee7b7]",
};

export default function Landing({ onEnter }: { onEnter: () => void }) {
  const [authModal, setAuthModal] = useState<AuthMode>("none");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);
  const [mx, setMx] = useState(0);
  const [my, setMy] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = 78;
    const step = () => {
      start += 2;
      if (start >= end) { setCount(end); return; }
      setCount(start);
      requestAnimationFrame(step);
    };
    const t = setTimeout(() => requestAnimationFrame(step), 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setMx(e.clientX / window.innerWidth - 0.5);
      setMy(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const handleAuthSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setAuthModal("none");
      onEnter();
    }, 900);
  };

  const par = (fx: number, fy: number) => ({
    transform: `translate(${(mx * fx).toFixed(1)}px, ${(my * fy).toFixed(1)}px)`,
  });

  return (
    <div className="min-h-screen bg-[#12131a] text-[#f5f6fa] relative overflow-x-clip font-sans selection:bg-[rgba(59,130,246,0.35)] selection:text-white">
      {/* ── Ambient background ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="signal-grid" />
        <div className="signal-blob signal-blob-blue" />
        <div className="signal-blob signal-blob-indigo" />
        {[
          { l: "12%", t: "70%", s: 5, d: "0s" }, { l: "24%", t: "80%", s: 3, d: "1.2s" },
          { l: "38%", t: "65%", s: 4, d: "2.4s" }, { l: "55%", t: "85%", s: 3, d: "0.8s" },
          { l: "68%", t: "72%", s: 5, d: "3.1s" }, { l: "80%", t: "78%", s: 3, d: "1.8s" },
          { l: "90%", t: "68%", s: 4, d: "2.9s" },
        ].map((p, i) => (
          <div key={i} className="signal-particle" style={{ left: p.l, top: p.t, width: p.s, height: p.s, animationDelay: p.d }} />
        ))}
        <svg className="signal-svg" viewBox="0 0 2880 220" preserveAspectRatio="none">
          <path className="signal-flowline" stroke="#3b82f6" d="M0,90 C160,40 320,140 480,90 C640,40 800,140 960,90 C1120,40 1280,140 1440,90 C1600,40 1760,140 1920,90 C2080,40 2240,140 2400,90 C2560,40 2720,140 2880,90" />
          <path className="signal-flowline" stroke="#818cf8" style={{ animationDelay: "-1.6s" }} d="M0,130 C160,170 320,90 480,130 C640,170 800,90 960,130 C1120,170 1280,90 1440,130 C1600,170 1760,90 1920,130 C2080,170 2240,90 2400,130 C2560,170 2720,90 2880,130" />
          <path className="signal-flowline" stroke="#34d399" style={{ animationDelay: "-3.2s" }} d="M0,165 C160,190 320,140 480,165 C640,190 800,140 960,165 C1120,190 1280,140 1440,165 C1600,190 1760,140 1920,165 C2080,190 2240,140 2400,165" />
        </svg>
        <div
          className="fixed w-[640px] h-[640px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(59,130,246,0.16), transparent 65%)",
            left: `${(50 + mx * 40).toFixed(1)}%`,
            top: `${(35 + my * 40).toFixed(1)}%`,
            transform: "translate(-50%,-50%)",
            transition: "left 0.4s ease-out, top 0.4s ease-out",
          }}
        />
      </div>

      {/* ── Nav ── */}
      <nav className="max-w-[1200px] mx-auto flex items-center justify-between px-5 sm:px-8 lg:px-16 py-5 relative z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[10px] bg-[#1c2333] border border-[#2a2c36] relative shrink-0">
            <span className="absolute w-[9px] h-[9px] rounded-full bg-[#3b82f6] left-[6px] top-[6px]" />
            <span className="absolute w-[9px] h-[9px] rounded-full bg-[#818cf8] right-[5px] top-[6px]" />
            <span className="absolute w-[9px] h-[9px] rounded-full bg-[#34d399] left-1/2 bottom-[5px] -translate-x-1/2" />
          </div>
          <span className="font-heading font-bold text-lg tracking-tight">InterviewIQ</span>
        </div>
        <div className="hidden md:flex gap-7 text-sm text-[#9a9ca8]">
          <span className="hover:text-[#f5f6fa] transition-colors cursor-pointer">How it works</span>
          <span className="hover:text-[#f5f6fa] transition-colors cursor-pointer">The method</span>
          <span className="hover:text-[#f5f6fa] transition-colors cursor-pointer">Results</span>
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary" size="sm" className="h-[38px] rounded-full px-4" onClick={() => setAuthModal("login")}>
            Sign in
          </Button>
          <Button variant="primary" size="sm" className="h-[38px] rounded-full px-5" onClick={onEnter}>
            Start a mock →
          </Button>
        </div>
      </nav>

      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-16 relative z-10">
        {/* ── Hero ── */}
        <section className="relative py-14 grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-12 items-center">
          <div className="relative z-10 anim-fade-up">
            <span className="inline-flex px-3.5 py-1.5 rounded-full bg-[#1c2333] text-[#60a5fa] text-xs font-semibold mb-5">
              For senior &amp; staff engineers
            </span>
            <h1 className="font-heading font-bold text-[clamp(38px,5.2vw,60px)] leading-[1.1] mb-5 text-white">
              Walk into the room <span className="g-text-accent">already having had</span> the conversation.
            </h1>
            <p className="text-[17px] leading-relaxed max-w-[46ch] text-[#9a9ca8] mb-7">
              Real, demanding mock interviews — technical, behavioral, coding — with every score traced back to the exact transcript line that earned it.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Button variant="primary" size="lg" onClick={onEnter}>Start a mock interview</Button>
              <Button variant="secondary" size="lg" onClick={() => setAuthModal("login")}>See how it works</Button>
            </div>
          </div>

          <div className="flex flex-col gap-6 py-2 relative z-10">
            <div className="w-[230px] self-start" style={{ animation: "lift 7s ease-in-out infinite" }}>
              <div className="glass-panel rounded-[22px] p-[22px]" style={{ ...par(14, 10), rotate: "-1.5deg" }}>
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-xs text-[#9a9ca8]">Readiness</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[rgba(52,211,153,0.16)] text-[#6ee7b7]">↑ 8 pts</span>
                </div>
                <p className="font-heading text-[40px] font-bold m-0 text-white leading-none">{count}</p>
                <p className="text-xs text-[#9a9ca8] mt-2">Distributed Consensus is the gap left.</p>
              </div>
            </div>
            <div className="w-[260px] self-end" style={{ animation: "lift 8s ease-in-out infinite", animationDelay: "1s" }}>
              <div className="glass-panel rounded-[22px] p-5" style={{ ...par(-10, -8), rotate: "1deg" }}>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[rgba(59,130,246,0.16)] text-[#93c5fd]">Verified claim</span>
                <p className="text-[13px] mt-2.5 text-[#c7c9d4] leading-relaxed">
                  "Handled 2M transactions/day at Razorpay" — checked against your architecture answer.
                </p>
              </div>
            </div>
            <div className="w-[190px] self-start ml-[70px]" style={{ animation: "lift 9s ease-in-out infinite", animationDelay: "0.4s" }}>
              <div className="glass-panel rounded-[22px] p-5" style={{ ...par(18, 12), rotate: "-1deg" }}>
                <span className="text-xs text-[#9a9ca8]">Session</span>
                <p className="text-[13px] mt-2 text-[#c7c9d4] leading-relaxed">Staff-level technical round, 42 minutes.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="py-16 anim-fade-up">
          <span className="inline-flex px-3.5 py-1.5 rounded-full border border-[#2a2c36] text-[#9a9ca8] text-xs font-semibold mb-5">
            How it works
          </span>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s) => (
              <div key={s.n}>
                <div className="w-[52px] h-[52px] rounded-full bg-[#1c2333] text-[#60a5fa] font-heading font-bold text-xl flex items-center justify-center mb-4">
                  {s.n}
                </div>
                <h3 className="font-heading text-lg mb-2 text-white">{s.title}</h3>
                <p className="text-sm text-[#9a9ca8] leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── The method ── */}
        <section className="pt-6 pb-16 anim-fade-up">
          <span className="inline-flex px-3.5 py-1.5 rounded-full border border-[#2a2c36] text-[#9a9ca8] text-xs font-semibold mb-5">
            The method
          </span>
          <h2 className="font-heading text-[32px] mb-7 text-white max-w-[20ch]">Three ways of looking at one answer</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {METHOD.map((m) => (
              <div key={m.tag} className="glass-panel rounded-[22px] p-[26px]">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${tagCls[m.tone]}`}>{m.tag}</span>
                <h3 className="text-lg mt-3.5 mb-2 font-heading text-white">{m.title}</h3>
                <p className="text-[13px] text-[#9a9ca8] leading-relaxed">{m.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Results ── */}
        <section className="pt-6 pb-20 grid md:grid-cols-3 gap-5 items-stretch anim-fade-up">
          <div className="glass-panel rounded-[22px] p-[26px]">
            <p className="font-heading text-[38px] font-bold m-0 text-[#60a5fa] leading-none">+12</p>
            <p className="text-[13px] text-[#9a9ca8] mt-2">avg. point gain in 4 rounds</p>
          </div>
          <div className="glass-panel rounded-[22px] p-[26px]">
            <p className="font-heading text-[38px] font-bold m-0 text-[#6ee7b7] leading-none">0</p>
            <p className="text-[13px] text-[#9a9ca8] mt-2">black-box scores</p>
          </div>
          <div className="glass-panel rounded-[22px] p-[26px]">
            <p className="text-[13px] italic mb-2.5 text-[#c7c9d4] leading-relaxed">
              "The follow-up on my Kafka answer was the exact question I got at the real onsite."
            </p>
            <p className="text-xs text-[#9a9ca8]">— Beta tester, Staff Backend Engineer</p>
          </div>
        </section>

        {/* ── CTA band ── */}
        <section className="pb-24 anim-fade-up">
          <div className="rounded-[32px] p-8 sm:p-12 lg:p-16 flex flex-wrap justify-between items-center gap-6 border border-[#262838]"
            style={{ background: "linear-gradient(135deg,#1c2333,#171827)" }}>
            <div className="max-w-[440px]">
              <h3 className="font-heading text-[26px] mb-2.5 text-white">Your next interview deserves a dry run.</h3>
              <p className="text-sm text-[#9a9ca8]">Start free. Your first mock interview takes about 20 minutes.</p>
            </div>
            <Button variant="primary" size="lg" onClick={onEnter}>Start a mock interview</Button>
          </div>
        </section>
      </div>

      <footer className="border-t border-[#1e2029] py-7 px-5 sm:px-8 lg:px-16 text-[13px] text-[#6b7280] flex flex-wrap gap-3 justify-between max-w-[1200px] mx-auto relative z-10">
        <span>© {new Date().getFullYear()} InterviewIQ</span>
        <span>Built for people who'd rather practice than panic.</span>
      </footer>

      <style>{`@keyframes lift { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

      {/* ── Auth modal ── */}
      <Modal
        open={authModal !== "none"}
        onClose={() => setAuthModal("none")}
        title={authModal === "signup" ? "Create your account" : "Sign in to InterviewIQ"}
        width="max-w-md"
      >
        <div className="flex flex-col gap-4 text-left">
          <div className="p-4 rounded-2xl bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.25)] flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white">Want to skip sign-up?</div>
              <div className="text-[11px] text-[#9a9ca8]">Launch the preloaded demo workspace.</div>
            </div>
            <Button variant="primary" size="xs" onClick={onEnter}>Instant demo →</Button>
          </div>

          <button
            onClick={onEnter}
            className="h-11 glass-panel rounded-xl flex items-center justify-center gap-3 text-xs font-semibold text-[#e5e7eb] hover:bg-white/[0.06] transition-all cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[11px] text-[#6b7280] uppercase tracking-wider">or with email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {authModal === "signup" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-wider text-[#9a9ca8] font-semibold">Full name</label>
              <input
                placeholder="Arjun Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 glass-panel rounded-xl px-4 text-sm text-white focus:outline-none focus:border-[rgba(59,130,246,0.4)]"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase tracking-wider text-[#9a9ca8] font-semibold">Work email</label>
            <input
              type="email"
              placeholder="arjun@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 glass-panel rounded-xl px-4 text-sm text-white focus:outline-none focus:border-[rgba(59,130,246,0.4)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase tracking-wider text-[#9a9ca8] font-semibold">Password</label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 glass-panel rounded-xl px-4 text-sm text-white focus:outline-none focus:border-[rgba(59,130,246,0.4)]"
            />
          </div>

          <Button variant="primary" size="md" loading={loading} onClick={handleAuthSubmit} className="w-full mt-2">
            {authModal === "signup" ? "Create account" : "Sign in"}
          </Button>

          <p className="text-center text-xs text-[#9a9ca8] mt-1">
            {authModal === "signup" ? "Already have an account? " : "New to InterviewIQ? "}
            <button
              onClick={() => setAuthModal(authModal === "signup" ? "login" : "signup")}
              className="text-[#60a5fa] hover:text-[#93c5fd] font-semibold cursor-pointer"
            >
              {authModal === "signup" ? "Sign in" : "Create account"}
            </button>
          </p>
        </div>
      </Modal>
    </div>
  );
}
