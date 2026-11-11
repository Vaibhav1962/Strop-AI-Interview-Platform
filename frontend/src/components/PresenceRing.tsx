import { useEffect, useRef, type ReactNode } from "react";

/**
 * Alex's presence in the room: an avatar whose halo breathes with the actual audio level while
 * he speaks, and rests when he does not. The level is read in a frame loop and written straight
 * to the DOM, so the parent never re-renders for it.
 */
export default function PresenceRing({
  getLevel,
  active,
  size = 40,
  children,
}: {
  getLevel?: () => number;
  active: boolean;
  size?: number;
  children: ReactNode;
}) {
  const haloRef = useRef<HTMLSpanElement>(null);
  const faceRef = useRef<HTMLSpanElement>(null);
  const getLevelRef = useRef(getLevel);
  getLevelRef.current = getLevel;

  useEffect(() => {
    const halo = haloRef.current;
    const face = faceRef.current;
    if (!halo || !face) return;
    const rest = () => {
      halo.style.transform = "scale(1)";
      halo.style.opacity = "0";
      face.style.borderColor = "var(--ob-ln2)";
    };
    if (!active) {
      rest();
      return;
    }
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      halo.style.transform = "scale(1.25)";
      halo.style.opacity = "0.5";
      face.style.borderColor = "var(--ob-ac)";
      return rest;
    }
    let raf = 0;
    let smooth = 0;
    const start = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const raw = Math.min(1, Math.max(0, getLevelRef.current?.() ?? 0));
      smooth += (raw - smooth) * 0.2;
      // A slow idle breath underneath, so the halo is alive even between syllables.
      const breath = 0.5 + 0.5 * Math.sin((now - start) / 520);
      halo.style.transform = `scale(${(1.18 + breath * 0.06 + smooth * 0.5).toFixed(3)})`;
      halo.style.opacity = (0.35 + breath * 0.1 + smooth * 0.45).toFixed(3);
      face.style.borderColor = `rgb(var(--ob-ac-rgb) / ${(0.45 + smooth * 0.55).toFixed(3)})`;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      rest();
    };
  }, [active]);

  return (
    <span className="relative inline-grid place-items-center shrink-0" style={{ width: size, height: size }} aria-hidden="true">
      <span
        ref={haloRef}
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(closest-side, rgb(var(--ob-ac-rgb)/0.22), rgb(var(--ob-ac-rgb)/0.08) 62%, transparent 100%)",
          opacity: 0,
          transition: "opacity 0.5s var(--ob-ease), transform 0.12s linear",
        }}
      />
      <span
        ref={faceRef}
        className="relative w-full h-full rounded-full border grid place-items-center text-[13px] font-semibold"
        style={{ borderColor: "var(--ob-ln2)", background: "var(--ob-bg3)", transition: "border-color 0.3s var(--ob-ease)" }}
      >
        {children}
      </span>
    </span>
  );
}
