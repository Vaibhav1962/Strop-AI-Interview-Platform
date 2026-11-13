import type { DsaProblem } from "../lib/dsaProblemBank";

/**
 * The problem as the candidate reads it before the code editor opens: statement, examples, constraints.
 * The candidate reads and asks questions here; the editor unlocks once the approach is agreed.
 * Deliberately shows no target complexity: that is part of what the candidate has to work out.
 */
export default function DsaProblemBrief({ problem, className = "" }: { problem: DsaProblem; className?: string }) {
  const tone =
    problem.difficulty === "Easy" ? "ob-ok" : problem.difficulty === "Medium" ? "ob-warn" : "ob-err";

  return (
    <section className={`ob-pane flex flex-col min-h-0 overflow-hidden ${className}`} aria-label="Problem statement">
      <header className="ob-ph">
        <span className="ob-lb">Problem</span>
        <span className={`ob-chip ${tone}`}>{problem.difficulty}</span>
      </header>

      <div className="ob-scroll flex-1 min-h-0 overflow-y-auto px-5 py-5 flex flex-col gap-6">
        <div>
          <h2 className="ob-tx text-[19px] font-medium leading-snug">{problem.title}</h2>
          <p className="ob-tx2 mt-3 text-[14.5px] leading-relaxed whitespace-pre-line">{problem.description}</p>
        </div>

        {problem.examples.length > 0 && (
          <div className="flex flex-col gap-3">
            <span className="ob-lb">{problem.examples.length === 1 ? "Example" : "Examples"}</span>
            {problem.examples.map((ex, i) => (
              <div
                key={i}
                className="ob-mo text-[12.5px] leading-relaxed rounded-lg border ob-bd px-3.5 py-3 flex flex-col gap-1.5"
                style={{ background: "var(--ob-bg3)" }}
              >
                <div className="break-words">
                  <span className="ob-tx3">Input </span>
                  <span className="ob-tx">{ex.input}</span>
                </div>
                <div className="break-words">
                  <span className="ob-tx3">Output </span>
                  <span className="ob-tx">{ex.output}</span>
                </div>
                {ex.explanation && (
                  <div className="ob-tx2 font-sans text-[12.5px] pt-1">{ex.explanation}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {problem.constraints.length > 0 && (
          <div className="flex flex-col gap-3">
            <span className="ob-lb">Constraints</span>
            <ul className="flex flex-col gap-1.5">
              {problem.constraints.map((c, i) => (
                <li key={i} className="ob-mo ob-tx2 text-[12.5px] leading-relaxed flex gap-2">
                  <span className="ob-tx3 select-none" aria-hidden="true">
                    •
                  </span>
                  <span className="break-words">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="ob-tx3 text-[12.5px] leading-relaxed border-t ob-bd pt-4">
          Take your time. Ask Alex anything about the problem, then talk through your approach and its complexity. The
          code editor opens once you have agreed on an approach.
        </p>
      </div>
    </section>
  );
}
