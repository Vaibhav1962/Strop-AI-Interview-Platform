import { useEffect, useRef } from "react";

interface LiquidMicWaveProps {
  micOn: boolean;
  micVolume: number; // 0.0 to 1.0
  onToggleMic: () => void;
  className?: string;
}

export default function LiquidMicWave({
  micOn,
  micVolume,
  onToggleMic,
  className = "",
}: LiquidMicWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Smooth fluid level interpolation
  const currentLevelRef = useRef(0.2);
  const targetLevelRef = useRef(0.2);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let time = 0;
    const width = (canvas.width = 120);
    const height = (canvas.height = 120);

    // Rising fluid bubbles
    const bubbles: { x: number; y: number; r: number; speed: number; opacity: number }[] = [];
    for (let i = 0; i < 8; i++) {
      bubbles.push({
        x: Math.random() * width,
        y: height - Math.random() * 40,
        r: Math.random() * 2.5 + 1.2,
        speed: Math.random() * 0.8 + 0.4,
        opacity: Math.random() * 0.6 + 0.2,
      });
    }

    const render = () => {
      time += 0.045;
      ctx.clearRect(0, 0, width, height);

      // Determine target fluid level based on microphone volume
      if (!micOn) {
        targetLevelRef.current = 0.08;
      } else {
        // Minimum resting fluid is 18%, jumps dynamically up to 92% as candidate speaks
        const speechBoost = Math.min(1.0, micVolume * 3.4);
        targetLevelRef.current = 0.18 + speechBoost * 0.74;
      }

      // Smooth fluid spring interpolation
      currentLevelRef.current += (targetLevelRef.current - currentLevelRef.current) * 0.14;
      const fillHeight = height * currentLevelRef.current;
      const baseY = height - fillHeight;

      // Circular clip path for the capsule
      ctx.save();
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, width / 2 - 4, 0, Math.PI * 2);
      ctx.clip();

      // Fluid background chamber
      ctx.fillStyle = micOn ? "#071714" : "#170c0c";
      ctx.fillRect(0, 0, width, height);

      // 1. Back wave (darker aqua/teal)
      ctx.beginPath();
      const waveFreq1 = 0.055;
      const waveAmp1 = micOn ? 4.5 + micVolume * 8 : 1.5;
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 4) {
        const y = baseY + Math.sin(x * waveFreq1 - time * 1.5) * waveAmp1;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = micOn ? "rgba(5, 150, 105, 0.45)" : "rgba(220, 38, 38, 0.3)";
      ctx.fill();

      // 2. Front wave (brighter emerald / cyan gradient)
      ctx.beginPath();
      const waveFreq2 = 0.065;
      const waveAmp2 = micOn ? 6.0 + micVolume * 11 : 2.0;
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 4) {
        const y = baseY + Math.cos(x * waveFreq2 + time * 2.2) * waveAmp2;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();

      const fluidGrad = ctx.createLinearGradient(0, baseY - 10, 0, height);
      if (micOn) {
        fluidGrad.addColorStop(0, "rgba(111, 214, 164, 0.95)");  // Glowing Emerald Crest
        fluidGrad.addColorStop(0.3, "rgba(111, 214, 164, 0.88)"); // Vibrant Green
        fluidGrad.addColorStop(1, "rgba(6, 95, 70, 0.95)");     // Deep Teal Base
      } else {
        fluidGrad.addColorStop(0, "rgba(248, 113, 113, 0.8)");
        fluidGrad.addColorStop(1, "rgba(153, 27, 27, 0.9)");
      }
      ctx.fillStyle = fluidGrad;
      ctx.fill();

      // 3. Fluid foam rim highlight
      ctx.beginPath();
      for (let x = 0; x <= width; x += 4) {
        const y = baseY + Math.cos(x * waveFreq2 + time * 2.2) * waveAmp2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = micOn ? "rgba(167, 243, 208, 0.9)" : "rgba(254, 202, 202, 0.6)";
      ctx.lineWidth = 2.0;
      ctx.stroke();

      // 4. Rising micro-bubbles through the fluid
      if (micOn && currentLevelRef.current > 0.22) {
        for (const b of bubbles) {
          b.y -= b.speed + micVolume * 2.0;
          if (b.y < baseY) {
            b.y = height + 5;
            b.x = Math.random() * width;
          }
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(209, 250, 229, ${b.opacity})`;
          ctx.fill();
        }
      }

      ctx.restore();

      // Subtle Outer Glass Ring
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, width / 2 - 3, 0, Math.PI * 2);
      ctx.strokeStyle = micOn
        ? currentLevelRef.current > 0.4
          ? "rgba(111, 214, 164, 0.75)"
          : "rgba(111, 214, 164, 0.3)"
        : "rgba(239, 68, 68, 0.4)";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [micOn, micVolume]);

  const speechPercent = Math.min(100, Math.round(micVolume * 280));

  return (
    <div className={`flex items-center gap-3.5 ${className}`}>
      {/* Liquid Wave Circular Capsule */}
      <button
        onClick={onToggleMic}
        title={micOn ? "Mute Microphone" : "Unmute Microphone"}
        className="relative w-14 h-14 rounded-full p-0.5 cursor-pointer flex items-center justify-center transition-transform hover:scale-105 active:scale-95 group shadow-lg shadow-black/40"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded-full"
          style={{ filter: "drop-shadow(0 0 8px rgba(111, 214, 164, 0.25))" }}
        />

        {/* Center Mic Icon */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {micOn ? (
            <svg
              className="w-5 h-5 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] transition-transform group-hover:scale-110"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-red-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.24-5.3-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c1.33-.19 2.53-.78 3.5-1.62l3.23 3.23L21 18.27 4.27 3z" />
            </svg>
          )}
        </div>
      </button>

      {/* Voice Activity Feedback Readout */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-200">
            {micOn ? "Your Voice" : "Microphone Muted"}
          </span>
          {micOn && micVolume > 0.04 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Active
            </span>
          )}
        </div>
        <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
          {micOn ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Fluid fills as you speak ({speechPercent}%)</span>
            </>
          ) : (
            <span className="text-red-400">Click icon to unmute microphone</span>
          )}
        </div>
      </div>
    </div>
  );
}

