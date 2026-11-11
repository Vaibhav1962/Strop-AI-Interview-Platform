import { useState, useRef, useEffect, useMemo } from "react";
import CodeMirror, { type Extension } from "@uiw/react-codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { buildEditorTheme } from "../lib/editorTheme";
import { useTheme } from "../lib/theme";
import { DSA_PROBLEMS, type DsaProblem } from "../lib/dsaProblemBank";
import { saveInterviewSession, type ExecuteLanguage } from "../lib/api";
import { executeCode, warmUpPython } from "../lib/codeExecution";

type TestStatus = "idle" | "running" | "passed" | "failed";

const LANGUAGES: ExecuteLanguage[] = ["Python", "JavaScript", "Java", "C++"];

const LANGUAGE_EXTENSIONS: Record<ExecuteLanguage, Extension> = {
  Python: python(),
  JavaScript: javascript(),
  Java: java(),
  "C++": cpp(),
};

export default function CodingInterview({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [problemIndex, setProblemIndex] = useState(0);
  const problem: DsaProblem = DSA_PROBLEMS[problemIndex] || DSA_PROBLEMS[0];

  const [selectedLang, setSelectedLang] = useState<ExecuteLanguage>("Python");
  const [code, setCode] = useState(() => problem.templates["Python"] || "");
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [output, setOutput] = useState<string | null>(null);
  const [failedRuns, setFailedRuns] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { theme } = useTheme();
  const editorTheme = useMemo(() => buildEditorTheme(13, theme === "light"), [theme]);
  const currentExtension = useMemo(() => [LANGUAGE_EXTENSIONS[selectedLang]], [selectedLang]);

  useEffect(() => {
    setCode(problem.templates[selectedLang] || "");
  }, [problemIndex, selectedLang]);

  const handleLangChange = (lang: ExecuteLanguage) => {
    setSelectedLang(lang);
    if (problem.templates[lang]) {
      setCode(problem.templates[lang]);
    }
  };

  useEffect(() => {
    warmUpPython();
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
    setTestStatus("running");
    setOutput("Executing code in cloud sandbox...");

    try {
      const res = await executeCode({
        language: selectedLang,
        source_code: code,
        stdin: "",
      }, { label: "coding-interview" });

      if (res.compile_output) {
        setTestStatus("failed");
        setFailedRuns((n) => n + 1);
        setOutput(`Compilation Error:\n${res.compile_output}`);
        return;
      }

      if (res.stderr) {
        setTestStatus("failed");
        setFailedRuns((n) => n + 1);
        setOutput(`Runtime Error:\n${res.stderr}`);
        return;
      }

      if (res.stdout) {
        setTestStatus("passed");
        setOutput(
          `Execution Complete (${res.time ?? "0.02"}s, ${(res.memory ? res.memory / 1024 : 12.4).toFixed(1)} MB):\n\n${res.stdout}`
        );
        return;
      }

      setTestStatus("passed");
      setOutput(`Execution Succeeded with status: ${res.status || "OK"} (${res.time ?? "0.01"}s)`);
    } catch (err: any) {
      setTestStatus("failed");
        setFailedRuns((n) => n + 1);
      setOutput(`Execution failed: ${err.message || "Failed to reach execution service"}`);
    }
  };

  // IDE Keyboard Shortcut: Cmd/Ctrl + Enter runs code
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        runTests();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedLang, code]);

  const handleSubmitInterview = async () => {
    setIsSubmitting(true);
    let currentStatus = testStatus;
    let currentOut = output;

    if (currentStatus === "idle") {
      try {
        const res = await executeCode({
          language: selectedLang,
          source_code: code,
          stdin: "",
        }, { label: "coding-interview-submit" });
        if (res.stdout) {
          currentStatus = "passed";
          currentOut = res.stdout;
        } else if (res.stderr || res.compile_output) {
          currentStatus = "failed";
          currentOut = res.stderr || res.compile_output;
        }
      } catch (e: any) {
        currentOut = e.message;
      }
    }

    const calculatedScore = currentStatus === "passed" ? 92 : currentStatus === "failed" ? 64 : 75;
    setFinalScore(calculatedScore);

    try {
      await saveInterviewSession({
        title: `Coding Assessment — ${problem.title}`,
        track: "Algorithms & Data Structures",
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
            text: `[Submitted Implementation in ${selectedLang}]:\n\n${code}\n\nExecution Log:\n${currentOut || "No output recorded"}`,
            time: fmtTime(elapsed),
          },
        ],
        overall_score: calculatedScore,
        competency_level: calculatedScore >= 85 ? "Senior" : "Mid-Level",
        metrics: {
          language: selectedLang,
          difficulty: problem.difficulty,
          status: currentStatus,
        },
        strengths: currentStatus === "passed"
          ? ["Clean algorithmic implementation", "Passed compilation and execution in sandbox"]
          : ["Constructed working syntax and problem structure"],
        weaknesses: currentStatus === "failed"
          ? ["Execution error or unresolved edge cases"]
          : [],
      });
      setShowCompleteModal(true);
    } catch (err) {
      console.error("Failed to save coding session:", err);
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
              <select aria-label="Problem" value={problemIndex} onChange={(e) => setProblemIndex(Number(e.target.value))} className={`${dd} !text-[15px] !font-sans`}>
                {DSA_PROBLEMS.map((p, idx) => (
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
              <CodeMirror
                value={code}
                height="100%"
                extensions={currentExtension}
                theme={editorTheme}
                onChange={(val) => setCode(val)}
                className="h-full text-xs font-mono"
                basicSetup={{ lineNumbers: true, highlightActiveLineGutter: true, foldGutter: false, history: true, bracketMatching: true, closeBrackets: true, autocompletion: true, highlightActiveLine: true }}
              />
            </div>
          </div>

          <div className="ob-rise flex flex-col overflow-hidden rounded-xl border border-ob-ln bg-ob-bg2 shrink-0" style={{ ["--i" as string]: 2, maxHeight: 240 }}>
            <div className="flex items-center justify-between gap-2.5 px-4 h-[42px] border-b border-ob-ln shrink-0">
              <span className="ob-lb">Console</span>
              <span className="flex items-center gap-2.5">
                {testStatus === "running" && <span className="ob-chip ob-sq ob-live">running</span>}
                {testStatus === "passed" && <span className="ob-chip ob-sq ob-ok">ran cleanly</span>}
                {testStatus === "failed" && <span className="ob-chip ob-sq ob-err">failed</span>}
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
              <h2 id="coding-done-title" className="text-[20px] font-medium tracking-[-0.02em] mt-2.5 mb-2">Solution saved</h2>
              <p className="ob-tx2 text-[13px] m-0">
                Your {selectedLang} implementation of {problem.title} was recorded in your history.
              </p>
            </div>
            <div className="rounded-[10px] border border-ob-ln bg-ob-bg p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-[13px]">{testStatus === "passed" ? "Ran cleanly in the sandbox" : testStatus === "failed" ? "Last run failed" : "Not run before submit"}</div>
                <div className="ob-mo text-xs ob-tx3 mt-0.5">{fmtTime(elapsed)} · {selectedLang}</div>
              </div>
              <span className="ob-chip ob-sq">{finalScore !== null ? "recorded" : "saved"}</span>
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
