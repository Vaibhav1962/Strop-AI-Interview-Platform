import { useEffect, useRef, useState } from "react";

/**
 * Drives an equalizer with a traveling-wave animation (two offset sine
 * waves plus per-bar shimmer) instead of independent per-bar random
 * jitter — neighboring bars stay correlated, which reads as an intentional
 * music-visualizer motion (think NCS release videos) rather than flicker.
 */
export function useProceduralLevels(barCount: number, active: boolean) {
  const [levels, setLevels] = useState<number[]>(() => new Array(barCount).fill(0.05));
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      phaseRef.current += dt * (active ? 2.4 : 0.35);
      const phase = phaseRef.current;

      const next = new Array(barCount);
      for (let i = 0; i < barCount; i++) {
        const wave = Math.sin(phase * 2 + i * 0.5);
        const counterWave = Math.sin(phase * 3.1 - i * 0.33 + 1.4);
        const shimmer = Math.sin(i * 12.9898 + phase * 6.5) * 0.5 + 0.5;
        if (active) {
          const envelope = 0.32 + 0.5 * (0.5 + 0.5 * wave);
          const detail = 0.18 * shimmer * (0.5 + 0.5 * counterWave);
          next[i] = Math.max(0.06, Math.min(1, envelope + detail));
        } else {
          next[i] = 0.04 + 0.03 * (0.5 + 0.5 * wave);
        }
      }
      setLevels(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, barCount]);

  return levels;
}
