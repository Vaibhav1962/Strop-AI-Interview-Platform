/**
 * Sandboxed Python runner (Pyodide = CPython compiled to WebAssembly) inside a dedicated Web Worker.
 *
 * Why this is safe to run untrusted code in:
 *  - A worker has no DOM, no localStorage/sessionStorage and no cookies, so the page's auth token and data
 *    are unreachable.
 *  - Every network primitive (fetch, XMLHttpRequest, WebSocket, EventSource, importScripts) is removed after
 *    Pyodide has loaded, so submitted code cannot call out or exfiltrate anything.
 *  - The page terminates this worker if a run exceeds its time limit (infinite loops, fork-bomb style code)
 *    or prints more than the output cap.
 *  - Each run executes in a fresh globals dict, so runs cannot see each other's variables.
 */

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const MAX_OUTPUT_CHARS = 1_000_000;

let pyodidePromise: Promise<any> | null = null;

function lockDownNetwork() {
  const g: any = self;
  const blocked = () => Promise.reject(new Error("Network access is disabled in the code sandbox."));
  const define = (name: string, value: unknown) => {
    try {
      Object.defineProperty(g, name, { value, writable: false, configurable: false });
    } catch {
      /* already locked */
    }
  };
  define("fetch", blocked);
  define("XMLHttpRequest", undefined);
  define("WebSocket", undefined);
  define("EventSource", undefined);
  define("importScripts", undefined);
  define("indexedDB", undefined);
  define("caches", undefined);
}

async function getPyodide(): Promise<any> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      const mod: any = await import(/* @vite-ignore */ `${PYODIDE_BASE}pyodide.mjs`);
      const py = await mod.loadPyodide({ indexURL: PYODIDE_BASE });
      // Runs a program and catches sys.exit() *inside* Python. If SystemExit were left to escape, Pyodide's event
      // loop would re-raise it as an uncaught worker error and the page would think the runtime crashed.
      py.runPython(`
import pyodide.code

async def __strop_run(source, namespace):
    try:
        await pyodide.code.eval_code_async(source, namespace)
    except SystemExit as exc:
        return 0 if exc.code is None else exc.code
    return None
`);
      lockDownNetwork();
      return py;
    })();
    pyodidePromise.catch(() => {
      pyodidePromise = null; // allow a retry after a failed download
    });
  }
  return pyodidePromise;
}

/**
 * Keeps only the candidate's own frames in a traceback. Pyodide's internals are always dropped. When a test
 * harness ran the code (it compiles the candidate's source as "main.py"), the harness' own frames are dropped
 * too; for a plain run, code compiled as "<exec>" is shown as main.py.
 */
function cleanTraceback(message: string): string {
  const lines = message.trim().split("\n");
  const hasMain = lines.some((l) => /^\s+File "main\.py"/.test(l));
  const out: string[] = [];
  let skipping = false;
  for (const line of lines) {
    const frame = /^ {2}File "([^"]*)"/.exec(line);
    if (frame) {
      const file = frame[1];
      skipping = file.includes("_pyodide") || file.startsWith("/lib/python") || (file === "<exec>" && hasMain);
      if (skipping) continue;
      out.push(file === "<exec>" ? line.replace('File "<exec>"', 'File "main.py"') : line);
    } else if (skipping && /^ {4}/.test(line)) {
      continue; // source line / caret belonging to a dropped frame
    } else {
      skipping = false;
      out.push(line);
    }
  }
  return out.join("\n").trim();
}

function isSyntaxProblem(message: string): boolean {
  const last = message.trim().split("\n").pop() ?? "";
  return /^(SyntaxError|IndentationError|TabError)\b/.test(last.trim());
}

/** Errors after which the interpreter itself is no longer trustworthy: tell the page to start a fresh worker. */
function isFatalRuntimeError(message: string): boolean {
  return /Aborted\(|out of memory|memory access out of bounds|unreachable|Maximum call stack size/i.test(message);
}

self.onmessage = async (event: MessageEvent) => {
  const { id, code, stdin } = event.data as { id: number; code: string; stdin: string };
  try {
    const py = await getPyodide();
    (self as any).postMessage({ id, type: "started" });

    const out: string[] = [];
    const err: string[] = [];
    let written = 0;
    let overflowed = false;
    const sink = (target: string[]) => (s: string) => {
      if (overflowed) return;
      written += s.length + 1;
      if (written > MAX_OUTPUT_CHARS) {
        overflowed = true;
        (self as any).postMessage({ id, type: "overflow" }); // the page stops this worker
        return;
      }
      target.push(s);
    };
    py.setStdout({ batched: sink(out) });
    py.setStderr({ batched: sink(err) });

    const lines = String(stdin ?? "").replace(/\r\n/g, "\n").split("\n");
    if (lines.length && lines[lines.length - 1] === "") lines.pop();
    let cursor = 0;
    py.setStdin({ stdin: () => (cursor < lines.length ? lines[cursor++] : null) });

    // Behave like `python main.py`: scripts rely on `if __name__ == "__main__":` to start.
    const globals = py.globals.get("dict")();
    globals.set("__name__", "__main__");
    globals.set("__file__", "main.py");
    const started = performance.now();
    let status = "Accepted";
    let fatal: string | null = null;
    const runner = py.globals.get("__strop_run");
    try {
      // undefined = ran to the end; otherwise the value passed to sys.exit()
      const exit = await runner(code, globals);
      if (exit !== undefined && exit !== null && exit !== 0) {
        status = "Runtime Error";
        if (typeof exit === "number") {
          err.push(`Process exited with code ${exit}`);
        } else {
          err.push(String(exit), "Process exited with code 1"); // sys.exit("message") prints it and exits 1
        }
      }
    } catch (e: any) {
      const message = String(e?.message ?? e);
      if (isFatalRuntimeError(message)) {
        fatal = message;
      } else {
        status = isSyntaxProblem(message) ? "Syntax Error" : "Runtime Error";
        err.push(cleanTraceback(message));
      }
    } finally {
      runner.destroy();
      try {
        globals.destroy();
      } catch {
        /* the interpreter is already gone */
      }
    }
    if (fatal) {
      (self as any).postMessage({ id, type: "failed", message: `The Python runtime stopped (out of memory or crashed). Please run again.` });
      return;
    }

    (self as any).postMessage({
      id,
      type: "done",
      stdout: out.length ? out.join("\n") + "\n" : "",
      stderr: err.length ? err.join("\n") : "",
      status,
      durationMs: Math.round(performance.now() - started),
    });
  } catch (e: any) {
    (self as any).postMessage({
      id,
      type: "failed",
      message: `Could not start the Python runtime: ${String(e?.message ?? e)}`,
    });
  }
};

export {};
