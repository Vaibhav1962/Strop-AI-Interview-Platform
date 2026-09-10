import { useState, useRef, useEffect } from "react";
import { Button, Badge, LiveBadge } from "../components/ui";
import { mockCodingProblem } from "../data/mock";

type TestStatus = "idle" | "running" | "passed" | "failed";

const LANGUAGES = ["Go", "Python", "JavaScript", "Java"] as const;

const languageTemplates: Record<string, string> = {
  Go: mockCodingProblem.starterCode,
  Python: `import time
import threading

class TokenBucket:
    def __init__(self, capacity: float, refill_rate: float):
        self.capacity = capacity
        self.tokens = capacity
        self.refill_rate = refill_rate  # tokens per second
        self.last_time = time.time()
        self.lock = threading.Lock()

    def allow(self) -> bool:
        with self.lock:
            now = time.time()
            elapsed = now - self.last_time
            self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
            self.last_time = now

            if self.tokens >= 1.0:
                self.tokens -= 1.0
                return True
            return False
`,
  JavaScript: `class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate; // tokens per second
    this.lastTime = Date.now();
  }

  allow() {
    const now = Date.now();
    const elapsed = (now - this.lastTime) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastTime = now;

    if (this.tokens >= 1.0) {
      this.tokens -= 1.0;
      return true;
    }
    return false;
  }
}
`,
  Java: `import java.util.concurrent.locks.ReentrantLock;

public class TokenBucket {
    private final double capacity;
    private final double refillRate;
    private double tokens;
    private long lastTime;
    private final ReentrantLock lock = new ReentrantLock();

    public TokenBucket(double capacity, double refillRate) {
        this.capacity = capacity;
        this.refillRate = refillRate;
        this.tokens = capacity;
        this.lastTime = System.currentTimeMillis();
    }

    public boolean allow() {
        lock.lock();
        try {
            long now = System.currentTimeMillis();
            double elapsed = (now - lastTime) / 1000.0;
            tokens = Math.min(capacity, tokens + elapsed * refillRate);
            lastTime = now;

            if (tokens >= 1.0) {
                tokens -= 1.0;
                return true;
            }
            return false;
        } finally {
            lock.unlock();
        }
    }
}
`,
};

export default function CodingInterview({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [selectedLang, setSelectedLang] = useState("Go");
  const [code, setCode] = useState(mockCodingProblem.starterCode);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [output, setOutput] = useState<string | null>(null);
  const [tab, setTab] = useState<"problem" | "ai">("problem");
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleLangChange = (lang: string) => {
    setSelectedLang(lang);
    if (languageTemplates[lang]) {
      setCode(languageTemplates[lang]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newCode = code.substring(0, start) + "    " + code.substring(end);
      setCode(newCode);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      });
    }
  };

  useEffect(() => {
    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const runTests = () => {
    setTestStatus("running");
    setOutput("Executing test suite against candidate code...");
    setTimeout(() => {
      setTestStatus("passed");
      setOutput(
        "✓ Test 1: Under capacity burst allowance — PASSED (14ms)\n✓ Test 2: Rate limit enforcement on 11th request — PASSED (28ms)\n✓ Test 3: Thread-safe concurrent access across 50 goroutines — PASSED (42ms)\n\nAll 3 test cases passed successfully!\nMemory: 14.1 MB · P99 Latency: 0.8ms"
      );
    }, 1100);
  };

  const timeLimitSecs = mockCodingProblem.timeLimit * 60;
  const timeWarning = elapsed > timeLimitSecs * 0.85;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0c0d13] text-[#f5f6fa] z-10">
      <div className="h-12 flex items-center justify-between px-5 border-b border-[#1e2029] shrink-0">
        <div className="flex items-center gap-3">
          <button
            className="text-xs text-[#9a9ca8] hover:text-white transition-colors cursor-pointer"
            onClick={() => onNavigate("dashboard")}
          >
            ← Exit
          </button>
          <div className="w-px h-3.5 bg-[#232430]" />
          <span className="text-[11px] font-bold uppercase text-[#60a5fa] tracking-wider">Algorithmic Round:</span>
          <span className="text-[13px] font-heading font-bold text-white">{mockCodingProblem.title}</span>
          <Badge variant={mockCodingProblem.difficulty === "Hard" ? "rose" : mockCodingProblem.difficulty === "Medium" ? "amber" : "emerald"}>
            {mockCodingProblem.difficulty}
          </Badge>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <LiveBadge label="CONCURRENCY ACTIVE" />
          <div
            className="px-3 py-1 rounded-lg border font-semibold font-mono"
            style={{
              background: timeWarning ? "rgba(244,63,94,0.15)" : "#1a1b24",
              borderColor: timeWarning ? "rgba(244,63,94,0.3)" : "#232430",
              color: timeWarning ? "#fb7185" : "#e5e7eb",
            }}
          >
            {fmtTime(elapsed)} / {fmtTime(timeLimitSecs)}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[380px] shrink-0 border-r border-[#1e2029] flex flex-col overflow-hidden">
          <div className="flex border-b border-[#1e2029] shrink-0">
            {(["problem", "ai"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-3 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                style={{
                  color: tab === t ? "#818cf8" : "#4b5060",
                  borderBottom: tab === t ? "2px solid #818cf8" : "2px solid transparent",
                }}
              >
                {t === "ai" ? "AI Coach" : "Problem"}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {tab === "problem" && (
              <div>
                <h2 className="text-[19px] font-heading font-bold text-white mb-3">{mockCodingProblem.title}</h2>
                <p className="text-[13px] text-[#9a9ca8] leading-relaxed mb-5 whitespace-pre-line">{mockCodingProblem.description}</p>

                <div className="mb-4">
                  <div className="text-[11px] text-[#6b7280] uppercase tracking-wider mb-2">Constraints</div>
                  <ul className="flex flex-col gap-1">
                    {mockCodingProblem.constraints.map((c, i) => (
                      <li key={i} className="text-[11px] text-[#8a8d9a] font-mono">· {c}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="text-[11px] text-[#6b7280] uppercase tracking-wider">Examples</div>
                  {mockCodingProblem.examples.map((ex, i) => (
                    <div key={i} className="rounded-[14px] p-3.5 bg-[#151622] border border-[#232430]">
                      <div className="text-[11px] font-mono mb-2 whitespace-pre-line text-[#a5b4fc]">{ex.input}</div>
                      <div className="text-[11px] font-mono text-[#34d399]">{ex.output}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "ai" && (
              <div>
                <div className="text-xs text-[#9a9ca8] mb-4">The AI Coach observes your code and gives guidance without spoiling the solution.</div>
                <div className="rounded-[14px] p-4 bg-[rgba(129,140,248,0.08)] border border-[rgba(129,140,248,0.2)] mb-4">
                  <div className="text-xs font-mono text-[#818cf8] mb-1">AI Coach</div>
                  <p className="text-sm text-[#c7d2fe]">I can see your code. You are on the right track. Think about the token refill logic — track when tokens were last consumed and compute the refill based on elapsed time. The mutex usage looks correct.</p>
                </div>
                <div className="flex flex-col gap-2">
                  {["What is the time complexity?", "I am stuck on the edge cases", "Review my current approach"].map((q) => (
                    <button key={q} className="text-left px-3 py-2 rounded-xl text-xs text-[#9a9ca8] border border-[#232430] hover:border-[rgba(129,140,248,0.3)] hover:text-[#a5b4fc] transition-all cursor-pointer">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e2029] shrink-0">
            <select
              value={selectedLang}
              onChange={(e) => handleLangChange(e.target.value)}
              className="h-7 px-3 rounded-lg bg-[#1a1b24] border border-[#232430] text-[11px] font-mono font-bold text-[#a5b4fc] cursor-pointer focus:outline-none focus:border-[rgba(129,140,248,0.4)] appearance-none pr-8"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239a9ca8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button variant="secondary" size="xs" onClick={runTests} loading={testStatus === "running"}>Run Tests</Button>
              <Button variant="glow" size="xs" onClick={() => onNavigate("interview-report")}>Submit Code</Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="w-full h-full p-5 font-mono text-xs md:text-[12.5px] bg-transparent text-[#c7d2fe] resize-none outline-none leading-relaxed selection:bg-[rgba(129,140,248,0.3)]"
              style={{ caretColor: "#818cf8" }}
            />
          </div>

          <div
            className="border-t border-[#1e2029] shrink-0 overflow-y-auto"
            style={{ maxHeight: "200px", minHeight: output ? "120px" : "44px" }}
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e2029]">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-[#6b7280] uppercase tracking-wider">Output</span>
                {testStatus === "running" && <Badge variant="indigo">Running...</Badge>}
                {testStatus === "passed" && <Badge variant="emerald">All Passed</Badge>}
                {testStatus === "failed" && <Badge variant="rose">Failed</Badge>}
              </div>
              {output && (
                <button onClick={() => { setOutput(null); setTestStatus("idle"); }} className="text-xs text-[#6b7280] hover:text-[#9a9ca8] cursor-pointer">Clear</button>
              )}
            </div>
            {output && (
              <pre
                className="p-4 text-[11.5px] font-mono leading-relaxed"
                style={{ color: testStatus === "passed" ? "#34d399" : testStatus === "failed" ? "#fb7185" : "#9a9ca8" }}
              >
                {output}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
