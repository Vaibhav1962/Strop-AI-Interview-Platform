import { executeCode as executeOnServer, type ExecuteLanguage, type ExecuteResult } from "./api";
import { recordRun } from "./runLog";
import PythonWorker from "./pythonWorker?worker";

/**
 * Single entry point for running code.
 *  - Python runs in the browser (Pyodide in a locked-down Web Worker): free, no server, nothing untrusted
 *    ever reaches our infrastructure.
 *  - Other languages still go to the Judge0 backend.
 * Every run is recorded in the local run log for later interview analysis.
 */

const RUN_TIME_LIMIT_MS = 10_000; // execution budget once the runtime is ready
const STARTUP_LIMIT_MS = 90_000; // first-time runtime download

let worker: Worker | null = null;
let chain: Promise<unknown> = Promise.resolve();
let nextId = 1;

function getWorker(): Worker {
  if (!worker) worker = new PythonWorker();
  return worker;
}

/** Start downloading the Python runtime in the background so the first Run is fast. */
export function warmUpPython(): void {
  try {
    getWorker();
  } catch {
    /* runtime will be created on first run */
  }
}

function runPythonOnce(code: string, stdin: string): Promise<ExecuteResult & { durationMs: number }> {
  return new Promise((resolve) => {
    const w = getWorker();
    const id = nextId++;
    let timer: number | undefined;

    const finish = (result: ExecuteResult & { durationMs: number }) => {
      window.clearTimeout(timer);
      w.removeEventListener("message", onMessage);
      resolve(result);
    };

    const killAndFail = (message: string, status: string) => {
      w.terminate();
      if (worker === w) worker = null; // next run starts a clean runtime
      finish({ stdout: null, stderr: message, compile_output: null, message: null, status, time: null, memory: null, durationMs: RUN_TIME_LIMIT_MS });
    };

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
        finish({
          stdout: d.stdout || null,
          stderr: d.stderr || null,
          compile_output: null,
          message: null,
          status: d.status,
          time: (d.durationMs / 1000).toFixed(3),
          memory: null,
          durationMs: d.durationMs,
        });
      } else if (d.type === "failed") {
        killAndFail(d.message, "Internal Error");
      }
    };

    w.addEventListener("message", onMessage);
    w.addEventListener("error", () => killAndFail("The Python runtime crashed. Please run again.", "Internal Error"), { once: true });
    timer = window.setTimeout(() => killAndFail("The Python runtime took too long to load. Check your connection and try again.", "Internal Error"), STARTUP_LIMIT_MS);
    w.postMessage({ id, code, stdin });
  });
}

export interface ExecuteMeta {
  /** The candidate's own code, when `source_code` is a wrapper around it (test harness). */
  candidateCode?: string;
  /** Where this run came from, for the run log. */
  label?: string;
  /** Set false to skip the run log. */
  record?: boolean;
}

export async function executeCode(
  input: { language: ExecuteLanguage; source_code: string; stdin: string },
  meta: ExecuteMeta = {},
): Promise<ExecuteResult> {
  const started = performance.now();
  let result: ExecuteResult;
  let engine: "browser" | "judge0";
  let durationMs: number;

  if (input.language === "Python") {
    engine = "browser";
    // one run at a time: the worker has a single interpreter
    const run = chain.then(() => runPythonOnce(input.source_code, input.stdin));
    chain = run.catch(() => undefined);
    const r = await run;
    durationMs = r.durationMs;
    const { durationMs: _unused, ...rest } = r;
    result = rest;
  } else {
    engine = "judge0";
    result = await executeOnServer(input);
    durationMs = Math.round(performance.now() - started);
  }

  if (meta.record !== false) {
    recordRun({
      language: input.language,
      engine,
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

export type { ExecuteLanguage, ExecuteResult };
