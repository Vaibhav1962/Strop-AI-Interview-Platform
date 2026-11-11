import { useEffect, useState } from "react";
import { FileDropZone, Segmented } from "../components/ui";
import { getUserResume, setUserJD, cleanCandidateName } from "../lib/userDocuments";
import { parseRawJD, computeAccurateMatch, saveJdMatchReport, isReadableJdText, analyzeJobDescription } from "../lib/jdMatcher";
import { extractPdfText } from "../lib/pdfExtractor";

export default function JobDescription({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [userResume] = useState(() => getUserResume());
  const [inputMode, setInputMode] = useState<"paste" | "upload">("paste");
  const [rawText, setRawText] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [errorNote, setErrorNote] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setIsMatching(true);
    setErrorNote(null);
    setUploadedFileName(file.name);

    try {
      let extracted = "";
      if (file.name.toLowerCase().endsWith(".pdf") || file.type.includes("pdf")) {
        extracted = await extractPdfText(file);
      } else {
        extracted = await file.text();
      }

      if (!isReadableJdText(extracted)) {
        setErrorNote("Could not extract readable text from the uploaded document. Please paste the JD text directly.");
        setIsMatching(false);
        return;
      }

      setRawText(extracted);

      const { jd: parsed, analysis } = await runAnalysis(extracted);
      setUserJD(parsed);
      saveJdMatchReport(analysis, parsed, userResume);

      // Directly navigate to Match Analysis
      onNavigate("match-analysis");
    } catch (err) {
      console.warn("[JobDescription] File processing error:", err);
      setErrorNote("Failed to process the uploaded file. Please try pasting the text directly.");
      setIsMatching(false);
    }
  };

  /** Server-side LLM parse and match first; local heuristics only if the server cannot answer. */
  const runAnalysis = async (text: string) => {
    const remote = await analyzeJobDescription(text, userResume);
    if (remote) return remote;
    const jd = parseRawJD(text);
    return { jd, analysis: computeAccurateMatch(userResume, jd) };
  };

  const handleMatchJob = async () => {
    if (!rawText.trim()) {
      setErrorNote("Please paste a job description or upload a file first.");
      return;
    }

    if (!isReadableJdText(rawText)) {
      setErrorNote("That does not look like a readable job description. Paste the full text of the posting.");
      return;
    }

    setIsMatching(true);
    setErrorNote(null);

    try {
      const { jd: parsed, analysis } = await runAnalysis(rawText);
      setUserJD(parsed);
      saveJdMatchReport(analysis, parsed, userResume);

      // Directly navigate to Match Analysis
      onNavigate("match-analysis");
    } catch (err) {
      console.warn("[JobDescription] Match error:", err);
      setErrorNote("Error matching job description. Please check the text format and try again.");
      setIsMatching(false);
    }
  };

  const wordCount = rawText.trim() ? rawText.trim().split(/\s+/).length : 0;

  // The analysis takes a while; name what is happening instead of one static "Analyzing...".
  const STAGES = ["Reading the posting", "Extracting requirements", "Checking evidence in your resume", "Writing the verdict"];
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (!isMatching) {
      setStage(0);
      return;
    }
    const id = window.setInterval(() => setStage((s) => Math.min(STAGES.length - 1, s + 1)), 2600);
    return () => window.clearInterval(id);
  }, [isMatching]);

  return (
    <div className="mx-auto w-full max-w-[1160px] px-5 sm:px-[clamp(20px,4vw,56px)] pt-2 pb-16 text-[14px] leading-[1.55]">
      <div className="flex flex-wrap items-center gap-5">
        <div className="ob-rise" style={{ ["--i" as string]: 3 }}>
          <Segmented
            quiet
            label="Input mode"
            value={inputMode}
            onChange={setInputMode}
            options={[
              { id: "paste", label: "Paste text" },
              { id: "upload", label: "Upload file" },
            ]}
          />
        </div>
      </div>

      <div className="mt-6">
        <div className="ob-rise w-full min-w-0 grid gap-3" style={{ ["--i" as string]: 4 }}>
          {inputMode === "paste" ? (
            <textarea
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setErrorNote(null);
              }}
              placeholder={"Paste the full job posting here: title, company, responsibilities, requirements and nice-to-haves."}
              aria-label="Job description text"
              className="ob-mo ob-scroll w-full min-h-[520px] resize-y p-[22px] rounded-xl border border-ob-ln bg-ob-card text-[13px] leading-[1.9] text-ob-tx2 outline-none focus:border-[rgb(var(--ob-ac-rgb)/0.26)] focus:shadow-[0_0_0_4px_rgb(var(--ob-ac-rgb)/0.07)] transition duration-300 placeholder:text-ob-tx3"
            />
          ) : (
            <div className="min-h-[420px] grid place-items-center">
              <FileDropZone accept=".pdf,.docx,.txt" onFile={handleFileUpload} loading={isMatching} uploaded={Boolean(uploadedFileName) && !isMatching} fileName={uploadedFileName || undefined} />
            </div>
          )}
          {inputMode === "paste" && (
            <div className="ob-mo text-[11.5px] ob-tx3 text-right">{wordCount > 0 ? `${wordCount} words` : "waiting for text"}</div>
          )}

          {errorNote && <div className="text-[13px] text-ob-er" role="alert">{errorNote}</div>}
          {!userResume && (
            <div className="text-[13px] text-ob-wn">
              No resume on file yet, so the match will be thin.{" "}
              <button type="button" className="underline cursor-pointer" onClick={() => onNavigate("resume")}>Upload one first</button>
            </div>
          )}

          <div className="flex gap-x-5 gap-y-3 flex-wrap items-center">
            <button type="button" className={`ob-btn ob-pr ob-btn-lg ${isMatching ? "ob-shim" : ""}`} onClick={handleMatchJob} disabled={isMatching || !rawText.trim()}>
              {isMatching ? "Analyzing" : "Next: analyze match"}
              {!isMatching && (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              )}
            </button>
            {isMatching && (
              <div className="flex items-center gap-3 ob-mo text-[11.5px] ob-tx3" role="status">
                <span className="flex gap-1" aria-hidden="true">
                  {STAGES.map((_, i) => (
                    <i key={i} className="block w-5 h-[2px] rounded-full transition-colors duration-700" style={{ background: i <= stage ? "var(--ob-ac)" : "var(--ob-ln2)" }} />
                  ))}
                </span>
                <span key={stage} className="ob-pop ob-tx2">{STAGES[stage]}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
