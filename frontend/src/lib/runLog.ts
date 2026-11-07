import { getCurrentUserId } from "./api";

/**
 * Local record of every code run (code, stdin, output, status, timing) so interview analysis can look at
 * how a candidate iterated: first attempt, errors hit, fixes, final result.
 */
export interface RunLogEntry {
  id: string;
  ranAt: string; // ISO timestamp
  language: string;
  engine: "browser" | "judge0";
  label?: string; // where the run came from, e.g. "compiler", "dsa-visible-test"
  code: string; // the candidate's own code (not any test harness wrapped around it)
  stdin: string;
  stdout: string;
  stderr: string;
  status: string;
  durationMs: number;
}

const MAX_ENTRIES = 200;
const MAX_FIELD = 20000;

function storageKey(): string {
  const uid = getCurrentUserId();
  return uid ? `interviewiq_${uid}_run_log` : "interviewiq_run_log";
}

const clip = (s: string | null | undefined) => (s ?? "").slice(0, MAX_FIELD);

export function getRunLog(): RunLogEntry[] {
  try {
    const raw = localStorage.getItem(storageKey());
    return raw ? (JSON.parse(raw) as RunLogEntry[]) : [];
  } catch {
    return [];
  }
}

export function recordRun(entry: Omit<RunLogEntry, "id" | "ranAt">): RunLogEntry {
  const full: RunLogEntry = {
    ...entry,
    code: clip(entry.code),
    stdin: clip(entry.stdin),
    stdout: clip(entry.stdout),
    stderr: clip(entry.stderr),
    id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ranAt: new Date().toISOString(),
  };
  try {
    const next = [...getRunLog(), full].slice(-MAX_ENTRIES);
    localStorage.setItem(storageKey(), JSON.stringify(next));
  } catch {
    /* storage full or unavailable: running code must never fail because logging did */
  }
  return full;
}

/** Runs recorded at or after a timestamp (e.g. the start of an interview). */
export function getRunsSince(sinceIso: string): RunLogEntry[] {
  return getRunLog().filter((r) => r.ranAt >= sinceIso);
}

export function clearRunLog(): void {
  try {
    localStorage.removeItem(storageKey());
  } catch {
    /* ignore */
  }
}
