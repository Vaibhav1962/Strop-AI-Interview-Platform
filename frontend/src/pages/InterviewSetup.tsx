import { useState } from "react";
import {
  INTERVIEW_TYPES,
  type InterviewTypeId,
  getSelectedInterviewType,
  setSelectedInterviewType,
  getInterviewTypeInfo,
} from "../lib/interviewConfig";
import { getUserResume } from "../lib/userDocuments";

/** One line icon per track (24x24, stroke). */
const ICONS: Record<string, string> = {
  dsa: "M16 18l6-6-6-6M8 6l-6 6 6 6M14 4l-4 16",
  "system-design": "M4 5h16v5H4zM4 14h16v5H4zM8 7.5h.01M8 16.5h.01M12 10v4",
  "cs-fundamentals": "M7 7h10v10H7zM10 10h4v4h-4zM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4",
  behavioral: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  resume: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5",
};

export default function InterviewSetup({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [selectedType, setInterviewType] = useState<InterviewTypeId>(() => getSelectedInterviewType());
  const userResume = getUserResume();
  const hasRealResume = Boolean(userResume?.name || userResume?.filename);
  const active = getInterviewTypeInfo(selectedType);
  const needsResume = selectedType === "resume" && !hasRealResume;

  const handleSelectType = (id: InterviewTypeId) => {
    setInterviewType(id);
    setSelectedInterviewType(id);
  };

  const begin = () => {
    setSelectedInterviewType(selectedType);
    onNavigate("voice-interview");
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 sm:px-[clamp(20px,4vw,48px)] pt-2 pb-14 text-[14px] leading-[1.55]">
      <div className="ob-rise ob-lb" style={{ ["--i" as string]: 0 }}>New session</div>

      <div className="mt-5 grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Interview track">
        {INTERVIEW_TYPES.map((track, i) => {
          const on = selectedType === track.id;
          return (
            <button
              key={track.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => handleSelectType(track.id)}
              className={`ob-rise group relative flex flex-col text-left min-h-[280px] p-6 rounded-2xl border cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 ${
                on
                  ? "bg-[rgba(230,223,204,0.07)] border-[rgba(230,223,204,0.45)] shadow-[0_0_0_4px_rgba(230,223,204,0.05)]"
                  : "bg-[#181817] border-[#2b2b28] hover:border-[#3a3a36]"
              }`}
              style={{ ["--i" as string]: i + 1 }}
            >
              <div className="flex items-start justify-between">
                <span
                  className={`w-11 h-11 rounded-xl border grid place-items-center transition-colors duration-300 ${
                    on ? "border-[rgba(230,223,204,0.45)] text-[#e6dfcc]" : "border-[#2b2b28] ob-tx3 group-hover:text-[#ebe9e2]"
                  }`}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d={ICONS[track.id] || ICONS.dsa} />
                  </svg>
                </span>
                <span
                  className={`w-5 h-5 rounded-full border grid place-items-center transition-all duration-300 ${
                    on ? "bg-[#e6dfcc] border-[#e6dfcc] text-[#121211]" : "border-[#3a3a36] text-transparent"
                  }`}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l5 5 9-10" />
                  </svg>
                </span>
              </div>
              <div className="text-[21px] font-medium tracking-[-0.02em] leading-[1.2] mt-5 mb-2">{track.title}</div>
              <p className="m-0 ob-tx3 text-[14px] leading-[1.6] line-clamp-3">{track.description}</p>
              <span className="ob-chip ob-sq self-start mt-auto pt-0 relative top-0" style={{ marginTop: "auto" }}>{track.badge}</span>
            </button>
          );
        })}

        {/* Sixth slot: start the selected track */}
        <div
          className="ob-rise relative flex flex-col justify-between min-h-[280px] p-6 rounded-2xl bg-[#e6dfcc] text-[#121211]"
          style={{ ["--i" as string]: 6 }}
        >
          <div>
            <div className="ob-mo text-[10.5px] uppercase tracking-[0.1em] opacity-60">Selected</div>
            <div className="text-[26px] font-medium tracking-[-0.025em] leading-[1.15] mt-3">{active.title}</div>
          </div>
          {needsResume ? (
            <div>
              <p className="m-0 mb-3 text-[13px] opacity-75">This track grounds its questions in your own projects, so it needs a resume first.</p>
              <button
                type="button"
                onClick={() => onNavigate("resume")}
                className="inline-flex items-center justify-center h-11 px-5 rounded-[9px] bg-[#121211] text-[#ebe9e2] text-[13.5px] font-medium cursor-pointer hover:bg-[#20201e] transition-colors"
              >
                Upload resume
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={begin}
              className="self-start inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[9px] bg-[#121211] text-[#ebe9e2] text-[13.5px] font-medium cursor-pointer hover:bg-[#20201e] transition-colors"
            >
              Begin session
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
