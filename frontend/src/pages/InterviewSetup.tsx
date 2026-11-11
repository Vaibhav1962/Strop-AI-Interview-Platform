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

/** The sort of thing Alex asks on each track, shown when a card is hovered or selected. */
const SAMPLE: Record<string, string> = {
  dsa: "Give me an input that breaks your loop.",
  "system-design": "The primary dies right after commit. What did the client see?",
  "cs-fundamentals": "What happens between a page fault and the next instruction?",
  behavioral: "You said \"we decided\". What did you personally decide?",
  resume: "What broke first at ten times the traffic?",
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
      <h1 className="ob-rise text-[clamp(26px,3vw,34px)] font-medium tracking-[-0.03em] leading-[1.1] mt-2 mb-2" style={{ ["--i" as string]: 0 }}>Pick a track.</h1>
      <p className="ob-rise ob-tx2 m-0 max-w-[58ch]" style={{ ["--i" as string]: 1 }}>One interviewer, five kinds of interview. You choose the length on the next screen.</p>

      <div className="mt-7 grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Interview track">
        {INTERVIEW_TYPES.map((track, i) => {
          const on = selectedType === track.id;
          return (
            <button
              key={track.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => handleSelectType(track.id)}
              className={`ob-rise group relative flex flex-col text-left min-h-[236px] p-6 rounded-2xl border cursor-pointer transition duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 ${
                on
                  ? "bg-[rgb(var(--ob-ac-rgb)/0.07)] border-[rgb(var(--ob-ac-rgb)/0.45)] shadow-[0_0_0_4px_rgb(var(--ob-ac-rgb)/0.05)]"
                  : "bg-ob-card border-ob-ln hover:border-ob-ln2"
              }`}
              style={{ ["--i" as string]: i + 1 }}
            >
              <div className="flex items-start justify-between">
                <span
                  className={`w-11 h-11 rounded-xl border grid place-items-center transition-colors duration-300 ${
                    on ? "border-[rgb(var(--ob-ac-rgb)/0.45)] text-ob-ac" : "border-ob-ln ob-tx3 group-hover:text-ob-tx"
                  }`}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d={ICONS[track.id] || ICONS.dsa} />
                  </svg>
                </span>
                <span
                  className={`w-5 h-5 rounded-full border grid place-items-center transition duration-300 ${
                    on ? "bg-ob-ac border-ob-ac text-ob-onac" : "border-ob-ln2 text-transparent"
                  }`}
                  aria-hidden="true"
                >
                  {on && (
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path className="ob-tick" pathLength={1} d="M5 12l5 5 9-10" />
                    </svg>
                  )}
                </span>
              </div>
              <div className="text-[21px] font-medium tracking-[-0.02em] leading-[1.2] mt-5 mb-2">{track.title}</div>
              <p className="m-0 ob-tx3 text-[14px] leading-[1.6] line-clamp-2">{track.description}</p>
              {SAMPLE[track.id] && (
                <p
                  className={`m-0 mt-3 mb-4 border-l-2 border-ob-ln3 pl-3 text-[13px] italic leading-[1.5] ob-tx2 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0 ${
                    on ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
                  }`}
                >
                  {SAMPLE[track.id]}
                </p>
              )}
              <span className="ob-chip ob-sq self-start" style={{ marginTop: "auto" }}>{track.badge}</span>
            </button>
          );
        })}

        {/* Sixth slot: start the selected track */}
        <div
          className="ob-rise relative flex flex-col justify-between min-h-[236px] p-6 rounded-2xl bg-ob-ac text-ob-onac"
          style={{ ["--i" as string]: 6 }}
        >
          <div>
            <div className="ob-mo text-[11px] uppercase tracking-[0.1em] opacity-60">Selected</div>
            <div key={active.id} className="st-line-in text-[26px] font-medium tracking-[-0.025em] leading-[1.15] mt-3">{active.title}</div>
          </div>
          {needsResume ? (
            <div>
              <p className="m-0 mb-3 text-[13px] opacity-75">This track grounds its questions in your own projects, so it needs a resume first.</p>
              <button
                type="button"
                onClick={() => onNavigate("resume")}
                className="inline-flex items-center justify-center h-11 px-5 rounded-[9px] bg-ob-bg1 text-ob-tx text-[13.5px] font-medium cursor-pointer hover:bg-ob-bg3 transition-colors"
              >
                Upload resume
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={begin}
              className="self-start inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[9px] bg-ob-bg1 text-ob-tx text-[13.5px] font-medium cursor-pointer hover:bg-ob-bg3 transition-colors"
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
