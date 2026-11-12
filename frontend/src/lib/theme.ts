import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "interviewiq_theme";
const listeners = new Set<() => void>();

function readStored(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {}
  return "dark";
}

let current: Theme = typeof window === "undefined" ? "dark" : readStored();

export function getInitialTheme(): Theme {
  return current;
}

/** Writes the theme to <html>. Kept free of animation so it can run inside a view transition. */
export function applyTheme(theme: Theme = current): void {
  current = theme;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#0d0d0c" : "#f3eedf");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/**
 * A liquid front: a circle whose edge is gently displaced by two slow, wide sine swells, so it
 * reads as a surface of water rolling outward rather than a jagged shape.
 */
function waveFrame(cx: number, cy: number, r: number, amp: number, phase: number, points = 56): string {
  const pts: string[] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const ripple = Math.sin(a * 3 + phase) * amp + Math.sin(a * 5 - phase * 1.35) * amp * 0.42;
    const rad = Math.max(0, r + ripple);
    pts.push(`${(cx + Math.cos(a) * rad).toFixed(1)}px ${(cy + Math.sin(a) * rad).toFixed(1)}px`);
  }
  return `polygon(${pts.join(",")})`;
}

type VTDocument = Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> } };

/**
 * While the theme flips, every CSS colour transition in the app is switched off (see index.css). Otherwise hundreds of
 * buttons, cards and rows each start their own 0.3-0.5s fade on top of the wave, which both costs a lot of frames and
 * makes the page seem to animate a second time after the wave has passed.
 */
const SWITCHING = "theme-switching";
let switchTimer: number | undefined;
function beginSwitch(): void {
  window.clearTimeout(switchTimer);
  document.documentElement.classList.add(SWITCHING);
}
function endSwitch(): void {
  window.clearTimeout(switchTimer);
  // two frames later, so the style change itself has already been applied without transitions
  switchTimer = window.setTimeout(() => requestAnimationFrame(() => document.documentElement.classList.remove(SWITCHING)), 60);
}

// The theme the user last asked for. Updated synchronously so rapid clicks always flip from the latest request.
let target: Theme = current;

/** Switches theme. With an origin point, the new theme floods in from there as a wavy water front. Safe to call repeatedly. */
export function setTheme(next: Theme, origin?: { x: number; y: number }): void {
  if (next === target) return;
  target = next;
  const doc = document as VTDocument;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!origin || reduce || typeof doc.startViewTransition !== "function") {
    beginSwitch();
    applyTheme(next);
    endSwitch();
    return;
  }

  const { x, y } = origin;
  const far = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const amp = Math.min(40, Math.max(18, far * 0.035));
  const endR = far + amp * 1.6;

  // Starting a new transition skips any one still running, so toggling mid-flight just restarts from here.
  beginSwitch();
  const transition = doc.startViewTransition(() => applyTheme(next));
  transition.finished.then(endSwitch, endSwitch);
  transition.ready
    .then(() => {
      const steps = 40;
      const frames: Keyframe[] = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Soft start, but never fully stalls at the end (that read as lag once the front left the screen).
        const smooth = t * t * (3 - 2 * t);
        const eased = smooth * 0.72 + t * 0.28;
        // The swell builds as the front leaves the button, peaks mid-way, and relaxes.
        const swell = 0.25 + 0.75 * Math.pow(Math.sin(t * Math.PI), 0.8);
        frames.push({ clipPath: waveFrame(x, y, eased * endR, amp * swell, t * Math.PI * 2.4), offset: t });
      }
      doc.documentElement.animate(frames, {
        duration: 1100,
        easing: "linear",
        fill: "forwards",
        pseudoElement: "::view-transition-new(root)",
      });
    })
    .catch(() => {});
}

export function toggleTheme(origin?: { x: number; y: number }): void {
  setTheme(target === "dark" ? "light" : "dark", origin);
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current, () => "dark" as Theme);
  return { theme, toggle: toggleTheme, setTheme };
}
