import { realSessionSeconds } from "../lib/sessionMetrics";
import { useState, useEffect } from "react";
import CandidateReportView from "../components/CandidateReportView";
import {
  getOrchestratorEvaluation,
  getOrchestratorSession,
  downloadOrchestratorSessionPdf,
  type BarsEvaluationReport,
} from "../lib/orchestratorClient";
import { getInterviewSession } from "../lib/api";
import { getSelectedReportId } from "../lib/reportGenerator";

export default function InterviewReport({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [report, setReport] = useState<any>(null);
  const [sessionMeta, setSessionMeta] = useState<any>(null);
  const [transcript, setTranscript] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const sessionId = getSelectedReportId() || sessionStorage.getItem("iq_active_session_id");

    if (!sessionId) {
      setLoading(false);
      return;
    }

    Promise.allSettled([
      getOrchestratorEvaluation(sessionId),
      getOrchestratorSession(sessionId),
      getInterviewSession(sessionId),
    ]).then(([evalRes, orchRes, legRes]) => {
      if (!mounted) return;

      let loadedReport: any = null;
      let loadedSession: any = { id: sessionId };
      let loadedTranscript: any[] = [];

      if (evalRes.status === "fulfilled" && evalRes.value) {
        loadedReport = evalRes.value;
      }

      if (orchRes.status === "fulfilled" && orchRes.value) {
        const os = orchRes.value;
        loadedSession = {
          id: os.id,
          track: os.track,
          title: os.title,
          date: new Date(os.created_at).toLocaleDateString(),
          duration_seconds: realSessionSeconds(os) || undefined,
          startedAt: os.created_at,
        };
        if (os.transcript) loadedTranscript = os.transcript;
      }

      if (legRes.status === "fulfilled" && legRes.value) {
        const ls = legRes.value as any;
        if (!loadedReport && ls.report) loadedReport = ls.report;
        if (!loadedTranscript.length && ls.transcript) loadedTranscript = ls.transcript;
        if (ls.audio_url) loadedSession.audio_url = ls.audio_url;
      }

      if (!loadedReport) {
        setError("Evaluation report is still generating or was not found for this session.");
      } else {
        setReport(loadedReport);
        setSessionMeta(loadedSession);
        setTranscript(loadedTranscript);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const handleDownloadPdf = async (sessionId: string, title?: string) => {
    await downloadOrchestratorSessionPdf(sessionId, `${title || "Strop-Report"}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center px-5 text-center">
        <div>
          <span className="inline-block w-5 h-5 rounded-full border-2 border-[#3a3a36] border-t-[#e6dfcc] animate-spin" aria-hidden="true" />
          <h2 className="text-[17px] font-medium mt-4 mb-1">Loading your report</h2>
          <p className="ob-tx3 text-[13px] m-0">Gathering the evaluation, transcript and evidence.</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mx-auto w-full max-w-[640px] px-5 pt-8 pb-16 text-center">
        <div className="ob-card hover:!translate-y-0 py-12">
          <div className="ob-lb ob-txa">Report</div>
          <h2 className="text-[22px] font-medium tracking-[-0.02em] mt-3 mb-2.5">No report selected</h2>
          <p className="ob-tx2 max-w-[46ch] mx-auto mb-6">
            {error || "Pick a session from your history to see its rubric scores, evidence quotes and transcript."}
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            <button type="button" className="ob-btn" onClick={() => onNavigate("history")}>Browse history</button>
            <button type="button" className="ob-btn ob-pr" onClick={() => onNavigate("interview-setup")}>Start a new interview</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-[clamp(20px,4vw,56px)] pt-2 pb-16 text-[14px] leading-[1.55]">
      <div className="ob-rise ob-lb mb-5" style={{ ["--i" as string]: 0 }}>Review</div>
      <CandidateReportView
        report={report}
        session={sessionMeta}
        transcript={transcript}
        onNavigate={onNavigate}
        onDownloadPdf={handleDownloadPdf}
        onClose={() => onNavigate("history")}
      />
    </div>
  );
}
