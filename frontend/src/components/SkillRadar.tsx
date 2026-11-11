import { useEffect, useId, useState } from "react";

export type SkillRadarPoint = { dimension: string; level: number };

const LEVEL_WORDS = ["", "Developing", "Working", "Fluent", "Expert"];

/**
 * Skill profile in the same language as the landing hero: hairline guides, a cream shape that
 * draws in once, small mono labels. An axis at the lowest level is marked in orange. Hovering a
 * vertex names its level; clicking (or pressing Enter on) an axis selects it.
 */
export default function SkillRadar({
  data,
  max = 4,
  selected = null,
  onSelect,
}: {
  data: SkillRadarPoint[];
  max?: number;
  selected?: number | null;
  onSelect?: (index: number) => void;
}) {
  const gradId = useId();
  const [t, setT] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const signature = data.map((d) => `${d.dimension}:${d.level}`).join("|");

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setT(1);
      return;
    }
    setT(0);
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start - 150) / 1300));
      setT(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [signature]);

  const W = 400, H = 300, cx = 200, cy = 150, R = 96;
  const N = data.length;
  const ang = (i: number) => (Math.PI * 2 * i) / N - Math.PI / 2;
  const pt = (i: number, v: number) => [cx + Math.cos(ang(i)) * R * (v / max), cy + Math.sin(ang(i)) * R * (v / max)] as const;
  const ring = (v: number) => data.map((_, i) => pt(i, v).map((n) => n.toFixed(1)).join(",")).join(" ");
  const vals = data.map((d) => Math.min(max, Math.max(0, d.level)) * t);
  const shape = vals.map((v, i) => pt(i, Math.max(v, 0.12)).map((n) => n.toFixed(1)).join(",")).join(" ");
  const short = (s: string) => (s.length > 17 ? `${s.slice(0, 16)}…` : s).toUpperCase();
  const summary = data.map((d) => `${d.dimension} ${d.level} of ${max}`).join(", ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Skill profile: ${summary}`} onMouseLeave={() => setHover(null)}>
      <defs>
        <radialGradient id={gradId} cx={cx} cy={cy} r={R} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--ob-ac)" stopOpacity="0.03" />
          <stop offset="1" stopColor="var(--ob-ac)" stopOpacity="0.18" />
        </radialGradient>
      </defs>

      {Array.from({ length: max }, (_, k) => k + 1).map((r) => (
        <polygon key={r} points={ring(r)} fill="none" stroke="var(--ob-ac)" strokeOpacity={r === max ? 0.17 : 0.07} strokeWidth="1" />
      ))}
      {data.map((_, i) => {
        const [x, y] = pt(i, max);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--ob-ac)" strokeOpacity="0.07" strokeWidth="1" />;
      })}

      <polygon
        points={shape}
        fill={`url(#${gradId})`}
        stroke="var(--ob-ac)"
        strokeOpacity="0.92"
        strokeWidth="1.5"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 6px rgb(var(--ob-ac-rgb)/0.28))" }}
      />

      {data.map((d, i) => {
        const [x, y] = pt(i, Math.max(vals[i], 0.12));
        const low = d.level <= 1;
        return (
          <g key={d.dimension}>
            <circle cx={x} cy={y} r="9" fill="none" stroke={low ? "var(--ob-hot)" : "var(--ob-ac)"} strokeWidth="1" style={{ opacity: selected === i ? 0.9 : hover === i ? 0.55 : 0, transition: "opacity 0.3s var(--ob-ease)" }} />
            {low ? (
              <circle cx={x} cy={y} r="3.4" fill="var(--ob-bg2)" stroke="var(--ob-hot)" strokeWidth="1.5" />
            ) : (
              <circle cx={x} cy={y} r="2.4" fill="var(--ob-ac)" />
            )}
          </g>
        );
      })}

      {data.map((d, i) => {
        const c = Math.cos(ang(i)), s = Math.sin(ang(i));
        const anchor = Math.abs(c) < 0.1 ? "middle" : c > 0 ? "start" : "end";
        const low = d.level <= 1;
        const on = hover === i;
        return (
          <g
            key={d.dimension}
            onMouseEnter={() => setHover(i)}
            onClick={() => onSelect?.(i)}
            onKeyDown={(e) => {
              if (onSelect && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onSelect(i);
              }
            }}
            role={onSelect ? "button" : undefined}
            tabIndex={onSelect ? 0 : undefined}
            aria-label={onSelect ? `${d.dimension}, level ${d.level} of ${max}. Show why and how to improve` : undefined}
            style={{ cursor: onSelect ? "pointer" : "default", outline: "none" }}
          >
            <title>{`${d.dimension}: ${d.level} of ${max}${LEVEL_WORDS[Math.round(d.level)] ? `, ${LEVEL_WORDS[Math.round(d.level)]}` : ""}`}</title>
            {/* A generous invisible target so the label and its vertex both respond */}
            <line x1={cx + c * 20} y1={cy + s * 20} x2={cx + c * (R + 40)} y2={cy + s * (R + 40)} stroke="transparent" strokeWidth="26" />
            <text
              x={cx + c * (R + 13)}
              y={cy + s * (R + 14) + 3.5}
              textAnchor={anchor}
              fontFamily="'JetBrains Mono', ui-monospace, monospace"
              fontSize="9.5"
              fontWeight="500"
              letterSpacing="0.08em"
              fill={low ? "var(--ob-hot)" : on || selected === i ? "var(--ob-tx)" : "var(--ob-tx3)"}
              style={{ opacity: (hover === null || on ? 1 : 0.45) * t, transition: "opacity 0.3s var(--ob-ease), fill 0.3s var(--ob-ease)" }}
            >
              {short(d.dimension)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
