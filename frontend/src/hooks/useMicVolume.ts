import { useEffect, useRef, useState } from "react";

/**
 * Real mic loudness via time-domain RMS (the standard "VU meter" technique) —
 * far more faithful to actual speech than averaging/peaking frequency bins,
 * which picks up ambient noise and single spiky bins as if you were talking.
 * Noise-gated so quiet room hiss doesn't register, with a fast attack /
 * slower release envelope so it feels responsive but doesn't flicker.
 */
export function useMicVolume(stream: MediaStream | null, active = true, liveRef?: { current: number }) {
  const [volume, setVolume] = useState(0);
  const rafRef = useRef<number | null>(null);
  const smoothedRef = useRef(0);
  const lastDispatchedRef = useRef(0);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    if (!stream || !active || stream.getAudioTracks().length === 0) {
      setVolume(0);
      smoothedRef.current = 0;
      lastDispatchedRef.current = 0;
      return;
    }

    const AudioCtxCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtxCtor();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);

    const NOISE_FLOOR = 0.025;
    const GAIN = 5.5;

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const normalized = (data[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      const target = Math.min(1, Math.max(0, rms - NOISE_FLOOR) * GAIN);

      const prev = smoothedRef.current;
      const smoothed = target > prev ? prev + (target - prev) * 0.55 : prev + (target - prev) * 0.12;
      smoothedRef.current = smoothed;
      // Per-frame value for canvas meters, so they stay smooth without re-rendering the page.
      if (liveRef) liveRef.current = smoothed;

      // Delta threshold throttling: dispatch state updates only on meaningful volume deltas,
      // silence transitions, or bounded intervals (~8fps max; smooth meters read liveRef instead) to eliminate main-thread render churn.
      const now = performance.now();
      const delta = Math.abs(smoothed - lastDispatchedRef.current);
      const timeSinceLast = now - lastTimeRef.current;

      if (delta >= 0.06 || (smoothed === 0 && lastDispatchedRef.current !== 0) || timeSinceLast >= 120) {
        lastDispatchedRef.current = smoothed;
        lastTimeRef.current = now;
        setVolume(smoothed);
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      source.disconnect();
      analyser.disconnect();
      ctx.close().catch(() => {});
    };
  }, [stream, active]);

  return volume;
}
