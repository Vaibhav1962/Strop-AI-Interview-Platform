import { useEffect, useRef } from "react";

interface AudioVisualizer3DProps {
  uiPhase: "splash" | "loading" | "alex_speaking" | "candidate_turn" | "thinking" | "completed";
  micVolume?: number;
  pulse?: number;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
  baseRadius: number;
  theta: number;
  phi: number;
  size: number;
  hueOffset: number;
}

export default function AudioVisualizer3D({
  uiPhase,
  micVolume = 0,
  pulse = 0,
}: AudioVisualizer3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 320);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener("resize", handleResize);

    // Generate 3D spherical particle cloud
    const numParticles = 120;
    const particles: Point3D[] = [];
    const baseRadius = Math.min(width, height) * 0.24;

    for (let i = 0; i < numParticles; i++) {
      // Golden spiral distribution on sphere surface
      const theta = Math.acos(1 - (2 * (i + 0.5)) / numParticles);
      const phi = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);

      particles.push({
        x: baseRadius * Math.sin(theta) * Math.cos(phi),
        y: baseRadius * Math.sin(theta) * Math.sin(phi),
        z: baseRadius * Math.cos(theta),
        baseRadius,
        theta,
        phi,
        size: Math.random() * 2.2 + 1.2,
        hueOffset: Math.random() * 40 - 20,
      });
    }

    let angleX = 0;
    let angleY = 0;
    let time = 0;

    const render = () => {
      time += 0.025;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const fov = 350;

      const isSpeaking = uiPhase === "alex_speaking";
      const isListening = uiPhase === "candidate_turn";
      const isThinking = uiPhase === "thinking";

      // Rotation velocity
      angleY += isSpeaking ? 0.018 : isThinking ? 0.035 : 0.008;
      angleX += isSpeaking ? 0.009 : 0.004;

      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);

      // Audio intensity multiplier
      const audioAmp = isSpeaking
        ? 1.0 + Math.sin(time * 3 + pulse * 0.4) * 0.28 + Math.cos(time * 5) * 0.15
        : isListening
        ? 1.0 + Math.min(0.5, micVolume * 2.5)
        : isThinking
        ? 1.0 + Math.sin(time * 6) * 0.12
        : 1.0;

      // Color scheme based on active state
      const baseHue = isSpeaking ? 245 : isListening ? 160 : isThinking ? 38 : 220; // Indigo, Emerald, Amber, Slate

      // 1. Draw Atmospheric Glow Behind Core
      const glowGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, baseRadius * 1.8 * audioAmp);
      glowGrad.addColorStop(
        0,
        isSpeaking
          ? "rgba(230, 223, 204, 0.35)"
          : isListening
          ? "rgba(111, 214, 164, 0.25)"
          : isThinking
          ? "rgba(232, 189, 111, 0.25)"
          : "rgba(230, 223, 204, 0.12)"
      );
      glowGrad.addColorStop(
        0.5,
        isSpeaking
          ? "rgba(230, 223, 204, 0.12)"
          : isListening
          ? "rgba(5, 150, 105, 0.08)"
          : "rgba(230, 223, 204, 0.04)"
      );
      glowGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Render 3D Orbital Rings
      const ringCount = 3;
      for (let r = 0; r < ringCount; r++) {
        ctx.beginPath();
        const ringTilt = (r * Math.PI) / 3 + time * 0.3;
        const ringRadius = baseRadius * (1.15 + r * 0.22) * audioAmp;
        const ringSegments = 48;

        for (let s = 0; s <= ringSegments; s++) {
          const a = (s / ringSegments) * Math.PI * 2;
          const rx = ringRadius * Math.cos(a);
          const ry = ringRadius * Math.sin(a) * Math.cos(ringTilt);
          const rz = ringRadius * Math.sin(a) * Math.sin(ringTilt);

          // Apply rotation
          const x1 = rx * cosY + rz * sinY;
          const z1 = -rx * sinY + rz * cosY;
          const y1 = ry * cosX - z1 * sinX;
          const z2 = ry * sinX + z1 * cosX;

          const scale = fov / (fov + z2 + 250);
          const px = cx + x1 * scale;
          const py = cy + y1 * scale;

          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = `hsla(${baseHue + r * 15}, 85%, 68%, ${
          isSpeaking ? 0.35 - r * 0.08 : 0.14
        })`;
        ctx.lineWidth = isSpeaking ? 1.8 : 1.0;
        ctx.stroke();
      }

      // 3. Project and Sort 3D Particles by Depth
      const projected: Array<{
        px: number;
        py: number;
        scale: number;
        z: number;
        size: number;
        hue: number;
        alpha: number;
      }> = [];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Wave deformation
        const wave = isSpeaking
          ? Math.sin(p.theta * 4 + time * 4) * 14 + Math.cos(p.phi * 3 + time * 3) * 10
          : isListening
          ? Math.sin(p.theta * 3 + time * 2) * (micVolume * 30)
          : 0;

        const curRadius = (p.baseRadius + wave) * audioAmp;
        const px3d = curRadius * Math.sin(p.theta) * Math.cos(p.phi);
        const py3d = curRadius * Math.sin(p.theta) * Math.sin(p.phi);
        const pz3d = curRadius * Math.cos(p.theta);

        // 3D Matrix Rotation (X & Y axes)
        const x1 = px3d * cosY + pz3d * sinY;
        const z1 = -px3d * sinY + pz3d * cosY;
        const y1 = py3d * cosX - z1 * sinX;
        const z2 = py3d * sinX + z1 * cosX;

        const scale = fov / (fov + z2 + 200);
        const px = cx + x1 * scale;
        const py = cy + y1 * scale;

        // Depth-based brightness & opacity
        const depthNorm = (z2 + p.baseRadius) / (p.baseRadius * 2);
        const alpha = Math.max(0.15, Math.min(1.0, 0.2 + depthNorm * 0.8));

        projected.push({
          px,
          py,
          scale,
          z: z2,
          size: p.size * scale * (isSpeaking ? 1.3 : 1.0),
          hue: baseHue + p.hueOffset,
          alpha,
        });
      }

      // Sort by z (depth) for correct painter's algorithm
      projected.sort((a, b) => a.z - b.z);

      // Render Particles & Inter-particle Neural Links
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];

        // Connect close neighbors
        for (let j = i + 1; j < Math.min(i + 4, projected.length); j++) {
          const p2 = projected[j];
          const dist = Math.hypot(p.px - p2.px, p.py - p2.py);
          if (dist < 36 * p.scale) {
            ctx.beginPath();
            ctx.moveTo(p.px, p.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.strokeStyle = `hsla(${p.hue}, 80%, 65%, ${
              (1 - dist / (36 * p.scale)) * (isSpeaking ? 0.35 : 0.12)
            })`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        // Particle circle with glowing radial specular
        ctx.beginPath();
        ctx.arc(p.px, p.py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 90%, 75%, ${p.alpha})`;
        ctx.fill();

        if (isSpeaking && p.alpha > 0.6) {
          ctx.shadowColor = `hsl(${p.hue}, 90%, 70%)`;
          ctx.shadowBlur = 8;
        } else {
          ctx.shadowBlur = 0;
        }
      }

      ctx.shadowBlur = 0;

      // 4. Central 3D Floating Avatar Core
      const coreRadius = baseRadius * 0.42 * (isSpeaking ? 1.0 + Math.sin(time * 4) * 0.05 : 1.0);
      const coreGrad = ctx.createRadialGradient(
        cx - coreRadius * 0.28,
        cy - coreRadius * 0.28,
        2,
        cx,
        cy,
        coreRadius
      );

      if (isSpeaking) {
        coreGrad.addColorStop(0, "#c7d2fe");
        coreGrad.addColorStop(0.3, "#e6dfcc");
        coreGrad.addColorStop(0.8, "#4338ca");
        coreGrad.addColorStop(1, "#1e1b4b");
      } else if (isListening) {
        coreGrad.addColorStop(0, "#a7f3d0");
        coreGrad.addColorStop(0.3, "#6fd6a4");
        coreGrad.addColorStop(0.8, "#047857");
        coreGrad.addColorStop(1, "#064e3b");
      } else if (isThinking) {
        coreGrad.addColorStop(0, "#fde68a");
        coreGrad.addColorStop(0.3, "#e8bd6f");
        coreGrad.addColorStop(0.8, "#b45309");
        coreGrad.addColorStop(1, "#451a03");
      } else {
        coreGrad.addColorStop(0, "#383f58");
        coreGrad.addColorStop(0.5, "#1f2438");
        coreGrad.addColorStop(1, "#0e111d");
      }

      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      ctx.strokeStyle = isSpeaking
        ? "rgba(165, 180, 252, 0.6)"
        : isListening
        ? "rgba(110, 231, 183, 0.5)"
        : "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Core Symbol "A" (Alex)
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.round(coreRadius * 0.85)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("A", cx, cy + 2);

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [uiPhase, micVolume, pulse]);

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Floating Status Pill over visualizer */}
      <div className="absolute bottom-4 flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/85 bg-black/50 backdrop-blur-md border border-[#e2e5ec] border-white/10 text-xs font-mono text-[#aaa89f] text-zinc-300 shadow-sm pointer-events-none">
        <span
          className={`w-2 h-2 rounded-full ${
            uiPhase === "alex_speaking"
              ? "bg-indigo-400 animate-ping"
              : uiPhase === "candidate_turn"
              ? "bg-emerald-400 animate-pulse"
              : uiPhase === "thinking"
              ? "bg-amber-400 animate-spin"
              : "bg-zinc-500"
          }`}
        />
        <span className="capitalize font-medium">
          {uiPhase === "alex_speaking"
            ? "Alex Speaking (3D Voice Stream)"
            : uiPhase === "candidate_turn"
            ? "Candidate Speaking (Listening)"
            : uiPhase === "thinking"
            ? "Evaluating Systems Depth..."
            : "Standby"}
        </span>
      </div>
    </div>
  );
}

