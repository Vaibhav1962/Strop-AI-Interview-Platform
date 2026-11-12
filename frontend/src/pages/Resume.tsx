import { useState, useEffect, useRef } from "react";
import { FileDropZone } from "../components/ui";
import {
  getUserResume,
  setUserResume,
  clearUserResume,
  type UserResumeData,
} from "../lib/userDocuments";
import { processAndAnalyzeResume } from "../lib/resumeAnalyzer";
import { fastIndexResume } from "../lib/resumeRAG";
import { getStoredPdf, saveStoredPdf, clearStoredPdf } from "../lib/pdfStorage";

export default function Resume({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [currentResume, setCurrentResume] = useState<UserResumeData | null>(() => getUserResume());
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisNote, setAnalysisNote] = useState<string | null>(null);
  const [pastStruggles, setPastStruggles] = useState<string[]>(() => currentResume?.pastStruggles || []);
  const [interviewTopics, setInterviewTopics] = useState<string[]>(() => currentResume?.interviewTopics || []);
  const [activeTab, setActiveTab] = useState<"overview" | "projects" | "roadmap">("overview");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);

  // Restore persistent PDF preview and parsed profile from storage on mount
  useEffect(() => {
    let activeUrl: string | null = null;
    getStoredPdf().then((stored) => {
      if (stored && stored.blob) {
        const url = URL.createObjectURL(stored.blob);
        activeUrl = url;
        setPdfPreviewUrl(url);
      } else {
        setPdfPreviewUrl(null);
      }
      const savedResume = getUserResume();
      setCurrentResume(savedResume);
      setPastStruggles(savedResume?.pastStruggles || []);
      setInterviewTopics(savedResume?.interviewTopics || []);
    });

    const handleSync = () => {
      getStoredPdf().then((stored) => {
        if (stored?.blob && !activeUrl) {
          activeUrl = URL.createObjectURL(stored.blob);
          setPdfPreviewUrl(activeUrl);
        }
      });
      const savedResume = getUserResume();
      setCurrentResume(savedResume);
      setPastStruggles(savedResume?.pastStruggles || []);
      setInterviewTopics(savedResume?.interviewTopics || []);
    };
    window.addEventListener("interviewiq-profile-synced", handleSync);

    return () => {
      if (activeUrl) URL.revokeObjectURL(activeUrl);
      window.removeEventListener("interviewiq-profile-synced", handleSync);
    };
  }, []);

  const handleFileUpload = async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setPdfPreviewUrl(previewUrl);
    setAnalyzing(true);
    setAnalysisNote(`Analyzing resume ${file.name}...`);

    await saveStoredPdf(file);
    // Ask the browser not to evict the saved PDF when storage runs low (best effort, ignored where unsupported).
    try {
      await navigator.storage?.persist?.();
    } catch {
      /* optional */
    }

    try {
      // 1. Instantaneous RAG indexing (< 100ms)
      const ragProfile = await fastIndexResume(file);

      const resumeData: UserResumeData = {
        name: ragProfile.name,
        headline: ragProfile.headline,
        contact: ragProfile.contact,
        filename: file.name,
        summary: ragProfile.summary,
        skills: ragProfile.skills,
        skillCategories: ragProfile.skillCategories,
        claims: [],
        experienceSummary: [
          ...(ragProfile.experience || []).map(
            (x) => `${[x.role, x.company].filter(Boolean).join(" at ")}: ${(x.highlights || []).join(". ")}`,
          ),
          ...ragProfile.projects.map((p) => `${p.title}: ${p.architectureDetails}${p.metrics ? ` (${p.metrics.join(", ")})` : ""}`)
        ].join(". "),
        projects: ragProfile.projects.map((p) => ({
          name: p.title,
          description: p.architectureDetails,
          technologies: p.technologies,
          metrics: p.metrics,
        })),
        strengths: ragProfile.strengths,
        pastStruggles: ragProfile.pastStruggles,
        interviewTopics: ragProfile.interviewTopics,
        rawText: ragProfile.rawText,
        education: ragProfile.education,
        experience: ragProfile.experience,
        publications: ragProfile.publications,
        certifications: ragProfile.certifications,
        achievements: ragProfile.achievements,
      };

      setCurrentResume(resumeData);
      setUserResume(resumeData);
      setPastStruggles(ragProfile.pastStruggles);
      setInterviewTopics(ragProfile.interviewTopics);
      setAnalyzing(false);
      setAnalysisNote(
        `Resume analyzed for ${ragProfile.name}! Practice topics generated from your resume.`
      );
    } catch (err) {
      console.warn("[Resume] Analyzing resume error:", err);
      setAnalyzing(false);
    }
  };

  // The parsed resume is saved with the account, but the PDF file itself only lives in the browser that uploaded it.
  // On another browser or device there is nothing to preview, so the user can add the file back here without
  // re-analysing anything.
  const handleRestorePreview = async (file: File | undefined) => {
    if (!file) return;
    if (file.type && file.type !== "application/pdf") {
      setAnalysisNote("Please choose a PDF file.");
      return;
    }
    await saveStoredPdf(file);
    setPdfPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
  };

  const handleClearResume = async () => {
    await clearStoredPdf();
    clearUserResume();
    setPdfPreviewUrl(null);
    setAnalysisNote(null);
    setCurrentResume(null);
    setPastStruggles([]);
    setInterviewTopics([]);
  };

  const skills = currentResume?.skills || [];
  const projects = currentResume?.projects || [];
  const claims = currentResume?.claims || [];
  const strengths = currentResume?.strengths || [];
  const contact = currentResume?.contact;
  const education = currentResume?.education || [];
  const experience = currentResume?.experience || [];
  const publications = currentResume?.publications || [];
  const contactLine = [contact?.email, contact?.phone, contact?.location].filter(Boolean).join(" · ");
  const parsed = Boolean(currentResume) && !analyzing;
  const PROP = "grid grid-cols-[110px_minmax(0,1fr)] gap-3.5 py-2.5 border-t border-ob-ln text-[13.5px]";
  const SEC = "flex justify-between items-center gap-3";

  return (
    <div className="mx-auto w-full max-w-[1160px] px-5 sm:px-[clamp(20px,4vw,56px)] pt-2 pb-16 text-[14px] leading-[1.55]">
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
          e.target.value = "";
        }}
        accept=".pdf,.docx,.txt"
        className="hidden"
      />

      {/* Progress steps */}
      <div className="ob-rise flex gap-[22px] flex-wrap mt-[26px] mb-[22px]" style={{ ["--i" as string]: 3 }} aria-label="Parsing progress">
        {[
          { label: "Uploaded", done: Boolean(currentResume) || analyzing },
          { label: "Text extracted", done: parsed },
          { label: "Structured", done: parsed && skills.length > 0 },
          { label: `${claims.length || projects.length} ${claims.length ? "claims" : "projects"} indexed`, done: parsed && (claims.length > 0 || projects.length > 0) },
        ].map((st) => (
          <span key={st.label} className={`inline-flex items-center gap-2 text-[12.5px] ${st.done ? "text-ob-tx" : "ob-tx3"}`}>
            <span className={`w-[18px] h-[18px] rounded-full border grid place-items-center transition-colors duration-500 ${st.done ? "bg-ob-ac border-ob-ac text-ob-onac" : "border-ob-ln2"}`} aria-hidden="true">
              {st.done && (
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path className="ob-tick" pathLength={1} d="M5 12l5 5 9-10" /></svg>
              )}
            </span>
            {st.label}
          </span>
        ))}
      </div>
      {analysisNote && <div className="ob-mo text-xs ob-tx3 -mt-3 mb-5" role="status">{analysisNote}</div>}

      <div className="grid gap-4 items-start grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)]">
        <div className="min-w-0 grid gap-4">
          {/* Properties */}
          <div className="ob-card ob-rise hover:!translate-y-0" style={{ ["--i" as string]: 4 }}>
            <div className={SEC}>
              <span className="ob-lb">Properties</span>
              {analyzing ? <span className="ob-chip ob-sq ob-warn">analyzing</span> : currentResume ? <span className="ob-chip ob-sq ob-ok">parsed</span> : <span className="ob-chip ob-sq">no resume</span>}
            </div>
            <div className="mt-3">
              <div className={PROP}><span className="ob-tx3">file</span><span className="ob-mo text-[12.5px] break-all">{currentResume?.filename || "none uploaded"}</span></div>
              <div className={PROP}><span className="ob-tx3">name</span><span>{currentResume?.name || "—"}</span></div>
              {currentResume?.headline && <div className={PROP}><span className="ob-tx3">headline</span><span>{currentResume.headline}</span></div>}
              <div className={PROP}><span className="ob-tx3">contact</span><span>{contactLine || "—"}</span></div>
              <div className={PROP}><span className="ob-tx3">summary</span><span className="ob-tx2">{currentResume?.summary || "Upload a resume to see the extracted summary."}</span></div>
            </div>
          </div>

          {/* Upload / replace */}
          {!currentResume && (
            <div className="ob-rise" style={{ ["--i" as string]: 5 }}>
              <FileDropZone accept=".pdf,.docx,.txt" onFile={handleFileUpload} loading={analyzing} />
            </div>
          )}

          {/* Experience */}
          {experience.length > 0 && (
            <div className="ob-card ob-rise hover:!translate-y-0" style={{ ["--i" as string]: 6 }}>
              <div className={SEC}><span className="ob-lb">Experience · {experience.length}</span></div>
              <div className="mt-2">
                {experience.map((x, i) => (
                  <div key={i} className="py-[18px] border-t border-ob-ln first:border-t-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                      <div className="text-[16px] tracking-[-0.01em]">{[x.role, x.company].filter(Boolean).join(" · ")}</div>
                      <div className="ob-mo text-[11.5px] ob-tx3">{[x.dates, x.location].filter(Boolean).join(" · ")}</div>
                    </div>
                    {x.highlights && x.highlights.length > 0 && (
                      <ul className="mt-2 mb-0 pl-[18px] grid gap-1.5 ob-tx2 text-[13px]">{x.highlights.map((h, j) => <li key={j}>{h}</li>)}</ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {education.length > 0 && (
            <div className="ob-card ob-rise hover:!translate-y-0" style={{ ["--i" as string]: 6 }}>
              <div className={SEC}><span className="ob-lb">Education · {education.length}</span></div>
              <div className="mt-2">
                {education.map((e, i) => (
                  <div key={i} className="py-[16px] border-t border-ob-ln first:border-t-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                      <div className="text-[16px] tracking-[-0.01em]">{e.institution}</div>
                      <div className="ob-mo text-[11.5px] ob-tx3">{[e.dates, e.gpa ? `GPA ${e.gpa}` : ""].filter(Boolean).join(" · ")}</div>
                    </div>
                    {(e.degree || e.field) && <div className="mt-1 ob-tx2 text-[13px]">{[e.degree, e.field].filter(Boolean).join(" in ")}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Publications */}
          {publications.length > 0 && (
            <div className="ob-card ob-rise hover:!translate-y-0" style={{ ["--i" as string]: 7 }}>
              <div className={SEC}><span className="ob-lb">Publications · {publications.length}</span></div>
              <ul className="mt-3 mb-0 pl-[18px] grid gap-2 ob-tx2 text-[13.5px]">{publications.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <div className="ob-card ob-rise hover:!translate-y-0" style={{ ["--i" as string]: 7 }}>
              <div className={SEC}><span className="ob-lb">Projects · {projects.length}</span></div>
              <div className="mt-2">
                {projects.map((p, i) => (
                  <div key={i} className="py-[18px] border-t border-ob-ln first:border-t-0">
                    <div className="text-[16px] tracking-[-0.01em]">{p.name}</div>
                    {p.description && <p className="mt-1.5 mb-3 ob-tx2 text-[13px]">{p.description}</p>}
                    {(p.technologies?.length || p.metrics?.length) ? (
                      <div className="flex flex-wrap gap-1.5">
                        {p.technologies?.map((t) => <span key={t} className="ob-chip ob-sq">{t}</span>)}
                        {p.metrics?.map((m) => <span key={m} className="ob-chip ob-sq ob-live">{m}</span>)}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          <div className="ob-card ob-rise hover:!translate-y-0" style={{ ["--i" as string]: 8 }}>
            <div className={SEC}><span className="ob-lb">Skills · {skills.length} extracted</span></div>
            {skills.length ? (
              <div className="flex flex-wrap gap-[7px] mt-2.5">
                {skills.map((s, i) => <span key={s} className="ob-chip ob-sq ob-live ob-pop" style={{ ["--i" as string]: i }}>{s}</span>)}
              </div>
            ) : (
              <div className="ob-tx3 text-[13px] mt-3">No skills extracted yet.</div>
            )}
          </div>

          {/* Strengths / struggles */}
          {(strengths.length > 0 || pastStruggles.length > 0) && (
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))]">
              {strengths.length > 0 && (
                <div className="ob-card ob-rise hover:!translate-y-0" style={{ ["--i" as string]: 9 }}>
                  <div className="ob-lb mb-2.5">Strengths</div>
                  <ul className="m-0 pl-[18px] grid gap-2 ob-tx2 text-[13.5px]">{strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
              {pastStruggles.length > 0 && (
                <div className="ob-card ob-rise hover:!translate-y-0" style={{ ["--i" as string]: 10 }}>
                  <div className="ob-lb mb-2.5">Challenges overcome</div>
                  <ul className="m-0 pl-[18px] grid gap-2 ob-tx2 text-[13.5px]">{pastStruggles.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
            </div>
          )}
        </div>

        {(pdfPreviewUrl || currentResume) && (
          <aside className="ob-rise w-full min-w-0 lg:sticky lg:top-4" style={{ ["--i" as string]: 5 }} aria-label="Resume document">
            {pdfPreviewUrl && (
            <div className="rounded-xl border border-ob-ln bg-ob-card overflow-hidden">
              <div className="flex items-center justify-between px-4 h-11 border-b border-ob-ln">
                <span className="ob-lb">Document</span>
                <span className="flex items-center gap-3">
                  <button type="button" onClick={() => window.open(pdfPreviewUrl, "_blank")} className="ob-mo text-[11.5px] ob-txa cursor-pointer">Open full size ↗</button>
                  <button type="button" onClick={handleClearResume} className="ob-btn ob-dg ob-sm" style={{ height: 28, padding: "0 10px" }}>Remove</button>
                </span>
              </div>
              {/* One letter-size page: the window is exactly as tall as the page it shows */}
              <div className="relative w-full bg-white overflow-hidden" style={{ aspectRatio: "8.5 / 11" }}>
                <iframe
                  src={`${pdfPreviewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                  title="Resume document"
                  className="absolute inset-0 w-full h-full border-0 block"
                />
                {/* A scan line passes over the page while it is being read. */}
                {analyzing && <div className="ob-scanline" aria-hidden="true" />}
              </div>
            </div>
            )}
            {!pdfPreviewUrl && currentResume && (
              <div className="rounded-xl border border-ob-ln bg-ob-card overflow-hidden">
                <div className="flex items-center justify-between px-4 h-11 border-b border-ob-ln">
                  <span className="ob-lb">Document</span>
                  <button type="button" onClick={handleClearResume} className="ob-btn ob-dg ob-sm" style={{ height: 28, padding: "0 10px" }}>Remove</button>
                </div>
                <div className="p-6 grid gap-3 justify-items-start">
                  <p className="m-0 ob-tx text-[14px]">Preview not available in this browser</p>
                  <p className="m-0 ob-tx3 text-[12.5px] leading-[1.6]">
                    Your parsed resume is saved to your account, but the PDF file itself is stored only in the browser you uploaded it from.
                    Add the file here to see it next to your profile. Nothing is re-analysed.
                  </p>
                  <button type="button" className="ob-btn ob-sm" onClick={() => previewInputRef.current?.click()}>Add PDF to preview</button>
                  <input
                    ref={previewInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      void handleRestorePreview(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
