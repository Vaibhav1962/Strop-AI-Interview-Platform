import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import CodeMirror, { type Extension } from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { buildEditorTheme } from "../lib/editorTheme";
import { EXECUTE_LANGUAGES, warmUpRuntimes, type ExecuteLanguage } from "../lib/codeExecution";
import { normalizeDsaTestCases, type DsaProblem, type DsaTestCase } from "../lib/dsaProblemBank";
import { isRunnable, runDsaTests, starterCode, type DsaTestResult } from "../lib/dsaRunner";
import { useTheme } from "../lib/theme";

interface DsaCodingWorkspaceProps {
  problem: DsaProblem;
  onSolutionSubmitted?: (result: {
    passed: boolean;
    totalPassed: number;
    totalTests: number;
    code: string;
    language: string;
  }) => void;
  className?: string;
}

const LANGUAGE_LABELS: Record<ExecuteLanguage, string> = { Python: "Python 3", JavaScript: "JavaScript" };

// Built once: handing CodeMirror a new extensions array on every keystroke makes it rebuild the editor state.
const LANGUAGE_EXTENSIONS: Record<ExecuteLanguage, Extension[]> = {
  Python: [python()],
  JavaScript: [javascript()],
};

const EDITOR_SETUP = {
  lineNumbers: true,
  foldGutter: true,
  autocompletion: true,
  bracketMatching: true,
  indentOnInput: true,
} as const;

type TestResult = DsaTestResult;

export default function DsaCodingWorkspace({
  problem: rawProblem,
  onSolutionSubmitted,
  className = "",
}: DsaCodingWorkspaceProps) {
  const problem = useMemo(
    () => ({ ...rawProblem, testCases: normalizeDsaTestCases(rawProblem.testCases) }),
    [rawProblem],
  );
  const runnable = isRunnable(problem);
  const [selectedLanguage, setSelectedLanguage] = useState<ExecuteLanguage>("Python");

  // One draft per problem and language, so switching language (or problem) never throws work away.
  const drafts = useRef<Record<string, string>>({});
  const draftKey = (p: string, l: ExecuteLanguage) => `${p}::${l}`;
  const [code, setCode] = useState(() => starterCode(problem, "Python"));
  const [loadedProblemId, setLoadedProblemId] = useState(problem.id);

  // A different problem arrived (props): keep the old draft and load the new one in the same render, so the
  // editor never shows the previous problem's code under the new title.
  if (loadedProblemId !== problem.id) {
    drafts.current[draftKey(loadedProblemId, selectedLanguage)] = code;
    setLoadedProblemId(problem.id);
    setCode(drafts.current[draftKey(problem.id, selectedLanguage)] ?? starterCode(problem, selectedLanguage));
  }

  // Start downloading the runtimes in the background so the first Run is quick
  useEffect(() => {
    warmUpRuntimes();
  }, []);

  // Left panel tabs (Editorial removed during live interview)
  const [leftTab, setLeftTab] = useState<"description" | "submissions">("description");

  // Right console tabs
  const [consoleTab, setConsoleTab] = useState<"testcase" | "result">("testcase");
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);

  const [customInputs, setCustomInputs] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    problem.testCases.forEach((tc) => {
      init[tc.id] = tc.input;
    });
    return init;
  });

  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  // Keep customInputs and results in sync if problem changes
  useEffect(() => {
    const init: Record<number, string> = {};
    problem.testCases.forEach((tc) => {
      init[tc.id] = tc.input;
    });
    setCustomInputs(init);
    setTestResults([]);
    setSelectedCaseIdx(0);
  }, [problem.id]);

  const { theme } = useTheme();
  const editorTheme = useMemo(() => buildEditorTheme(13, theme === "light"), [theme]);

  const visibleTests = useMemo(
    () => problem.testCases.filter((tc) => !tc.isHidden),
    [problem.testCases]
  );
  const activeVisibleCase = visibleTests[selectedCaseIdx] || visibleTests[0];

  const handleLanguageChange = (lang: ExecuteLanguage) => {
    if (lang === selectedLanguage) return;
    drafts.current[draftKey(problem.id, selectedLanguage)] = code;
    setSelectedLanguage(lang);
    setCode(drafts.current[draftKey(problem.id, lang)] ?? starterCode(problem, lang));
  };

  // Bumped when the code is replaced from outside (Reset): see the note on the editor's key below.
  const [resetCount, setResetCount] = useState(0);
  const handleResetCode = () => {
    setCode(starterCode(problem, selectedLanguage));
    setResetCount((n) => n + 1);
  };

  const handleCodeChange = useCallback((value: string) => setCode(value), []);

  const runVisibleTests = async () => {
    if (isRunning || isSubmitting || !runnable) return;
    setIsRunning(true);
    setConsoleTab("result");
    setProgress({ done: 0, total: visibleTests.length });

    const cases: DsaTestCase[] = visibleTests.map((tc) => ({
      ...tc,
      input: customInputs[tc.id] !== undefined ? customInputs[tc.id] : tc.input,
    }));
    try {
      const results = await runDsaTests(problem, selectedLanguage, code, cases, "dsa-visible-test", (done, total) =>
        setProgress({ done, total }),
      );
      setTestResults(results);
      setSelectedCaseIdx(0);
    } finally {
      setProgress(null);
      setIsRunning(false);
    }
  };

  const submitFullSolution = async () => {
    if (isRunning || isSubmitting || !runnable) return;
    setIsSubmitting(true);
    setConsoleTab("result");
    const allTests = problem.testCases;
    setProgress({ done: 0, total: allTests.length });

    let results: TestResult[] = [];
    try {
      results = await runDsaTests(problem, selectedLanguage, code, allTests, "dsa-submit", (done, total) =>
        setProgress({ done, total }),
      );
    } finally {
      setProgress(null);
      setIsSubmitting(false);
    }

    const passedCount = results.filter((r) => r.passed).length;
    setTestResults(results);
    setSelectedCaseIdx(0);

    if (onSolutionSubmitted) {
      onSolutionSubmitted({
        passed: allTests.length > 0 && passedCount === allTests.length,
        totalPassed: passedCount,
        totalTests: allTests.length,
        code,
        language: selectedLanguage,
      });
    }
  };

  const stateRef = useRef({ isRunning, isSubmitting, runVisibleTests, submitFullSolution });
  stateRef.current = { isRunning, isSubmitting, runVisibleTests, submitFullSolution };

  // Keyboard shortcuts: Ctrl+' to Run, Ctrl+Enter to Submit
  // Registered in capture phase so CodeMirror or inner inputs cannot swallow them.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isQuote = e.key === "'" || e.code === "Quote";
      const isEnter = e.key === "Enter" || e.code === "Enter";
      if ((e.ctrlKey || e.metaKey) && isQuote) {
        e.preventDefault();
        e.stopPropagation();
        if (!stateRef.current.isRunning && !stateRef.current.isSubmitting) {
          stateRef.current.runVisibleTests();
        }
      } else if ((e.ctrlKey || e.metaKey) && isEnter) {
        e.preventDefault();
        e.stopPropagation();
        if (!stateRef.current.isRunning && !stateRef.current.isSubmitting) {
          stateRef.current.submitFullSolution();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  const extensions = LANGUAGE_EXTENSIONS[selectedLanguage];
  const activeResult = testResults[selectedCaseIdx];
  const allTestsPassed = testResults.length > 0 && testResults.every((r) => r.passed);
  const crashed =
    testResults.length > 0 &&
    testResults.every((r) => !r.passed && (r.actualOutput === "Error" || r.actualOutput === "(no result)" || r.actualOutput === "Not run"));
  const verdict = allTestsPassed ? "Accepted" : crashed ? "Runtime Error" : "Wrong Answer";
  const runTime = activeResult?.executionTime ?? "—";

  return (
    <div className={`flex flex-col h-full text-ob-tx overflow-hidden ${className}`}>
      {/* LeetCode Header Nav */}
      <div className="h-11 border-b border-ob-ov/10 bg-ob-bg2 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                problem.difficulty === "Easy"
                  ? "bg-emerald-400"
                  : problem.difficulty === "Medium"
                  ? "bg-amber-400"
                  : "bg-rose-400"
              }`}
            />
            <span className="text-xs font-semibold tracking-wide text-ob-tx font-mono px-1 py-0.5">
              {problem.title}
            </span>
          </div>
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
              problem.difficulty === "Easy"
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : problem.difficulty === "Medium"
                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                : "bg-rose-500/15 text-rose-400 border-rose-500/30"
            }`}
          >
            {problem.difficulty}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-ob-tx2">
          <span className="px-2 py-0.5 rounded bg-ob-bg3 text-[11px] font-mono text-ob-soft border border-ob-ov/5">
            {problem.optimalTimeComplexity} Time | {problem.optimalSpaceComplexity} Space
          </span>
        </div>
      </div>

      {/* Main Split: 50% Left (Problem Specs) | 50% Right (Editor & Console) */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* ================================================================= */}
        {/* LEFT PANE: LeetCode Problem Description                           */}
        {/* ================================================================= */}
        <div className="col-span-12 lg:col-span-6 flex flex-col border-r border-ob-ov/10 overflow-hidden h-full">
          {/* Problem Tabs */}
          <div className="h-10 border-b border-ob-ov/10 bg-ob-bg2 px-3 flex items-center gap-2 shrink-0">
            <button
              onClick={() => setLeftTab("description")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                leftTab === "description"
                  ? "bg-ob-ov/10 text-ob-tx shadow-sm font-semibold"
                  : "text-ob-tx2 hover:text-ob-tx hover:bg-ob-ov/5"
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>Description</span>
            </button>
            <button
              onClick={() => setLeftTab("submissions")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                leftTab === "submissions"
                  ? "bg-ob-ov/10 text-ob-tx shadow-sm font-semibold"
                  : "text-ob-tx2 hover:text-ob-tx hover:bg-ob-ov/5"
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Submissions</span>
            </button>
          </div>

          {/* Left Content Scrollable */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-ob-soft leading-relaxed font-sans bg-ob-bg">
            {leftTab === "description" && (
              <>
                <div>
                  <h1 className="text-lg font-bold text-ob-tx mb-2">
                    {problem.title}
                  </h1>
                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                        problem.difficulty === "Easy"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                          : problem.difficulty === "Medium"
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                          : "bg-rose-500/15 text-rose-400 border-rose-500/25"
                      }`}
                    >
                      {problem.difficulty}
                    </span>
                    <span className="text-[11px] text-ob-tx3">Topics</span>
                    <span className="text-[11px] text-ob-tx3">Companies</span>
                  </div>
                  <p className="text-ob-soft whitespace-pre-line leading-relaxed font-normal">
                    {problem.description}
                  </p>
                </div>

                {/* Examples */}
                <div className="space-y-4">
                  {problem.examples.map((ex, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="font-semibold text-ob-soft">
                        Example {idx + 1}:
                      </div>
                      <div className="bg-ob-bg2 border border-ob-ov/10 rounded-lg p-3 font-mono text-[11px] space-y-1">
                        <div>
                          <strong className="text-ob-tx2 font-sans">Input: </strong>
                          <span className="text-ob-soft">{ex.input}</span>
                        </div>
                        {ex.output ? (
                          <div>
                            <strong className="text-ob-tx2 font-sans">Output: </strong>
                            <span className="text-ob-soft">{ex.output}</span>
                          </div>
                        ) : null}
                        {ex.explanation && (
                          <div className="pt-1 font-sans text-ob-tx2 text-[11px]">
                            <strong className="text-ob-soft">Explanation: </strong>
                            <span>{ex.explanation}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Constraints */}
                <div>
                  <div className="font-semibold text-ob-soft mb-2">
                    Constraints:
                  </div>
                  <ul className="space-y-1.5 list-disc list-inside font-mono text-[11px] text-ob-tx2">
                    {problem.constraints.map((c, i) => (
                      <li key={i}>
                        <code className="bg-ob-bg3 border border-ob-ov/10 px-1.5 py-0.5 rounded text-ob-soft">
                          {c}
                        </code>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tags */}
                <div className="pt-4 border-t border-ob-ov/10">
                  <div className="text-xs text-ob-tx2 mb-2 font-semibold">
                    Related Topics
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {problem.tagline.split(", ").map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-full bg-ob-bg3 hover:bg-ob-ov/10 text-[11px] text-ob-soft cursor-pointer transition-colors border border-ob-ov/5"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {leftTab === "submissions" && (
              <div className="space-y-3">
                <div className="text-zinc-400 text-xs">
                  {testResults.length > 0
                    ? `Last evaluation: ${testResults.filter((r) => r.passed).length} / ${testResults.length} test cases passed.`
                    : "No submissions recorded yet for this session."}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT PANE: Code Editor (Top) + LeetCode Test Console (Bottom)     */}
        {/* ================================================================= */}
        <div className="col-span-12 lg:col-span-6 flex flex-col overflow-hidden h-full">
          {/* Editor Header Bar */}
          <div className="h-10 border-b border-ob-ov/10 bg-ob-bg2 px-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <select
                value={selectedLanguage}
                aria-label="Language"
                onChange={(e) => handleLanguageChange(e.target.value as ExecuteLanguage)}
                className="bg-ob-bg3 hover:bg-ob-ov/10 border border-ob-ov/15 text-xs text-ob-tx rounded px-2.5 py-1 focus:outline-none cursor-pointer font-medium"
              >
                {EXECUTE_LANGUAGES.map((l) => (
                  <option key={l} value={l} className="bg-ob-bg3 text-ob-tx">
                    {LANGUAGE_LABELS[l]}
                  </option>
                ))}
              </select>

              <button
                onClick={handleResetCode}
                className="px-2 py-1 text-xs text-ob-tx2 hover:text-ob-tx rounded hover:bg-ob-ov/5 transition-colors cursor-pointer"
                title="Reset to starter stub"
              >
                Reset
              </button>
            </div>

            <div className="text-[11px] text-ob-tx3 font-mono">
              Draft kept per language · runs in your browser
            </div>
          </div>

          {/* Top 60%: CodeMirror Editor */}
          <div className="flex-[6] overflow-auto">
            {/* The key remounts the editor whenever the document is swapped from outside (another language,
                problem, or Reset). Otherwise the editor library holds back an outside change for ~0.7s after the
                last keystroke, and the old code stays on screen under the new language. */}
            <CodeMirror
              key={`${problem.id}:${selectedLanguage}:${resetCount}`}
              value={code}
              height="100%"
              extensions={extensions}
              onChange={handleCodeChange}
              theme={editorTheme}
              basicSetup={EDITOR_SETUP}
            />
          </div>

          {/* Bottom 40%: LeetCode Testcase & Console Drawer */}
          <div className="flex-[4] flex flex-col border-t border-ob-ov/10 bg-ob-bg overflow-hidden">
            {/* Console Tabs */}
            <div className="h-9 border-b border-ob-ov/10 bg-ob-bg2 px-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConsoleTab("testcase")}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                    consoleTab === "testcase"
                      ? "bg-ob-ov/10 text-ob-tx font-semibold shadow-sm"
                      : "text-ob-tx2 hover:text-ob-tx hover:bg-ob-ov/5"
                  }`}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Testcase</span>
                </button>
                <button
                  onClick={() => setConsoleTab("result")}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                    consoleTab === "result"
                      ? "bg-ob-ov/10 text-ob-tx font-semibold shadow-sm"
                      : "text-ob-tx2 hover:text-ob-tx hover:bg-ob-ov/5"
                  }`}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 17l6-6-6-6M12 19h8" />
                  </svg>
                  <span>Test Result</span>
                  {testResults.length > 0 && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        allTestsPassed ? "bg-emerald-400" : "bg-red-400"
                      }`}
                    />
                  )}
                </button>
              </div>

              {(isRunning || isSubmitting) && (
                <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-mono">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>{progress ? `Running ${Math.min(progress.done + 1, progress.total)}/${progress.total}` : "Running..."}</span>
                </div>
              )}
            </div>

            {/* Console Body */}
            <div className="flex-1 overflow-y-auto p-3 text-xs leading-relaxed font-sans bg-ob-bg">
              {/* TAB 1: TESTCASE INPUT */}
              {consoleTab === "testcase" && (
                <div className="space-y-3">
                  {/* Case Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {visibleTests.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedCaseIdx(idx)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                          selectedCaseIdx === idx
                            ? "bg-ob-ov/15 text-ob-tx font-semibold shadow-sm border border-ob-ov/20"
                            : "bg-ob-bg3 text-ob-tx2 hover:text-ob-tx hover:bg-ob-ov/10 border border-ob-ov/5"
                        }`}
                      >
                        Case {idx + 1}
                      </button>
                    ))}
                  </div>

                  {/* Input field for chosen case */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-ob-tx2 font-semibold font-mono">
                      {problem.args.map((a) => a.name).join(", ") || "input"} =
                    </div>
                    <textarea
                      rows={Math.max(1, (customInputs[activeVisibleCase?.id] ?? activeVisibleCase?.input ?? "").split("\n").length)}
                      value={customInputs[activeVisibleCase?.id] ?? activeVisibleCase?.input ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeVisibleCase) {
                          setCustomInputs((prev) => ({ ...prev, [activeVisibleCase.id]: val }));
                        }
                      }}
                      className="w-full bg-ob-bg2 border border-ob-ov/10 focus:border-cyan-500/60 rounded-lg px-3 py-2 text-ob-tx font-mono text-xs focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: TEST RESULT */}
              {consoleTab === "result" && (
                <div className="space-y-3">
                  {testResults.length === 0 && !isRunning && !isSubmitting && (
                    <div className="text-center py-6 text-ob-tx3 italic text-xs">
                      {runnable ? "Run your code to evaluate against testcases." : "This problem has no automated tests, so it is discussed rather than run."}
                    </div>
                  )}

                  {testResults.length > 0 && (
                    <>
                      {/* Big Status Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-ob-ov/10">
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-base font-bold tracking-tight ${
                              allTestsPassed ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {verdict}
                          </span>
                          <span className="text-ob-tx2 font-mono text-xs">
                            Runtime: {runTime}
                          </span>
                        </div>

                        <span className="text-[11px] font-mono text-ob-tx2">
                          {testResults.filter((r) => r.passed).length} / {testResults.length} testcases passed
                        </span>
                      </div>

                      {/* Result Case Selector */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {testResults.map((r, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedCaseIdx(idx)}
                            className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                              selectedCaseIdx === idx
                                ? "bg-ob-ov/15 text-ob-tx font-semibold shadow-sm border border-ob-ov/20"
                                : "bg-ob-bg3 text-ob-tx2 hover:text-ob-tx hover:bg-ob-ov/10 border border-ob-ov/5"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                r.passed ? "bg-emerald-400" : "bg-rose-400"
                              }`}
                            />
                            <span>Case {idx + 1}</span>
                          </button>
                        ))}
                      </div>

                      {/* Detail of chosen result */}
                      {activeResult && (
                        <div className="space-y-2 p-3 rounded-lg border border-ob-ov/10 bg-ob-bg2 font-mono text-[11px]">
                          <div>
                            <span className="text-ob-tx2">Input: </span>
                            <div className="mt-1 p-2 rounded bg-ob-bg text-ob-tx whitespace-pre-wrap border border-ob-ov/5">
                              {activeResult.testCase.input}
                            </div>
                          </div>
                          <div>
                            <span className="text-ob-tx2">Output: </span>
                            <span className={activeResult.passed ? "text-emerald-400" : "text-rose-400 font-semibold"}>
                              {activeResult.actualOutput}
                            </span>
                          </div>
                          <div>
                            <span className="text-ob-tx2">Expected: </span>
                            <span className="text-emerald-400">{activeResult.testCase.expectedOutput}</span>
                          </div>

                          {activeResult.printed && (
                            <div>
                              <span className="text-ob-tx2">Stdout: </span>
                              <div className="mt-1 p-2 rounded bg-ob-bg text-ob-soft whitespace-pre-wrap border border-ob-ov/5">
                                {activeResult.printed}
                              </div>
                            </div>
                          )}

                          {activeResult.error && (
                            <div className="mt-2 p-2 bg-rose-950/30 text-rose-300 rounded border border-rose-500/20 whitespace-pre-wrap font-mono text-[11px]">
                              {activeResult.error}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Bottom LeetCode Action Bar: Console (Left) | Run + Submit (Right) */}
            <div className="h-11 border-t border-ob-ov/10 bg-ob-bg px-3 flex items-center justify-between shrink-0">
              <button
                onClick={() => setConsoleTab((prev) => (prev === "testcase" ? "result" : "testcase"))}
                className="px-2.5 py-1 text-xs text-ob-tx2 hover:text-ob-tx rounded hover:bg-ob-ov/5 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                <span>Console</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={runVisibleTests}
                  disabled={isRunning || isSubmitting || !runnable}
                  className="px-3 py-1.5 rounded-lg bg-ob-bg3 hover:bg-ob-ov/10 text-ob-soft border border-ob-ov/15 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  title="Run tests (Ctrl+')"
                >
                  <svg className="w-3 h-3 text-ob-tx2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>Run</span>
                  <span className="hidden sm:inline-block text-[11px] font-mono text-ob-tx2 px-1 py-0.2 rounded bg-ob-ov/5 border border-ob-ov/10">Ctrl+'</span>
                </button>

                <button
                  onClick={submitFullSolution}
                  disabled={isRunning || isSubmitting || !runnable}
                  className="px-3.5 py-1.5 rounded-lg bg-[#2cbb5d] hover:bg-[#28a752] text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
                  title="Submit full solution (Ctrl+Enter)"
                >
                  <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Submit</span>
                  <span className="hidden sm:inline-block text-[11px] font-mono text-white/90 px-1 py-0.2 rounded bg-black/20 border border-ob-ov/20">Ctrl+Enter</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
