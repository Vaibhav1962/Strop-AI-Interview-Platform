import { useState } from "react";
import { mockUser } from "../data/mock";

type Page = string;

const navGroups = [
  {
    label: "Prep",
    items: [
      { id: "dashboard", label: "Home" },
      { id: "resume", label: "Resume" },
      { id: "job-description", label: "Job" },
      { id: "match-analysis", label: "Match" },
    ],
  },
  {
    label: "Practice",
    items: [
      { id: "interview-setup", label: "Interview" },
      { id: "coding-interview", label: "Code" },
      { id: "history", label: "History" },
    ],
  },
  {
    label: "Track",
    items: [
      { id: "interview-report", label: "Report" },
      { id: "progress", label: "Progress" },
      { id: "knowledge-graph", label: "Skills" },
      { id: "training", label: "Training" },
    ],
  },
];

function LogoMark() {
  return (
    <div className="w-8 h-8 rounded-[10px] bg-[#1c2333] border border-[#2a2c36] relative shrink-0">
      <span className="absolute w-[9px] h-[9px] rounded-full bg-[#3b82f6] left-[6px] top-[6px]" />
      <span className="absolute w-[9px] h-[9px] rounded-full bg-[#818cf8] right-[5px] top-[6px]" />
      <span className="absolute w-[9px] h-[9px] rounded-full bg-[#34d399] left-1/2 bottom-[5px] -translate-x-1/2" />
    </div>
  );
}

export default function Navigation({
  current, onNavigate,
}: {
  current: Page; onNavigate: (p: Page) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = mockUser.name.split(" ").map((n) => n[0]).join("");

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 sm:px-6 lg:px-12 h-[58px] nav-strip gap-4">
        <button onClick={() => onNavigate("dashboard")} className="flex items-center gap-2.5 cursor-pointer shrink-0">
          <LogoMark />
          <span className="font-heading font-bold text-[17px] text-[#f5f6fa] tracking-tight">InterviewIQ</span>
        </button>

        <nav className="hidden lg:flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto px-3 scrollbar-none">
          {navGroups.map((group, gi) => (
            <div key={group.label} className="flex items-center gap-0.5 shrink-0">
              <span className="text-[10px] font-bold text-[#4b5060] uppercase tracking-wider px-2 mr-1">{group.label}</span>
              {group.items.map((item) => {
                const active = current === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                      active
                        ? "bg-[rgba(59,130,246,0.16)] text-[#93c5fd]"
                        : "text-[#9a9ca8] hover:text-[#f5f6fa]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
              {gi < navGroups.length - 1 && <div className="w-px h-4 bg-[#232430] mx-2 shrink-0" />}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate("interview-setup")}
            className="hidden sm:flex items-center h-[34px] px-4 rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[12.5px] font-semibold transition-all cursor-pointer shadow-[0_8px_18px_-6px_rgba(59,130,246,0.6)] whitespace-nowrap"
          >
            + New session
          </button>

          <button
            onClick={() => onNavigate("settings")}
            className="w-[34px] h-[34px] rounded-[10px] bg-[#1c1d26] border border-[#232430] flex items-center justify-center cursor-pointer hover:bg-[#22232e] transition-all text-[#9a9ca8] text-sm"
            aria-label="Settings"
          >
            ⚙
          </button>

          <button
            onClick={() => onNavigate("settings")}
            className="w-[34px] h-[34px] rounded-[10px] bg-[#3b82f6] flex items-center justify-center cursor-pointer font-heading font-bold text-xs text-white"
          >
            {initials}
          </button>

          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden w-8 h-8 rounded-lg bg-[#1a1b24] border border-[#232430] flex items-center justify-center cursor-pointer text-[#9a9ca8]"
            aria-label="Menu"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-x-0 top-[58px] z-40 glass-bright border-b border-[#232430] py-4 px-6 lg:hidden anim-fade-up">
          <div className="grid grid-cols-3 gap-2">
            {navGroups.flatMap((g) => g.items).map((item) => (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
                className={`p-2 rounded-xl text-sm font-semibold text-center transition-all cursor-pointer ${
                  current === item.id ? "bg-[rgba(59,130,246,0.16)] text-[#93c5fd]" : "text-[#9a9ca8] hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export type { Page };
