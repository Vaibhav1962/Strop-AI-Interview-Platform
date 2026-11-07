import { useState } from "react";
import { FileDropZone } from "../components/ui";
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

  return (
    <div className="mx-auto w-full max-w-[1160px] px-5 sm:px-[clamp(20px,4vw,56px)] pt-2 pb-16 text-[14px] leading-[1.55]">
      <div className="flex flex-wrap items-center gap-5">
        <div className="ob-rise inline-flex p-[3px] border border-[#2b2b28] rounded-[9px] bg-[#181817]" style={{ ["--i" as string]: 3 }} role="tablist" aria-label="Input mode">
          {(["paste", "upload"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={inputMode === m}
              onClick={() => setInputMode(m)}
              className={`h-9 px-4 rounded-[7px] text-[13px] cursor-pointer transition-all duration-300 ${
                inputMode === m ? "bg-[#20201e] text-[#ebe9e2] border border-[#3a3a36]" : "text-[#8f8d85] border border-transparent hover:text-[#ebe9e2]"
              }`}
            >
              {m === "paste" ? "Paste text" : "Upload file"}
            </button>
          ))}
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
              className="ob-mo ob-scroll w-full min-h-[520px] resize-y p-[22px] rounded-xl border border-[#2b2b28] bg-[#181817] text-[13px] leading-[1.9] text-[#aaa89f] outline-none focus:border-[rgba(230,223,204,0.26)] focus:shadow-[0_0_0_4px_rgba(230,223,204,0.07)] transition-all duration-300 placeholder:text-[#8f8d85]"
            />
          ) : (
            <div className="min-h-[420px] grid place-items-center">
              <FileDropZone accept=".pdf,.docx,.txt" onFile={handleFileUpload} loading={isMatching} uploaded={Boolean(uploadedFileName) && !isMatching} fileName={uploadedFileName || undefined} />
            </div>
          )}
          {inputMode === "paste" && (
            <div className="ob-mo text-[11.5px] ob-tx3 text-right">{wordCount > 0 ? `${wordCount} words` : "waiting for text"}</div>
          )}

          {errorNote && <div className="text-[13px] text-[#f08a98]" role="alert">{errorNote}</div>}
          {!userResume && (
            <div className="text-[13px] text-[#e8bd6f]">
              No resume on file yet, so the match will be thin.{" "}
              <button type="button" className="underline cursor-pointer" onClick={() => onNavigate("resume")}>Upload one first</button>
            </div>
          )}

          <div className="flex gap-2.5 flex-wrap">
            <button type="button" className="ob-btn ob-pr ob-btn-lg" onClick={handleMatchJob} disabled={isMatching || !rawText.trim()}>
              {isMatching ? "Analyzing..." : "Next: analyze match"}
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
