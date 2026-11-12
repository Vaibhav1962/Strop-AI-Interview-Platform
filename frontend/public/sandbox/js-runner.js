/*
 * Sandboxed JavaScript runner. Runs candidate code inside a dedicated Web Worker, entirely in the browser.
 *
 * Why this is safe to run untrusted code in:
 *  - A worker has no DOM, no localStorage/sessionStorage and no cookies, so the app's auth token is unreachable.
 *  - This file is served with its own Content-Security-Policy (see vercel.json / security-headers.inc):
 *    `default-src 'none'; script-src 'unsafe-eval'`. The browser itself then blocks fetch, XHR, WebSocket and
 *    script loading from here, so the (necessary) eval cannot be used to call out. The removals below are a
 *    second layer for browsers or dev servers that do not apply that header.
 *  - The page terminates the worker when a run exceeds its time limit (infinite loops) or output limit.
 *  - Every run gets a brand-new worker, so runs cannot see each other's globals or patched prototypes.
 *
 * It behaves like `node main.js`: console.*, require("fs"|"readline"|"util"|"assert"...), process.stdin /
 * process.stdout / process.exit and top-level await all work, with the program's stdin supplied by the page.
 *
 * Protocol (same as the Python runner): in  {id, code, stdin}
 *   out {id, type:"started"} then {id, type:"done", stdout, stderr, status, durationMs}
 *   or  {id, type:"overflow"} when output exceeds the cap, or {id, type:"failed", message}.
 */
"use strict";

(function () {
  var MAX_OUTPUT_CHARS = 1000000;
  var hostPost = self.postMessage.bind(self);
  var realSetTimeout = self.setTimeout.bind(self);
  var realClearTimeout = self.clearTimeout.bind(self);
  var realSetInterval = self.setInterval.bind(self);
  var realClearInterval = self.clearInterval.bind(self);
  var perfNow = function () {
    return self.performance.now();
  };
  var AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

  // ---------------------------------------------------------------------------------------------------------
  // Lock down everything that could reach the network or another context.
  // ---------------------------------------------------------------------------------------------------------
  function lockDown() {
    var names = [
      "fetch", "XMLHttpRequest", "WebSocket", "WebTransport", "EventSource", "importScripts", "indexedDB",
      "caches", "Worker", "SharedWorker", "BroadcastChannel", "MessageChannel", "postMessage", "close",
    ];
    names.forEach(function (name) {
      try {
        Object.defineProperty(self, name, { value: undefined, writable: false, configurable: false });
      } catch (e) {
        /* already locked */
      }
    });
  }

  // ---------------------------------------------------------------------------------------------------------
  // util.inspect (close to Node's output for the common cases)
  // ---------------------------------------------------------------------------------------------------------
  function quote(s) {
    if (s.indexOf("'") === -1) return "'" + s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n") + "'";
    if (s.indexOf('"') === -1) return '"' + s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n") + '"';
    return "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n") + "'";
  }

  function keyText(k) {
    return /^[A-Za-z_$][\w$]*$/.test(k) ? k : quote(k);
  }

  function inspect(value, depth, seen, nested) {
    switch (typeof value) {
      case "string":
        return nested ? quote(value) : value;
      case "number":
        return Object.is(value, -0) ? "-0" : String(value);
      case "bigint":
        return String(value) + "n";
      case "boolean":
      case "undefined":
        return String(value);
      case "symbol":
        return value.toString();
      case "function": {
        var isClass = /^class[\s{]/.test(Function.prototype.toString.call(value));
        return isClass
          ? "[class " + (value.name || "(anonymous)") + "]"
          : "[Function: " + (value.name || "(anonymous)") + "]";
      }
    }
    if (value === null) return "null";
    if (seen.indexOf(value) !== -1) return "[Circular *1]";
    if (value instanceof Error) return value.stack || String(value);
    if (value instanceof Date) return isNaN(value) ? "Invalid Date" : value.toISOString();
    if (value instanceof RegExp) return String(value);

    var isArr = Array.isArray(value);
    var isMap = value instanceof Map;
    var isSet = value instanceof Set;
    var ctor = value.constructor && value.constructor.name;
    var prefix = "";
    if (isMap) prefix = "Map(" + value.size + ") ";
    else if (isSet) prefix = "Set(" + value.size + ") ";
    else if (isArr) prefix = ctor && ctor !== "Array" ? ctor + "(" + value.length + ") " : "";
    else if (ctor && ctor !== "Object") prefix = ctor + " ";
    else if (!ctor) prefix = "[Object: null prototype] ";

    if (depth > 2) return isArr ? "[Array]" : "[" + (ctor || "Object") + "]";

    var seen2 = seen.concat([value]);
    var parts = [];
    if (isArr) {
      var holes = 0;
      var max = Math.min(value.length, 100);
      for (var i = 0; i < max; i++) {
        if (!(i in value)) {
          holes++;
          continue;
        }
        if (holes) {
          parts.push("<" + holes + " empty item" + (holes > 1 ? "s" : "") + ">");
          holes = 0;
        }
        parts.push(inspect(value[i], depth + 1, seen2, true));
      }
      if (holes) parts.push("<" + holes + " empty item" + (holes > 1 ? "s" : "") + ">");
      if (value.length > 100) {
        var more = value.length - 100;
        parts.push("... " + more + " more item" + (more > 1 ? "s" : ""));
      }
    } else if (isMap) {
      value.forEach(function (v, k) {
        parts.push(inspect(k, depth + 1, seen2, true) + " => " + inspect(v, depth + 1, seen2, true));
      });
    } else if (isSet) {
      value.forEach(function (v) {
        parts.push(inspect(v, depth + 1, seen2, true));
      });
    }
    if (!isMap && !isSet) {
      Object.keys(value).forEach(function (k) {
        if (isArr && String(k >>> 0) === k) return;
        parts.push(keyText(k) + ": " + inspect(value[k], depth + 1, seen2, true));
      });
    }

    var open = isArr ? "[" : "{";
    var close = isArr ? "]" : "}";
    if (!parts.length) return prefix + open + close;
    var oneLine = prefix + open + " " + parts.join(", ") + " " + close;
    var multi = parts.some(function (p) {
      return p.indexOf("\n") !== -1;
    });
    if (!multi && oneLine.length <= 72) return oneLine;
    var pad = "  ";
    return (
      prefix + open + "\n" + pad + parts.map(function (p) { return p.split("\n").join("\n" + pad); }).join(",\n" + pad) + "\n" + close
    );
  }

  function format() {
    var args = Array.prototype.slice.call(arguments);
    var out = "";
    var first = args[0];
    var idx = 0;
    if (typeof first === "string") {
      idx = 1;
      out = first.replace(/%[sdifjoOc%]/g, function (m) {
        if (m === "%%") return "%";
        if (idx >= args.length) return m;
        var a = args[idx++];
        switch (m) {
          case "%s": return typeof a === "string" ? a : inspect(a, 1, [], false);
          case "%d": return typeof a === "bigint" ? a + "n" : String(Number(a));
          case "%i": return String(parseInt(a, 10));
          case "%f": return String(parseFloat(a));
          case "%j": try { return JSON.stringify(a); } catch (e) { return "[Circular]"; }
          case "%c": return "";
          default: return inspect(a, 0, [], true);
        }
      });
    }
    for (; idx < args.length; idx++) {
      out += (out || idx > 0 ? " " : "") + (typeof args[idx] === "string" ? args[idx] : inspect(args[idx], 0, [], true));
    }
    return out;
  }

  // ---------------------------------------------------------------------------------------------------------
  // One run
  // ---------------------------------------------------------------------------------------------------------
  function ExitSignal(code) {
    this.code = code;
  }

  function OutputLimit() {}

  function runProgram(id, code, stdinText, lineOffset, lineCount) {
    var stdout = [];
    var stderr = [];
    var written = 0;
    var overflowed = false;
    var activeTimers = 0;
    var timerHandles = {};
    var exitCode = 0;
    var errorReported = false;
    var handlers = { exit: [] };

    function emit(target, text) {
      if (overflowed) throw new OutputLimit();
      written += text.length;
      if (written > MAX_OUTPUT_CHARS) {
        overflowed = true;
        hostPost({ id: id, type: "overflow" });
        throw new OutputLimit();
      }
      target.push(text);
    }
    function writeOut(s) {
      emit(stdout, String(s));
    }
    function writeErr(s) {
      emit(stderr, String(s));
    }

    var consoleShim = {};
    ["log", "info", "debug"].forEach(function (n) {
      consoleShim[n] = function () { writeOut(format.apply(null, arguments) + "\n"); };
    });
    ["error", "warn", "trace"].forEach(function (n) {
      consoleShim[n] = function () { writeErr(format.apply(null, arguments) + "\n"); };
    });
    consoleShim.dir = function (v) { writeOut(inspect(v, 0, [], true) + "\n"); };
    consoleShim.table = consoleShim.log;
    consoleShim.assert = function (cond) {
      if (!cond) writeErr("Assertion failed" + (arguments.length > 1 ? ": " + format.apply(null, [].slice.call(arguments, 1)) : "") + "\n");
    };
    consoleShim.time = consoleShim.timeEnd = consoleShim.timeLog = consoleShim.group = consoleShim.groupEnd = function () {};
    consoleShim.group = function () { if (arguments.length) consoleShim.log.apply(null, arguments); };
    // Replace the page-level console so even code that grabs `globalThis.console` is captured.
    try {
      Object.defineProperty(self, "console", { value: consoleShim, writable: true, configurable: true });
    } catch (e) {
      /* keep going with the injected parameter */
    }

    // Timers are tracked so the run waits for them the way `node` waits for its event loop.
    function track(setter, repeat) {
      return function (fn, ms) {
        var extra = Array.prototype.slice.call(arguments, 2);
        var handle;
        activeTimers++;
        var wrapped = function () {
          if (!repeat) {
            activeTimers--;
            delete timerHandles[handle];
          }
          try {
            if (typeof fn === "function") fn.apply(null, extra);
          } catch (e) {
            reportUncaught(e);
          }
        };
        handle = setter(wrapped, ms);
        timerHandles[handle] = true;
        return handle;
      };
    }
    function untrack(clearer) {
      return function (handle) {
        if (handle !== undefined && timerHandles[handle]) {
          delete timerHandles[handle];
          activeTimers--;
        }
        clearer(handle);
      };
    }
    var setTimeoutT = track(realSetTimeout, false);
    var setIntervalT = track(realSetInterval, true);
    var clearTimeoutT = untrack(realClearTimeout);
    var clearIntervalT = untrack(realClearInterval);
    function setImmediateT(fn) {
      return setTimeoutT.apply(null, [fn, 0].concat(Array.prototype.slice.call(arguments, 1)));
    }
    var timerGlobals = {
      setTimeout: setTimeoutT, setInterval: setIntervalT, clearTimeout: clearTimeoutT, clearInterval: clearIntervalT,
      setImmediate: setImmediateT, clearImmediate: clearTimeoutT,
    };
    Object.keys(timerGlobals).forEach(function (k) {
      try {
        Object.defineProperty(self, k, { value: timerGlobals[k], writable: true, configurable: true });
      } catch (e) {
        /* ignore */
      }
    });

    // --- stdin ------------------------------------------------------------------------------------------
    var stdinLines = stdinText.replace(/\r\n/g, "\n").split("\n");
    if (stdinLines.length && stdinLines[stdinLines.length - 1] === "") stdinLines.pop();

    function makeEmitter() {
      var listeners = {};
      var api = {
        on: function (ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return api; },
        once: function (ev, fn) {
          var wrap = function () { api.removeListener(ev, wrap); fn.apply(null, arguments); };
          return api.on(ev, wrap);
        },
        addListener: function (ev, fn) { return api.on(ev, fn); },
        removeListener: function (ev, fn) {
          listeners[ev] = (listeners[ev] || []).filter(function (f) { return f !== fn; });
          return api;
        },
        off: function (ev, fn) { return api.removeListener(ev, fn); },
        removeAllListeners: function (ev) { if (ev) delete listeners[ev]; else listeners = {}; return api; },
        emit: function (ev) {
          var args = Array.prototype.slice.call(arguments, 1);
          (listeners[ev] || []).slice().forEach(function (f) { f.apply(null, args); });
          return (listeners[ev] || []).length > 0;
        },
        listenerCount: function (ev) { return (listeners[ev] || []).length; },
      };
      return api;
    }

    function makeStdin() {
      var s = makeEmitter();
      var started = false;
      var encoding = null;
      s.setEncoding = function (e) { encoding = e; return s; };
      s.resume = s.pause = s.unref = s.ref = function () { return s; };
      s.isTTY = false;
      s.fd = 0;
      var origOn = s.on;
      s.on = function (ev, fn) {
        origOn(ev, fn);
        if (!started && (ev === "data" || ev === "end" || ev === "close" || ev === "readable")) {
          started = true;
          setTimeoutT(function () {
            var text = stdinText;
            if (text.length) s.emit("data", text);
            s.emit("end");
            s.emit("close");
          }, 0);
        }
        return s;
      };
      s.addListener = s.on;
      s.read = function () {
        if (started) return null;
        started = true;
        return stdinText.length ? stdinText : null;
      };
      s[Symbol.asyncIterator] = async function* () {
        if (stdinText.length) yield stdinText;
      };
      return s;
    }

    function createInterface() {
      var rl = makeEmitter();
      var closed = false;
      var cursor = 0;
      var pendingQuestions = [];
      var scheduled = false;
      var iterating = false;
      function close() {
        if (closed) return;
        closed = true;
        rl.emit("close");
      }
      function pump() {
        scheduled = false;
        if (closed || iterating) return;
        while (cursor < stdinLines.length) {
          var line = stdinLines[cursor++];
          if (pendingQuestions.length) {
            pendingQuestions.shift()(line);
            // let the answer's continuation (a promise, a nested question) run before the next line
            if (cursor < stdinLines.length) schedule();
            else setTimeoutT(close, 0);
            return;
          }
          rl.emit("line", line);
          if (closed || iterating) return;
        }
        close();
      }
      function schedule() {
        if (!scheduled && !closed) {
          scheduled = true;
          setTimeoutT(pump, 0);
        }
      }
      rl.close = close;
      rl.pause = rl.resume = rl.setPrompt = rl.prompt = function () { return rl; };
      rl.write = function () {};
      rl.question = function (query, optsOrCb, maybeCb) {
        var cb = typeof optsOrCb === "function" ? optsOrCb : maybeCb;
        writeOut(String(query));
        pendingQuestions.push(function (answer) { cb(answer); });
        schedule();
      };
      var origOn = rl.on;
      rl.on = function (ev, fn) {
        origOn(ev, fn);
        if (ev === "line" || ev === "close") schedule();
        return rl;
      };
      rl.addListener = rl.on;
      rl[Symbol.asyncIterator] = async function* () {
        iterating = true;
        while (cursor < stdinLines.length) yield stdinLines[cursor++];
        close();
      };
      schedule();
      return rl;
    }

    // --- process / require --------------------------------------------------------------------------------
    var processShim = {
      argv: ["node", "main.js"],
      env: {},
      platform: "linux",
      version: "v22.0.0",
      versions: { node: "22.0.0" },
      pid: 1,
      arch: "x64",
      exitCode: undefined,
      stdin: makeStdin(),
      stdout: { write: function (s) { writeOut(s); return true; }, isTTY: false, columns: 80, on: function () { return this; }, end: function () {} },
      stderr: { write: function (s) { writeErr(s); return true; }, isTTY: false, on: function () { return this; }, end: function () {} },
      exit: function (c) {
        throw new ExitSignal(c === undefined ? processShim.exitCode || 0 : c);
      },
      cwd: function () { return "/"; },
      uptime: function () { return perfNow() / 1000; },
      nextTick: function (fn) {
        var extra = Array.prototype.slice.call(arguments, 1);
        activeTimers++;
        Promise.resolve().then(function () {
          activeTimers--;
          try { fn.apply(null, extra); } catch (e) { reportUncaught(e); }
        });
      },
      hrtime: Object.assign(
        function (prev) {
          var t = perfNow();
          var sec = Math.floor(t / 1000);
          var nano = Math.floor((t % 1000) * 1e6);
          if (prev) {
            var ds = sec - prev[0];
            var dn = nano - prev[1];
            if (dn < 0) { ds--; dn += 1e9; }
            return [ds, dn];
          }
          return [sec, nano];
        },
        { bigint: function () { return BigInt(Math.floor(perfNow() * 1e6)); } },
      ),
      memoryUsage: function () {
        var m = (self.performance && self.performance.memory && self.performance.memory.usedJSHeapSize) || 0;
        return { rss: m, heapTotal: m, heapUsed: m, external: 0, arrayBuffers: 0 };
      },
      on: function (ev, fn) {
        if (ev === "exit" || ev === "beforeExit") handlers.exit.push(fn);
        return processShim;
      },
      once: function (ev, fn) { return processShim.on(ev, fn); },
      emitWarning: function () {},
    };

    var utilModule = {
      format: format,
      inspect: function (v, o) { return inspect(v, 0, [], true); },
      promisify: function (fn) {
        return function () {
          var args = Array.prototype.slice.call(arguments);
          return new Promise(function (res, rej) {
            args.push(function (err, val) { return err ? rej(err) : res(val); });
            fn.apply(null, args);
          });
        };
      },
      isDeepStrictEqual: function (a, b) { return deepEqual(a, b); },
      types: {},
      TextEncoder: self.TextEncoder,
      TextDecoder: self.TextDecoder,
    };

    function deepEqual(a, b) {
      if (Object.is(a, b)) return true;
      if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
      if (Array.isArray(a) !== Array.isArray(b)) return false;
      if (a instanceof Map && b instanceof Map) {
        if (a.size !== b.size) return false;
        var ok = true;
        a.forEach(function (v, k) { if (!b.has(k) || !deepEqual(v, b.get(k))) ok = false; });
        return ok;
      }
      if (a instanceof Set && b instanceof Set) {
        if (a.size !== b.size) return false;
        var ok2 = true;
        a.forEach(function (v) { if (!b.has(v)) ok2 = false; });
        return ok2;
      }
      var ka = Object.keys(a);
      var kb = Object.keys(b);
      if (ka.length !== kb.length) return false;
      return ka.every(function (k) { return Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]); });
    }

    function AssertionError(message) {
      var e = new Error(message);
      e.name = "AssertionError";
      e.code = "ERR_ASSERTION";
      return e;
    }
    function assertFn(v, m) { if (!v) throw AssertionError(m || "The expression evaluated to a falsy value"); }
    assertFn.ok = assertFn;
    assertFn.equal = function (a, b, m) { if (a != b) throw AssertionError(m || inspect(a, 0, [], true) + " == " + inspect(b, 0, [], true)); };
    assertFn.notEqual = function (a, b, m) { if (a == b) throw AssertionError(m || inspect(a, 0, [], true) + " != " + inspect(b, 0, [], true)); };
    assertFn.strictEqual = function (a, b, m) {
      if (!Object.is(a, b)) throw AssertionError(m || "Expected values to be strictly equal:\n\n" + inspect(a, 0, [], true) + " !== " + inspect(b, 0, [], true) + "\n");
    };
    assertFn.notStrictEqual = function (a, b, m) { if (Object.is(a, b)) throw AssertionError(m || "Expected \"actual\" to be strictly unequal to: " + inspect(b, 0, [], true)); };
    assertFn.deepEqual = assertFn.deepStrictEqual = function (a, b, m) {
      if (!deepEqual(a, b)) throw AssertionError(m || "Expected values to be strictly deep-equal:\n" + inspect(a, 0, [], true) + "\n\nshould equal\n\n" + inspect(b, 0, [], true));
    };
    assertFn.notDeepStrictEqual = assertFn.notDeepEqual = function (a, b, m) { if (deepEqual(a, b)) throw AssertionError(m || "Expected \"actual\" not to be strictly deep-equal to: " + inspect(b, 0, [], true)); };
    assertFn.throws = function (fn, _e, m) {
      try { fn(); } catch (e) { return; }
      throw AssertionError(typeof _e === "string" ? _e : m || "Missing expected exception.");
    };
    assertFn.fail = function (m) { throw AssertionError(m || "Failed"); };
    assertFn.AssertionError = AssertionError;
    assertFn.strict = assertFn;

    function EventEmitter() {
      var e = makeEmitter();
      Object.keys(e).forEach(function (k) { this[k] = e[k]; }, this);
    }

    var modules = {
      fs: {
        readFileSync: function (target) {
          if (target === 0 || target === "/dev/stdin") return stdinText;
          var err = new Error("ENOENT: no such file or directory, open '" + target + "'");
          err.code = "ENOENT";
          throw err;
        },
        writeSync: function (fd, data) {
          if (fd === 2) writeErr(data); else writeOut(data);
          return String(data).length;
        },
        writeFileSync: function (target, data) {
          if (target === 1 || target === "/dev/stdout") writeOut(data);
          else if (target === 2 || target === "/dev/stderr") writeErr(data);
          else {
            var err = new Error("EROFS: read-only file system, open '" + target + "'");
            err.code = "EROFS";
            throw err;
          }
        },
        existsSync: function () { return false; },
      },
      readline: { createInterface: createInterface },
      util: utilModule,
      assert: assertFn,
      events: Object.assign(EventEmitter, { EventEmitter: EventEmitter }),
      perf_hooks: { performance: self.performance },
      os: { EOL: "\n", platform: function () { return "linux"; }, cpus: function () { return [{}]; } },
      path: {
        join: function () { return Array.prototype.slice.call(arguments).join("/").replace(/\/+/g, "/"); },
        basename: function (p) { return String(p).split("/").pop(); },
        sep: "/",
      },
      timers: timerGlobals,
      process: processShim,
    };
    modules["timers/promises"] = {
      setTimeout: function (ms, v) { return new Promise(function (r) { setTimeoutT(function () { r(v); }, ms); }); },
    };
    modules["readline/promises"] = {
      createInterface: function () {
        var rl = createInterface();
        var it = rl[Symbol.asyncIterator]();
        rl.question = function (q) {
          writeOut(String(q));
          return it.next().then(function (r) { return r.done ? "" : r.value; });
        };
        return rl;
      },
    };
    function requireShim(name) {
      var n = String(name).replace(/^node:/, "");
      if (Object.prototype.hasOwnProperty.call(modules, n)) return modules[n];
      var err = new Error("Cannot find module '" + name + "'");
      err.code = "MODULE_NOT_FOUND";
      throw err;
    }

    // --- reporting ----------------------------------------------------------------------------------------
    function describeError(e) {
      if (e && typeof e === "object" && "stack" in e) {
        // Keep the message, then only the frames that are the candidate's code, as "main.js:LINE:COL".
        // `new AsyncFunction` puts two wrapper lines before the code, hence the -2.
        var lines = String(e.stack || e).split("\n");
        var head = [];
        var frames = [];
        lines.forEach(function (ln) {
          if (!/^\s+at /.test(ln)) {
            if (!frames.length) head.push(ln);
            return;
          }
          var m = /^\s+at (?:(.*?) \()?.*<anonymous>:(\d+):(\d+)\)?$/.exec(ln);
          if (m) {
            var line = Number(m[2]) - 2 - lineOffset;
            // lines outside the candidate's own code belong to the test harness around it
            if (line < 1 || (lineCount > 0 && line > lineCount)) return;
            var fn = m[1] && m[1] !== "eval" ? m[1] : "<anonymous>";
            frames.push("    at " + fn + " (main.js:" + line + ":" + m[3] + ")");
          }
        });
        return head.join("\n") + (frames.length ? "\n" + frames.join("\n") : "");
      }
      return "Uncaught " + inspect(e, 0, [], true);
    }

    function reportUncaught(e) {
      if (e instanceof ExitSignal) {
        exitCode = e.code;
        exitRequested = true;
        finishSoon();
        return;
      }
      if (e instanceof OutputLimit) return;
      if (errorReported) return;
      errorReported = true;
      exitCode = 1;
      try { writeErr(describeError(e) + "\n"); } catch (_) { /* output cap */ }
      finishSoon();
    }

    self.addEventListener("unhandledrejection", function (ev) {
      ev.preventDefault();
      reportUncaught(ev.reason);
    });
    self.addEventListener("error", function (ev) {
      ev.preventDefault();
      reportUncaught(ev.error || new Error(ev.message));
    });

    var finished = false;
    var mainSettled = false;
    var started = perfNow();

    var exitRequested = false;
    var syntaxFailed = false;

    function finishSoon() {
      if (finished) return;
      // errors and process.exit end the program immediately, otherwise wait for timers like node does
      if (errorReported || exitRequested) return complete();
      if (mainSettled && activeTimers <= 0) complete();
    }

    function complete() {
      if (finished) return;
      finished = true;
      handlers.exit.forEach(function (f) { try { f(exitCode); } catch (_) { /* ignore */ } });
      var failed = exitCode !== 0 || errorReported;
      var err = stderr.join("");
      if (exitCode !== 0 && !errorReported) err += "Process exited with code " + exitCode + "\n";
      hostPost({
        id: id,
        type: "done",
        stdout: stdout.join(""),
        stderr: err.replace(/\n$/, ""),
        status: syntaxFailed ? "Syntax Error" : failed ? "Runtime Error" : "Accepted",
        durationMs: Math.round(perfNow() - started),
      });
    }

    // Wait for the event loop to drain (timers, readline, stdin) before reporting.
    function pollDrain() {
      if (finished) return;
      if (mainSettled && activeTimers <= 0) return complete();
      realSetTimeout(pollDrain, 4);
    }

    hostPost({ id: id, type: "started" });

    // `process`, `global` and `console` are true globals in node, so a program may legally redeclare them with
    // const/let; only the module-wrapper names are function parameters.
    ["process", "global"].forEach(function (name) {
      try {
        Object.defineProperty(self, name, { value: name === "process" ? processShim : self, writable: true, configurable: true });
      } catch (e) {
        /* ignore */
      }
    });

    var fn;
    try {
      fn = new AsyncFunction("require", "module", "exports", "__filename", "__dirname", code);
    } catch (e) {
      mainSettled = true;
      if (e instanceof EvalError) {
        // The host page served this file without the CSP that allows eval (see vercel.json / sandbox-headers.inc).
        hostPost({ id: id, type: "failed", message: "The JavaScript runner is blocked by this site's security policy (the /sandbox/ CSP header is missing). Python still works." });
        return;
      }
      errorReported = true;
      syntaxFailed = true;
      exitCode = 1;
      stderr.push("main.js\n" + (e && e.name ? e.name + ": " + e.message : String(e)) + "\n");
      return complete();
    }

    var moduleObj = { exports: {} };
    var promise;
    try {
      promise = fn.call(moduleObj.exports, requireShim, moduleObj, moduleObj.exports, "/main.js", "/");
    } catch (e) {
      mainSettled = true;
      reportUncaught(e);
      return;
    }
    Promise.resolve(promise).then(
      function () {
        mainSettled = true;
        if (processShim.exitCode) exitCode = processShim.exitCode;
        pollDrain();
      },
      function (e) {
        mainSettled = true;
        reportUncaught(e);
        if (!finished) pollDrain();
      },
    );
  }

  lockDown();

  self.onmessage = function (event) {
    var d = event.data || {};
    self.onmessage = null; // one program per worker
    try {
      runProgram(d.id, String(d.code == null ? "" : d.code), String(d.stdin == null ? "" : d.stdin), d.lineOffset | 0, d.lineCount | 0);
    } catch (e) {
      hostPost({ id: d.id, type: "failed", message: "Could not start the JavaScript runtime: " + String((e && e.message) || e) });
    }
  };
})();
