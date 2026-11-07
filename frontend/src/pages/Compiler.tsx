import { useEffect, useMemo, useRef, useState } from "react";
import CodeMirror, { type Extension } from "@uiw/react-codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { ApiError, type ExecuteLanguage } from "../lib/api";
import { executeCode, warmUpPython } from "../lib/codeExecution";
import { buildEditorTheme } from "../lib/editorTheme";

const LANGUAGES = ["Python", "JavaScript", "C++", "Java"] as const satisfies readonly ExecuteLanguage[];
type Language = (typeof LANGUAGES)[number];

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
      Java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n`,
      "C++": `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n`,
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
      Java: `import java.util.*;\n\npublic class Main {\n    public static int[] twoSum(int[] nums, int target) {\n        Map<Integer, Integer> seen = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int complement = target - nums[i];\n            if (seen.containsKey(complement)) {\n                return new int[] { seen.get(complement), i };\n            }\n            seen.put(nums[i], i);\n        }\n        return new int[0];\n    }\n\n    public static void main(String[] args) {\n        int[] nums = {2, 7, 11, 15};\n        int target = 9;\n        int[] result = twoSum(nums, target);\n        System.out.println("Input: nums=[2, 7, 11, 15], target=9");\n        System.out.println("Output: " + Arrays.toString(result));\n        System.out.println(result.length == 2 && result[0] == 0 && result[1] == 1 ? "Verdict: PASSED" : "Verdict: FAILED");\n    }\n}\n`,
      "C++": `#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n    unordered_map<int, int> seen;\n    for (int i = 0; i < nums.size(); i++) {\n        int complement = target - nums[i];\n        if (seen.count(complement)) {\n            return {seen[complement], i};\n        }\n        seen[nums[i]] = i;\n    }\n    return {};\n}\n\nint main() {\n    vector<int> nums = {2, 7, 11, 15};\n    int target = 9;\n    vector<int> result = twoSum(nums, target);\n    cout << "Input: nums=[2, 7, 11, 15], target=9" << endl;\n    cout << "Output: [" << result[0] << ", " << result[1] << "]" << endl;\n    cout << (result.size() == 2 && result[0] == 0 && result[1] == 1 ? "Verdict: PASSED" : "Verdict: FAILED") << endl;\n    return 0;\n}\n`,
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
      Java: `import java.util.*;\n\npublic class Main {\n    public static int binarySearch(int[] nums, int target) {\n        int left = 0, right = nums.length - 1;\n        while (left <= right) {\n            int mid = left + (right - left) / 2;\n            if (nums[mid] == target) return mid;\n            if (nums[mid] < target) left = mid + 1;\n            else right = mid - 1;\n        }\n        return -1;\n    }\n\n    public static void main(String[] args) {\n        int[] nums = {-1, 0, 3, 5, 9, 12};\n        int target = 9;\n        int idx = binarySearch(nums, target);\n        System.out.println("Input: nums=[-1, 0, 3, 5, 9, 12], target=9");\n        System.out.println("Output: Index " + idx);\n        System.out.println(idx == 4 ? "Verdict: PASSED" : "Verdict: FAILED");\n    }\n}\n`,
      "C++": `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint binarySearch(const vector<int>& nums, int target) {\n    int left = 0, right = nums.size() - 1;\n    while (left <= right) {\n        int mid = left + (right - left) / 2;\n        if (nums[mid] == target) return mid;\n        if (nums[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    return -1;\n}\n\nint main() {\n    vector<int> nums = {-1, 0, 3, 5, 9, 12};\n    int target = 9;\n    int idx = binarySearch(nums, target);\n    cout << "Input: nums=[-1, 0, 3, 5, 9, 12], target=9" << endl;\n    cout << "Output: Index " << idx << endl;\n    cout << (idx == 4 ? "Verdict: PASSED" : "Verdict: FAILED") << endl;\n    return 0;\n}\n`,
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
      Java: `import java.util.*;\n\nclass LRUCache extends LinkedHashMap<Integer, Integer> {\n    private final int capacity;\n\n    public LRUCache(int capacity) {\n        super(capacity, 0.75f, true);\n        this.capacity = capacity;\n    }\n\n    public int get(int key) {\n        return super.getOrDefault(key, -1);\n    }\n\n    public void put(int key, int value) {\n        super.put(key, value);\n    }\n\n    @Override\n    protected boolean removeEldestEntry(Map.Entry<Integer, Integer> eldest) {\n        return size() > capacity;\n    }\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        LRUCache lru = new LRUCache(2);\n        lru.put(1, 1);\n        lru.put(2, 2);\n        int val1 = lru.get(1);\n        lru.put(3, 3);\n        int val2 = lru.get(2);\n        int val3 = lru.get(3);\n        System.out.println("Operations: put(1,1), put(2,2), get(1)=" + val1 + ", put(3,3), get(2)=" + val2 + ", get(3)=" + val3);\n        System.out.println(val1 == 1 && val2 == -1 && val3 == 3 ? "Verdict: PASSED" : "Verdict: FAILED");\n    }\n}\n`,
      "C++": `#include <iostream>\n#include <list>\n#include <unordered_map>\nusing namespace std;\n\nclass LRUCache {\n    int cap;\n    list<pair<int, int>> lru;\n    unordered_map<int, list<pair<int, int>>::iterator> mp;\npublic:\n    LRUCache(int capacity) : cap(capacity) {}\n\n    int get(int key) {\n        if (!mp.count(key)) return -1;\n        lru.splice(lru.begin(), lru, mp[key]);\n        return mp[key]->second;\n    }\n\n    void put(int key, int value) {\n        if (mp.count(key)) {\n            mp[key]->second = value;\n            lru.splice(lru.begin(), lru, mp[key]);\n            return;\n        }\n        if (lru.size() == cap) {\n            mp.erase(lru.back().first);\n            lru.pop_back();\n        }\n        lru.emplace_front(key, value);\n        mp[key] = lru.begin();\n    }\n};\n\nint main() {\n    LRUCache lru(2);\n    lru.put(1, 1);\n    lru.put(2, 2);\n    int val1 = lru.get(1);\n    lru.put(3, 3);\n    int val2 = lru.get(2);\n    int val3 = lru.get(3);\n    cout << "Operations: put(1,1), put(2,2), get(1)=" << val1 << ", put(3,3), get(2)=" << val2 << ", get(3)=" << val3 << endl;\n    cout << (val1 == 1 && val2 == -1 && val3 == 3 ? "Verdict: PASSED" : "Verdict: FAILED") << endl;\n    return 0;\n}\n`,
    },
  },
];

const LANGUAGE_EXTENSIONS: Record<Language, Extension> = {
  Python: python(),
  JavaScript: javascript(),
  Java: java(),
  "C++": cpp(),
};

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

  // Fetch the Python runtime in the background so the first Run is quick
  useEffect(() => {
    warmUpPython();
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
      setOutput(err instanceof ApiError ? err.message : "Failed to execute code. Please check connection and try again.");
      setOutputTone("error");
    } finally {
      setRunning(false);
    }
  };

  const editorTheme = useMemo(() => buildEditorTheme(fontSize, false), [fontSize]);

  const fileName: Record<Language, string> = { Python: "main.py", JavaScript: "main.js", "C++": "main.cpp", Java: "Main.java" };
  const dd =
    "appearance-none h-[34px] pl-3 pr-8 border border-[#3a3a36] rounded-lg bg-[#121211] text-[#ebe9e2] font-mono text-[12.5px] cursor-pointer outline-none hover:border-[#55544e] focus:border-[#55544e] transition-colors";
  const ibtn =
    "w-[34px] h-[34px] rounded-lg border border-[#3a3a36] text-[#ebe9e2] font-mono text-[11px] cursor-pointer hover:bg-[#20201e] hover:border-[#55544e] transition-colors disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col min-h-[calc(100vh-98px)] p-3 gap-3 text-[14px] leading-[1.55]">
      <div ref={containerRef} className="flex-1 flex flex-wrap gap-3 items-stretch min-h-[640px]">
        {/* Editor */}
        <section className="ob-rise flex-[2_1_620px] min-w-0 flex flex-col overflow-hidden rounded-xl border border-[#2b2b28] bg-[#181817]" style={{ ["--i" as string]: 0 }}>
          <div className="flex items-center justify-between gap-2.5 flex-wrap px-3.5 min-h-12 border-b border-[#2b2b28] shrink-0">
            <span className="inline-flex items-center gap-2 h-12 font-mono text-xs border-b border-[#e6dfcc] -mb-px">
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
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#8f8d85" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="absolute right-[11px] top-[11px] pointer-events-none" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
              </span>
              <span className="relative inline-flex">
                <select aria-label="Starter template" value={preset} onChange={(e) => handlePresetChange(e.target.value as PresetId)} className={dd}>
                  {PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#8f8d85" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="absolute right-[11px] top-[11px] pointer-events-none" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
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
                }}
              >
                Reset
              </button>
              <button type="button" className="ob-btn ob-pr ob-sm" onClick={runCode} disabled={running}>
                {running ? (
                  <span className="inline-block w-3 h-3 rounded-full border-[1.5px] border-[#3a3a36] border-t-[#121211] animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M7 4l13 8-13 8z" /></svg>
                )}
                Run
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-[480px] overflow-hidden bg-[#121211]">
            <CodeMirror
              value={code}
              onChange={(value) => setCode(value)}
              theme={editorTheme}
              extensions={[LANGUAGE_EXTENSIONS[language]]}
              height="100%"
              style={{ height: "100%" }}
              basicSetup={{ foldGutter: false }}
            />
          </div>
          <div className="flex gap-[18px] flex-wrap px-4 py-[9px] border-t border-[#2b2b28] font-mono text-[11px] ob-tx3 shrink-0">
            <span>{language}</span>
            <span>UTF-8</span>
            <span className="ml-auto flex items-center gap-2">
              <span className="inline-block w-[7px] h-[7px] rounded-full bg-[#6fd6a4]" aria-hidden="true" />
              Judge0 sandbox
            </span>
          </div>
        </section>

        {/* Input / output */}
        <div ref={rightColRef} className="flex-[1_1_340px] min-w-0 flex flex-col gap-3">
          <section className="ob-rise flex-[0_0_220px] flex flex-col overflow-hidden rounded-xl border border-[#2b2b28] bg-[#181817]" style={{ ["--i" as string]: 1 }}>
            <div className="flex items-center justify-between gap-2.5 px-3.5 h-12 border-b border-[#2b2b28] shrink-0">
              <span className="ob-lb">Input</span>
              <span className="ob-chip ob-sq" style={{ height: 22, fontSize: 11 }}>stdin</span>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              aria-label="Program input"
              placeholder="Anything typed here is sent to your program as standard input."
              className="flex-1 w-full min-h-[120px] p-3.5 bg-transparent border-0 text-[#ebe9e2] font-mono text-[13px] leading-[1.7] outline-none resize-none placeholder:text-[#8f8d85]"
            />
          </section>

          <section className="ob-rise flex-1 flex flex-col overflow-hidden rounded-xl border border-[#2b2b28] bg-[#181817] min-h-[260px]" style={{ ["--i" as string]: 2 }}>
            <div className="flex items-center justify-between gap-2.5 px-3.5 h-12 border-b border-[#2b2b28] shrink-0">
              <span className="ob-lb">Output</span>
              {running ? (
                <span className="ob-chip ob-sq" style={{ height: 22, fontSize: 11, color: "var(--ob-hot)", borderColor: "rgba(255,106,61,.4)" }}>
                  <span className="inline-block w-3 h-3 rounded-full border-[1.5px] border-[#3a3a36] border-t-[#e6dfcc] animate-spin" />
                  running
                </span>
              ) : outputTone === "success" ? (
                <span className="ob-chip ob-sq ob-ok" style={{ height: 22, fontSize: 11 }}>success</span>
              ) : outputTone === "error" ? (
                <span className="ob-chip ob-sq ob-err" style={{ height: 22, fontSize: 11 }}>error</span>
              ) : null}
            </div>
            <div className="flex-1 overflow-auto px-4 py-3.5 font-mono text-[13px] leading-[1.9]" aria-live="polite">
              {running ? (
                <div className="ob-tx3">
                  $ run {fileName[language]}
                  <span className="inline-block w-2 h-3.5 bg-[#ff6a3d] align-[-2px] ml-1 animate-pulse" aria-hidden="true" />
                </div>
              ) : output === null ? (
                <div className="ob-tx3">Run your code to see the output here.</div>
              ) : (
                <pre className={`m-0 whitespace-pre-wrap break-words font-[inherit] ${outputTone === "error" ? "text-[#f08a98]" : "text-[#ebe9e2]"}`}>{output}</pre>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
