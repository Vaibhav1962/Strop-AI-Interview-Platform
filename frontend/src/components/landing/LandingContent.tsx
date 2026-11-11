import ThemeToggle from "../ThemeToggle";
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
   Hero: the live session itself. The answer is the centrepiece, set large; phrases are marked as
   evidence while you speak, a compact skill readout sharpens beside the list of what was heard,
   and Alex's follow-up lands on the one phrase that skipped something. One timeline, looped.
   --------------------------------------------------------------------------------------------- */
type Grp = "a" | "b" | "g" | null;
const ANSWER: { g: Grp; words: string[]; tail?: string }[] = [
  { g: null, words: ["I", "would", "claim", "rows", "with"] },
  { g: "a", words: ["SKIP", "LOCKED"], tail: "," },
  { g: null, words: ["so", "each", "worker", "gets"] },
  { g: "g", words: ["a", "different", "batch"], tail: "." },
  { g: null, words: ["Consumers"] },
  { g: "b", words: ["dedupe", "on", "event", "id"], tail: "." },
];
const SEGS = ANSWER.reduce<{ g: Grp; words: string[]; tail?: string; start: number; end: number }[]>((out, s) => {
  const start = out.length ? out[out.length - 1].end : 0;
  out.push({ ...s, start, end: start + s.words.length });
  return out;
}, []);
const WORDS = SEGS[SEGS.length - 1].end;
const segEnd = (g: Grp) => SEGS.find((s) => s.g === g)?.end ?? 0;

const HERO_AXES = ["Scoping", "Architecture", "Storage", "Consistency", "Resilience", "Trade-offs"];
const GAP_AXIS = 3;
const BASE = [2.6, 2.3, 1.6, 1.3, 1.7, 2.4];
const T0 = 1.2; // first word
const DT = 0.26; // seconds per word
const SPEECH_END = T0 + WORDS * DT;
const GAP_AT = SPEECH_END + 1.6;
const FADE_AT = 14.4;
const LOOP = 15.6;
const EVENTS = [
  { axis: 2, to: 3.4, at: T0 + segEnd("a") * DT },
  { axis: 4, to: 3.3, at: T0 + segEnd("b") * DT },
];

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);

/** Canvas cannot resolve CSS variables, so read the live theme colours (they change with light/dark). */
let inkCache: ReturnType<typeof readInk> | null = null;
if (typeof document !== "undefined") {
  new MutationObserver(() => { inkCache = null; }).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
}
function themeInk() {
  return (inkCache ??= readInk());
}
function readInk() {
  const cs = getComputedStyle(document.documentElement);
  const rgb = (v: string, fb: string) => cs.getPropertyValue(v).trim().split(/[\s,]+/).join(",") || fb;
  const hex = (v: string, fb: string) => cs.getPropertyValue(v).trim() || fb;
  const light = document.documentElement.classList.contains("light");
  return {
    cream: rgb("--ob-ac-rgb", "230,223,204"),
    hot: light ? "217,72,27" : "255,106,61",
    ok: light ? "31,138,90" : "111,214,164",
    tx: hex("--ob-tx", "#ebe9e2"),
    tx3: hex("--ob-tx3", "#8f8d85"),
    bg1: hex("--ob-bg1", "#121211"),
    light,
  };
}

/** Compact skill readout. `intro` (0..1) draws it in once on load; `t` is the loop time. */
function drawReadout(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, intro: number) {
  const cx = W / 2, cy = H / 2 + 1;
  const R = Math.max(40, Math.min(W / 2 - 70, H / 2 - 26));
  const N = HERO_AXES.length;
  const { cream: CREAM, hot: HOT, ok: OK, tx, tx3, bg1, light } = themeInk();
  // light backgrounds need heavier hairlines than dark ones to read at the same strength
  const gk = light ? 2.4 : 1;
  ctx.clearRect(0, 0, W, H);
  if (intro <= 0) return;

  const ang = (i: number) => (Math.PI * 2 * i) / N - Math.PI / 2;
  const pt = (i: number, v: number) => [cx + Math.cos(ang(i)) * R * (v / 4), cy + Math.sin(ang(i)) * R * (v / 4)] as const;
  const poly = (vs: number[]) => {
    ctx.beginPath();
    vs.forEach((v, i) => {
      const [x, y] = pt(i, v);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath();
  };
  const fade = clamp01((t - FADE_AT) / 0.9);
  const flagged = t > GAP_AT && t < FADE_AT;

  // guides: hairlines, the rim slightly brighter
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  for (let r = 1; r <= 4; r++) {
    poly(HERO_AXES.map(() => r * intro));
    ctx.strokeStyle = `rgba(${CREAM},${(r === 4 ? 0.17 : 0.07) * gk})`;
    ctx.stroke();
  }
  HERO_AXES.forEach((_, i) => {
    const [x, y] = pt(i, 4 * intro);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.strokeStyle = `rgba(${CREAM},${0.07 * gk})`;
    ctx.stroke();
  });

  // where you started: a dashed ghost that the live shape pulls away from
  poly(BASE.map((b) => b * intro));
  ctx.setLineDash([2, 3]);
  ctx.strokeStyle = `rgba(${CREAM},0.24)`;
  ctx.stroke();
  ctx.setLineDash([]);

  // live values: a slow breath, plus whatever the answer has earned so far
  const vals = BASE.map((b, i) => (b + 0.035 * Math.sin(t * 1.1 + i * 1.7)) * intro);
  EVENTS.forEach((e) => {
    vals[e.axis] += (e.to - BASE[e.axis]) * easeOut((t - e.at - 0.5) / 1.3) * (1 - fade) * intro;
  });

  poly(vals);
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  grad.addColorStop(0, `rgba(${CREAM},0.03)`);
  grad.addColorStop(1, `rgba(${CREAM},0.17)`);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.save();
  ctx.shadowColor = `rgba(${CREAM},0.28)`;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = `rgba(${CREAM},0.92)`;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.restore();

  // evidence: a spark leaves the centre, lands on its axis, and the vertex rings out once
  EVENTS.forEach((e) => {
    if (fade) return;
    const [vx, vy] = pt(e.axis, e.to);
    const p = (t - e.at) / 0.7;
    if (p > 0 && p < 1) {
      const q = easeOut(p);
      ctx.save();
      ctx.shadowColor = `rgba(${OK},0.9)`;
      ctx.shadowBlur = 10;
      ctx.fillStyle = `rgb(${OK})`;
      ctx.beginPath();
      ctx.arc(cx + (vx - cx) * q, cy + (vy - cy) * q, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const q = (t - e.at - 1.2) / 1.1;
    if (q > 0 && q < 1) {
      ctx.strokeStyle = `rgba(${OK},${0.6 * (1 - q)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(vx, vy, 4 + 14 * easeOut(q), 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  // the gap: the missing length on the skipped axis, measured out in orange
  if (flagged) {
    const pr = easeOut((t - GAP_AT) / 1.0);
    const [x0, y0] = pt(GAP_AXIS, vals[GAP_AXIS]);
    const [x1, y1] = pt(GAP_AXIS, vals[GAP_AXIS] + (4 - vals[GAP_AXIS]) * pr);
    ctx.save();
    ctx.setLineDash([3, 4]);
    ctx.lineDashOffset = -t * 10;
    ctx.strokeStyle = `rgba(${HOT},0.85)`;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
    const ph = (t * 0.6) % 1;
    ctx.strokeStyle = `rgba(${HOT},${0.55 * (1 - ph) * pr})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x0, y0, 4 + 11 * ph, 0, Math.PI * 2);
    ctx.stroke();
  }

  // vertices
  vals.forEach((v, i) => {
    const [x, y] = pt(i, v);
    ctx.beginPath();
    if (i === GAP_AXIS && flagged) {
      ctx.arc(x, y, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = bg1;
      ctx.fill();
      ctx.strokeStyle = `rgb(${HOT})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.arc(x, y, 2.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${CREAM})`;
      ctx.fill();
    }
  });

  // labels: small mono caps, like the rest of the instrument labels on the site
  ctx.font = "500 8.5px 'JetBrains Mono', ui-monospace, monospace";
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "0.05em";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = intro;
  HERO_AXES.forEach((label, i) => {
    const c = Math.cos(ang(i)), s = Math.sin(ang(i));
    ctx.textAlign = Math.abs(c) < 0.1 ? "center" : c > 0 ? "left" : "right";
    ctx.fillStyle = i === GAP_AXIS && flagged ? `rgb(${HOT})` : vals[i] > BASE[i] + 0.6 ? tx : tx3;
    ctx.fillText(label.toUpperCase(), cx + c * (R + 10), cy + s * (R + 12));
  });
  ctx.globalAlpha = 1;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "0px";
}

function HeroSession() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [n, setN] = useState(0);
  const [stage, setStage] = useState(0); // 0 listening, 1 gap flagged, 2 follow-up, 3 resetting
  const [elapsed, setElapsed] = useState(462);

  useEffect(() => {
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return [w, h] as const;
    };

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      const paint = () => {
        const [w, h] = fit();
        drawReadout(ctx, w, h, GAP_AT + 3, 1);
      };
      paint();
      document.fonts?.ready.then(paint).catch(() => {});
      setN(WORDS);
      setStage(2);
      window.addEventListener("resize", paint);
      return () => window.removeEventListener("resize", paint);
    }

    let raf = 0;
    let visible = true;
    const start = performance.now();
    const io = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; }) : null;
    io?.observe(canvas);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const since = (now - start) / 1000;
      const t = since % LOOP;
      const [w, h] = fit();
      drawReadout(ctx, w, h, t, easeOut((since - 0.5) / 1.6));
      setN(t < T0 ? 0 : Math.min(WORDS, Math.floor((t - T0) / DT) + 1));
      setStage(t >= FADE_AT ? 3 : t >= GAP_AT + 0.9 ? 2 : t >= GAP_AT ? 1 : 0);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
    };
  }, []);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const speaking = n > 0 && n < WORDS;
  const gap = stage >= 1;
  const markOn = (s: { g: Grp; end: number }) => (s.g === "g" ? gap : s.g !== null && n >= s.end);

  const evidence = [
    { axis: "Storage", note: "Row claiming, named", val: "3.4", tone: "var(--ob-ok)", on: n >= segEnd("a") },
    { axis: "Resilience", note: "Idempotent consumers", val: "3.3", tone: "var(--ob-ok)", on: n >= segEnd("b") },
    { axis: "Consistency", note: "Ordering skipped", val: "1.3", tone: "var(--ob-hot)", on: gap },
  ];

  return (
    <div className="relative w-full max-w-[620px] justify-self-center lg:justify-self-end">
      <div aria-hidden="true" className="absolute inset-[-10%] pointer-events-none" style={{ background: "radial-gradient(50% 50% at 55% 40%, rgb(var(--ob-ac-rgb)/0.06), transparent 70%)" }} />

      <div
        role="img"
        aria-label="A live system design session. The candidate's spoken answer appears word by word; two phrases are marked as evidence and raise Storage and Resilience on a skill chart, one phrase is flagged as a gap in Consistency, and the interviewer's follow-up question targets that phrase."
        className="group relative rounded-[18px] border border-ob-ln bg-ob-bg1 overflow-hidden shadow-[inset_0_1px_0_rgb(var(--ob-ov)/0.04),0_48px_96px_-48px_rgb(var(--ob-sh)/0.9)]"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
          e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
        }}
      >
        {/* A faint light that follows the pointer across the pane. */}
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{ background: "radial-gradient(280px circle at var(--mx, 70%) var(--my, 0%), rgb(var(--ob-ac-rgb)/0.055), transparent 70%)" }} />

        <div className="relative flex items-center justify-between gap-3 h-11 px-5 sm:px-6 border-b border-ob-ln ob-mo text-[11px] ob-tx3">
          <span className="flex items-center gap-2.5 min-w-0">
            <span className="inline-block w-[7px] h-[7px] rounded-full st-live shrink-0" style={{ background: "var(--ob-hot)" }} />
            <span className="truncate">Live · System design with Alex</span>
          </span>
          <span className="tabular-nums shrink-0">{mm}:{ss} / 15:00</span>
        </div>

        <div className={`relative px-5 sm:px-6 pt-5 pb-6 transition-opacity duration-700 ${stage === 3 ? "opacity-0" : "opacity-100"}`}>
          <p className="m-0 text-[13.5px] leading-[1.55] ob-tx3">
            <span className="ob-mo text-[11px] uppercase tracking-[0.12em] mr-2.5">Alex</span>
            Two workers poll your outbox table. What happens to ordering?
          </p>

          <div className="flex items-center gap-2.5 mt-5 mb-2">
            <span className="ob-mo text-[11px] uppercase tracking-[0.12em]" style={{ color: "var(--ob-ok)" }}>You</span>
            <span className={`ob-lv ${speaking ? "" : "ob-mute"}`} style={{ height: 10 }}><i /><i /><i /><i /><i /></span>
          </div>
          <p className="m-0 text-[clamp(22px,2.35vw,29px)] leading-[1.3] tracking-[-0.025em] min-h-[5.2em] sm:min-h-[3.9em]">
            {SEGS.map((s, si) => {
              const shown = s.words.slice(0, Math.max(0, n - s.start));
              if (!shown.length) return null;
              return (
                <span key={si}>
                  {si > 0 && " "}
                  <span
                    className={`${s.g ? "st-mark" : ""} ${markOn(s) ? "st-on" : ""}`}
                    style={s.g ? { ["--mk" as string]: s.g === "g" ? "var(--ob-hot)" : "var(--ob-ok)" } : undefined}
                  >
                    {shown.map((w, i) => (
                      <span key={i}>
                        {i > 0 && " "}
                        <span className="st-word">{w}</span>
                      </span>
                    ))}
                  </span>
                  {n >= s.end && s.tail}
                </span>
              );
            })}
            {n < WORDS && <span className="st-caret" />}
          </p>

          <div className="h-px bg-ob-ln mt-5" />

          <div className="grid gap-x-5 gap-y-1 items-center sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <canvas ref={canvasRef} className="block w-full h-[220px]" />
            <ul className="list-none m-0 p-0 grid">
              {evidence.map((e) => (
                <li key={e.axis} className={`st-ev ${e.on ? "st-on" : ""} grid grid-cols-[7px_minmax(0,1fr)_auto] gap-x-3 items-baseline py-2.5 border-t border-ob-ln first:border-t-0`}>
                  <span className="w-[7px] h-[7px] rounded-full self-center" style={{ background: e.tone }} />
                  <span className="min-w-0">
                    <span className="block ob-mo text-[11px] uppercase tracking-[0.1em]" style={{ color: e.tone }}>{e.axis}</span>
                    <span className="block text-[13px] ob-tx2 truncate">{e.note}</span>
                  </span>
                  <span className="ob-mo text-[12px] tabular-nums ob-tx2">{e.val}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-h-[70px] mt-1">
            {stage >= 2 && (
              <p className="st-line-in m-0 border-l-2 pl-3.5 text-[14px] leading-[1.6] ob-tx2" style={{ borderColor: "var(--ob-hot)" }}>
                <span className="ob-mo text-[11px] uppercase tracking-[0.12em] mr-2.5" style={{ color: "var(--ob-hot)" }}>Alex</span>
                You said <span className="italic" style={{ color: "var(--ob-tx)" }}>"a different batch"</span>. Batches finish out of order. What keeps one customer's events in sequence?
              </p>
            )}
          </div>
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
      <div role="tablist" aria-label="Interview tracks" className="border-t border-ob-ln">
        {TRACKS.map((tr, i) => (
          <button
            key={tr.id}
            type="button"
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            className="st-row w-full text-left flex items-baseline gap-5 py-[22px] border-b border-ob-ln cursor-pointer"
            style={{ color: active === i ? "var(--ob-tx)" : "var(--ob-tx3)", transform: active === i ? "translateX(14px)" : "none" }}
          >
            <span className="ob-mo text-[11.5px] w-6 shrink-0" style={{ color: active === i ? "var(--ob-hot)" : undefined }}>0{i + 1}</span>
            <span className="text-[clamp(24px,3.1vw,38px)] tracking-[-0.03em] leading-[1.1]">{tr.name}</span>
          </button>
        ))}
      </div>

      <div key={t.id} role="tabpanel" className="st-line-in lg:sticky lg:top-28 rounded-[16px] border border-ob-ln bg-ob-card p-7">
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

function SharpRadar({ focus = null }: { focus?: number | null }) {
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
          <polygon key={r} points={AXES.map((_, i) => pt(i, r).join(",")).join(" ")} fill="none" stroke="var(--ob-ln)" strokeWidth="1" />
        ))}
        {AXES.map((_, i) => {
          const [x, y] = pt(i, 4);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--ob-ln)" strokeWidth="1" />;
        })}
        <polygon points={poly} fill="var(--ob-ac)" fillOpacity="0.13" stroke="var(--ob-ac)" strokeWidth="1.6" strokeLinejoin="round" />
        {vals.map((v, i) => {
          const [x, y] = pt(i, v);
          return (
            <g key={i}>
              {/* Ring on the axis a hovered receipt is about */}
              <circle cx={x} cy={y} r="10" fill="none" stroke={i === gap ? "var(--ob-hot)" : "var(--ob-ac)"} strokeWidth="1" style={{ opacity: focus === i ? 0.6 : 0, transition: "opacity 0.4s var(--ob-ease)" }} />
              <circle cx={x} cy={y} r={i === gap ? 4.5 : 3} fill={i === gap ? "var(--ob-bg1)" : "var(--ob-ac)"} stroke={i === gap ? "var(--ob-hot)" : undefined} strokeWidth={i === gap ? 1.8 : 0} />
            </g>
          );
        })}
        {AXES.map((label, i) => {
          const [x, y] = pt(i, 4.75);
          const anchor = Math.abs(x - cx) < 8 ? "middle" : x > cx ? "start" : "end";
          return (
            <text
              key={label} x={x} y={y + 4} textAnchor={anchor} fontSize="11.5" fontFamily="Inter, sans-serif"
              fill={i === gap ? "var(--ob-hot)" : focus === i ? "var(--ob-tx)" : "var(--ob-tx2)"}
              style={{ opacity: focus === null || focus === i ? 1 : 0.4, transition: "opacity 0.4s var(--ob-ease), fill 0.4s var(--ob-ease)" }}
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function Receipt({ tone, title, body, quote, note, onHover }: { tone: "good" | "gap"; title: string; body: string; quote: string; note: string; onHover?: (on: boolean) => void }) {
  const c = tone === "good" ? "var(--ob-ok)" : "var(--ob-wn)";
  return (
    <div
      className="rounded-[14px] border border-ob-ln bg-ob-card p-5 transition-[background-color] duration-500 hover:bg-[#1c1c1a]"
      style={{ borderLeft: `2px solid ${c}` }}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    >
      <div className="text-[14.5px] font-medium" style={{ color: c }}>{title}</div>
      <p className="m-0 mt-1.5 text-[13.5px] ob-tx2 leading-relaxed">{body}</p>
      <div className="mt-3 border-l-2 pl-3 text-[12.5px] italic leading-relaxed ob-tx2" style={{ borderColor: "var(--ob-ln3)" }}>
        <span className="not-italic ob-mo text-[11px] uppercase tracking-[0.12em] ob-tx3 mr-2">Example</span>
        "{quote}"
      </div>
      <p className="m-0 mt-2 text-[12px] ob-tx3">What this shows: {note}</p>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
   How it works: the rail draws as you scroll, each marker fills when reached, and every step
   carries one small live fragment of what it describes.
   --------------------------------------------------------------------------------------------- */
function Typed({ text, start }: { text: string; start: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setN(text.length);
      return;
    }
    let i = 0;
    let id = 0;
    const wait = window.setTimeout(() => {
      id = window.setInterval(() => {
        i += 1;
        setN(i);
        if (i >= text.length) window.clearInterval(id);
      }, 26);
    }, 500);
    return () => {
      window.clearTimeout(wait);
      window.clearInterval(id);
    };
  }, [start, text]);
  return (
    <>
      <span aria-hidden="true">{text.slice(0, n)}{n < text.length && <span className="st-caret" />}</span>
      <span className="sr-only">{text}</span>
    </>
  );
}

function Step({ n, title, body, children }: { n: string; title: string; body: string; children: (seen: boolean) => ReactNode }) {
  const [ref, seen] = useSeen<HTMLLIElement>(0.55);
  return (
    <li ref={ref} className={`st-reveal ${seen ? "st-in" : ""} relative pl-14 pb-[clamp(48px,8vh,88px)] last:pb-0`}>
      <span
        className="absolute left-0 top-1 w-[37px] h-[37px] rounded-full border grid place-items-center ob-mo text-[11px] transition-[border-color,color,background-color] duration-700"
        style={seen ? { borderColor: "var(--ob-ac)", color: "var(--ob-ac)", background: "var(--ob-card)" } : { borderColor: "var(--ob-ln2)", color: "var(--ob-tx2)", background: "var(--ob-bg1)" }}
      >
        {n}
      </span>
      <h3 className="m-0 text-[clamp(24px,2.6vw,34px)] tracking-[-0.03em] font-medium">{title}</h3>
      <p className="mt-3 mb-0 max-w-[48ch] ob-tx2 text-[15.5px] leading-[1.65]">{body}</p>
      <div className="mt-5 max-w-[48ch]">{children(seen)}</div>
    </li>
  );
}

function HowItWorks() {
  const listRef = useRef<HTMLOListElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const fill = fillRef.current;
    if (!list || !fill) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = list.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (window.innerHeight * 0.62 - r.top) / Math.max(1, r.height)));
      fill.style.transform = `scaleY(${p})`;
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

  return (
    <ol ref={listRef} className="list-none m-0 p-0 relative">
      <span aria-hidden="true" className="absolute left-[18px] top-3 bottom-3 w-px bg-ob-ln" />
      <span ref={fillRef} aria-hidden="true" className="absolute left-[18px] top-3 bottom-3 w-px origin-top" style={{ background: "var(--ob-ac)", transform: "scaleY(0)" }} />

      <Step n="01" title="Speak" body="Answer out loud, the way you will in the room. Alex hears you, and the transcript fills in as you talk.">
        {() => (
          <div className="flex items-center gap-3 ob-mo text-[11.5px] ob-tx3" aria-hidden="true">
            <div className="st-bars flex items-center gap-[3px] h-5"><i /><i /><i /><i /><i /></div>
            listening
          </div>
        )}
      </Step>

      <Step n="02" title="Get pushed" body="Follow-ups use your own words: the claim you skipped over, the input that breaks it, the cost you did not mention. It moves on when you are solid, and wraps up when time is up.">
        {(seen) => (
          <p className="m-0 border-l-2 pl-3.5 text-[14px] leading-[1.6] ob-tx2 min-h-[2.9em]" style={{ borderColor: "var(--ob-hot)" }}>
            <span className="ob-mo text-[11px] uppercase tracking-[0.12em] mr-2.5" style={{ color: "var(--ob-hot)" }}>Alex</span>
            <Typed start={seen} text={"You said \"we cache it\". For how long, and who invalidates it?"} />
          </p>
        )}
      </Step>

      <Step n="03" title="Read the receipts" body="Every score in the report links back to a sentence you said. You see what worked, what did not, and what to do about it.">
        {(seen) => (
          <div className="flex items-center gap-3 text-[13px]" aria-hidden="true">
            <span className="italic ob-tx2 truncate min-w-0">"keyed on the sorted string"</span>
            <span className="h-px flex-1 min-w-[28px] origin-left" style={{ background: "var(--ob-ok)", transform: seen ? "scaleX(1)" : "scaleX(0)", transition: "transform 0.9s var(--ob-ease) 0.5s" }} />
            <span className="ob-chip ob-sq ob-ok shrink-0" style={{ opacity: seen ? 1 : 0, transition: "opacity 0.6s var(--ob-ease) 1.2s" }}>Data structures 3/4</span>
          </div>
        )}
      </Step>
    </ol>
  );
}

/* ---------------------------------------------------------------------------------------------
   Page
   --------------------------------------------------------------------------------------------- */
export default function LandingContent({ onSignup, onLogin }: { onSignup: () => void; onLogin: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [focusAxis, setFocusAxis] = useState<number | null>(null);

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
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[900px] pointer-events-none" style={{ background: "radial-gradient(60% 55% at 78% 8%, rgb(var(--ob-ac-rgb)/0.075), transparent 70%), radial-gradient(40% 40% at 8% 30%, rgba(255,106,61,0.035), transparent 70%)" }} />

      <header className={`sticky top-0 z-40 transition-[background-color,border-color] duration-500 border-b ${scrolled ? "border-ob-ln bg-ob-bg1/95" : "border-transparent"}`}>
        <div className={`${wrap} flex items-center justify-between gap-4 h-16`}>
          <a href="#top" className="flex items-center gap-2.5 font-semibold tracking-[-0.01em]" aria-label="Strop, back to top">
            <Logo size={28} />
            Strop
          </a>
          <nav className="hidden md:flex gap-8 text-[13.5px] ob-tx2" aria-label="Primary">
            {[["loop", "How it works"], ["tracks", "Tracks"], ["report", "The report"], ["match", "Resume and job"]].map(([id, l]) => (
              <a key={id} href={`#${id}`} className="st-link pb-0.5 hover:text-ob-tx transition-colors">{l}</a>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button type="button" className="text-[13.5px] ob-tx2 hover:text-ob-tx transition-colors cursor-pointer" onClick={onLogin}>Sign in</button>
            <button type="button" className="ob-btn ob-pr" onClick={onSignup}>Get started</button>
          </div>
        </div>
      </header>

      <main id="main">
        {/* ---------------------------------- Hero ---------------------------------- */}
        <section id="top" className={`${wrap} relative z-[2] pt-[clamp(48px,9vh,112px)] pb-[clamp(72px,12vh,140px)] grid gap-14 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] items-center`}>
          <div>
            <h1 className="ob-rise m-0 text-[clamp(44px,6.3vw,92px)] leading-[0.96] tracking-[-0.045em] font-medium text-balance" style={{ ["--i" as string]: 0 }}>
              Get{" "}
              <span className="relative inline-block">
                <span className="st-serif italic text-[1.06em] pr-[0.04em]" style={{ color: "var(--ob-ac)" }}>sharper</span>
                <svg aria-hidden="true" viewBox="0 0 300 14" preserveAspectRatio="none" className="absolute left-0 -bottom-[0.1em] w-full h-[0.13em] overflow-visible">
                  <path className="st-draw" pathLength={1} d="M2 9 C 70 2, 150 13, 298 4" fill="none" stroke="var(--ob-hot)" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
              <br />
              before it counts.
            </h1>
            <p className="ob-rise mt-9 mb-0 max-w-[50ch] text-[clamp(16px,1.35vw,19px)] leading-[1.6] ob-tx2 text-pretty" style={{ ["--i" as string]: 2 }}>
              An interviewer that listens to what you actually said, pushes on the weak spot, and keeps score. Afterwards you get a report that quotes you, line by line.
            </p>
            <div className="ob-rise mt-10 flex flex-wrap items-center gap-x-7 gap-y-4" style={{ ["--i" as string]: 3 }}>
              <button type="button" className="ob-btn ob-pr ob-btn-lg" onClick={onSignup}>Start a session</button>
              <a href="#report" className="st-link pb-0.5 text-[14px] ob-tx2 hover:text-ob-tx transition-colors">See how a report reads</a>
            </div>
          </div>
          <div className="ob-rise min-w-0 grid" style={{ ["--i" as string]: 4 }}>
            <HeroSession />
          </div>
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

          <HowItWorks />
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
            <SharpRadar focus={focusAxis} />
          </div>
          <div className="grid gap-4">
            <Reveal delay={40}>
              <Receipt
                onHover={(on) => setFocusAxis(on ? 1 : null)}
                tone="good"
                title="Chose the right data structure"
                body="A hash map keyed on the sorted string, with a reason for it."
                quote="We have a map where the key is a string, the sorted anagram, and the value stores the original strings."
                note="explicit selection of a hash map with a sorted key."
              />
            </Reveal>
            <Reveal delay={120}>
              <Receipt
                onHover={(on) => setFocusAxis(on ? 3 : null)}
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
            <Reveal className="rounded-[16px] border border-ob-ln bg-ob-card p-7">
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <span className="ob-lb">Requirements checked against your resume</span>
                <span className="ob-mo text-[11.5px] ob-tx3">sample</span>
              </div>
              {[
                { req: "Go or Java", met: true, ev: "Built a ledger reconciliation service in Go handling 2M txns/day" },
                { req: "PostgreSQL", met: true, ev: "Skills: Python, Go, FastAPI, PostgreSQL, Docker" },
                { req: "Kafka or similar event streaming", met: false, ev: "" },
                { req: "Kubernetes in production", met: false, ev: "" },
              ].map((r, i) => (
                /* Rows are checked off one after another once the card is in view. */
                <Reveal key={r.req} delay={200 + i * 180} className="border-t border-ob-ln first:border-t-0">
                  <div className="grid grid-cols-[18px_1fr] gap-3 py-4">
                    <span aria-hidden="true" className="mt-[5px] w-[11px] h-[11px] rounded-full" style={r.met ? { background: "var(--ob-ac)" } : { border: "1.5px dashed var(--ob-wn)" }} />
                    <div>
                      <div className="text-[14.5px]" style={{ color: r.met ? "var(--ob-tx)" : "var(--ob-wn)" }}>{r.req}</div>
                      <div className="text-[12.5px] mt-1 ob-tx3 italic">{r.met ? `"${r.ev}"` : "No evidence found in your resume."}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
              <p className="m-0 mt-3 pt-4 border-t border-ob-ln text-[12.5px] ob-tx3 leading-relaxed">
                Evidence has to be quoted from your resume. If the quote is not really there, it does not count.
              </p>
            </Reveal>

            <Reveal delay={90} className="rounded-[16px] border border-ob-ln bg-ob-bg2 p-7 flex flex-col">
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
            <div className="relative rounded-[22px] border border-ob-ln bg-ob-bg2 overflow-hidden px-[clamp(24px,5vw,72px)] py-[clamp(48px,9vw,104px)]">
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

      <footer className={`${wrap} relative z-[2] py-10 border-t border-ob-ln flex flex-wrap items-center justify-between gap-4 text-[12.5px] ob-tx3`}>
        <span className="flex items-center gap-2.5 ob-tx2"><Logo size={22} />Strop</span>
        <span>Practice with memory.</span>
      </footer>
    </>
  );
}
