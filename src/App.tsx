import { useState } from "react";
import Navigation, { type Page } from "./components/Navigation";
import AppBackground from "./components/AppBackground";
import { ToastContainer, useToast } from "./components/ui";

import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Resume from "./pages/Resume";
import JobDescription from "./pages/JobDescription";
import MatchAnalysis from "./pages/MatchAnalysis";
import InterviewSetup from "./pages/InterviewSetup";
import VoiceInterview from "./pages/VoiceInterview";
import InterviewReport from "./pages/InterviewReport";
import Progress from "./pages/Progress";
import KnowledgeGraph from "./pages/KnowledgeGraph";
import Training from "./pages/Training";
import History from "./pages/History";
import CodingInterview from "./pages/CodingInterview";
import Settings from "./pages/Settings";

type AnyPage = Page | "landing" | "voice-interview" | "coding-interview";

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [page, setPage] = useState<AnyPage>("landing");
  const { toasts, add, remove } = useToast();

  const navigate = (p: string) => {
    setPage(p as AnyPage);
    window.scrollTo({ top: 0 });
  };

  const handleEnter = () => {
    setAuthed(true);
    setPage("dashboard");
    add("success", "Welcome back, Arjun!");
  };

  if (!authed) {
    return (
      <>
        <Landing onEnter={handleEnter} />
        <ToastContainer toasts={toasts} onRemove={remove} />
      </>
    );
  }

  if (page === "voice-interview") {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-[#0c0d13] relative text-[#f5f6fa]">
        <AppBackground variant="immersive" />
        <VoiceInterview onNavigate={navigate} />
        <ToastContainer toasts={toasts} onRemove={remove} />
      </div>
    );
  }

  if (page === "coding-interview") {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-[#0c0d13] relative text-[#f5f6fa]">
        <AppBackground variant="immersive" />
        <CodingInterview onNavigate={navigate} />
        <ToastContainer toasts={toasts} onRemove={remove} />
      </div>
    );
  }

  const pageComponents: Record<string, React.ReactNode> = {
    dashboard: <Dashboard onNavigate={navigate} />,
    resume: <Resume onNavigate={navigate} />,
    "job-description": <JobDescription onNavigate={navigate} />,
    "match-analysis": <MatchAnalysis onNavigate={navigate} />,
    "interview-setup": <InterviewSetup onNavigate={navigate} />,
    "interview-report": <InterviewReport onNavigate={navigate} />,
    progress: <Progress onNavigate={navigate} />,
    "knowledge-graph": <KnowledgeGraph onNavigate={navigate} />,
    training: <Training onNavigate={navigate} />,
    history: <History onNavigate={navigate} />,
    settings: <Settings onNavigate={navigate} />,
  };

  return (
    <div className="min-h-screen relative bg-[#12131a] text-[#f5f6fa]">
      <AppBackground />
      <Navigation current={page as Page} onNavigate={(p) => navigate(p)} />
      <main className="pt-[58px] min-h-screen overflow-y-auto relative z-10">
        {pageComponents[page] ?? <Dashboard onNavigate={navigate} />}
      </main>
      <ToastContainer toasts={toasts} onRemove={remove} />
    </div>
  );
}
