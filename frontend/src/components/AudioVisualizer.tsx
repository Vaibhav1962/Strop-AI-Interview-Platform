import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  level?: number; // 0.0 to 1.0 real-time audio volume
  getLevel?: () => number; // Optional stable telemetry getter to avoid parent component re-renders
  active: boolean;
  source?: "ai" | "candidate" | "idle";
  bars?: number;
  height?: number;
  className?: string;
  label?: string;
}

export default function AudioVisualizer({
  level,
  getLevel,
  active,
  source = "ai",
  bars = 28,
  height = 36,
  className = "",
  label,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const barHeightsRef = useRef<number[]>(new Array(bars).fill(2));
  const levelRef = useRef(level ?? 0);
  levelRef.current = level ?? 0;
  const getLevelRef = useRef(getLevel);
  getLevelRef.current = getLevel;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fixed rendering dimensions for crisp DPI
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const width = 240;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let phase = 0;

    const render = () => {
      phase += 0.08;
      ctx.clearRect(0, 0, width, height);

      const rawLevel = getLevelRef.current ? getLevelRef.current() : levelRef.current;
      const currentLevel = active ? Math.min(1.0, rawLevel) : 0;
      const barWidth = 3;
      const gap = (width - bars * barWidth) / (bars - 1);

      // Color themes for AI vs Candidate
      let grad: CanvasGradient;
      if (source === "ai") {
        grad = ctx.createLinearGradient(0, height, 0, 0);
        grad.addColorStop(0, "rgba(230, 223, 204, 0.4)");
        grad.addColorStop(1, "rgba(230, 223, 204, 0.95)");
      } else if (source === "candidate") {
        grad = ctx.createLinearGradient(0, height, 0, 0);
        grad.addColorStop(0, "rgba(111, 214, 164, 0.4)");
        grad.addColorStop(1, "rgba(111, 214, 164, 0.95)");
      } else {
        grad = ctx.createLinearGradient(0, height, 0, 0);
        grad.addColorStop(0, "rgba(120, 127, 149, 0.2)");
        grad.addColorStop(1, "rgba(120, 127, 149, 0.5)");
      }

      ctx.fillStyle = grad;

      for (let i = 0; i < bars; i++) {
        // Bell-curve weighting towards the middle bars (human speech formants)
        const centerFactor = 1 - Math.abs(i - bars / 2) / (bars / 2);
        const harmonic = Math.sin(phase + i * 0.45) * 0.25 + 0.75;
        
        // Target height calculated from real audio level
        const targetH = active
          ? Math.max(3, currentLevel * (height - 6) * centerFactor * harmonic * 1.8)
          : 2;

        // Smooth spring dampening towards target
        barHeightsRef.current[i] += (targetH - barHeightsRef.current[i]) * 0.22;
        const h = Math.min(height, Math.max(2, barHeightsRef.current[i]));

        const x = i * (barWidth + gap);
        const y = (height - h) / 2; // Centered vertical waveform

        // Rounded pill bars
        ctx.beginPath();
        const r = barWidth / 2;
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + barWidth, y, x + barWidth, y + h, r);
        ctx.arcTo(x + barWidth, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + barWidth, y, r);
        ctx.closePath();
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [active, source, bars, height]);

  return (
    <div className={`inline-flex items-center gap-3 px-3 py-1.5 rounded-xl bg-black/[0.03] bg-[#141620] border border-[#e2e5ec] border-[#232634] shadow-xs ${className}`}>
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            active
              ? source === "ai"
                ? "bg-blue-500 animate-pulse"
                : "bg-emerald-500 animate-pulse"
              : "bg-[#8b8f9e] opacity-40"
          }`}
        />
        {label && (
          <span className="text-[11px] font-mono font-medium text-[#4b5162] text-[#8f8d85]">
            {label}
          </span>
        )}
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: "160px", height: `${height}px` }}
        className="shrink-0"
      />
    </div>
  );
}

