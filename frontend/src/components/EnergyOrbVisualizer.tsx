import { useEffect, useRef } from "react";
import * as THREE from "three";

interface EnergyOrbVisualizerProps {
  uiPhase: "splash" | "loading" | "alex_speaking" | "candidate_turn" | "thinking" | "completed";
  pulse?: number;
  intensity?: number;
  className?: string;
}

// -----------------------------------------------------------------------------
// Simplex 3D Noise GLSL (Ashima Arts / Stefan Gustavson)
// -----------------------------------------------------------------------------
const noiseGLSL = `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

  i = mod(i, 289.0 );
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
}
`;

// -----------------------------------------------------------------------------
// Outer Membrane Shaders (Translucent Organic Energy Shell)
// -----------------------------------------------------------------------------
const membraneVertexShader = `
${noiseGLSL}

uniform float uTime;
uniform float uDisplacement;
uniform float uSpeed;
uniform float uFrequency;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying float vDisplacement;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;

  // Organic harmonic noise displacement
  float t = uTime * uSpeed;
  float n1 = snoise(position * uFrequency + vec3(t * 0.7, t * 0.4, 0.0));
  float n2 = snoise(position * (uFrequency * 2.2) - vec3(0.0, t * 0.8, t * 0.5));
  float combinedNoise = (n1 * 0.7 + n2 * 0.3);

  vDisplacement = combinedNoise;

  vec3 newPosition = position + normal * (combinedNoise * uDisplacement);
  vec4 worldPos = modelMatrix * vec4(newPosition, 1.0);
  vWorldPosition = worldPos.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const membraneFragmentShader = `
uniform vec3 uColorCore;
uniform vec3 uColorMid;
uniform vec3 uColorRim;
uniform float uTime;
uniform float uGlowIntensity;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying float vDisplacement;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  vec3 normal = normalize(vNormal);

  // Fresnel rim factor (iridescent violet edge)
  float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.6);

  // Surface elevation color modulation
  float elevation = clamp(vDisplacement * 1.8 + 0.45, 0.0, 1.0);

  // Layered iridescent blend: Cyan Core -> Electric Blue Mid -> Radiant Violet Rim
  vec3 baseTone = mix(uColorMid, uColorCore, elevation);
  vec3 finalColor = mix(baseTone, uColorRim, fresnel);

  // Specular gleam for liquid translucent sheen
  vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));
  vec3 halfVector = normalize(lightDir + viewDir);
  float spec = pow(max(dot(normal, halfVector), 0.0), 28.0) * 0.55;

  float alpha = clamp(0.72 + fresnel * 0.35 + elevation * 0.15, 0.0, 0.98);

  // Boost glow on active speaking
  finalColor += uColorRim * (fresnel * uGlowIntensity * 0.5);
  finalColor += spec * uColorCore;

  gl_FragColor = vec4(finalColor, alpha);
}
`;

// -----------------------------------------------------------------------------
// Atmospheric Volumetric Corona Glow Shader
// -----------------------------------------------------------------------------
const coronaVertexShader = `
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const coronaFragmentShader = `
uniform vec3 uGlowColor;
uniform float uGlowPower;

varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - max(dot(viewDir, normalize(vNormal)), 0.0), 3.4);
  gl_FragColor = vec4(uGlowColor, fresnel * uGlowPower);
}
`;

export default function EnergyOrbVisualizer({
  uiPhase,
  pulse = 0,
  intensity = 1.0,
  className = "",
}: EnergyOrbVisualizerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 360;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06070a, 0.04);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Outer Organic Energy Membrane
    const membraneGeo = new THREE.IcosahedronGeometry(1.35, 48);
    const membraneUniforms = {
      uTime: { value: 0 },
      uSpeed: { value: 0.8 },
      uFrequency: { value: 1.15 },
      uDisplacement: { value: 0.12 },
      uGlowIntensity: { value: 0.5 },
      uColorCore: { value: new THREE.Color("#e6dfcc") }, // Vibrant Cyan
      uColorMid: { value: new THREE.Color("#d6cdb6") },  // Electric Blue
      uColorRim: { value: new THREE.Color("#8b5cf6") },  // Iridescent Violet
    };

    const membraneMat = new THREE.ShaderMaterial({
      vertexShader: membraneVertexShader,
      fragmentShader: membraneFragmentShader,
      uniforms: membraneUniforms,
      transparent: true,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const membraneMesh = new THREE.Mesh(membraneGeo, membraneMat);
    scene.add(membraneMesh);

    // 3. Inner Plasma Core
    const coreGeo = new THREE.SphereGeometry(0.85, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#0ea5e9"),
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // 4. Volumetric Corona / Atmosphere Aura
    const coronaGeo = new THREE.SphereGeometry(1.65, 32, 32);
    const coronaUniforms = {
      uGlowColor: { value: new THREE.Color("#e6dfcc") },
      uGlowPower: { value: 0.6 },
    };
    const coronaMat = new THREE.ShaderMaterial({
      vertexShader: coronaVertexShader,
      fragmentShader: coronaFragmentShader,
      uniforms: coronaUniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    scene.add(coronaMesh);

    // 5. Orbiting Subtle Stardust Particles
    const particleCount = 140;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);
    const particleAngles = new Float32Array(particleCount);
    const particleRadii = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const radius = 1.8 + Math.random() * 1.2;
      const angle = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 1.6;

      particlePositions[i * 3] = Math.cos(angle) * radius;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = Math.sin(angle) * radius;

      particleRadii[i] = radius;
      particleAngles[i] = angle;
      particleSpeeds[i] = (Math.random() * 0.4 + 0.3) * (Math.random() > 0.5 ? 1 : -1);
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: new THREE.Color("#a5b4fc"),
      size: 0.045,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 6. Lights
    const ambientLight = new THREE.AmbientLight(0x0a0d18, 1.2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x38bdf8, 2.5, 8);
    pointLight.position.set(2, 2, 3);
    scene.add(pointLight);

    // 7. Resize Observer
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

    // 8. Animation & Render Loop
    let clock = new THREE.Clock();
    let currentDisplacement = 0.12;
    let currentSpeed = 0.8;
    let targetDisplacement = 0.12;
    let targetSpeed = 0.8;
    let currentGlow = 0.5;

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // State determination: AI Speaking vs Idle vs Thinking
      const isAlexSpeaking = uiPhase === "alex_speaking";
      const isThinking = uiPhase === "thinking";

      if (isAlexSpeaking) {
        // High-energy fluid deformation modulated by voice pulse
        const audioAmp = 1.0 + Math.sin(time * 6 + pulse * 0.5) * 0.45;
        targetDisplacement = (0.28 + Math.abs(Math.sin(time * 4)) * 0.18) * intensity;
        targetSpeed = (1.8 + audioAmp * 0.6) * intensity;
        currentGlow = 1.1 + Math.sin(time * 5) * 0.3;

        // Dynamic electric blue / violet color bloom during speech
        membraneUniforms.uColorCore.value.set("#22d3ee");
        membraneUniforms.uColorMid.value.set("#e6dfcc");
        membraneUniforms.uColorRim.value.set("#a855f7");
        coronaUniforms.uGlowColor.value.set("#e6dfcc");
      } else if (isThinking) {
        // Amber / Violet analytical state
        targetDisplacement = 0.16;
        targetSpeed = 1.2;
        currentGlow = 0.8;
        membraneUniforms.uColorCore.value.set("#fbbf24");
        membraneUniforms.uColorMid.value.set("#e6dfcc");
        membraneUniforms.uColorRim.value.set("#ec4899");
        coronaUniforms.uGlowColor.value.set("#e8bd6f");
      } else {
        // Calm, idle breathing state
        const breathing = Math.sin(time * 1.5) * 0.04;
        targetDisplacement = 0.11 + breathing;
        targetSpeed = 0.7;
        currentGlow = 0.45;
        membraneUniforms.uColorCore.value.set("#e6dfcc");
        membraneUniforms.uColorMid.value.set("#1e40af");
        membraneUniforms.uColorRim.value.set("#7c3aed");
        coronaUniforms.uGlowColor.value.set("#e6dfcc");
      }

      // Smooth interpolation for fluid motion
      currentDisplacement += (targetDisplacement - currentDisplacement) * 0.12;
      currentSpeed += (targetSpeed - currentSpeed) * 0.1;

      membraneUniforms.uTime.value = time;
      membraneUniforms.uDisplacement.value = currentDisplacement;
      membraneUniforms.uSpeed.value = currentSpeed;
      membraneUniforms.uGlowIntensity.value = currentGlow;

      // Inner Core pulsation
      const corePulse = 0.85 + Math.sin(time * (isAlexSpeaking ? 5 : 2)) * 0.08;
      coreMesh.scale.set(corePulse, corePulse, corePulse);

      // Subtle rotation and cinematic floating
      membraneMesh.rotation.y = time * 0.18;
      membraneMesh.rotation.x = Math.sin(time * 0.25) * 0.15;
      membraneMesh.position.y = Math.sin(time * 1.2) * 0.08;

      coronaMesh.position.y = membraneMesh.position.y;
      coreMesh.position.y = membraneMesh.position.y;

      // Orbiting particles update
      const posAttr = particleGeo.attributes.position;
      const posArray = posAttr.array as Float32Array;
      const pSpeedMult = isAlexSpeaking ? 1.6 : 1.0;

      for (let i = 0; i < particleCount; i++) {
        particleAngles[i] += particleSpeeds[i] * delta * pSpeedMult;
        const rad = particleRadii[i] + Math.sin(time * 2 + i) * 0.1;
        posArray[i * 3] = Math.cos(particleAngles[i]) * rad;
        posArray[i * 3 + 2] = Math.sin(particleAngles[i]) * rad;
      }
      posAttr.needsUpdate = true;
      particleSystem.rotation.y = time * 0.08;

      // Gentle cinematic camera drift
      camera.position.x = Math.sin(time * 0.2) * 0.25;
      camera.position.y = Math.cos(time * 0.25) * 0.15;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    render();

    // 9. Cleanup
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      membraneGeo.dispose();
      membraneMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      coronaGeo.dispose();
      coronaMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, [uiPhase, pulse, intensity]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}
      style={{
        background: "radial-gradient(circle at center, rgba(16, 18, 30, 0.4) 0%, rgba(6, 7, 10, 0.95) 75%)",
      }}
    >
      {/* Cinematic subtle grid & vignettes */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(6,7,10,0.85)_100%)]" />
    </div>
  );
}

