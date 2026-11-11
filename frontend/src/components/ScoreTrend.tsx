import { useState } from "react";
import type { ScoreTrendItem } from "../lib/api";

/**
 * Rubric coverage per evaluated session, oldest to newest. The line draws in once; hovering a point
 * names the session. Same hairline language as the daily-practice chart.
 */
export default function ScoreTrend({ items }: { items: ScoreTrendItem[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = items.length;
  if (n === 0) return null;

  const left = 40, right = 580, top = 30, bottom = 160;
  const x = (i: number) => (n === 1 ? (left + right) / 2 : left + (i * (right - left)) / (n - 1));
  const y = (v: number) => bottom - (Math.min(100, Math.max(0, v)) / 100) * (bottom - top);
  const line = items.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.overall).toFixed(1)}`).join("");
  const area = n > 1 ? `${line}L${x(n - 1).toFixed(1)} ${bottom}L${x(0).toFixed(1)} ${bottom}Z` : "";
  const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const clip = (s: string, k: number) => (s.length > k ? `${s.slice(0, k - 1)}…` : s);

  return (
    <svg
      viewBox="0 0 600 190"
      width="100%"
      className="block mt-3 touch-none"
      role="img"
      aria-label={`Rubric coverage across your last ${n} evaluated sessions: ${items.map((p) => `${p.overall}%`).join(", ")}`}
      onPointerMove={(e) => {
        if (n === 1) return setHover(0);
        const r = e.currentTarget.getBoundingClientRect();
        const vx = ((e.clientX - r.left) / r.width) * 600;
        setHover(Math.min(n - 1, Math.max(0, Math.round(((vx - left) / (right - left)) * (n - 1)))));
      }}
      onPointerLeave={() => setHover(null)}
    >
      <g stroke="var(--ob-ln)" strokeWidth="1">
        <path d={`M${left} ${y(100)}H${right}M${left} ${y(50)}H${right}`} strokeDasharray="2 4" />
        <path d={`M${left} ${bottom}H${right}`} />
      </g>
      <g fontFamily="JetBrains Mono,monospace" fontSize="10.5" fill="var(--ob-tx3)" textAnchor="end">
        <text x="32" y={y(100) + 4}>100</text>
        <text x="32" y={y(50) + 4}>50</text>
        <text x="32" y={bottom + 4}>0</text>
      </g>

      {area && <path d={area} fill="var(--ob-ac)" fillOpacity=".07" className="ob-fade" />}
      {n > 1 && <path className="ob-lk" pathLength={1} d={line} fill="none" stroke="var(--ob-ac)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
      <g className="ob-fade">
        {items.map((p, i) => {
          const last = i === n - 1;
          return <circle key={p.session_id} cx={x(i)} cy={y(p.overall)} r={last ? 5 : 3.5} fill={last ? "var(--ob-ac)" : "var(--ob-bg1)"} stroke="var(--ob-ac)" strokeWidth="2" />;
        })}
      </g>

      {hover !== null && (
        <g pointerEvents="none">
          <path d={`M${x(hover)} ${top - 6}V${bottom}`} stroke="var(--ob-ln3)" strokeWidth="1" strokeDasharray="2 3" />
          <circle cx={x(hover)} cy={y(items[hover].overall)} r="4.5" fill="var(--ob-ac)" stroke="var(--ob-card)" strokeWidth="2" />
          <text
            x={x(hover)}
            y="14"
            fontFamily="JetBrains Mono,monospace"
            fontSize="11"
            fill="var(--ob-tx)"
            textAnchor={hover < 2 && n > 2 ? "start" : hover > n - 3 && n > 2 ? "end" : "middle"}
          >
            {items[hover].overall}% · {clip(items[hover].title || "Session", 30)}
          </text>
        </g>
      )}

      <g fontFamily="JetBrains Mono,monospace" fontSize="10" fill="var(--ob-tx3)">
        <text x={x(0)} y="182" textAnchor={n === 1 ? "middle" : "start"}>{day(items[0].date)}</text>
        {n > 1 && <text x={x(n - 1)} y="182" textAnchor="end">{day(items[n - 1].date)}</text>}
      </g>
    </svg>
  );
}
