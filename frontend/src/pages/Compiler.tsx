import { useEffect, useMemo, useRef, useState } from "react";
import CodeMirror, { type Extension } from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { EXECUTE_LANGUAGES, executeCode, warmUpRuntimes, type ExecuteLanguage } from "../lib/codeExecution";
import { buildEditorTheme } from "../lib/editorTheme";
import { useTheme } from "../lib/theme";

const LANGUAGES = EXECUTE_LANGUAGES;
type Language = ExecuteLanguage;

export type PresetId = "blank" | "two-sum" | "binary-search" | "lru-cache";

interface PresetConfig {
  id: PresetId;
  title: string;
  category: string;
  expectedOutput: string;
  stdin: string;
  templates: Record<Language, string>;
}

const PRESETS: PresetConfig[] = [
  {
    id: "blank",
    title: "Blank Scratchpad",
    category: "General",
    expectedOutput: "Hello, World!",
    stdin: "",
    templates: {
      Python: `def main():\n    print("Hello, World!")\n\n\nif __name__ == "__main__":\n    main()\n`,
      JavaScript: `function main() {\n  console.log("Hello, World!");\n}\n\nmain();\n`,
    },
  },
  {
    id: "two-sum",
    title: "Two Sum",
    category: "Hash Table · O(n)",
    expectedOutput: "[0, 1]",
    stdin: "2 7 11 15\n9",
    templates: {
      Python: `def two_sum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in seen:\n            return [seen[complement], i]\n        seen[num] = i\n    return []\n\nif __name__ == "__main__":\n    nums = [2, 7, 11, 15]\n    target = 9\n    result = two_sum(nums, target)\n    print(f"Input: nums={nums}, target={target}")\n    print(f"Output: {result}")\n    print("Verdict: PASSED" if result == [0, 1] else "Verdict: FAILED")\n`,
      JavaScript: `function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (seen.has(complement)) {\n      return [seen.get(complement), i];\n    }\n    seen.set(nums[i], i);\n  }\n  return [];\n}\n\nconst nums = [2, 7, 11, 15];\nconst target = 9;\nconst result = twoSum(nums, target);\nconsole.log(\`Input: nums=[\${nums}], target=\${target}\`);\nconsole.log(\`Output: [\${result}]\`);\nconsole.log(result[0] === 0 && result[1] === 1 ? "Verdict: PASSED" : "Verdict: FAILED");\n`,
    },
  },
  {
    id: "binary-search",
    title: "Binary Search",
    category: "Divide & Conquer · O(log n)",
    expectedOutput: "Index: 4",
    stdin: "-1 0 3 5 9 12\n9",
    templates: {
      Python: `def binary_search(nums, target):\n    left, right = 0, len(nums) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if nums[mid] == target:\n            return mid\n        elif nums[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1\n\nif __name__ == "__main__":\n    nums = [-1, 0, 3, 5, 9, 12]\n    target = 9\n    idx = binary_search(nums, target)\n    print(f"Input: nums={nums}, target={target}")\n    print(f"Output: Index {idx}")\n    print("Verdict: PASSED" if idx == 4 else "Verdict: FAILED")\n`,
      JavaScript: `function binarySearch(nums, target) {\n  let left = 0, right = nums.length - 1;\n  while (left <= right) {\n    const mid = Math.floor((left + right) / 2);\n    if (nums[mid] === target) return mid;\n    if (nums[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  return -1;\n}\n\nconst nums = [-1, 0, 3, 5, 9, 12];\nconst target = 9;\nconst idx = binarySearch(nums, target);\nconsole.log(\`Input: nums=[\${nums}], target=\${target}\`);\nconsole.log(\`Output: Index \${idx}\`);\nconsole.log(idx === 4 ? "Verdict: PASSED" : "Verdict: FAILED");\n`,
    },
  },
  {
    id: "lru-cache",
    title: "LRU Cache",
    category: "Design · O(1) Operations",
    expectedOutput: "get(1)=1, get(2)=-1, get(3)=3",
    stdin: "",
    templates: {
      Python: `from collections import OrderedDict\n\nclass LRUCache:\n    def __init__(self, capacity: int):\n        self.capacity = capacity\n        self.cache = OrderedDict()\n\n    def get(self, key: int) -> int:\n        if key not in self.cache:\n            return -1\n        self.cache.move_to_end(key)\n        return self.cache[key]\n\n    def put(self, key: int, value: int) -> None:\n        if key in self.cache:\n            self.cache.move_to_end(key)\n        self.cache[key] = value\n        if len(self.cache) > self.capacity:\n            self.cache.popitem(last=False)\n\nif __name__ == "__main__":\n    lru = LRUCache(2)\n    lru.put(1, 1)\n    lru.put(2, 2)\n    val1 = lru.get(1)  # returns 1\n    lru.put(3, 3)      # evicts key 2\n    val2 = lru.get(2)  # returns -1\n    val3 = lru.get(3)  # returns 3\n    print(f"Operations: put(1,1), put(2,2), get(1)={val1}, put(3,3), get(2)={val2}, get(3)={val3}")\n    passed = val1 == 1 and val2 == -1 and val3 == 3\n    print("Verdict: PASSED" if passed else "Verdict: FAILED")\n`,
      JavaScript: `class LRUCache {\n  constructor(capacity) {\n    this.capacity = capacity;\n    this.cache = new Map();\n  }\n\n  get(key) {\n    if (!this.cache.has(key)) return -1;\n    const val = this.cache.get(key);\n    this.cache.delete(key);\n    this.cache.set(key, val);\n    return val;\n  }\n\n  put(key, value) {\n    if (this.cache.has(key)) this.cache.delete(key);\n    this.cache.set(key, value);\n    if (this.cache.size > this.capacity) {\n      const oldest = this.cache.keys().next().value;\n      this.cache.delete(oldest);\n    }\n  }\n}\n\nconst lru = new LRUCache(2);\nlru.put(1, 1);\nlru.put(2, 2);\nconst val1 = lru.get(1);\nlru.put(3, 3);\nconst val2 = lru.get(2);\nconst val3 = lru.get(3);\nconsole.log(\`Operations: put(1,1), put(2,2), get(1)=\${val1}, put(3,3), get(2)=\${val2}, get(3)=\${val3}\`);\nconsole.log(val1 === 1 && val2 === -1 && val3 === 3 ? "Verdict: PASSED" : "Verdict: FAILED");\n`,
    },
  },
];

// Built once: a new extensions array on every keystroke makes CodeMirror rebuild the editor state.
const LANGUAGE_EXTENSIONS: Record<Language, Extension[]> = {
  Python: [python()],
  JavaScript: [javascript()],
};

const EDITOR_SETUP = { foldGutter: false } as const;

const MIN_PANE_PCT = 25;
const MAX_PANE_PCT = 75;
const MIN_FONT_SIZE = 11;
const MAX_FONT_SIZE = 18;
const DEFAULT_FONT_SIZE = 13;
const FONT_SIZE_KEY = "interviewiq_compiler_font_size";

export default function Compiler({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [language, setLanguage] = useState<Language>("Python");
  const [preset, setPreset] = useState<PresetId>("blank");
  const activePresetConfig = useMemo(
    () => PRESETS.find((p) => p.id === preset) ?? PRESETS[0],
    [preset]
  );
  const [code, setCode] = useState(PRESETS[0].templates.Python);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [outputTone, setOutputTone] = useState<"neutral" | "success" | "error">("neutral");
  const [running, setRunning] = useState(false);


  const [fontSize, setFontSize] = useState(() => {
    const stored = Number(localStorage.getItem(FONT_SIZE_KEY));
    return stored >= MIN_FONT_SIZE && stored <= MAX_FONT_SIZE ? stored : DEFAULT_FONT_SIZE;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);

  const [resetCount, setResetCount] = useState(0);

  const handleLangChange = (lang: Language) => {
    setLanguage(lang);
    setCode(activePresetConfig.templates[lang]);
  };

  const handlePresetChange = (presetId: PresetId) => {
    setPreset(presetId);
    const target = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];
    setCode(target.templates[language]);
    setInput(target.stdin);
  };

  const adjustFontSize = (delta: number) => {
    setFontSize((size) => {
      const next = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, size + delta));
      localStorage.setItem(FONT_SIZE_KEY, String(next));
      return next;
    });
  };

  // Fetch the runtimes in the background so the first Run is quick
  useEffect(() => {
    warmUpRuntimes();
  }, []);

  const runCode = async () => {
    setRunning(true);
    setOutput(null);
    setOutputTone("neutral");

    try {
      const result = await executeCode({ language, source_code: code, stdin: input }, { label: "compiler" });

      const body = [result.compile_output, result.stdout, result.stderr, result.message]
        .filter((part): part is string => Boolean(part && part.trim()))
        .map((part) => part.trimEnd())
        .join("\n");

      const meta = [result.status, result.time ? `${result.time}s` : null, result.memory ? `${result.memory} KB` : null]
        .filter(Boolean)
        .join(" · ");

      setOutput(`${body || "(no output)"}\n\n[Status: ${meta || "Execution completed"}]`);
      setOutputTone(result.compile_output || result.stderr ? "error" : "success");
    } catch (err) {
      setOutput(err instanceof Error && err.message ? err.message : "Failed to run the code. Please try again.");
      setOutputTone("error");
    } finally {
      setRunning(false);
    }
  };

  // Ctrl/Cmd+Enter runs the code and gives the Run button the same brief press as a click.
  const [pressed, setPressed] = useState(false);
  const runRef = useRef(runCode);
  runRef.current = runCode;
  const runningRef = useRef(running);
  runningRef.current = running;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || !(e.ctrlKey || e.metaKey) || runningRef.current) return;
      e.preventDefault();
      e.stopPropagation(); // keep the editor from also inserting a blank line
      setPressed(true);
      window.setTimeout(() => setPressed(false), 160);
      runRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const { theme } = useTheme();
  const editorTheme = useMemo(() => buildEditorTheme(fontSize, theme === "light"), [fontSize, theme]);

  const fileName: Record<Language, string> = { Python: "main.py", JavaScript: "main.js" };
  const dd =
    "appearance-none h-[34px] pl-3 pr-8 border border-ob-ln2 rounded-lg bg-ob-bg1 text-ob-tx font-mono text-[12.5px] cursor-pointer outline-none hover:border-ob-ln3 focus:border-ob-ln3 transition-colors";
  const ibtn =
    "w-[34px] h-[34px] rounded-lg border border-ob-ln2 text-ob-tx font-mono text-[11px] cursor-pointer hover:bg-ob-bg3 hover:border-ob-ln3 transition-colors disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col min-h-[calc(100vh-98px)] p-3 gap-3 text-[14px] leading-[1.55]">
      <div ref={containerRef} className="flex-1 flex flex-wrap gap-3 items-stretch min-h-[640px]">
        {/* Editor */}
        <section className="ob-rise flex-[2_1_620px] min-w-0 flex flex-col overflow-hidden rounded-xl border border-ob-ln bg-ob-card" style={{ ["--i" as string]: 0 }}>
          <div className="flex items-center justify-between gap-2.5 flex-wrap px-3.5 min-h-12 border-b border-ob-ln shrink-0">
            <span className="inline-flex items-center gap-2 h-12 font-mono text-xs border-b border-ob-ac -mb-px">
              <span style={{ color: "var(--ob-hot)" }}>●</span>
              {fileName[language]}
            </span>
            <div className="flex gap-2 items-center flex-wrap justify-end py-1.5">
              <span className="relative inline-flex">
                <select aria-label="Language" value={language} onChange={(e) => handleLangChange(e.target.value as Language)} className={dd}>
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--ob-tx3)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="absolute right-[11px] top-[11px] pointer-events-none" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
              </span>
              <span className="relative inline-flex">
                <select aria-label="Starter template" value={preset} onChange={(e) => handlePresetChange(e.target.value as PresetId)} className={dd}>
                  {PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--ob-tx3)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="absolute right-[11px] top-[11px] pointer-events-none" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
              </span>
              <button type="button" aria-label="Decrease font size" className={ibtn} onClick={() => adjustFontSize(-1)} disabled={fontSize <= MIN_FONT_SIZE}>A−</button>
              <span className="font-mono text-[11.5px] ob-tx3 min-w-[34px] text-center">{fontSize}px</span>
              <button type="button" aria-label="Increase font size" className={ibtn} onClick={() => adjustFontSize(1)} disabled={fontSize >= MAX_FONT_SIZE}>A+</button>
              <button
                type="button"
                className="ob-btn ob-sm"
                onClick={() => {
                  setCode(activePresetConfig.templates[language]);
                  setInput(activePresetConfig.stdin);
                  setResetCount((n) => n + 1);
                }}
              >
                Reset
              </button>
              <button type="button" className="ob-btn ob-pr ob-sm" onClick={runCode} disabled={running} title="Run (Ctrl+Enter)" style={pressed ? { transform: "scale(0.96)" } : undefined}>
                {running ? (
                  <span className="inline-block w-3 h-3 rounded-full border-[1.5px] border-ob-ln2 border-t-ob-bg1 animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M7 4l13 8-13 8z" /></svg>
                )}
                Run
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-[480px] overflow-hidden bg-ob-bg1">
            {/* Remounted when the document is swapped from outside (language, template, Reset): the editor library
                holds back outside changes for ~0.7s after the last keystroke, which would leave the old code visible. */}
            <CodeMirror
              key={`${language}:${preset}:${resetCount}`}
              value={code}
              onChange={(value) => setCode(value)}
              theme={editorTheme}
              extensions={LANGUAGE_EXTENSIONS[language]}
              height="100%"
              style={{ height: "100%" }}
              basicSetup={EDITOR_SETUP}
            />
          </div>
          <div className="flex gap-[18px] flex-wrap px-4 py-[9px] border-t border-ob-ln font-mono text-[11px] ob-tx3 shrink-0">
            <span>{language}</span>
            <span>UTF-8</span>
            <span className="ml-auto flex items-center gap-2">
              <span className="inline-block w-[7px] h-[7px] rounded-full bg-ob-ok" aria-hidden="true" />
              Runs in your browser
            </span>
          </div>
        </section>

        {/* Input / output */}
        <div ref={rightColRef} className="flex-[1_1_340px] min-w-0 flex flex-col gap-3">
          <section className="ob-rise flex-[0_0_220px] flex flex-col overflow-hidden rounded-xl border border-ob-ln bg-ob-card" style={{ ["--i" as string]: 1 }}>
            <div className="flex items-center justify-between gap-2.5 px-3.5 h-12 border-b border-ob-ln shrink-0">
              <span className="ob-lb">Input</span>
              <span className="ob-chip ob-sq" style={{ height: 22, fontSize: 11 }}>stdin</span>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              aria-label="Program input"
              placeholder="Anything typed here is sent to your program as standard input."
              className="flex-1 w-full min-h-[120px] p-3.5 bg-transparent border-0 text-ob-tx font-mono text-[13px] leading-[1.7] outline-none resize-none placeholder:text-ob-tx3"
            />
          </section>

          <section className="ob-rise flex-1 flex flex-col overflow-hidden rounded-xl border border-ob-ln bg-ob-card min-h-[260px]" style={{ ["--i" as string]: 2 }}>
            <div className="flex items-center justify-between gap-2.5 px-3.5 h-12 border-b border-ob-ln shrink-0">
              <span className="ob-lb">Output</span>
              {running ? (
                <span className="ob-chip ob-sq" style={{ height: 22, fontSize: 11, color: "var(--ob-hot)", borderColor: "rgba(255,106,61,.4)" }}>
                  <span className="inline-block w-3 h-3 rounded-full border-[1.5px] border-ob-ln2 border-t-ob-ac animate-spin" />
                  running
                </span>
              ) : outputTone === "success" ? (
                <span className="ob-chip ob-sq ob-ok ob-pop" style={{ height: 22, fontSize: 11 }}>success</span>
              ) : outputTone === "error" ? (
                <span className="ob-chip ob-sq ob-err ob-pop" style={{ height: 22, fontSize: 11 }}>error</span>
              ) : null}
            </div>
            <div className="flex-1 overflow-auto px-4 py-3.5 font-mono text-[13px] leading-[1.9]" aria-live="polite">
              {running ? (
                <div className="ob-tx3">
                  $ run {fileName[language]}
                  <span className="inline-block w-2 h-3.5 bg-ob-hot align-[-2px] ml-1 animate-pulse" aria-hidden="true" />
                </div>
              ) : output === null ? (
                <div className="ob-tx3">Run your code to see the output here.</div>
              ) : (
                /* Lines print in quick succession; long output stops staggering after the first screenful. */
                <pre key={output} className={`m-0 whitespace-pre-wrap break-words font-[inherit] ${outputTone === "error" ? "text-ob-er" : "text-ob-tx"}`}>
                  {output.split("\n").map((line, i) => (
                    <span key={i} className={i < 40 ? "ob-pop block min-h-[1.9em]" : "block min-h-[1.9em]"} style={i < 40 ? { ["--i" as string]: i } : undefined}>{line}</span>
                  ))}
                </pre>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
