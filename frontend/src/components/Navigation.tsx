import Logo from "./Logo";
import { useEffect, useRef, useState } from "react";
import { type AuthUser, getCurrentUserId, resetInterviewSessions } from "../lib/api";
import { resetOrchestratorSessions } from "../lib/orchestratorClient";
import { clearSelectedReportId, getReportHistoryKey } from "../lib/reportGenerator";

type Page = string;

interface NavLink {
  id: string;
  label: string;
  d: string; // SVG path (24x24 stroke icon)
  alias?: string[];
}

interface NavGroup {
  label: string;
  items: NavLink[];
}

/** Obsidian sidebar structure: Workspace / Practice / Review / System. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { id: "dashboard", label: "Dashboard", d: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" },
      { id: "resume", label: "Resume", d: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5" },
      {
        id: "job-description",
        label: "Job description",
        alias: ["match-analysis"],
        d: "M3 8h18v12H3zM8 8V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3M3 13h18",
      },
    ],
  },
  {
    label: "Practice",
    items: [
      {
        id: "interview-setup",
        label: "Interviews",
        alias: ["voice-interview", "coding-interview"],
        d: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
      },
      { id: "compiler", label: "Compiler", d: "M4 5h16v14H4zM8 10l3 2-3 2M13 14h3" },
    ],
  },
  {
    label: "Review",
    items: [
      { id: "history", label: "History", alias: ["interview-report"], d: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2" },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export function pageTitle(page: string): string {
  const hit = ALL_NAV_ITEMS.find((i) => i.id === page || i.alias?.includes(page));
  return hit?.label ?? "Dashboard";
}

function Icon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d={d} />
    </svg>
  );
}

function BrandMark({ size = 26 }: { size?: number }) {
  return <Logo size={size} />;
}

function initials(name?: string | null): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "IQ";
  return ((parts[0][0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** Avatar button with a dropdown holding the account email and Sign out. */
export function ProfileMenu({ user, onLogout }: { user?: AuthUser | null; onLogout?: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const deleteAllData = async () => {
    setBusy(true);
    setNote(null);
    try {
      const results = await Promise.allSettled([resetInterviewSessions(), resetOrchestratorSessions()]);
      clearSelectedReportId();
      const key = getReportHistoryKey(getCurrentUserId());
      if (key) localStorage.removeItem(key);
      localStorage.removeItem("interviewiq_selected_report_id");
      localStorage.removeItem("interviewiq_report_history");
      window.dispatchEvent(new CustomEvent("interviewiq-refresh-history"));
      window.dispatchEvent(new CustomEvent("interviewiq-profile-synced"));
      setNote(
        results.every((r) => r.status === "rejected")
          ? "Could not reach the server. Nothing was deleted there."
          : results.some((r) => r.status === "rejected")
          ? "Deleted on this device, but some server records were unreachable."
          : "All interviews and reports were deleted.",
      );
    } catch {
      setNote("Deletion failed. Check your connection and try again.");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setConfirming(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="w-8 h-8 p-0 rounded-full bg-[#20201e] border border-[#3a3a36] inline-flex items-center justify-center text-center leading-none tracking-normal text-[11px] font-semibold text-[#e6dfcc] cursor-pointer hover:border-[#55544e] transition-colors"
      >
        {initials(user?.full_name)}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] w-[260px] rounded-xl border border-[#2b2b28] bg-[#181817] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.8)] z-[70] overflow-hidden anim-fade-in"
        >
          <div className="px-4 py-3.5 border-b border-[#2b2b28]">
            <div className="text-[13.5px] text-[#ebe9e2] truncate">{user?.full_name || "Candidate"}</div>
            <div className="text-[12px] text-[#8f8d85] truncate mt-0.5">{user?.email || ""}</div>
          </div>
          {confirming ? (
            <div className="px-4 py-3.5 border-b border-[#2b2b28]">
              <div className="text-[13px] text-[#ebe9e2] leading-snug">Delete every interview, transcript and report? This cannot be undone.</div>
              <div className="flex gap-2 mt-3">
                <button type="button" disabled={busy} onClick={deleteAllData} className="ob-btn ob-sm ob-dg cursor-pointer">
                  {busy ? "Deleting..." : "Delete"}
                </button>
                <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="ob-btn ob-sm cursor-pointer">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setNote(null);
                setConfirming(true);
              }}
              className="w-full flex items-center gap-2.5 px-4 h-11 text-[13.5px] text-[#aaa89f] hover:bg-[#20201e] hover:text-[#ff6a3d] transition-colors cursor-pointer text-left border-b border-[#2b2b28]"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
              </svg>
              Delete all my data
            </button>
          )}
          {note && <div className="px-4 py-2.5 text-[12px] text-[#aaa89f] border-b border-[#2b2b28]">{note}</div>}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout?.();
            }}
            className="w-full flex items-center gap-2.5 px-4 h-11 text-[13.5px] text-[#aaa89f] hover:bg-[#20201e] hover:text-[#ff6a3d] transition-colors cursor-pointer text-left"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navigation({
  current,
  onNavigate,
  user,
  onLogout,
  collapsed: _collapsed = false,
  onToggleCollapse: _onToggleCollapse,
}: {
  current: Page;
  onNavigate: (p: Page) => void;
  user?: AuthUser | null;
  onLogout?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const hoverTimer = useRef<number | null>(null);
  // Hover intent: open only after the pointer rests on the rail briefly, close right away.
  const openSoon = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHovered(true), 260);
  };
  const closeNow = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    setHovered(false);
  };

  const isActive = (item: NavLink) => item.id === current || !!item.alias?.includes(current);
  const go = (id: string) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  const panel = (isCollapsed: boolean, isDrawer: boolean) => (
    <div className="h-full w-[232px] lg:w-full flex flex-col gap-0.5 px-3 py-[18px] bg-[#121211] overflow-hidden">
      <div className={`flex items-center justify-between gap-1.5 ${isCollapsed ? "flex-col" : ""}`}>
        <button
          type="button"
          onClick={() => go("dashboard")}
          className="flex items-center gap-2.5 px-2.5 pt-1 pb-3.5 font-semibold tracking-[-0.01em] text-[#ebe9e2] cursor-pointer"
          aria-label="Strop dashboard"
        >
          <BrandMark />
          {!isCollapsed && <span>Strop</span>}
        </button>
      </div>


      <nav className="flex-1 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: "none" }} aria-label="Primary">
        {NAV_GROUPS.map((g) => (
          <div key={g.label}>
            {!isCollapsed && (
              <div className="mt-4 mx-2.5 mb-1.5 font-mono text-[10.5px] font-medium tracking-[0.1em] uppercase text-[#8f8d85]">
                {g.label}
              </div>
            )}
            {isCollapsed && <div className="h-3" />}
            {g.items.map((item) => {
              const on = isActive(item);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => go(item.id)}
                  aria-current={on ? "page" : undefined}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-2.5 min-h-10 px-2.5 rounded-[7px] text-left transition-all duration-300 cursor-pointer hover:translate-x-0.5 ${
                    isCollapsed ? "justify-center px-0" : ""
                  } ${on ? "bg-[rgba(230,223,204,0.07)] text-[#ebe9e2]" : "text-[#aaa89f] hover:bg-[#20201e] hover:text-[#ebe9e2]"}`}
                >
                  <span className={on ? "text-[#e6dfcc]" : ""}>
                    <Icon d={item.d} />
                  </span>
                  {!isCollapsed && <span className="text-[14px]">{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

    </div>
  );

  return (
    <>
      {/* Desktop sidebar: a slim rail that expands on hover (or keyboard focus) and overlays the page */}
      <aside
        onMouseEnter={openSoon}
        onMouseLeave={closeNow}
        onFocus={() => setHovered(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) closeNow();
        }}
        className={`hidden lg:block fixed inset-y-0 left-0 border-r border-[#2b2b28] bg-[#121211] overflow-hidden transition-[width,box-shadow] duration-[550ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          hovered ? "w-[232px] z-40 shadow-[24px_0_48px_-24px_rgba(0,0,0,0.7)]" : "w-16 z-30"
        }`}
      >
        {panel(!hovered, true)}
      </aside>

      {/* Mobile top bar + drawer */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 flex items-center justify-between px-4 border-b border-[#2b2b28] bg-[#121211]">
        <button type="button" onClick={() => go("dashboard")} className="flex items-center gap-2.5 font-semibold text-[#ebe9e2] cursor-pointer">
          <BrandMark />
          Strop
        </button>
        <div className="flex items-center gap-2">
        <ProfileMenu user={user} onLogout={onLogout} />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="w-10 h-10 rounded-[8px] grid place-items-center text-[#aaa89f] hover:bg-[#20201e] cursor-pointer"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        </div>
      </header>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="w-[260px] max-w-[84vw] h-full border-r border-[#2b2b28]">{panel(false, true)}</div>
          <button type="button" className="flex-1 bg-[#121211]/70 backdrop-blur-sm cursor-pointer" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
        </div>
      )}

    </>
  );
}

export type { Page };
