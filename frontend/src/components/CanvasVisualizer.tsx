import { useEffect, useRef } from "react";

/**
 * A smooth, organic glowing blob whose outline pulses with `levels` — an
 * amorphous "voice orb" (closer to Siri/Assistant-style visualizers) rather
 * than spiky spectrum bars, which read as too technical/harsh at icon scale
 * and clash with this app's soft, rounded "Smooth Tech" visual language.
 * Renders on canvas for real gradient fill + blur/glow that flat DOM
 * elements can't produce.
 */
export function CanvasBlobVisualizer({
  levels,
  color,
  size = 220,
  baseRadius = 62,
  amplitude = 30,
}: {
  levels: number[];
  color: string;
  size?: number;
  baseRadius?: number;
  amplitude?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const count = levels.length;

    const points = levels.map((lvl, i) => {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const r = baseRadius + lvl * amplitude;
      return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r] as const;
    });

    const tracePath = () => {
      ctx.beginPath();
      const first = points[0];
      const last = points[count - 1];
      let midX = (first[0] + last[0]) / 2;
      let midY = (first[1] + last[1]) / 2;
      ctx.moveTo(midX, midY);
      for (let i = 0; i < count; i++) {
        const cur = points[i];
        const next = points[(i + 1) % count];
        midX = (cur[0] + next[0]) / 2;
        midY = (cur[1] + next[1]) / 2;
        ctx.quadraticCurveTo(cur[0], cur[1], midX, midY);
      }
      ctx.closePath();
    };

    // Outer soft glow bloom.
    tracePath();
    const glow = ctx.createRadialGradient(cx, cy, baseRadius * 0.2, cx, cy, baseRadius + amplitude + 10);
    glow.addColorStop(0, `${color}40`);
    glow.addColorStop(0.7, `${color}22`);
    glow.addColorStop(1, `${color}00`);
    ctx.fillStyle = glow;
    ctx.shadowColor = color;
    ctx.shadowBlur = 36;
    ctx.fill();

    // Crisp outline on top for definition.
    tracePath();
    ctx.shadowBlur = 14;
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = `${color}cc`;
    ctx.stroke();

    ctx.shadowBlur = 0;
  }, [levels, color, size, baseRadius, amplitude]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, position: "absolute", inset: 0, pointerEvents: "none" }}
    />
  );
}
