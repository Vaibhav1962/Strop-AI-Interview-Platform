import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import CodeMirror, { type Extension } from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { buildEditorTheme } from "../lib/editorTheme";
import { useTheme } from "../lib/theme";
import { DSA_PROBLEMS, normalizeDsaTestCases, type DsaProblem } from "../lib/dsaProblemBank";
import { saveInterviewSession } from "../lib/api";
import { EXECUTE_LANGUAGES, warmUpRuntimes, type ExecuteLanguage } from "../lib/codeExecution";
import { isRunnable, runDsaTests, starterCode, type DsaTestResult } from "../lib/dsaRunner";

type TestStatus = "idle" | "running" | "passed" | "failed";

const LANGUAGES = EXECUTE_LANGUAGES;

// Built once: a new extensions array on every keystroke makes CodeMirror rebuild the editor state.
const LANGUAGE_EXTENSIONS: Record<ExecuteLanguage, Extension[]> = {
  Python: [python()],
  JavaScript: [javascript()],
};

const EDITOR_SETUP = {
  lineNumbers: true,
  highlightActiveLineGutter: true,
  foldGutter: false,
  history: true,
  bracketMatching: true,
  closeBrackets: true,
  autocompletion: true,
  highlightActiveLine: true,
} as const;

// Only problems that ship with tests can be judged; the rest are interview-discussion problems.
const PROBLEMS: DsaProblem[] = DSA_PROBLEMS.map((p) => ({ ...p, testCases: normalizeDsaTestCases(p.testCases) })).filter(isRunnable);

function describeResults(results: DsaTestResult[], elapsedLabel: string): string {
  const passed = results.filter((r) => r.passed).length;
  const lines = [`${passed}/${results.length} tests passed${elapsedLabel}`, ""];
  results.forEach((r, i) => {
    lines.push(`${r.passed ? "✓" : "✗"} Case ${i + 1}${r.passed ? "" : ` — ${r.skipped ? r.error : "wrong answer"}`}`);
    if (!r.passed && !r.skipped) {
      lines.push(`    input:    ${r.testCase.input.replace(/\n/g, "  ")}`);
      lines.push(`    expected: ${r.testCase.expectedOutput}`);
      lines.push(`    got:      ${r.actualOutput}`);
      if (r.error) lines.push("", ...r.error.split("\n").map((l) => `    ${l}`));
    }
    if (r.printed) lines.push(`    printed:  ${r.printed.split("\n").join("\n              ")}`);
  });
  return lines.join("\n");
}

export default function CodingInterview({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [problemIndex, setProblemIndex] = useState(0);
  const problem: DsaProblem = PROBLEMS[problemIndex] || PROBLEMS[0];

  const [selectedLang, setSelectedLang] = useState<ExecuteLanguage>("Python");
  const [code, setCode] = useState(() => starterCode(problem, "Python"));
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [output, setOutput] = useState<string | null>(null);
  const [failedRuns, setFailedRuns] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [lastRun, setLastRun] = useState<{ passed: number; total: number } | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { theme } = useTheme();
  const editorTheme = useMemo(() => buildEditorTheme(13, theme === "light"), [theme]);
  const currentExtension = LANGUAGE_EXTENSIONS[selectedLang];
  const handleCodeChange = useCallback((val: string) => setCode(val), []);

  // One draft per problem and language, so switching never throws work away. The switch happens in one batch
  // (language, problem and code together) so the editor never shows a mismatched pair for a frame.
  const drafts = useRef<Record<string, string>>({});
  const switchTo = (nextIndex: number, nextLang: ExecuteLanguage) => {
    const next = PROBLEMS[nextIndex] ?? PROBLEMS[0];
    drafts.current[`${problem.id}::${selectedLang}`] = code;
    setProblemIndex(nextIndex);
    setSelectedLang(nextLang);
    setCode(drafts.current[`${next.id}::${nextLang}`] ?? starterCode(next, nextLang));
    // a different problem or language starts with a clean console
    setOutput(null);
    setTestStatus("idle");
    setLastRun(null);
  };
  const handleLangChange = (lang: ExecuteLanguage) => switchTo(problemIndex, lang);

  useEffect(() => {
    warmUpRuntimes();
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const timeLimitSecs = 45 * 60;
  const timeWarning = elapsed > timeLimitSecs * 0.85;

  const runTests = async () => {
    if (testStatus === "running") return;
    setTestStatus("running");
    setOutput("Running your solution against the test cases...");
    try {
      const results = await runDsaTests(problem, selectedLang, code, problem.testCases, "coding-interview");
      const passed = results.filter((r) => r.passed).length;
      setLastRun({ passed, total: results.length });
      setOutput(describeResults(results, ""));
      if (passed === results.length) {
        setTestStatus("passed");
      } else {
        setTestStatus("failed");
        setFailedRuns((n) => n + 1);
      }
      return { passed, total: results.length };
    } catch (err: any) {
      setTestStatus("failed");
      setFailedRuns((n) => n + 1);
      setOutput(`Execution failed: ${err?.message || "the in-browser runtime could not start"}`);
    }
  };

  // IDE Keyboard Shortcut: Cmd/Ctrl + Enter runs the tests
  const runRef = useRef(runTests);
  runRef.current = runTests;
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        runRef.current();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmitInterview = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Score what the candidate actually delivered: the share of tests their final code passes.
    let outcome = lastRun;
    let log = output;
    if (testStatus === "idle" || testStatus === "running") {
      try {
        const results = await runDsaTests(problem, selectedLang, code, problem.testCases, "coding-interview-submit");
        outcome = { passed: results.filter((r) => r.passed).length, total: results.length };
        log = describeResults(results, "");
      } catch (e: any) {
        log = e?.message ?? "Could not run the tests";
      }
    }
    const passed = outcome?.passed ?? 0;
    const total = outcome?.total ?? problem.testCases.length;
    const calculatedScore = total > 0 ? Math.round((passed / total) * 100) : 0;
    const status = total > 0 && passed === total ? "passed" : "failed";
    setFinalScore(calculatedScore);

    try {
      await saveInterviewSession({
        title: `Coding Assessment — ${problem.title}`,
        track: "DSA",
        question_count: 1,
        duration_seconds: elapsed,
        transcript: [
          {
            speaker: "AI",
            text: `Problem: ${problem.title}\nDifficulty: ${problem.difficulty}\n\n${problem.description}`,
            time: "00:00",
          },
          {
            speaker: "You",
            text: `[Submitted Implementation in ${selectedLang}]:\n\n${code}\n\nTest results:\n${log || "No output recorded"}`,
            time: fmtTime(elapsed),
          },
        ],
        overall_score: calculatedScore,
        competency_level: calculatedScore >= 85 ? "Senior" : calculatedScore >= 60 ? "Mid-Level" : "Junior",
        metrics: {
          language: selectedLang,
          difficulty: problem.difficulty,
          status,
          tests_passed: passed,
          tests_total: total,
        },
        strengths: status === "passed" ? ["Passed every test case", "Working solution in the allotted time"] : passed > 0 ? ["Handled part of the test cases"] : [],
        weaknesses: status === "failed" ? [`Passed ${passed} of ${total} test cases`] : [],
      });
      setSaveFailed(false);
      setShowCompleteModal(true);
    } catch (err) {
      console.error("Failed to save coding session:", err);
      setSaveFailed(true);
      setShowCompleteModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hintUnlocked = failedRuns >= 2;
  const dd =
    "appearance-none h-[34px] pl-3 pr-8 border border-ob-ln2 rounded-lg bg-ob-bg text-ob-tx font-mono text-xs cursor-pointer outline-none hover:border-ob-ln3 focus:border-ob-ln3 transition-colors";
  const diffCls = problem.difficulty === "Hard" ? "ob-err" : problem.difficulty === "Medium" ? "ob-warn" : "ob-ok";

  return (
    <div className="h-full flex flex-col overflow-hidden bg-ob-bg text-ob-tx z-10 text-[14px] leading-[1.55]">
      <header className="flex items-center justify-between flex-wrap gap-3.5 px-[clamp(16px,2vw,28px)] py-3.5 border-b border-ob-ln shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
          <button type="button" className="ob-btn" onClick={() => onNavigate("dashboard")}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
            Exit assessment
          </button>
          <div className="flex items-center gap-2">
            <span className="relative inline-flex">
              <select aria-label="Problem" value={problemIndex} onChange={(e) => switchTo(Number(e.target.value), selectedLang)} className={`${dd} !text-[15px] !font-sans`}>
                {PROBLEMS.map((p, idx) => (
                  <option key={p.id} value={idx}>{p.title}</option>
                ))}
              </select>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--ob-tx3)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="absolute right-[11px] top-[11px] pointer-events-none" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
            </span>
            <span className={`ob-chip ob-sq ${diffCls}`}>{problem.difficulty}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-mono text-[12.5px] ob-tx2 flex items-center gap-2.5" aria-label={`Elapsed ${fmtTime(elapsed)} of ${fmtTime(timeLimitSecs)}`}>
            <span className={`inline-block w-[7px] h-[7px] rounded-full ${timeWarning ? "bg-ob-hot" : "bg-ob-ok"}`} aria-hidden="true" />
            {fmtTime(elapsed)}
            <span className="ob-bar !h-[3px] !w-[120px]"><i style={{ width: `${Math.min(100, (elapsed / timeLimitSecs) * 100)}%`, animation: "none" }} /></span>
            {fmtTime(timeLimitSecs)}
          </span>
          <span className="ob-chip ob-sq">{selectedLang}</span>
          <button type="button" className="ob-btn" onClick={runTests} disabled={testStatus === "running"}>
            {testStatus === "running" ? "Running..." : "Run"}
          </button>
          <button type="button" className="ob-btn ob-pr" onClick={handleSubmitInterview} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-wrap gap-3 px-[clamp(12px,1.5vw,20px)] pt-3 pb-4 min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* Problem */}
        <section className="ob-rise flex-[1_1_320px] max-w-[420px] min-w-0 flex flex-col overflow-hidden rounded-xl border border-ob-ln bg-ob-bg2 min-h-[420px]" style={{ ["--i" as string]: 0 }}>
          <div className="flex items-center justify-between px-4 h-[42px] border-b border-ob-ln shrink-0">
            <span className="ob-lb">Problem</span>
            <span className="ob-mo text-[11.5px] ob-tx3">{problem.examples.length} examples</span>
          </div>
          <div className="ob-scroll flex-1 overflow-y-auto p-5 grid gap-[18px] content-start text-[13.5px] ob-tx2">
            <div>
              <h2 className="m-0 text-[17px] font-medium tracking-[-0.01em] ob-tx">{problem.title}</h2>
              <div className="ob-mo text-xs ob-txa mt-1">
                {problem.optimalTimeComplexity} time · {problem.optimalSpaceComplexity} space target
              </div>
            </div>
            <p className="m-0 ob-tx whitespace-pre-line">{problem.description}</p>
            {problem.examples.map((ex, i) => (
              <div key={i}>
                <div className="ob-lb mb-2">Example {i + 1}</div>
                <div className="ob-mo text-xs bg-ob-bg border border-ob-ln rounded-lg p-3 leading-[1.8] whitespace-pre-line">
                  in&nbsp; {ex.input}
                  {"\n"}out {ex.output}
                </div>
                {ex.explanation && <p className="mt-2 mb-0 text-[12.5px] ob-tx3">{ex.explanation}</p>}
              </div>
            ))}
            {problem.constraints && problem.constraints.length > 0 && (
              <div>
                <div className="ob-lb mb-2">Constraints</div>
                <div className="ob-mo text-xs leading-[1.9]">{problem.constraints.map((c, i) => <div key={i}>{c}</div>)}</div>
              </div>
            )}
            <div className="border border-dashed border-ob-ln2 rounded-[10px] p-3.5 text-[12.5px]">
              <div className="flex items-start justify-between gap-2.5">
                <span>
                  <span className="ob-tx block">Structural hint</span>
                  <span className="ob-tx3">{hintUnlocked ? "Unlocked after two failed runs" : `Unlocks after two failed runs (${failedRuns}/2)`}</span>
                </span>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" className="shrink-0 ob-tx3">
                  <rect x="5" y="11" width="14" height="9" rx="2" />
                  <path d={hintUnlocked ? "M8 11V8a4 4 0 0 1 7-2.6" : "M8 11V8a4 4 0 0 1 8 0v3"} />
                </svg>
              </div>
              {hintUnlocked && <p className="mt-2.5 mb-0 ob-tx2">{problem.hints.tier2_structural}</p>}
            </div>
            <div className="text-[12.5px] ob-tx3">
              <span className="ob-tx">Concept:</span> {problem.hints.tier1_conceptual}
            </div>
          </div>
        </section>

        {/* Editor + console */}
        <section className="flex-[2_1_520px] min-w-0 flex flex-col gap-3 min-h-[520px]">
          <div className="ob-rise flex-1 flex flex-col min-h-[320px] overflow-hidden rounded-xl border border-ob-ln bg-ob-bg2" style={{ ["--i" as string]: 1 }}>
            <div className="flex items-center justify-between gap-2.5 px-4 h-[42px] border-b border-ob-ln shrink-0">
              <span className="ob-mo text-xs flex items-center gap-2.5"><span className="ob-txa">●</span>solution</span>
              <div className="flex items-center gap-2">
                <span className="relative inline-flex">
                  <select aria-label="Language" value={selectedLang} onChange={(e) => handleLangChange(e.target.value as ExecuteLanguage)} className={dd}>
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--ob-tx3)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="absolute right-[11px] top-[11px] pointer-events-none" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                </span>
                <button type="button" className="ob-btn ob-sm" onClick={() => onNavigate("compiler")}>Full compiler</button>
                <span className="ob-mo text-[11.5px] ob-tx3 hidden md:inline">⌘↵ runs</span>
              </div>
            </div>
            <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
              {/* The key remounts the editor when the document is swapped from outside (another language or
                  problem); otherwise the editor library holds back an outside change for ~0.7s after the last
                  keystroke and the old code stays on screen under the new language. */}
              <CodeMirror
                key={`${problem.id}:${selectedLang}`}
                value={code}
                height="100%"
                extensions={currentExtension}
                theme={editorTheme}
                onChange={handleCodeChange}
                className="h-full text-xs font-mono"
                basicSetup={EDITOR_SETUP}
              />
            </div>
          </div>

          <div className="ob-rise flex flex-col overflow-hidden rounded-xl border border-ob-ln bg-ob-bg2 shrink-0" style={{ ["--i" as string]: 2, maxHeight: 240 }}>
            <div className="flex items-center justify-between gap-2.5 px-4 h-[42px] border-b border-ob-ln shrink-0">
              <span className="ob-lb">Console</span>
              <span className="flex items-center gap-2.5">
                {testStatus === "running" && <span className="ob-chip ob-sq ob-live">running</span>}
                {testStatus === "passed" && <span className="ob-chip ob-sq ob-ok">all tests passed</span>}
                {testStatus === "failed" && <span className="ob-chip ob-sq ob-err">{lastRun ? `${lastRun.passed}/${lastRun.total} passed` : "failed"}</span>}
                {output && (
                  <button type="button" onClick={() => { setOutput(null); setTestStatus("idle"); }} className="ob-mo text-[11.5px] ob-tx3 hover:text-ob-tx cursor-pointer">clear</button>
                )}
              </span>
            </div>
            <div className="ob-scroll overflow-y-auto px-[18px] py-3 min-h-[56px]" aria-live="polite">
              {output ? (
                <pre className={`m-0 font-mono text-xs leading-[1.7] whitespace-pre-wrap ${testStatus === "failed" ? "text-ob-er" : testStatus === "passed" ? "text-ob-tx" : "ob-tx2"}`}>{output}</pre>
              ) : (
                <div className="ob-tx3 text-[13px]">Run your code to see the output here.</div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Completion modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "color-mix(in srgb, var(--ob-bg) 80%, transparent)", backdropFilter: "blur(6px)" }} role="dialog" aria-modal="true" aria-labelledby="coding-done-title">
          <div className="ob-pane max-w-md w-full p-7 flex flex-col gap-5">
            <div>
              <div className="ob-lb ob-txa">Submitted</div>
              <h2 id="coding-done-title" className="text-[20px] font-medium tracking-[-0.02em] mt-2.5 mb-2">{saveFailed ? "Result not saved" : "Solution saved"}</h2>
              <p className="ob-tx2 text-[13px] m-0">
                {saveFailed
                  ? `Your ${selectedLang} implementation of ${problem.title} was scored, but we couldn't save it to your history. Check your connection and submit again.`
                  : `Your ${selectedLang} implementation of ${problem.title} was recorded in your history.`}
              </p>
            </div>
            <div className="rounded-[10px] border border-ob-ln bg-ob-bg p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-[13px]">{finalScore !== null ? `${finalScore}% of tests passed` : "Saved"}</div>
                <div className="ob-mo text-xs ob-tx3 mt-0.5">{fmtTime(elapsed)} · {selectedLang}</div>
              </div>
              <span className={`ob-chip ob-sq ${saveFailed ? "ob-err" : finalScore === 100 ? "ob-ok" : ""}`}>{saveFailed ? "not saved" : "recorded"}</span>
            </div>
            <div className="grid gap-2.5">
              <button type="button" className="ob-btn ob-pr" onClick={() => onNavigate("history")}>View in history</button>
              <button type="button" className="ob-btn" onClick={() => onNavigate("dashboard")}>Back to dashboard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
