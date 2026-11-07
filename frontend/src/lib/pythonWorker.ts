/**
 * Sandboxed Python runner (Pyodide = CPython compiled to WebAssembly) inside a dedicated Web Worker.
 *
 * Why this is safe to run untrusted code in:
 *  - A worker has no DOM, no localStorage/sessionStorage and no cookies, so the page's auth token and data
 *    are unreachable.
 *  - Every network primitive (fetch, XMLHttpRequest, WebSocket, EventSource, importScripts) is removed after
 *    Pyodide has loaded, so submitted code cannot call out or exfiltrate anything.
 *  - The page terminates this worker if a run exceeds its time limit (infinite loops, fork-bomb style code).
 *  - Each run executes in a fresh globals dict, so runs cannot see each other's variables.
 */

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

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
      lockDownNetwork();
      return py;
    })();
    pyodidePromise.catch(() => {
      pyodidePromise = null; // allow a retry after a failed download
    });
  }
  return pyodidePromise;
}

/** Drops Pyodide's own frames so learners only see their code in the traceback. */
function cleanTraceback(message: string): string {
  return message
    .replace(/ {2}File "\/lib\/python[^\n]*_pyodide[^\n]*\n(?: {4}[^\n]*\n)*/g, "")
    .replace(/File "<exec>"/g, 'File "main.py"')
    .trim();
}

self.onmessage = async (event: MessageEvent) => {
  const { id, code, stdin } = event.data as { id: number; code: string; stdin: string };
  try {
    const py = await getPyodide();
    (self as any).postMessage({ id, type: "started" });

    const out: string[] = [];
    const err: string[] = [];
    py.setStdout({ batched: (s: string) => out.push(s) });
    py.setStderr({ batched: (s: string) => err.push(s) });

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
    try {
      await py.runPythonAsync(code, { globals });
    } catch (e: any) {
      status = "Runtime Error";
      err.push(cleanTraceback(String(e?.message ?? e)));
    } finally {
      globals.destroy();
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
