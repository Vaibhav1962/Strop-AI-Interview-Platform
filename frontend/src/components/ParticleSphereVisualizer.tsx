import { useEffect, useRef } from "react";
import * as THREE from "three";

interface ParticleSphereVisualizerProps {
  uiPhase: "splash" | "loading" | "alex_speaking" | "candidate_turn" | "thinking" | "completed";
  pulse?: number;
  getAudioLevel?: () => number;
  className?: string;
}

// Generate soft circular glowing dot texture to prevent square pixels
function createGlowDotTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0.0, "rgba(255, 255, 255, 1.0)");
  gradient.addColorStop(0.25, "rgba(230, 223, 204, 0.95)"); // Electric Cyan
  gradient.addColorStop(0.6, "rgba(230, 223, 204, 0.55)");  // Violet Bloom
  gradient.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export default function ParticleSphereVisualizer({
  uiPhase,
  pulse = 0,
  getAudioLevel,
  className = "",
}: ParticleSphereVisualizerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Store live reactive state in refs so the WebGL context NEVER recreates during speech!
  const uiPhaseRef = useRef(uiPhase);
  uiPhaseRef.current = uiPhase;

  const pulseRef = useRef(pulse);
  pulseRef.current = pulse;

  const getAudioLevelRef = useRef(getAudioLevel);
  getAudioLevelRef.current = getAudioLevel;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 360;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06070a, 0.05);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.8);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    const glowTexture = createGlowDotTexture();

    // 3. Main Particle Sphere (1,800 dots distributed via Golden Spiral)
    const particleCount = 1800;
    const sphereGeometry = new THREE.BufferGeometry();
    const basePositions = new Float32Array(particleCount * 3);
    const livePositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const baseRadius = 1.45;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < particleCount; i++) {
      // Spherical Fibonacci distribution
      const theta = (2 * Math.PI * i) / goldenRatio;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / particleCount);

      const x = baseRadius * Math.sin(phi) * Math.cos(theta);
      const y = baseRadius * Math.sin(phi) * Math.sin(theta);
      const z = baseRadius * Math.cos(phi);

      basePositions[i * 3] = x;
      basePositions[i * 3 + 1] = y;
      basePositions[i * 3 + 2] = z;

      livePositions[i * 3] = x;
      livePositions[i * 3 + 1] = y;
      livePositions[i * 3 + 2] = z;

      // Color gradient: Cyan pole to Violet equator
      const colorRatio = Math.abs(z / baseRadius);
      const c = new THREE.Color();
      c.lerpColors(
        new THREE.Color("#8b5cf6"), // Violet
        new THREE.Color("#e6dfcc"), // Cyan
        colorRatio * 0.8 + 0.2
      );

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    sphereGeometry.setAttribute("position", new THREE.BufferAttribute(livePositions, 3));
    sphereGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const sphereMaterial = new THREE.PointsMaterial({
      size: 0.075,
      map: glowTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const spherePoints = new THREE.Points(sphereGeometry, sphereMaterial);
    scene.add(spherePoints);

    // 4. Concentric Orbital Rings (Dual rotating halo dust rings)
    const ringCount = 280;
    const ringGeometry = new THREE.BufferGeometry();
    const ringPositions = new Float32Array(ringCount * 3);
    const ringColors = new Float32Array(ringCount * 3);

    for (let i = 0; i < ringCount; i++) {
      const angle = (i / ringCount) * Math.PI * 2;
      const r = 2.05 + (Math.random() - 0.5) * 0.25;
      ringPositions[i * 3] = Math.cos(angle) * r;
      ringPositions[i * 3 + 1] = (Math.random() - 0.5) * 0.35;
      ringPositions[i * 3 + 2] = Math.sin(angle) * r;

      const rc = new THREE.Color("#e6dfcc");
      ringColors[i * 3] = rc.r;
      ringColors[i * 3 + 1] = rc.g;
      ringColors[i * 3 + 2] = rc.b;
    }

    ringGeometry.setAttribute("position", new THREE.BufferAttribute(ringPositions, 3));
    ringGeometry.setAttribute("color", new THREE.BufferAttribute(ringColors, 3));

    const ringMaterial = new THREE.PointsMaterial({
      size: 0.05,
      map: glowTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.7,
    });

    const ringPoints = new THREE.Points(ringGeometry, ringMaterial);
    ringPoints.rotation.x = 0.45;
    scene.add(ringPoints);

    // 5. Dense Inner Core Dots
    const coreCount = 350;
    const coreGeo = new THREE.BufferGeometry();
    const corePos = new Float32Array(coreCount * 3);
    for (let i = 0; i < coreCount; i++) {
      const r = Math.random() * 0.75;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      corePos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      corePos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      corePos[i * 3 + 2] = r * Math.cos(ph);
    }
    coreGeo.setAttribute("position", new THREE.BufferAttribute(corePos, 3));
    const coreMat = new THREE.PointsMaterial({
      size: 0.05,
      map: glowTexture,
      color: new THREE.Color("#0ea5e9"),
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const corePoints = new THREE.Points(coreGeo, coreMat);
    scene.add(corePoints);

    // 6. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // 7. Butter-smooth 60+ FPS animation loop
    let clock = new THREE.Clock();
    let animId: number;

    const render = () => {
      animId = requestAnimationFrame(render);
      const time = clock.getElapsedTime();
      const currentPhase = uiPhaseRef.current;
      const currentPulse = pulseRef.current;

      const isSpeaking = currentPhase === "alex_speaking";
      const isThinking = currentPhase === "thinking";

      // Rotation velocity
      spherePoints.rotation.y = time * (isSpeaking ? 0.35 : isThinking ? 0.6 : 0.15);
      spherePoints.rotation.x = Math.sin(time * 0.25) * 0.2;
      ringPoints.rotation.z = time * 0.12;
      ringPoints.rotation.y = -time * 0.22;
      corePoints.rotation.y = -time * 0.3;

      // Floating cinematic drift
      spherePoints.position.y = Math.sin(time * 1.5) * 0.08;
      ringPoints.position.y = spherePoints.position.y;
      corePoints.position.y = spherePoints.position.y;

      // Particle Displacement calculation
      const posAttr = sphereGeometry.attributes.position;
      const array = posAttr.array as Float32Array;

      // Real acoustic loudness from ElevenLabs voice (0.0 to 1.0)
      const realLoudness = getAudioLevelRef.current ? getAudioLevelRef.current() : 0;

      // Audio reactive amplitude seamlessly driven by real decoded voice buffer
      const voiceAmp = isSpeaking
        ? 0.05 + realLoudness * 0.45
        : isThinking
        ? 0.08 + Math.sin(time * 3) * 0.04
        : 0.025 + Math.sin(time * 1.4) * 0.015; // Smooth idle breathing

      const speed = isSpeaking ? 3.0 : 1.1;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const bx = basePositions[i3];
        const by = basePositions[i3 + 1];
        const bz = basePositions[i3 + 2];

        // 3D Harmonic surface waves across dots
        const wave =
          Math.sin(bx * 2.5 + time * speed) *
          Math.cos(by * 2.5 - time * speed * 0.8) *
          Math.sin(bz * 2.0 + time * speed * 0.5);

        const displacement = 1.0 + wave * voiceAmp;

        array[i3] = bx * displacement;
        array[i3 + 1] = by * displacement;
        array[i3 + 2] = bz * displacement;
      }
      posAttr.needsUpdate = true;

      // Dynamic Dot Size modulation matching speech acoustic power
      if (isSpeaking) {
        sphereMaterial.size = 0.07 + realLoudness * 0.035;
      } else {
        sphereMaterial.size = 0.07;
      }

      // Smooth camera drift
      camera.position.x = Math.sin(time * 0.3) * 0.15;
      camera.position.y = Math.cos(time * 0.35) * 0.1;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    render();

    // 8. Cleanup only on real component unmount
    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      sphereGeometry.dispose();
      sphereMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      glowTexture.dispose();
      renderer.dispose();
    };
  }, []); // Empty dependency array ensures WebGL context is created ONCE and never destroyed on pulse!

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}
      style={{
        background: "radial-gradient(circle at center, rgba(14, 18, 32, 0.5) 0%, rgba(6, 7, 10, 0.98) 78%)",
      }}
    >
      {/* Subtle background glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(230, 223, 204,0.06)_0%,transparent_70%)]" />
    </div>
  );
}

