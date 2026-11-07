import { useEffect, useRef, useState, type ReactNode } from "react";
import Logo from "../Logo";

/* ---------------------------------------------------------------------------------------------
   Motion helpers. Everything reveals once, slowly. Reduced-motion users get the final state (see CSS).
   --------------------------------------------------------------------------------------------- */
function useSeen<T extends HTMLElement>(threshold = 0.2): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen];
}

function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const [ref, seen] = useSeen<HTMLDivElement>(0.15);
  return (
    <div ref={ref} className={`st-reveal ${seen ? "st-in" : ""} ${className}`} style={{ transitionDelay: seen ? `${delay}ms` : "0ms" }}>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
   Hero: a live session, so the first thing you see is the product doing its job.
   --------------------------------------------------------------------------------------------- */
const SESSION_LINES = [
  { who: "Alex", text: "You said the outbox table fixes the dual write. What happens to ordering if two workers poll it at once?" },
  { who: "You", text: "I would claim rows with SKIP LOCKED, so each worker gets a different batch and" },
  { who: "Note", text: "Ordering across workers: not covered yet. Follow up on partition keys." },
];

function HeroSession() {
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(462);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setStep(SESSION_LINES.length);
      return;
    }
    const timers = [700, 2600, 5200].map((ms, i) => window.setTimeout(() => setStep(i + 1), ms));
    return () => timers.forEach(window.clearTimeout);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="relative">
      {/* A second sheet behind the panel: the strap it is drawn across. */}
      <div aria-hidden="true" className="absolute inset-x-6 -bottom-3 top-6 rounded-[18px] border border-[#2b2b28] bg-[#161614] -rotate-[1.6deg]" />
      <div className="relative rounded-[18px] border border-[#2b2b28] bg-[#181817] shadow-[0_30px_80px_-30px_rgba(8,6,2,0.9)] overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 h-12 border-b border-[#2b2b28] ob-mo text-[11.5px] ob-tx3">
          <span className="flex items-center gap-2.5">
            <span className="inline-block w-[7px] h-[7px] rounded-full st-live" style={{ background: "var(--ob-hot)" }} aria-hidden="true" />
            System design · Alex
          </span>
          <span className="tabular-nums">{mm}:{ss} / 15:00</span>
        </div>

        <div className="px-5 py-5 grid gap-4 min-h-[300px] content-start" aria-live="polite">
          {SESSION_LINES.slice(0, step).map((l, i) =>
            l.who === "Note" ? (
              <div key={i} className="st-line-in ml-6 border-l-2 pl-3.5 py-1 text-[12.5px] leading-relaxed" style={{ borderColor: "var(--ob-hot)" }}>
                <span className="ob-mo text-[10.5px] uppercase tracking-[0.12em] ob-tx3 block mb-0.5">Probe queued</span>
                <span className="ob-tx2">{l.text}</span>
              </div>
            ) : (
              <div key={i} className="st-line-in grid grid-cols-[44px_1fr] gap-3 items-start">
                <span className="ob-mo text-[10.5px] uppercase tracking-[0.12em] pt-[3px]" style={{ color: l.who === "Alex" ? "var(--ob-ac)" : "var(--ob-ok)" }}>{l.who}</span>
                <p className="m-0 text-[14.5px] leading-[1.6] tracking-[-0.005em]">
                  {l.text}
                  {l.who === "You" && step === 2 && <span className="inline-block w-[7px] h-[15px] ml-1 align-[-2px] bg-[#e6dfcc] st-live" aria-hidden="true" />}
                </p>
              </div>
            ),
          )}
        </div>

        <div className="flex items-center justify-between gap-4 px-5 h-14 border-t border-[#2b2b28]">
          <div className={`flex items-center gap-[3px] h-5 ${step === 2 ? "st-bars" : "opacity-40"}`} aria-hidden="true">
            <i /><i /><i /><i /><i />
          </div>
          <span className="ob-mo text-[11.5px] ob-tx3">{step === 2 ? "listening" : step >= 3 ? "answer received" : "alex is asking"}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
   Tracks: one list, one detail panel. Probes are the sort of thing Alex actually asks.
   --------------------------------------------------------------------------------------------- */
const TRACKS = [
  {
    id: "dsa", name: "DSA and problem solving",
    blurb: "Talk through the approach, then write it in the editor. Python runs in your browser.",
    probes: ["You sort each string to build the key. What does that cost across 10,000 strings?", "Give me an input that breaks your loop."],
    scored: ["Clarifying", "Data structures", "Correctness", "Complexity", "Edge cases", "Code quality"],
  },
  {
    id: "sd", name: "System design",
    blurb: "Scope it, draw it, then defend it when something fails.",
    probes: ["Two workers poll your outbox table. What happens to ordering?", "The primary dies right after commit. What did the client see?"],
    scored: ["Scoping", "Architecture", "Storage", "Consistency", "Resilience", "Trade-offs"],
  },
  {
    id: "cs", name: "Core CS",
    blurb: "The fundamentals under everything else: memory, concurrency, networks, databases.",
    probes: ["What happens between a page fault and the next instruction?", "Why does HTTP/2 still stall on one lost packet?"],
    scored: ["OS and memory", "Networking", "Concurrency", "Databases", "Reasoning", "Troubleshooting"],
  },
  {
    id: "bh", name: "Behavioral",
    blurb: "Stories held to the same standard as code: specific, owned, with a result.",
    probes: ["You said \"we decided\". What did you personally decide?", "What did it cost, and what would you change?"],
    scored: ["Ownership", "Collaboration", "Conflict", "Crisis handling", "Story structure", "Reflection"],
  },
  {
    id: "rt", name: "Resume technical",
    blurb: "Built from your own resume, so every project is fair game.",
    probes: ["Your resume says 2M transactions a day. Where did that number come from?", "What broke first at ten times the traffic?"],
    scored: ["Project design", "Technical depth", "Incident recovery", "Scaling"],
  },
];

function TrackExplorer() {
  const [active, setActive] = useState(0);
  const t = TRACKS[active];
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] items-start">
      <div role="tablist" aria-label="Interview tracks" className="border-t border-[#2b2b28]">
        {TRACKS.map((tr, i) => (
          <button
            key={tr.id}
            type="button"
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            className="st-row w-full text-left flex items-baseline gap-5 py-[22px] border-b border-[#2b2b28] cursor-pointer"
            style={{ color: active === i ? "var(--ob-tx)" : "var(--ob-tx3)", paddingLeft: active === i ? 14 : 0 }}
          >
            <span className="ob-mo text-[11.5px] w-6 shrink-0" style={{ color: active === i ? "var(--ob-hot)" : undefined }}>0{i + 1}</span>
            <span className="text-[clamp(24px,3.1vw,38px)] tracking-[-0.03em] leading-[1.1]">{tr.name}</span>
          </button>
        ))}
      </div>

      <div key={t.id} role="tabpanel" className="st-line-in lg:sticky lg:top-28 rounded-[16px] border border-[#2b2b28] bg-[#181817] p-7">
        <p className="m-0 text-[16px] leading-[1.6] ob-tx2 max-w-[44ch]">{t.blurb}</p>
        <div className="ob-lb mt-7 mb-3">Alex might ask</div>
        <ul className="list-none m-0 p-0 grid gap-3">
          {t.probes.map((p) => (
            <li key={p} className="border-l-2 pl-3.5 py-0.5 text-[14.5px] leading-[1.55] italic" style={{ borderColor: "var(--ob-ln3)" }}>
              {p}
            </li>
          ))}
        </ul>
        <div className="ob-lb mt-7 mb-3">Scored on</div>
        <div className="flex flex-wrap gap-2">
          {t.scored.map((s) => (
            <span key={s} className="ob-chip ob-sq">{s}</span>
          ))}
        </div>
        <div className="ob-mo text-[11.5px] ob-tx3 mt-7">15, 30, 45 or 60 minutes. The clock turns red when time is up.</div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
   Radar that sharpens: starts blunt and settles on the real shape when it scrolls into view.
   --------------------------------------------------------------------------------------------- */
const AXES = ["Clarifying", "Data structures", "Correctness", "Complexity", "Edge cases", "Code quality"];
const SHARP = [3, 3, 3, 2, 3, 2];

function SharpRadar() {
  const [ref, seen] = useSeen<HTMLDivElement>(0.35);
  const [t, setT] = useState(0);

  useEffect(() => {
    if (!seen) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setT(1);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1500);
      setT(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen]);

  const cx = 210, cy = 160, R = 104;
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
    return [cx + Math.cos(a) * R * (v / 4), cy + Math.sin(a) * R * (v / 4)] as const;
  };
  const vals = SHARP.map((s) => 1.35 + (s - 1.35) * t);
  const poly = vals.map((v, i) => pt(i, v).join(",")).join(" ");
  const gap = 3; // Complexity: the one axis that stays short

  return (
    <div ref={ref} className="w-full max-w-[420px] mx-auto">
      <svg viewBox="0 0 420 330" width="100%" role="img" aria-label="Sample skill profile: strong on four areas, shorter on complexity and code quality">
        {[1, 2, 3, 4].map((r) => (
          <polygon key={r} points={AXES.map((_, i) => pt(i, r).join(",")).join(" ")} fill="none" stroke="#2b2b28" strokeWidth="1" />
        ))}
        {AXES.map((_, i) => {
          const [x, y] = pt(i, 4);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#2b2b28" strokeWidth="1" />;
        })}
        <polygon points={poly} fill="#e6dfcc" fillOpacity="0.13" stroke="#e6dfcc" strokeWidth="1.6" strokeLinejoin="round" />
        {vals.map((v, i) => {
          const [x, y] = pt(i, v);
          return <circle key={i} cx={x} cy={y} r={i === gap ? 4.5 : 3} fill={i === gap ? "#121211" : "#e6dfcc"} stroke={i === gap ? "#ff6a3d" : undefined} strokeWidth={i === gap ? 1.8 : 0} />;
        })}
        {AXES.map((label, i) => {
          const [x, y] = pt(i, 4.75);
          const anchor = Math.abs(x - cx) < 8 ? "middle" : x > cx ? "start" : "end";
          return (
            <text key={label} x={x} y={y + 4} textAnchor={anchor} fontSize="11.5" fontFamily="Inter, sans-serif" fill={i === gap ? "#ff6a3d" : "#aaa89f"}>
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function Receipt({ tone, title, body, quote, note }: { tone: "good" | "gap"; title: string; body: string; quote: string; note: string }) {
  const c = tone === "good" ? "var(--ob-ok)" : "var(--ob-wn)";
  return (
    <div className="rounded-[14px] border border-[#2b2b28] bg-[#181817] p-5" style={{ borderLeft: `2px solid ${c}` }}>
      <div className="text-[14.5px] font-medium" style={{ color: c }}>{title}</div>
      <p className="m-0 mt-1.5 text-[13.5px] ob-tx2 leading-relaxed">{body}</p>
      <div className="mt-3 border-l-2 pl-3 text-[12.5px] italic leading-relaxed ob-tx2" style={{ borderColor: "var(--ob-ln3)" }}>
        <span className="not-italic ob-mo text-[10px] uppercase tracking-[0.12em] ob-tx3 mr-2">Example</span>
        "{quote}"
      </div>
      <p className="m-0 mt-2 text-[12px] ob-tx3">What this shows: {note}</p>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
   Page
   --------------------------------------------------------------------------------------------- */
export default function LandingContent({ onSignup, onLogin }: { onSignup: () => void; onLogin: () => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      setScrolled(window.scrollY > 12);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const wrap = "max-w-[1240px] mx-auto px-[clamp(20px,5vw,64px)]";

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[90] ob-btn ob-pr">Skip to content</a>

      {/* Warm light behind the hero, off to one side so the page is not centred and symmetrical. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[900px] pointer-events-none" style={{ background: "radial-gradient(60% 55% at 78% 8%, rgba(230,223,204,0.075), transparent 70%), radial-gradient(40% 40% at 8% 30%, rgba(255,106,61,0.035), transparent 70%)" }} />

      <header className={`sticky top-0 z-40 transition-[background-color,border-color] duration-500 border-b ${scrolled ? "border-[#2b2b28] bg-[#121211]/95" : "border-transparent"}`}>
        <div className={`${wrap} flex items-center justify-between gap-4 h-16`}>
          <a href="#top" className="flex items-center gap-2.5 font-semibold tracking-[-0.01em]" aria-label="Strop, back to top">
            <Logo size={28} />
            Strop
          </a>
          <nav className="hidden md:flex gap-8 text-[13.5px] ob-tx2" aria-label="Primary">
            {[["loop", "How it works"], ["tracks", "Tracks"], ["report", "The report"], ["match", "Resume and job"]].map(([id, l]) => (
              <a key={id} href={`#${id}`} className="st-link pb-0.5 hover:text-[#ebe9e2] transition-colors">{l}</a>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <button type="button" className="text-[13.5px] ob-tx2 hover:text-[#ebe9e2] transition-colors cursor-pointer" onClick={onLogin}>Sign in</button>
            <button type="button" className="ob-btn ob-pr" onClick={onSignup}>Get started</button>
          </div>
        </div>
      </header>

      <main id="main">
        {/* ---------------------------------- Hero ---------------------------------- */}
        <section id="top" className={`${wrap} relative z-[2] pt-[clamp(48px,9vh,112px)] pb-[clamp(72px,12vh,140px)] grid gap-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] items-center`}>
          <div>
            <h1 className="m-0 text-[clamp(44px,6.3vw,92px)] leading-[0.96] tracking-[-0.045em] font-medium text-balance">
              Get{" "}
              <span className="relative inline-block">
                <span className="st-serif italic text-[1.06em] pr-[0.04em]" style={{ color: "var(--ob-ac)" }}>sharper</span>
                <svg aria-hidden="true" viewBox="0 0 300 14" preserveAspectRatio="none" className="absolute left-0 -bottom-[0.1em] w-full h-[0.13em] overflow-visible">
                  <path className="st-draw" pathLength={1} d="M2 9 C 70 2, 150 13, 298 4" fill="none" stroke="#ff6a3d" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
              <br />
              before it counts.
            </h1>
            <p className="mt-9 mb-0 max-w-[50ch] text-[clamp(16px,1.35vw,19px)] leading-[1.6] ob-tx2 text-pretty">
              An interviewer that listens to what you actually said, pushes on the weak spot, and keeps score. Afterwards you get a report that quotes you, line by line.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
              <button type="button" className="ob-btn ob-pr ob-btn-lg" onClick={onSignup}>Start a session</button>
              <a href="#report" className="st-link pb-0.5 text-[14px] ob-tx2 hover:text-[#ebe9e2] transition-colors">See how a report reads</a>
            </div>
          </div>
          <HeroSession />
        </section>

        {/* ------------------------------ How it works ------------------------------ */}
        <section id="loop" className={`${wrap} relative z-[2] py-[clamp(72px,12vh,140px)] grid gap-14 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]`}>
          <div className="lg:sticky lg:top-32 self-start">
            <Reveal>
              <div className="ob-mo text-[12px] ob-tx3 mb-4">How it works</div>
              <h2 className="m-0 text-[clamp(32px,4.4vw,58px)] leading-[1.02] tracking-[-0.04em] font-medium text-balance">
                Three passes<br />across the strap.
              </h2>
              <p className="mt-6 mb-0 max-w-[36ch] ob-tx2 text-[16px] leading-[1.6]">Like honing a blade: each pass removes a little of what is dull.</p>
            </Reveal>
          </div>

          <ol className="list-none m-0 p-0 relative">
            <span aria-hidden="true" className="absolute left-[18px] top-3 bottom-3 w-px bg-[#2b2b28]" />
            {[
              { n: "01", t: "Speak", d: "Answer out loud, the way you will in the room. Alex hears you, and the transcript fills in as you talk.", extra: <div className="st-bars flex items-center gap-[3px] h-5 mt-5" aria-hidden="true"><i /><i /><i /><i /><i /></div> },
              { n: "02", t: "Get pushed", d: "Follow-ups use your own words: the claim you skipped over, the input that breaks it, the cost you did not mention. It moves on when you are solid, and wraps up when time is up.", extra: null },
              { n: "03", t: "Read the receipts", d: "Every score in the report links back to a sentence you said. You see what worked, what did not, and what to do about it.", extra: null },
            ].map((s, i) => (
              <li key={s.n} className="relative pl-14 pb-[clamp(48px,8vh,88px)] last:pb-0">
                <Reveal delay={i * 60}>
                  <span className="absolute left-0 top-1 w-[37px] h-[37px] rounded-full border border-[#3a3a36] bg-[#121211] grid place-items-center ob-mo text-[11px] ob-tx2">{s.n}</span>
                  <h3 className="m-0 text-[clamp(24px,2.6vw,34px)] tracking-[-0.03em] font-medium">{s.t}</h3>
                  <p className="mt-3 mb-0 max-w-[48ch] ob-tx2 text-[15.5px] leading-[1.65]">{s.d}</p>
                  {s.extra}
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        {/* --------------------------------- Tracks --------------------------------- */}
        <section id="tracks" className={`${wrap} relative z-[2] py-[clamp(72px,12vh,140px)]`}>
          <Reveal className="mb-14 max-w-[760px]">
            <div className="ob-mo text-[12px] ob-tx3 mb-4">Tracks</div>
            <h2 className="m-0 text-[clamp(32px,4.4vw,58px)] leading-[1.02] tracking-[-0.04em] font-medium text-balance">
              Five kinds of interview, <span className="st-serif italic" style={{ color: "var(--ob-ac)" }}>one</span> interviewer.
            </h2>
          </Reveal>
          <TrackExplorer />
        </section>

        {/* ---------------------------------- Report ---------------------------------- */}
        <section id="report" className={`${wrap} relative z-[2] py-[clamp(72px,12vh,140px)] grid gap-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] items-center`}>
          <div>
            <Reveal>
              <div className="ob-mo text-[12px] ob-tx3 mb-4">The report</div>
              <h2 className="m-0 text-[clamp(32px,4.4vw,58px)] leading-[1.02] tracking-[-0.04em] font-medium text-balance">
                A score is only useful if you can <span className="st-serif italic" style={{ color: "var(--ob-ac)" }}>check</span> it.
              </h2>
              <p className="mt-6 mb-10 max-w-[44ch] ob-tx2 text-[16px] leading-[1.6]">
                Skills are plotted on a radar. Each strength and each gap is attached to the exact words you used, with a line on what they show.
              </p>
            </Reveal>
            <SharpRadar />
          </div>
          <div className="grid gap-4">
            <Reveal delay={40}>
              <Receipt
                tone="good"
                title="Chose the right data structure"
                body="A hash map keyed on the sorted string, with a reason for it."
                quote="We have a map where the key is a string, the sorted anagram, and the value stores the original strings."
                note="explicit selection of a hash map with a sorted key."
              />
            </Reveal>
            <Reveal delay={120}>
              <Receipt
                tone="gap"
                title="Space analysis stayed vague"
                body="Time was worked out per string, but the total cost of the map was never stated."
                quote="The space used by the map itself is of course O of N, and as I said I am using the notation."
                note="a partial answer that did not name what N counts."
              />
            </Reveal>
          </div>
        </section>

        {/* ------------------------------ Resume and job ------------------------------ */}
        <section id="match" className={`${wrap} relative z-[2] py-[clamp(72px,12vh,140px)]`}>
          <Reveal className="mb-12 max-w-[760px]">
            <div className="ob-mo text-[12px] ob-tx3 mb-4">Resume and job</div>
            <h2 className="m-0 text-[clamp(32px,4.4vw,58px)] leading-[1.02] tracking-[-0.04em] font-medium text-balance">
              Paste the job. See what your resume can <span className="st-serif italic" style={{ color: "var(--ob-ac)" }}>prove</span>.
            </h2>
          </Reveal>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
            <Reveal className="rounded-[16px] border border-[#2b2b28] bg-[#181817] p-7">
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <span className="ob-lb">Requirements checked against your resume</span>
                <span className="ob-mo text-[11.5px] ob-tx3">sample</span>
              </div>
              {[
                { req: "Go or Java", met: true, ev: "Built a ledger reconciliation service in Go handling 2M txns/day" },
                { req: "PostgreSQL", met: true, ev: "Skills: Python, Go, FastAPI, PostgreSQL, Docker" },
                { req: "Kafka or similar event streaming", met: false, ev: "" },
                { req: "Kubernetes in production", met: false, ev: "" },
              ].map((r) => (
                <div key={r.req} className="grid grid-cols-[18px_1fr] gap-3 py-4 border-t border-[#2b2b28] first:border-t-0">
                  <span aria-hidden="true" className="mt-[5px] w-[11px] h-[11px] rounded-full" style={r.met ? { background: "var(--ob-ac)" } : { border: "1.5px dashed var(--ob-wn)" }} />
                  <div>
                    <div className="text-[14.5px]" style={{ color: r.met ? "var(--ob-tx)" : "var(--ob-wn)" }}>{r.req}</div>
                    <div className="text-[12.5px] mt-1 ob-tx3 italic">{r.met ? `"${r.ev}"` : "No evidence found in your resume."}</div>
                  </div>
                </div>
              ))}
              <p className="m-0 mt-3 pt-4 border-t border-[#2b2b28] text-[12.5px] ob-tx3 leading-relaxed">
                Evidence has to be quoted from your resume. If the quote is not really there, it does not count.
              </p>
            </Reveal>

            <Reveal delay={90} className="rounded-[16px] border border-[#2b2b28] bg-[#161614] p-7 flex flex-col">
              <span className="ob-lb">Writing check</span>
              <div className="mt-5 border-l-2 pl-3 text-[13.5px] italic ob-tx2 leading-relaxed" style={{ borderColor: "var(--ob-ln3)" }}>
                "Worked on various backend stuff etc"
              </div>
              <p className="m-0 mt-3 text-[13.5px] leading-relaxed">Describes a duty, not a result. "Various" and "etc" hide what you did.</p>
              <div className="ob-lb mt-6 mb-2 ob-txa">Try</div>
              <p className="m-0 text-[13.5px] ob-tx2 leading-relaxed">Built the payments retry queue in Go, cutting failed charges by [X%].</p>
              <p className="m-0 mt-auto pt-6 text-[12.5px] ob-tx3 leading-relaxed">Grammar, buzzwords, passive voice and bullets with no numbers, each quoted from your resume.</p>
            </Reveal>
          </div>
        </section>

        {/* -------------------------------- Closing -------------------------------- */}
        <section id="join" className={`${wrap} relative z-[2] py-[clamp(80px,14vh,170px)]`}>
          <Reveal>
            <div className="relative rounded-[22px] border border-[#2b2b28] bg-[#161614] overflow-hidden px-[clamp(24px,5vw,72px)] py-[clamp(48px,9vw,104px)]">
              <div aria-hidden="true" className="absolute -right-10 -bottom-16 opacity-[0.07] rotate-6"><Logo size={360} /></div>
              <h2 className="relative m-0 text-[clamp(38px,6vw,84px)] leading-[0.98] tracking-[-0.045em] font-medium text-balance max-w-[14ch]">
                Take the first <span className="st-serif italic" style={{ color: "var(--ob-ac)" }}>pass</span>.
              </h2>
              <p className="relative mt-6 mb-9 max-w-[42ch] ob-tx2 text-[16px] leading-[1.6]">
                Upload a resume, pick a track and talk. Your files stay yours, and you can delete everything from the profile menu.
              </p>
              <div className="relative flex flex-wrap gap-3">
                <button type="button" className="ob-btn ob-pr ob-btn-lg" onClick={onSignup}>Create account</button>
                <button type="button" className="ob-btn ob-btn-lg" onClick={onLogin}>Sign in</button>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className={`${wrap} relative z-[2] py-10 border-t border-[#2b2b28] flex flex-wrap items-center justify-between gap-4 text-[12.5px] ob-tx3`}>
        <span className="flex items-center gap-2.5 ob-tx2"><Logo size={22} />Strop</span>
        <span>Practice with memory.</span>
      </footer>
    </>
  );
}
