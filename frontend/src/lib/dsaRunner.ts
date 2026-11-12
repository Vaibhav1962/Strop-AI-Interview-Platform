/**
 * Everything the DSA coding screens need to run a candidate's solution against a problem's test cases,
 * in Python or JavaScript, entirely in the browser:
 *  - starterCode(): a LeetCode-style stub generated from the problem's real signature,
 *  - buildHarness(): wraps the candidate's code in a driver that feeds it each test case and prints one
 *    machine-readable result line (so the candidate's own debug prints can never corrupt the verdict),
 *  - checkResult(): compares actual to expected (order-insensitive only where the problem allows it),
 *  - runDsaTests(): runs a list of test cases and returns a verdict for each.
 *
 * Test-case convention (same as backend/tools/dsa_data.py): `input` holds one JSON value per line, one per
 * function argument; `expected` is JSON. A TreeNode argument is a level-order array, a ListNode argument is
 * an array; a "void" function is judged on its first argument after the call. Design problems (a class such
 * as MinStack or LRUCache) receive a list of operations and a list of argument lists.
 */

import { executeCode, type ExecuteLanguage } from "./codeExecution";
import type { DsaProblem, DsaTestCase } from "./dsaProblemBank";

export const RESULT_MARKER = "@@STROP_RESULT@@";

// ---------------------------------------------------------------------------------------------------------
// Problem shape helpers
// ---------------------------------------------------------------------------------------------------------

export function isDesignProblem(problem: DsaProblem): boolean {
  return /^[A-Z]/.test(problem.entryPoint || "");
}

/** Problems whose tests are missing cannot be judged (backend marks them runnable: false). */
export function isRunnable(problem: DsaProblem): boolean {
  return Array.isArray(problem.testCases) && problem.testCases.length > 0;
}

const IDENT = /^[A-Za-z_$][\w$]*$/;

function safeIdent(name: string, fallback: string): string {
  return IDENT.test(name || "") ? name : fallback;
}

function paramNames(problem: DsaProblem): string[] {
  const used = new Set<string>();
  return (problem.args || []).map((a, i) => {
    let n = safeIdent(a.name, `arg${i + 1}`);
    if (used.has(n)) n = `${n}${i + 1}`;
    used.add(n);
    return n;
  });
}

// ---------------------------------------------------------------------------------------------------------
// Starter code
// ---------------------------------------------------------------------------------------------------------

const PY_TYPES: Record<string, string> = {
  number: "int",
  string: "str",
  boolean: "bool",
  "number[]": "List[int]",
  "string[]": "List[str]",
  "number[][]": "List[List[int]]",
  "string[][]": "List[List[str]]",
  TreeNode: "Optional[TreeNode]",
  ListNode: "Optional[ListNode]",
  "ListNode[]": "List[Optional[ListNode]]",
  void: "None",
};

const JS_TYPES: Record<string, string> = {
  number: "number",
  string: "string",
  boolean: "boolean",
  "number[]": "number[]",
  "string[]": "string[]",
  "number[][]": "number[][]",
  "string[][]": "string[][]",
  TreeNode: "TreeNode",
  ListNode: "ListNode",
  "ListNode[]": "ListNode[]",
  void: "void",
};

/** Method names and their argument counts for a design problem, read from its first test (e.g. MinStack). */
function designMethods(problem: DsaProblem): { name: string; argc: number }[] {
  const first = problem.testCases?.[0];
  if (!first) return [];
  const lines = String(first.input ?? "").split("\n").filter((l) => l.trim());
  try {
    const ops: unknown = JSON.parse(lines[0] ?? "[]");
    const args: unknown = JSON.parse(lines[1] ?? "[]");
    if (!Array.isArray(ops) || !Array.isArray(args)) return [];
    const seen = new Map<string, number>();
    ops.forEach((op, i) => {
      if (typeof op !== "string" || op === problem.entryPoint || seen.has(op)) return;
      const a = args[i];
      seen.set(op, Array.isArray(a) ? a.length : 0);
    });
    return [...seen.entries()].map(([name, argc]) => ({ name, argc }));
  } catch {
    return [];
  }
}

function needs(problem: DsaProblem, type: string): boolean {
  return (problem.args || []).some((a) => a.type === type || a.type === `${type}[]`) || problem.returnType === type;
}

export function starterCode(problem: DsaProblem, language: ExecuteLanguage): string {
  const entry = safeIdent(problem.entryPoint, "solution");
  const names = paramNames(problem);
  const args = problem.args || [];

  if (language === "Python") {
    const out: string[] = ["from typing import List, Optional", ""];
    if (needs(problem, "ListNode")) {
      out.push(
        "# Definition for singly-linked list (already provided when your code runs).",
        "# class ListNode:",
        "#     def __init__(self, val=0, next=None):",
        "#         self.val = val",
        "#         self.next = next",
        "",
      );
    }
    if (needs(problem, "TreeNode")) {
      out.push(
        "# Definition for a binary tree node (already provided when your code runs).",
        "# class TreeNode:",
        "#     def __init__(self, val=0, left=None, right=None):",
        "#         self.val = val",
        "#         self.left = left",
        "#         self.right = right",
        "",
      );
    }
    if (isDesignProblem(problem)) {
      const ctor = names.length ? `, ${names.join(", ")}` : "";
      out.push(`class ${entry}:`, `    def __init__(self${ctor}):`, "        pass", "");
      for (const m of designMethods(problem)) {
        const ps = Array.from({ length: m.argc }, (_, i) => `arg${i + 1}`);
        out.push(`    def ${m.name}(self${ps.map((p) => `, ${p}`).join("")}):`, "        pass", "");
      }
      return out.join("\n").trimEnd() + "\n";
    }
    const sig = args.map((a, i) => `${names[i]}: ${PY_TYPES[a.type] ?? "object"}`).join(", ");
    const ret = PY_TYPES[problem.returnType] ?? "";
    out.push("class Solution:", `    def ${entry}(self${sig ? ", " + sig : ""})${ret ? ` -> ${ret}` : ""}:`, "        pass");
    return out.join("\n") + "\n";
  }

  // JavaScript
  const out: string[] = [];
  if (needs(problem, "ListNode")) {
    out.push(
      "// Definition for singly-linked list (already provided when your code runs).",
      "// function ListNode(val, next) {",
      "//   this.val = (val === undefined ? 0 : val);",
      "//   this.next = (next === undefined ? null : next);",
      "// }",
      "",
    );
  }
  if (needs(problem, "TreeNode")) {
    out.push(
      "// Definition for a binary tree node (already provided when your code runs).",
      "// function TreeNode(val, left, right) {",
      "//   this.val = (val === undefined ? 0 : val);",
      "//   this.left = (left === undefined ? null : left);",
      "//   this.right = (right === undefined ? null : right);",
      "// }",
      "",
    );
  }
  if (isDesignProblem(problem)) {
    out.push(`class ${entry} {`, `  constructor(${names.join(", ")}) {`, "  }", "");
    for (const m of designMethods(problem)) {
      out.push(`  ${m.name}(${Array.from({ length: m.argc }, (_, i) => `arg${i + 1}`).join(", ")}) {`, "  }", "");
    }
    out[out.length - 1] = "}";
    return out.join("\n") + "\n";
  }
  out.push("/**");
  args.forEach((a, i) => out.push(` * @param {${JS_TYPES[a.type] ?? "*"}} ${names[i]}`));
  out.push(` * @return {${JS_TYPES[problem.returnType] ?? "*"}}`, " */", `function ${entry}(${names.join(", ")}) {`, "  ", "}");
  return out.join("\n") + "\n";
}

// ---------------------------------------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------------------------------------

function b64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(bin);
}

interface HarnessConfig {
  id: string;
  entry: string;
  argTypes: string[];
  returnType: string;
  design: boolean;
}

function configFor(problem: DsaProblem): HarnessConfig {
  return {
    id: problem.id,
    entry: problem.entryPoint,
    argTypes: (problem.args || []).map((a) => a.type),
    returnType: problem.returnType,
    design: isDesignProblem(problem),
  };
}

const PY_PRELUDE = String.raw`import base64 as _b64, json as _json, sys as _sys, linecache as _linecache
from typing import *
from collections import defaultdict, deque, Counter, OrderedDict
import collections, heapq, bisect, itertools, math, functools, re

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
`;

const PY_DRIVER = String.raw`
def _strop_tree(vals):
    T = globals()["TreeNode"]
    if not vals or vals[0] is None:
        return None
    root = T(vals[0])
    queue = deque([root])
    i = 1
    while queue and i < len(vals):
        node = queue.popleft()
        if i < len(vals):
            if vals[i] is not None:
                node.left = T(vals[i])
                queue.append(node.left)
            i += 1
        if i < len(vals):
            if vals[i] is not None:
                node.right = T(vals[i])
                queue.append(node.right)
            i += 1
    return root

def _strop_tree_list(root):
    if root is None:
        return []
    out, queue, guard = [], deque([root]), 0
    while queue and guard < 200000:
        guard += 1
        n = queue.popleft()
        if n is None:
            out.append(None)
            continue
        out.append(n.val)
        queue.append(n.left)
        queue.append(n.right)
    while out and out[-1] is None:
        out.pop()
    return out

def _strop_list(arr):
    L = globals()["ListNode"]
    head = None
    for v in reversed(arr or []):
        head = L(v, head)
    return head

def _strop_list_arr(head):
    out, guard = [], 0
    while head is not None and guard < 200000:
        out.append(head.val)
        head = head.next
        guard += 1
    return out

def _strop_find(root, v):
    queue = deque([root]) if root is not None else deque()
    while queue:
        n = queue.popleft()
        if n.val == v:
            return n
        if n.left is not None:
            queue.append(n.left)
        if n.right is not None:
            queue.append(n.right)
    return None

def _strop_default(o):
    if isinstance(o, (set, frozenset)):
        return sorted(o)
    return str(o)

def _strop_parse(line):
    try:
        return _json.loads(line)
    except Exception:
        return line

def _strop_serialize(value, kind):
    if kind == "TreeNode":
        return _strop_tree_list(value)
    if kind == "ListNode":
        return _strop_list_arr(value)
    return value

def _strop_main():
    g = globals()
    cfg = _CFG
    g["__name__"] = "solution"
    _linecache.cache["main.py"] = (len(_SRC), None, _SRC.splitlines(True), "main.py")
    exec(compile(_SRC, "main.py", "exec"), g)
    lines = [l for l in _sys.stdin.read().split("\n") if l.strip() != ""]
    entry = cfg["entry"]
    if cfg["design"]:
        cls = g.get(entry)
        if cls is None:
            raise NameError("class " + entry + " is not defined")
        ops = _strop_parse(lines[0])
        argl = _strop_parse(lines[1])
        obj, out = None, []
        for op, a in zip(ops, argl):
            if op == entry:
                obj = cls(*a)
                out.append(None)
            else:
                out.append(getattr(obj, op)(*a))
        result = out
    else:
        vals = [_strop_parse(l) for l in lines]
        call, trees = [], []
        for i, kind in enumerate(cfg["argTypes"]):
            v = vals[i] if i < len(vals) else None
            if kind == "TreeNode":
                if isinstance(v, (int, float)) and not isinstance(v, bool) and trees:
                    call.append(_strop_find(trees[0], v))
                else:
                    root = _strop_tree(v)
                    trees.append(root)
                    call.append(root)
            elif kind == "ListNode":
                call.append(_strop_list(v))
            elif kind == "ListNode[]":
                call.append([_strop_list(x) for x in (v or [])])
            else:
                call.append(v)
        sol = g.get("Solution")
        fn = getattr(sol(), entry, None) if isinstance(sol, type) else None
        if fn is None:
            fn = g.get(entry)
        if not callable(fn):
            raise NameError("could not find " + entry + " (define it inside class Solution)")
        res = fn(*call)
        rtype = cfg["returnType"]
        if rtype == "void":
            res = _strop_serialize(call[0], cfg["argTypes"][0]) if call else None
        elif rtype == "TreeNode":
            res = (res.val if res is not None else None) if cfg["id"].startswith("lowest-common-ancestor") else _strop_tree_list(res)
        elif rtype == "ListNode":
            res = _strop_list_arr(res)
        result = res
    print("@@STROP_RESULT@@" + _json.dumps(result, separators=(",", ":"), default=_strop_default))

_strop_main()
`;

function pythonHarness(code: string, problem: DsaProblem): string {
  return `${PY_PRELUDE}
_SRC = _b64.b64decode("${b64(code)}").decode("utf-8")
_CFG = _json.loads(_b64.b64decode("${b64(JSON.stringify(configFor(problem)))}").decode("utf-8"))
${PY_DRIVER}`;
}

/** Drops comments so a commented-out `function TreeNode` in the starter code is not mistaken for a definition. */
function stripJsComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/.*$/gm, "$1");
}

const JS_NODE_DEFS = String.raw`function TreeNode(val, left, right) {
  this.val = (val === undefined ? 0 : val);
  this.left = (left === undefined ? null : left);
  this.right = (right === undefined ? null : right);
}
function ListNode(val, next) {
  this.val = (val === undefined ? 0 : val);
  this.next = (next === undefined ? null : next);
}`;

function jsDefinesName(code: string, name: string): boolean {
  return new RegExp(`(?:\\b(?:class|function|var|let|const)\\s+${name}\\b)`).test(stripJsComments(code));
}

function jsHarness(code: string, problem: DsaProblem): Harness {
  const entry = safeIdent(problem.entryPoint, "solution");
  const cfg = JSON.stringify(configFor(problem));
  const prelude = [
    jsDefinesName(code, "TreeNode") ? "" : JS_NODE_DEFS.split("\n").slice(0, 5).join("\n"),
    jsDefinesName(code, "ListNode") ? "" : JS_NODE_DEFS.split("\n").slice(5).join("\n"),
  ]
    .filter(Boolean)
    .join("\n");
  const head = prelude ? prelude + "\n" : "";
  const driver = String.raw`
;await (async () => {
  const __cfg = ${cfg};
  const __lines = require("fs").readFileSync(0, "utf-8").split(/\r?\n/).filter((l) => l.trim() !== "");
  const __parse = (l) => { try { return JSON.parse(l); } catch (e) { return l; } };
  const __tree = (vals) => {
    if (!vals || !vals.length || vals[0] === null) return null;
    const root = new TreeNode(vals[0]);
    const queue = [root];
    let head = 0, i = 1;
    while (head < queue.length && i < vals.length) {
      const node = queue[head++];
      if (i < vals.length) { if (vals[i] !== null) { node.left = new TreeNode(vals[i]); queue.push(node.left); } i++; }
      if (i < vals.length) { if (vals[i] !== null) { node.right = new TreeNode(vals[i]); queue.push(node.right); } i++; }
    }
    return root;
  };
  const __treeList = (root) => {
    if (!root) return [];
    const out = [], queue = [root];
    let head = 0;
    while (head < queue.length && head < 200000) {
      const n = queue[head++];
      if (n === null || n === undefined) { out.push(null); continue; }
      out.push(n.val); queue.push(n.left); queue.push(n.right);
    }
    while (out.length && out[out.length - 1] === null) out.pop();
    return out;
  };
  const __list = (arr) => { let h = null; for (let i = (arr || []).length - 1; i >= 0; i--) h = new ListNode(arr[i], h); return h; };
  const __listArr = (h) => { const out = []; let g = 0; while (h && g++ < 200000) { out.push(h.val); h = h.next; } return out; };
  const __find = (root, v) => {
    const queue = root ? [root] : [];
    let head = 0;
    while (head < queue.length) { const n = queue[head++]; if (n.val === v) return n; if (n.left) queue.push(n.left); if (n.right) queue.push(n.right); }
    return null;
  };
  const __serialize = (v, kind) => kind === "TreeNode" ? __treeList(v) : kind === "ListNode" ? __listArr(v) : v;
  let result;
  if (__cfg.design) {
    const Cls = typeof ${entry} === "function" ? ${entry} : null;
    if (!Cls) throw new ReferenceError("class ${entry} is not defined");
    const ops = __parse(__lines[0]), argl = __parse(__lines[1]);
    let obj = null;
    const out = [];
    for (let i = 0; i < ops.length; i++) {
      if (ops[i] === __cfg.entry) { obj = new Cls(...argl[i]); out.push(null); }
      else { const r = await obj[ops[i]](...argl[i]); out.push(r === undefined ? null : r); }
    }
    result = out;
  } else {
    const vals = __lines.map(__parse);
    const call = [], trees = [];
    __cfg.argTypes.forEach((kind, i) => {
      const v = i < vals.length ? vals[i] : null;
      if (kind === "TreeNode") {
        if (typeof v === "number" && trees.length) call.push(__find(trees[0], v));
        else { const r = __tree(v); trees.push(r); call.push(r); }
      } else if (kind === "ListNode") call.push(__list(v));
      else if (kind === "ListNode[]") call.push((v || []).map(__list));
      else call.push(v);
    });
    let fn = null;
    if (typeof Solution === "function") { const inst = new Solution(); if (typeof inst[__cfg.entry] === "function") fn = inst[__cfg.entry].bind(inst); }
    if (!fn && typeof ${entry} === "function") fn = ${entry};
    if (!fn) throw new ReferenceError("could not find ${entry} (define a function named ${entry})");
    let res = await fn(...call);
    if (__cfg.returnType === "void") res = call.length ? __serialize(call[0], __cfg.argTypes[0]) : null;
    else if (__cfg.returnType === "TreeNode") res = __cfg.id.startsWith("lowest-common-ancestor") ? (res ? res.val : null) : __treeList(res);
    else if (__cfg.returnType === "ListNode") res = __listArr(res);
    result = res;
  }
  console.log("${RESULT_MARKER}" + JSON.stringify(result === undefined ? null : result));
})();
`;
  const source = `${head}${code}\n${driver}`;
  return { source, lineOffset: head ? head.split("\n").length - 1 : 0, lineCount: code.split("\n").length };
}

export interface Harness {
  source: string;
  /** Lines the harness adds before the candidate's first line (so error positions can be reported against their code). */
  lineOffset: number;
  /** How many lines the candidate wrote (0 = not tracked). */
  lineCount: number;
}

export function buildHarness(code: string, language: ExecuteLanguage, problem: DsaProblem): Harness {
  if (language === "Python") return { source: pythonHarness(code, problem), lineOffset: 0, lineCount: 0 };
  return jsHarness(code, problem);
}

// ---------------------------------------------------------------------------------------------------------
// Judging
// ---------------------------------------------------------------------------------------------------------

type OrderMode = "deep" | "outer" | "flat";

/** Problems where any ordering of the answer is correct. Everything else must match in order. */
const ORDER_FREE: Record<string, OrderMode> = {
  "three-sum": "deep",
  "group-anagrams": "deep",
  subsets: "deep",
  "combination-sum": "deep",
  permutations: "outer",
  "pacific-atlantic-water-flow": "outer",
  "top-k-frequent-elements": "flat",
};

const byJson = (a: unknown, b: unknown) => {
  const x = JSON.stringify(a);
  const y = JSON.stringify(b);
  return x < y ? -1 : x > y ? 1 : 0;
};

function canonical(value: unknown, mode: OrderMode): unknown {
  if (!Array.isArray(value)) return value;
  if (mode === "flat") return [...value].sort(byJson);
  const inner = mode === "deep" ? value.map((v) => (Array.isArray(v) ? [...v].sort(byJson) : v)) : value;
  return [...inner].sort(byJson);
}

function sameValue(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= 1e-5 * Math.max(1, Math.abs(b));
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => sameValue(v, b[i]));
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    return ka.length === kb.length && ka.every((k) => sameValue((a as any)[k], (b as any)[k]));
  }
  return a === b;
}

/** Problems with several correct answers are checked by property instead of by exact match. */
const CUSTOM_CHECKS: Record<string, (inputs: any[], actual: any, expected: any) => boolean> = {
  "longest-palindromic-substring": ([s], actual, expected) => {
    if (typeof actual !== "string" || typeof s !== "string") return false;
    const isPal = actual === [...actual].reverse().join("");
    return isPal && s.includes(actual) && actual.length === String(expected).length;
  },
  "course-schedule-ii": ([n, prereqs], actual, expected) => {
    if (!Array.isArray(actual)) return false;
    if (Array.isArray(expected) && expected.length === 0) return actual.length === 0;
    if (actual.length !== n || new Set(actual).size !== n || !actual.every((c) => Number.isInteger(c) && c >= 0 && c < n)) return false;
    const pos = new Map<number, number>(actual.map((c: number, i: number) => [c, i]));
    return (prereqs as number[][]).every(([a, b]) => (pos.get(b) as number) < (pos.get(a) as number));
  },
  "alien-dictionary": ([words], actual, expected) => {
    if (typeof actual !== "string" || typeof expected !== "string") return false;
    if (expected === "") return actual === "";
    if ([...actual].sort().join("") !== [...expected].sort().join("")) return false;
    const rank = new Map<string, number>([...actual].map((c, i) => [c, i]));
    for (let i = 0; i + 1 < (words as string[]).length; i++) {
      const a = words[i] as string;
      const b = words[i + 1] as string;
      const k = [...Array(Math.min(a.length, b.length)).keys()].find((j) => a[j] !== b[j]);
      if (k !== undefined && (rank.get(a[k]) as number) > (rank.get(b[k]) as number)) return false;
    }
    return true;
  },
};

function parseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

export function inputValues(input: string): unknown[] {
  return String(input ?? "")
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => {
      const p = parseJson(l);
      return p.ok ? p.value : l;
    });
}

export function checkResult(problem: DsaProblem, input: string, actualText: string, expectedText: string): boolean {
  const actual = parseJson(actualText.trim());
  const expected = parseJson(String(expectedText ?? "").trim());
  if (!actual.ok || !expected.ok) return actualText.trim() === String(expectedText ?? "").trim();

  const custom = CUSTOM_CHECKS[problem.id];
  if (custom) {
    try {
      return custom(inputValues(input), actual.value, expected.value);
    } catch {
      return false;
    }
  }
  const mode = ORDER_FREE[problem.id];
  return mode ? sameValue(canonical(actual.value, mode), canonical(expected.value, mode)) : sameValue(actual.value, expected.value);
}

// ---------------------------------------------------------------------------------------------------------
// Running
// ---------------------------------------------------------------------------------------------------------

export interface DsaTestResult {
  testCase: DsaTestCase;
  passed: boolean;
  /** The solution's answer (JSON), or a short message when it did not produce one. */
  actualOutput: string;
  /** Anything the candidate printed while running (debug output). */
  printed: string;
  executionTime?: string;
  error?: string;
  skipped?: boolean;
}

export function splitRunOutput(stdout: string | null): { result: string | null; printed: string } {
  const lines = (stdout ?? "").split("\n");
  let result: string | null = null;
  const printed: string[] = [];
  for (const line of lines) {
    if (line.startsWith(RESULT_MARKER)) result = line.slice(RESULT_MARKER.length);
    else printed.push(line);
  }
  return { result, printed: printed.join("\n").trim() };
}

export async function runDsaTests(
  problem: DsaProblem,
  language: ExecuteLanguage,
  code: string,
  cases: DsaTestCase[],
  label: string,
  onProgress?: (done: number, total: number) => void,
): Promise<DsaTestResult[]> {
  const harness = buildHarness(code, language, problem);
  const results: DsaTestResult[] = [];
  let stopReason: string | null = null;

  for (const tc of cases) {
    if (stopReason) {
      results.push({ testCase: tc, passed: false, actualOutput: "Not run", printed: "", error: stopReason, skipped: true });
      continue;
    }
    try {
      const res = await executeCode(
        { language, source_code: harness.source, stdin: tc.input },
        { candidateCode: code, label, lineOffset: harness.lineOffset, lineCount: harness.lineCount },
      );
      const { result, printed } = splitRunOutput(res.stdout);
      const error = [res.compile_output, res.stderr, res.message].filter(Boolean).join("\n") || undefined;
      const time = res.time ? `${res.time}s` : undefined;

      if (result === null) {
        results.push({ testCase: tc, passed: false, actualOutput: error ? "Error" : "(no result)", printed, executionTime: time, error });
        // The same mistake will repeat on every case: stop early instead of making the candidate wait.
        if (res.status === "Time Limit Exceeded" || res.status === "Output Limit Exceeded") stopReason = `Skipped: ${res.status.toLowerCase()} on an earlier test.`;
        else if (res.status === "Syntax Error" || res.status === "Internal Error") stopReason = `Skipped: ${error?.split("\n").pop() ?? "same error as the first test"}`;
        continue;
      }
      results.push({
        testCase: tc,
        passed: checkResult(problem, tc.input, result, tc.expectedOutput),
        actualOutput: result,
        printed,
        executionTime: time,
        error,
      });
    } catch (err: any) {
      results.push({ testCase: tc, passed: false, actualOutput: "Execution error", printed: "", error: err?.message || "Failed to execute" });
    }
    onProgress?.(results.length, cases.length);
  }
  return results;
}
