import { recordRun } from "./runLog";
import PythonWorker from "./pythonWorker?worker";

/**
 * Single entry point for running code. Both supported languages run entirely in the browser, in locked-down
 * Web Workers, so nothing a candidate writes ever reaches our servers:
 *  - Python: Pyodide (CPython compiled to WebAssembly), loaded once and reused for every run.
 *  - JavaScript: a sandboxed runner (public/sandbox/js-runner.js) that behaves like `node main.js`; every run
 *    gets a brand-new worker, so runs cannot affect each other.
 * Every run is recorded in the local run log for later interview analysis.
 */

export type ExecuteLanguage = "Python" | "JavaScript";

export const EXECUTE_LANGUAGES: readonly ExecuteLanguage[] = ["Python", "JavaScript"];

export interface ExecuteResult {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: string | null;
  time: string | null;
  memory: number | null;
}

const RUN_TIME_LIMIT_MS = 10_000; // execution budget once the runtime is ready
const STARTUP_LIMIT_MS = 90_000; // first-time Python runtime download
const JS_RUNNER_URL = "/sandbox/js-runner.js";

interface RunOutcome extends ExecuteResult {
  durationMs: number;
}

interface Runtime {
  /** The worker to run on (created on demand). */
  acquire(): Worker;
  /** Called when a run has finished. `healthy` is false when the worker was killed or crashed. */
  release(worker: Worker, healthy: boolean): void;
}

// --- Python: one long-lived worker (the interpreter is expensive to start) ---------------------------------
let pythonWorker: Worker | null = null;
const pythonRuntime: Runtime = {
  acquire() {
    if (!pythonWorker) pythonWorker = new PythonWorker();
    return pythonWorker;
  },
  release(worker, healthy) {
    if (!healthy) {
      worker.terminate();
      if (pythonWorker === worker) pythonWorker = null; // the next run starts a clean runtime
    }
  },
};

// --- JavaScript: a fresh worker per run, with the next one already waiting so Run feels instant ------------
let idleJsWorker: Worker | null = null;
function spawnJsWorker(): Worker {
  return new Worker(JS_RUNNER_URL, { name: "js-sandbox" });
}
const javascriptRuntime: Runtime = {
  acquire() {
    const w = idleJsWorker ?? spawnJsWorker();
    idleJsWorker = null;
    return w;
  },
  release(worker) {
    worker.terminate(); // never reuse: the next program must not see this one's globals
    try {
      idleJsWorker = spawnJsWorker();
    } catch {
      idleJsWorker = null;
    }
  },
};

/** Start loading both runtimes in the background so the first Run is fast. */
export function warmUpRuntimes(): void {
  try {
    pythonRuntime.acquire();
  } catch {
    /* created again on the first run */
  }
  try {
    if (!idleJsWorker) idleJsWorker = spawnJsWorker();
  } catch {
    idleJsWorker = null;
  }
}

function failure(message: string, status: string): RunOutcome {
  return { stdout: null, stderr: message, compile_output: null, message: null, status, time: null, memory: null, durationMs: RUN_TIME_LIMIT_MS };
}

function runOnce(runtime: Runtime, label: string, code: string, stdin: string, id: number, lineOffset: number, lineCount: number): Promise<RunOutcome> {
  return new Promise((resolve) => {
    let w: Worker;
    try {
      w = runtime.acquire();
    } catch (e) {
      resolve(failure(`The ${label} runtime could not start in this browser: ${String((e as Error)?.message ?? e)}`, "Internal Error"));
      return;
    }
    let timer: number | undefined;
    let settled = false;

    const finish = (result: RunOutcome, healthy: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      runtime.release(w, healthy);
      resolve(result);
    };
    const killAndFail = (message: string, status: string) => finish(failure(message, status), false);

    const onError = () => killAndFail(`The ${label} runtime crashed. Please run again.`, "Internal Error");

    const onMessage = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.id !== id) return;
      if (d.type === "started") {
        window.clearTimeout(timer);
        timer = window.setTimeout(
          () => killAndFail(`Execution stopped: it ran longer than ${RUN_TIME_LIMIT_MS / 1000} seconds. Check for an infinite loop.`, "Time Limit Exceeded"),
          RUN_TIME_LIMIT_MS,
        );
      } else if (d.type === "done") {
        finish(
          {
            stdout: d.stdout || null,
            stderr: d.stderr || null,
            compile_output: null,
            message: null,
            status: d.status,
            time: (d.durationMs / 1000).toFixed(3),
            memory: null,
            durationMs: d.durationMs,
          },
          true,
        );
      } else if (d.type === "overflow") {
        killAndFail("Execution stopped: the program printed too much output (over 1 MB). Check for an infinite print loop.", "Output Limit Exceeded");
      } else if (d.type === "failed") {
        killAndFail(d.message, "Internal Error");
      }
    };

    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);
    timer = window.setTimeout(
      () => killAndFail(`The ${label} runtime took too long to load. Check your connection and try again.`, "Internal Error"),
      STARTUP_LIMIT_MS,
    );
    w.postMessage({ id, code, stdin, lineOffset, lineCount });
  });
}

// One run at a time per language: the Python worker has a single interpreter, and serial runs keep timing honest.
const chains: Record<ExecuteLanguage, Promise<unknown>> = { Python: Promise.resolve(), JavaScript: Promise.resolve() };
let nextId = 1;

export interface ExecuteMeta {
  /** The candidate's own code, when `source_code` is a wrapper around it (test harness). */
  candidateCode?: string;
  /** Where this run came from, for the run log. */
  label?: string;
  /** Set false to skip the run log. */
  record?: boolean;
  /** Lines a test harness adds before the candidate's first line, so error positions match their editor. */
  lineOffset?: number;
  /** How many lines the candidate wrote; error frames beyond them (the harness) are hidden. */
  lineCount?: number;
}

export async function executeCode(
  input: { language: ExecuteLanguage; source_code: string; stdin: string },
  meta: ExecuteMeta = {},
): Promise<ExecuteResult> {
  const isPython = input.language === "Python";
  const runtime = isPython ? pythonRuntime : javascriptRuntime;
  const id = nextId++;
  const run = chains[input.language].then(() => runOnce(runtime, input.language, input.source_code, input.stdin, id, meta.lineOffset ?? 0, meta.lineCount ?? 0));
  chains[input.language] = run.catch(() => undefined);
  const { durationMs, ...result } = await run;

  if (meta.record !== false) {
    recordRun({
      language: input.language,
      engine: "browser",
      label: meta.label,
      code: meta.candidateCode ?? input.source_code,
      stdin: input.stdin,
      stdout: result.stdout ?? "",
      stderr: [result.compile_output, result.stderr, result.message].filter(Boolean).join("\n"),
      status: result.status ?? "",
      durationMs,
    });
  }
  return result;
}
