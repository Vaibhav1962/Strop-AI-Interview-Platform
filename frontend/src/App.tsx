import { Suspense, lazy, useState, useEffect, useRef } from "react";
import Navigation, { type Page, ProfileMenu } from "./components/Navigation";
import AppBackground from "./components/AppBackground";
import { ToastContainer, useToast } from "./components/ui";
import { type AuthUser, clearSession, getStoredUser, getToken, warmBackend } from "./lib/api";
import { syncUserProfileFromBackend } from "./lib/userDocuments";
import ThemeToggle from "./components/ThemeToggle";

import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Resume from "./pages/Resume";
import JobDescription from "./pages/JobDescription";
import MatchAnalysis from "./pages/MatchAnalysis";
import InterviewSetup from "./pages/InterviewSetup";
import VoiceInterview from "./pages/VoiceInterview";
import History from "./pages/History";
import InterviewReport from "./pages/InterviewReport";
import CodingInterview from "./pages/CodingInterview";
import ErrorBoundary from "./components/ErrorBoundary";

// CodeMirror + language grammars are ~700kB; only load them when someone
// actually opens the Compiler tab instead of on every app load.
const Compiler = lazy(() => import("./pages/Compiler"));

type AnyPage = Page | "landing" | "voice-interview" | "coding-interview" | "interview-report";

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = getStoredUser();
    // A signed-in session needs a token. A stored user without one cannot call the backend (every request would
    // fail and the pages would just look empty), so it counts as signed out. This also clears the placeholder
    // "Alex Vance" account that an earlier build saved when a page hash was opened without logging in.
    if (stored && !getToken()) {
      if (stored.id === "usr_lead_dev") {
        try {
          localStorage.removeItem("interviewiq_user");
        } catch {}
      }
      return null;
    }
    return stored;
  });
  const [page, setPage] = useState<AnyPage>(() => {
    const hash = window.location.hash.replace("#", "").replace(/^\//, "") as AnyPage;
    const validPages: AnyPage[] = [
      "dashboard", "interviews", "interview-setup", "resume",
      "job-description", "match-analysis", "compiler", "history",
      "landing", "voice-interview", "coding-interview",
      "interview-report"
    ];
    if (hash && validPages.includes(hash)) return hash;
    return getStoredUser() && getToken() ? "dashboard" : "landing";
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("interviewiq_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });
  const { toasts, add, remove } = useToast();
  // No useTheme() here: it would re-render the whole page tree on every theme flip. Components that need the
  // theme (editors, the toggle) subscribe themselves; everything else follows the CSS variables.

  // The staggered rise plays on a page's first visit only; after that it is a quick cross-fade.
  const visited = useRef(new Set<string>());
  const pageSeen = useRef({ page: "", seen: false });
  if (pageSeen.current.page !== page) {
    pageSeen.current = { page, seen: visited.current.has(page) };
    visited.current.add(page);
  }

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("interviewiq_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const pageRef = useRef(page);
  pageRef.current = page;

  const navigate = (p: string) => {
    pageRef.current = p as AnyPage;
    setPage(p as AnyPage);
    window.location.hash = p;
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    const handleNav = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) navigate(custom.detail);
    };
    const handleAuth = (e: Event) => {
      const custom = e as CustomEvent<AuthUser>;
      if (custom.detail) handleEnter(custom.detail);
    };
    const handleHash = () => {
      const hash = window.location.hash.replace("#", "").replace(/^\//, "") as AnyPage;
      // Browser Back/Forward during a live interview would silently drop it: ask first.
      const live = (window as unknown as { __iqInterviewLive?: boolean }).__iqInterviewLive;
      if (hash && live && hash !== pageRef.current) {
        if (!window.confirm("Leave the interview? The session in progress will be lost.")) {
          window.location.hash = pageRef.current;
          return;
        }
      }
      if (hash) {
        pageRef.current = hash;
        setPage(hash);
      }
    };
    window.addEventListener("interviewiq-navigate", handleNav);
    window.addEventListener("interviewiq-auth", handleAuth);
    window.addEventListener("hashchange", handleHash);
    return () => {
      window.removeEventListener("interviewiq-navigate", handleNav);
      window.removeEventListener("interviewiq-auth", handleAuth);
      window.removeEventListener("hashchange", handleHash);
    };
  }, []);

  // Free hosting sleeps when idle: start waking the backend the moment anyone opens the site.
  useEffect(() => {
    warmBackend();
  }, []);

  useEffect(() => {
    if (user?.id) {
      syncUserProfileFromBackend(user.id).catch(() => {});
    }
  }, [user?.id]);

  const handleEnter = (authedUser: AuthUser) => {
    setUser(authedUser);
    setPage("dashboard");
    syncUserProfileFromBackend(authedUser.id).catch(() => {});
    add("success", `Welcome, ${authedUser.full_name.split(" ")[0]}!`);
  };

  const handleLogout = () => {
    clearSession();
    try {
      localStorage.removeItem("interviewiq_user_resume");
      localStorage.removeItem("interviewiq_user_jd");
      localStorage.removeItem("interviewiq_jd_matches_history");
      localStorage.removeItem("interviewiq_active_jd_match");
      localStorage.removeItem("interviewiq_target_role");
      localStorage.removeItem("interviewiq_target_company");
      localStorage.removeItem("interviewiq_reports_history");
      localStorage.removeItem("interviewiq_latest_report");
      localStorage.removeItem("interviewiq_selected_report_id");
    } catch {}
    setUser(null);
    setPage("landing");
    add("info", "Signed out.");
  };

  if (!user) {
    return (
      <>
        <Landing onEnter={handleEnter} />
        <ToastContainer toasts={toasts} onRemove={remove} />
      </>
    );
  }

  if (page === "voice-interview") {
    return (
      <div className="h-screen h-[100dvh] min-h-[100dvh] flex flex-col overflow-hidden bg-ob-bg relative text-ob-tx safe-area-inset">
        <AppBackground variant="immersive" />
        <div className="relative z-10 flex-1 flex flex-col min-h-0 overflow-hidden">
          <ErrorBoundary fallbackTitle="Voice Interview Assessment Error" onReset={() => navigate("interview-setup")}>
            <VoiceInterview key={`voice_${user.id}`} onNavigate={navigate} />
          </ErrorBoundary>
        </div>
        <ToastContainer toasts={toasts} onRemove={remove} />
      </div>
    );
  }

  if (page === "coding-interview") {
    return (
      <div className="h-screen h-[100dvh] min-h-[100dvh] flex flex-col overflow-hidden bg-ob-bg relative text-ob-tx safe-area-inset">
        <AppBackground variant="immersive" />
        <div className="relative z-10 flex-1 flex flex-col min-h-0 overflow-hidden">
          <ErrorBoundary fallbackTitle="Coding Interview Assessment Error" onReset={() => navigate("interview-setup")}>
            <CodingInterview key={`coding_${user.id}`} onNavigate={navigate} />
          </ErrorBoundary>
        </div>
        <ToastContainer toasts={toasts} onRemove={remove} />
      </div>
    );
  }

  const pageComponents: Record<string, React.ReactNode> = {
    dashboard: <Dashboard key={`dashboard_${user.id}`} onNavigate={navigate} user={user} />,
    resume: <Resume key={`resume_${user.id}`} onNavigate={navigate} />,
    "job-description": <JobDescription key={`jd_${user.id}`} onNavigate={navigate} />,
    "match-analysis": <MatchAnalysis key={`match_${user.id}`} onNavigate={navigate} />,
    "interview-setup": <InterviewSetup key={`setup_${user.id}`} onNavigate={navigate} />,
    history: <History key={`history_${user.id}`} onNavigate={navigate} />,
    "interview-report": <InterviewReport key={`report_${user.id}`} onNavigate={navigate} />,
    compiler: <Compiler key={`compiler_${user.id}`} onNavigate={navigate} />,
  };

  return (
    <div className="min-h-screen bg-ob-bg1 text-ob-tx selection:bg-ob-ac/25">
      <Navigation
        current={page as Page}
        onNavigate={(p) => navigate(p)}
        user={user}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      <div
        className={`min-h-screen flex flex-col transition-[padding] duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          "lg:pl-16"
        } pt-14 lg:pt-0`}
      >
        {/* Top bar: just the profile menu, no breadcrumb or divider */}
        <div className="hidden sm:flex items-center justify-end gap-2.5 h-[44px] px-6 relative z-40">
          <ThemeToggle />
          <ProfileMenu user={user} onLogout={handleLogout} />
        </div>

        <main className="flex-1 min-w-0">
          <div key={page} className={`ob-page ${pageSeen.current.seen ? "ob-seen" : ""}`}>
            <Suspense fallback={<div className="h-[60vh]" />}>
              {pageComponents[page] ?? <Dashboard onNavigate={navigate} user={user} />}
            </Suspense>
          </div>
        </main>

        {/* Status bar */}
        <div className="flex flex-wrap justify-end gap-x-5 gap-y-1 px-6 py-[9px] border-t border-ob-ln font-mono text-[11px] text-ob-tx3">
          <span className="flex items-center gap-2">
            <span className="inline-block w-[7px] h-[7px] rounded-full bg-ob-ok" aria-hidden="true" />
            signed in as {user.email}
          </span>
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemove={remove} />
    </div>
  );
}
