import { useEffect, useRef } from "react";

interface NodePoint {
  id: string;
  label: string;
  xRatio: number;
  yRatio: number;
  color: string;
  glowColor: string;
  baseRadius: number;
  pulsePhase: number;
}

interface Edge {
  from: number;
  to: number;
}

interface DataPacket {
  edgeIndex: number;
  progress: number; // 0 to 1
  speed: number;
  color: string;
  tailLength: number;
}

interface TelemetryTag {
  text: string;
  x: number;
  y: number;
  speedY: number;
  opacity: number;
  color: string;
}

const ASSESSMENT_NODES: NodePoint[] = [
  { id: "raft", label: "Raft Quorum", xRatio: 0.16, yRatio: 0.24, color: "#e6dfcc", glowColor: "rgba(230, 223, 204, 0.4)", baseRadius: 4.5, pulsePhase: 0 },
  { id: "ast", label: "AST Syntax Tree", xRatio: 0.84, yRatio: 0.20, color: "#e6dfcc", glowColor: "rgba(230, 223, 204, 0.4)", baseRadius: 4, pulsePhase: 1.2 },
  { id: "judge0", label: "Judge0 Sandbox", xRatio: 0.88, yRatio: 0.64, color: "#6fd6a4", glowColor: "rgba(111, 214, 164, 0.4)", baseRadius: 5, pulsePhase: 2.5 },
  { id: "neural", label: "Neural Audio 48kHz", xRatio: 0.12, yRatio: 0.72, color: "#e6dfcc", glowColor: "rgba(230, 223, 204, 0.4)", baseRadius: 4.5, pulsePhase: 3.8 },
  { id: "bars", label: "BARS Scoring", xRatio: 0.50, yRatio: 0.12, color: "#a855f7", glowColor: "rgba(230, 223, 204, 0.4)", baseRadius: 5, pulsePhase: 4.9 },
  { id: "epoch", label: "Epoch Fencing", xRatio: 0.28, yRatio: 0.46, color: "#e6dfcc", glowColor: "rgba(230, 223, 204, 0.4)", baseRadius: 4, pulsePhase: 0.8 },
  { id: "mutex", label: "Lock Striping", xRatio: 0.74, yRatio: 0.42, color: "#6fd6a4", glowColor: "rgba(111, 214, 164, 0.4)", baseRadius: 4, pulsePhase: 2.1 },
  { id: "heap", label: "Memory Heap 0x7F", xRatio: 0.36, yRatio: 0.82, color: "#e6dfcc", glowColor: "rgba(230, 223, 204, 0.4)", baseRadius: 4.5, pulsePhase: 3.3 },
  { id: "dag", label: "DAG Topology", xRatio: 0.65, yRatio: 0.84, color: "#e6dfcc", glowColor: "rgba(230, 223, 204, 0.4)", baseRadius: 4.5, pulsePhase: 5.2 },
];

const NODE_EDGES: Edge[] = [
  { from: 0, to: 5 }, // Raft -> Epoch
  { from: 5, to: 4 }, // Epoch -> BARS
  { from: 4, to: 1 }, // BARS -> AST
  { from: 1, to: 6 }, // AST -> Lock Striping
  { from: 6, to: 2 }, // Lock Striping -> Judge0
  { from: 0, to: 3 }, // Raft -> Neural Audio
  { from: 3, to: 7 }, // Neural Audio -> Memory Heap
  { from: 7, to: 8 }, // Memory Heap -> DAG
  { from: 8, to: 2 }, // DAG -> Judge0
  { from: 5, to: 7 }, // Epoch -> Memory Heap
  { from: 4, to: 6 }, // BARS -> Lock Striping
];

const TELEMETRY_STRINGS = [
  "0x7FFE_8A1B",
  "O(N log N)",
  "QUORUM_CONSENSUS: OK",
  "BARS: 96.4",
  "EPOCH_FENCE: 0x4E",
  "MUTEX_STRIPE: 16",
  "AUDIO_IN: 48kHz PCM",
  "LATENCY: 38ms",
  "AST_DEPTH: 7",
  "JUDGE0: ISOLATED",
  "HEAP_ALLOC: 4.2MB",
  "TCP_KEEP_ALIVE",
];

export default function TechnicalBackground({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Mouse parallax tracking
    let targetMouseX = 0;
    let targetMouseY = 0;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      targetMouseX = (e.clientX - cx) / cx; // -1 to 1
      targetMouseY = (e.clientY - cy) / cy; // -1 to 1
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // Packets initialization
    const packets: DataPacket[] = NODE_EDGES.map((_, i) => ({
      edgeIndex: i,
      progress: (i * 0.18) % 1,
      speed: 0.0018 + (i % 3) * 0.0006,
      color: i % 2 === 0 ? "#e6dfcc" : "#6fd6a4",
      tailLength: 0.12,
    }));

    // Add extra reverse packets for continuous circuit density
    NODE_EDGES.forEach((_, i) => {
      packets.push({
        edgeIndex: i,
        progress: (0.5 + i * 0.14) % 1,
        speed: 0.0014 + ((i + 1) % 3) * 0.0005,
        color: i % 3 === 0 ? "#e6dfcc" : i % 3 === 1 ? "#a855f7" : "#6fd6a4",
        tailLength: 0.10,
      });
    });

    // Telemetry tags
    let tags: TelemetryTag[] = [];

    const initTags = (w: number, h: number) => {
      tags = TELEMETRY_STRINGS.map((text, i) => ({
        text,
        x: (w * (0.08 + (i * 0.08))) % (w * 0.9),
        y: (h * (0.1 + (i * 0.085))) % h,
        speedY: 0.22 + (i % 4) * 0.08,
        opacity: 0.25 + (i % 3) * 0.12,
        color: i % 3 === 0 ? "#e6dfcc" : i % 3 === 1 ? "#6fd6a4" : "#aaa89f",
      }));
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.scale(dpr, dpr);
      initTags(width, height);
    };

    resize();
    window.addEventListener("resize", resize);

    // Reduced motion check
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let lastTime = performance.now();
    let isRunning = true;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isRunning = false;
      } else {
        isRunning = true;
        lastTime = performance.now();
        animId = requestAnimationFrame(render);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // ─────────────────────────────────────────────────────────────────────────
    // Render Loop (60 FPS, Pure Continuous Math — Zero Cuts, Zero Glitches)
    // ─────────────────────────────────────────────────────────────────────────
    const render = (now: number) => {
      if (!isRunning) return;

      const dt = Math.min(now - lastTime, 40); // Cap frame delta to prevent jumps
      lastTime = now;

      // Smooth mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      const parallaxX = mouseX * 18;
      const parallaxY = mouseY * 14;

      // 1. Grid Crosshairs & Minor Grid System
      const gridSize = 64;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Precision Coordinate Crosshairs at major intersections
      ctx.fillStyle = "rgba(230, 223, 204, 0.15)";
      ctx.font = "8px 'Geist Mono', monospace";
      for (let x = gridSize * 2; x < width; x += gridSize * 4) {
        for (let y = gridSize * 2; y < height; y += gridSize * 4) {
          ctx.fillText("+", x - 2, y + 3);
        }
      }

      // 2. Harmonic Audio Waveforms at Lower Horizon (Continuous Mathematical Flow)
      // Representing real-time 48kHz audio speech & question stream
      const horizonY = height * 0.70 + parallaxY * 0.4;
      const t = now * 0.001;

      // Layer A: Electric Cyan Wave
      ctx.beginPath();
      for (let x = 0; x <= width; x += 6) {
        const y = horizonY +
          Math.sin(x * 0.0035 + t * 1.4) * 32 +
          Math.sin(x * 0.008 - t * 0.9) * 18 +
          Math.cos(x * 0.016 + t * 2.1) * 8;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(230, 223, 204, 0.28)";
      ctx.lineWidth = 1.8;
      ctx.shadowColor = "#e6dfcc";
      ctx.shadowBlur = 10;
      ctx.stroke();

      // Layer B: Cobalt Blue Harmonic
      ctx.beginPath();
      for (let x = 0; x <= width; x += 8) {
        const y = horizonY + 12 +
          Math.sin(x * 0.0045 - t * 1.1) * 26 +
          Math.cos(x * 0.009 + t * 1.6) * 14;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(230, 223, 204, 0.22)";
      ctx.lineWidth = 1.4;
      ctx.shadowColor = "#e6dfcc";
      ctx.shadowBlur = 8;
      ctx.stroke();

      // Layer C: High-frequency Shimmer
      ctx.beginPath();
      for (let x = 0; x <= width; x += 10) {
        const y = horizonY - 14 +
          Math.sin(x * 0.006 + t * 2.4) * 16 +
          Math.cos(x * 0.018 - t * 1.8) * 6;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(111, 214, 164, 0.18)";
      ctx.lineWidth = 1.0;
      ctx.shadowBlur = 0;
      ctx.stroke();

      // 3. Telemetry Tags (Seamless Vertical Modulo Wrap)
      ctx.font = "10px 'Geist Mono', monospace";
      tags.forEach((tag) => {
        if (!prefersReducedMotion) {
          tag.y -= tag.speedY * (dt / 16.6);
          if (tag.y < -30) tag.y = height + 20; // Seamless continuous wrap
        }

        // Soft edge fade
        let edgeOpacity = 1;
        if (tag.y < 120) edgeOpacity = Math.max(0, tag.y / 120);
        else if (tag.y > height - 120) edgeOpacity = Math.max(0, (height - tag.y) / 120);

        ctx.fillStyle = tag.color;
        ctx.globalAlpha = tag.opacity * edgeOpacity;
        ctx.fillText(tag.text, tag.x + parallaxX * 0.3, tag.y + parallaxY * 0.3);
      });
      ctx.globalAlpha = 1;

      // 4. Calculate Screen Positions for Technical Nodes
      const nodeCoords = ASSESSMENT_NODES.map((node) => ({
        x: node.xRatio * width + parallaxX * (0.8 + node.yRatio * 0.4),
        y: node.yRatio * height + parallaxY * (0.8 + node.xRatio * 0.4),
        color: node.color,
        glowColor: node.glowColor,
        baseRadius: node.baseRadius,
        label: node.label,
        pulsePhase: node.pulsePhase,
      }));

      // 5. Draw Interconnecting Vector Bus Lines
      NODE_EDGES.forEach((edge) => {
        const p1 = nodeCoords[edge.from];
        const p2 = nodeCoords[edge.to];
        if (!p1 || !p2) return;

        const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
        grad.addColorStop(0, "rgba(230, 223, 204, 0.18)");
        grad.addColorStop(0.5, "rgba(230, 223, 204, 0.14)");
        grad.addColorStop(1, "rgba(111, 214, 164, 0.18)");

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      // 6. Draw Continuous Energy Packets (Parametric Smooth Flow — Zero Cuts)
      packets.forEach((packet) => {
        if (!prefersReducedMotion) {
          packet.progress = (packet.progress + packet.speed * (dt / 16.6)) % 1;
        }

        const edge = NODE_EDGES[packet.edgeIndex];
        const p1 = nodeCoords[edge.from];
        const p2 = nodeCoords[edge.to];
        if (!p1 || !p2) return;

        // Current head position along parametric line
        const currX = p1.x + (p2.x - p1.x) * packet.progress;
        const currY = p1.y + (p2.y - p1.y) * packet.progress;

        // Tail position
        const tailProg = Math.max(0, packet.progress - packet.tailLength);
        const tailX = p1.x + (p2.x - p1.x) * tailProg;
        const tailY = p1.y + (p2.y - p1.y) * tailProg;

        // Packet tail streak
        const tailGrad = ctx.createLinearGradient(tailX, tailY, currX, currY);
        tailGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
        tailGrad.addColorStop(1, packet.color);

        ctx.strokeStyle = tailGrad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(currX, currY);
        ctx.stroke();

        // Glowing packet head
        ctx.shadowColor = packet.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(currX, currY, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 7. Draw Technical Nodes & Labels
      nodeCoords.forEach((node, i) => {
        const pulse = Math.sin(t * 2 + node.pulsePhase) * 0.5 + 0.5; // 0 to 1 smooth
        const radius = node.baseRadius + pulse * 1.5;

        // Outer radar pulse ring
        ctx.strokeStyle = node.glowColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 2.4, 0, Math.PI * 2);
        ctx.stroke();

        // Glowing core
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner bright pip
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(node.x, node.y, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Node technical label pill
        ctx.font = "9px 'Geist Mono', monospace";
        ctx.fillStyle = "rgba(226, 232, 240, 0.75)";
        ctx.fillText(node.label, node.x + radius + 6, node.y + 3);
      });

      // 8. Top Vignette Mask to blend with page headers
      const topVignette = ctx.createLinearGradient(0, 0, 0, 160);
      topVignette.addColorStop(0, "rgba(8, 9, 13, 0.7)");
      topVignette.addColorStop(1, "rgba(8, 9, 13, 0)");
      ctx.fillStyle = topVignette;
      ctx.fillRect(0, 0, width, 160);

      // Bottom Vignette Mask to blend with footer
      const bottomVignette = ctx.createLinearGradient(0, height - 140, 0, height);
      bottomVignette.addColorStop(0, "rgba(8, 9, 13, 0)");
      bottomVignette.addColorStop(1, "rgba(8, 9, 13, 0.85)");
      ctx.fillStyle = bottomVignette;
      ctx.fillRect(0, height - 140, width, 140);

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-0 ${className}`}
      aria-hidden="true"
    />
  );
}

