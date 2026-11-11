import Logo from "../components/Logo";
import { useState } from "react";
import { setUserResume, setUserJD, setOnboardingCompleted } from "../lib/userDocuments";

interface OnboardingProps {
  onComplete: () => void;
  userName?: string;
}

const FIELD = "flex flex-col gap-[7px] text-[12.5px] ob-tx2";
const splitList = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);
const splitLines = (v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);

export default function Onboarding({ onComplete, userName }: OnboardingProps) {
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: profile and resume
  const [resumeName, setResumeName] = useState(userName || "");
  const [resumeSkills, setResumeSkills] = useState("");
  const [resumeSummary, setResumeSummary] = useState("");
  const [resumeExperience, setResumeExperience] = useState("");

  // Step 2: target role
  const [targetRole, setTargetRole] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [targetSkills, setTargetSkills] = useState("");
  const [targetResponsibilities, setTargetResponsibilities] = useState("");

  const handleFinish = () => {
    setUserResume({
      name: resumeName.trim() || "Candidate",
      summary: resumeSummary,
      skills: splitList(resumeSkills),
      // Claims come from the lines the user wrote, never invented
      claims: splitLines(resumeExperience),
      experienceSummary: resumeExperience,
    });
    setUserJD({
      title: targetRole.trim() || "Target role",
      company: targetCompany.trim(),
      requiredSkills: splitList(targetSkills),
      responsibilities: splitLines(targetResponsibilities),
    });
    setOnboardingCompleted(true);
    onComplete();
  };

  const steps = [
    { label: "Profile & resume", sub: resumeName || "Tell us about you", done: step > 1, current: step === 1 },
    { label: "Target role", sub: step === 2 ? "In progress" : "Up next", done: false, current: step === 2 },
  ];

  return (
    <div className="relative min-h-screen bg-ob-bg1 text-ob-tx overflow-hidden text-[14px] leading-[1.55]">
      <header className="relative z-[2] flex items-center justify-between px-[clamp(20px,5vw,72px)] py-[22px]">
        <span className="flex items-center gap-2.5 font-semibold tracking-[-0.01em]">
          <Logo size={26} />
          Strop
        </span>
        <button type="button" onClick={() => { setOnboardingCompleted(true); onComplete(); }} className="ob-mo text-xs ob-tx3 hover:text-ob-tx cursor-pointer">
          Skip for now →
        </button>
      </header>

      <div className="relative z-[2] flex flex-wrap gap-[clamp(32px,6vw,96px)] max-w-[1180px] mx-auto px-[clamp(20px,5vw,72px)] pt-10 pb-[72px]">
        <aside className="flex-[0_1_300px] min-w-[240px]">
          <div className="ob-rise ob-lb" style={{ ["--i" as string]: 0 }}>Set up your workspace</div>
          <h1 className="ob-rise text-[34px] font-medium tracking-[-0.03em] mt-3 mb-3.5 leading-[1.1]" style={{ ["--i" as string]: 1 }}>
            Tell us where you are headed.
          </h1>
          <p className="ob-rise ob-tx2 mt-0 mb-9" style={{ ["--i" as string]: 2 }}>
            Everything after this is calibrated to your target role. It takes about two minutes.
          </p>
          <ol className="ob-rise list-none m-0 p-0" style={{ ["--i" as string]: 3 }}>
            {steps.map((s, i) => (
              <li key={s.label} className="grid grid-cols-[28px_minmax(0,1fr)] gap-4">
                <div className="flex flex-col">
                  <span className={`w-7 h-7 rounded-full grid place-items-center border font-mono text-[11px] ${
                    s.done ? "bg-ob-ac border-ob-ac text-ob-onac" : s.current ? "border-ob-ac text-ob-ac" : "border-ob-ln2 ob-tx3"
                  }`}>
                    {s.done ? (
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
                    ) : i + 1}
                  </span>
                  {i < steps.length - 1 && <span className="w-px h-9 mx-auto my-1" style={{ background: s.done ? "var(--ob-ac)" : "var(--ob-ln2)" }} />}
                </div>
                <div className="pt-1">
                  <div>{s.label}</div>
                  <div className="ob-tx3 text-[12.5px]">{s.sub}</div>
                </div>
              </li>
            ))}
          </ol>
        </aside>

        <section className="ob-card ob-rise flex-[1_1_520px] min-w-0 grid gap-[26px] !p-[clamp(22px,3vw,36px)] hover:!translate-y-0" style={{ ["--i" as string]: 4 }}>
          <div>
            <div className="ob-lb">Step {step} of 2</div>
            <h2 className="text-2xl font-medium tracking-[-0.02em] mt-2 mb-0">{step === 1 ? "Profile & resume" : "Target role"}</h2>
          </div>

          {step === 1 ? (
            <>
              <label className={FIELD}>Full name
                <input className="ob-input !h-11" value={resumeName} onChange={(e) => setResumeName(e.target.value)} placeholder="Your full name" />
              </label>
              <label className={FIELD}>Core skills <span className="ob-tx3">(comma separated)</span>
                <input className="ob-input !h-11" value={resumeSkills} onChange={(e) => setResumeSkills(e.target.value)} placeholder="e.g. Go, Python, Kafka, AWS" />
              </label>
              <label className={FIELD}>Professional summary
                <textarea className="ob-input min-h-[88px] resize-none" rows={3} value={resumeSummary} onChange={(e) => setResumeSummary(e.target.value)} placeholder="A few sentences about your engineering background" />
              </label>
              <label className={FIELD}>Projects &amp; work experience <span className="ob-tx3">(one achievement per line)</span>
                <textarea className="ob-input min-h-[112px] resize-none" rows={4} value={resumeExperience} onChange={(e) => setResumeExperience(e.target.value)} placeholder={"Built X that handled Y\nReduced Z by N%"} />
              </label>
              <div className="flex justify-end pt-1.5 border-t border-ob-ln">
                <button type="button" className="ob-btn ob-pr ob-btn-lg mt-[18px]" onClick={() => setStep(2)}>
                  Continue to target role
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))]">
                <label className={FIELD}>Role
                  <input className="ob-input !h-11" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Staff Software Engineer" />
                </label>
                <label className={FIELD}>Company <span className="ob-tx3">(optional)</span>
                  <input className="ob-input !h-11" value={targetCompany} onChange={(e) => setTargetCompany(e.target.value)} placeholder="e.g. Stripe" />
                </label>
              </div>
              <label className={FIELD}>Key required skills <span className="ob-tx3">(comma separated)</span>
                <input className="ob-input !h-11" value={targetSkills} onChange={(e) => setTargetSkills(e.target.value)} placeholder="e.g. Distributed Systems, PostgreSQL, Kafka" />
              </label>
              <label className={FIELD}>Responsibilities <span className="ob-tx3">(one per line)</span>
                <textarea className="ob-input min-h-[120px] resize-none" rows={5} value={targetResponsibilities} onChange={(e) => setTargetResponsibilities(e.target.value)} placeholder="Paste responsibilities from the job description" />
              </label>
              <div className="flex justify-between flex-wrap gap-3 pt-1.5 border-t border-ob-ln">
                <button type="button" className="ob-btn ob-btn-lg mt-[18px]" onClick={() => setStep(1)}>Back</button>
                <button type="button" className="ob-btn ob-pr ob-btn-lg mt-[18px]" onClick={handleFinish}>
                  Save and start prep
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
