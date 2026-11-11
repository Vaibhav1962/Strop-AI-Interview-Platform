import { useDialogA11y, Segmented } from "../components/ui";
import Logo from "../components/Logo";
import { useState, useEffect, useRef, useCallback } from "react";
import { useMediaCapture } from "../hooks/useMediaCapture";
import { useMicVolume } from "../hooks/useMicVolume";
import { useElevenLabsTTS, calibrateEngines } from "../hooks/useElevenLabsTTS";
import { useElevenLabsSTT } from "../hooks/useElevenLabsSTT";
import type { ConversationTurn } from "../hooks/useQwenResponse";
import {
  createOrchestratorSession,
  getOrchestratorSession,
  streamOrchestratorTurn,
  submitDsaCode,
  evaluateOrchestratorSessionAsync,
  type OrchestratorSessionResponse,
} from "../lib/orchestratorClient";
import { saveInterviewSession, API_BASE_URL, type TranscriptLine } from "../lib/api";
import { getEffectiveUserResume, getUserResume } from "../lib/userDocuments";
import {
  getSelectedInterviewType,
  getInterviewTypeInfo,
  getInterviewTopicsForType,
  getTrackAgenda,
} from "../lib/interviewConfig";
import {
  getDefaultDsaProblem,
  getDsaProblemById,
  type DsaProblem,
} from "../lib/dsaProblemBank";
import LiquidMicWave from "../components/LiquidMicWave";
import DsaCodingWorkspace from "../components/DsaCodingWorkspace";

type UIPhase =
  | "splash"
  | "loading"
  | "alex_speaking"
  | "candidate_turn"
  | "thinking"
  | "completed";

type InterviewStage =
  | "self_intro"
  | "topics"
  | "dsa_approach"
  | "dsa_cross_exam"
  | "dsa_coding";

function syncDsaProblemFromBackend(wmDsa: any, setter: (p: DsaProblem) => void) {
  if (!wmDsa) return;
  const existing = wmDsa.id ? getDsaProblemById(wmDsa.id) : undefined;
  if (existing) {
    setter(existing);
    return;
  }
  if (wmDsa.title) {
    setter({
      id: wmDsa.id || wmDsa.problem_id || "dsa-problem",
      title: wmDsa.title,
      difficulty: wmDsa.difficulty || "Medium",
      tagline: wmDsa.tagline || `${wmDsa.title} Algorithmic Challenge`,
      description: wmDsa.description || wmDsa.prompt || "",
      constraints: wmDsa.constraints || ["Optimal Big-O time and space complexity required."],
      examples: wmDsa.examples || [],
      entryPoint: wmDsa.entry_point || "solution",
      args: wmDsa.args || [{ name: "input_val", type: "any" }],
      returnType: wmDsa.return_type || "any",
      optimalTimeComplexity: wmDsa.optimal_time_complexity || "O(N)",
      optimalSpaceComplexity: wmDsa.optimal_space_complexity || "O(1)",
      edgeCasesToProbe: [],
      traps: [],
      hints: { tier1_conceptual: "", tier2_structural: "", tier3_concrete: "" },
      templates: wmDsa.templates || {
        Python: `class Solution:\n    def ${wmDsa.entry_point || "solution"}(self, input_val):\n        pass\n`,
        JavaScript: `function ${wmDsa.entry_point || "solution"}(input_val) {\n}\n`,
        "C++": `class Solution {\npublic:\n    void ${wmDsa.entry_point || "solution"}() {\n    }\n};\n`,
        Java: `class Solution {\n    public void ${wmDsa.entry_point || "solution"}() {\n    }\n}\n`,
      },
      testCases: wmDsa.test_cases || [],
    });
  }
}

const VOICE_LOUDNESS_THRESHOLD = 0.035;
const BARGE_IN_THRESHOLD = 0.08;

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function getTrackScratchpadConfig(track: string) {
  switch (track) {
    case "system-design":
      return {
        label: "Candidate Architecture Scratchpad · Sketch data flows, schemas, and trade-offs",
        buttonText: "+ Insert Architecture Checklist",
        template: "• High-Level Architecture:\n• Data Storage & Sharding:\n• Caching & Consistency:\n• Scalability & Bottlenecks:",
        placeholder: "Note system requirements, sketch API endpoints, estimate QPS & storage, or structure tradeoffs...",
      };
    case "cs-fundamentals":
      return {
        label: "CS Fundamentals Scratchpad · Technical reasoning, state transitions & invariants",
        buttonText: "+ Insert Fundamentals Checklist",
        template: "• Core Concept / Invariant:\n• Low-Level Mechanism (OS/DB/Net):\n• Concurrency & Complexity:\n• Failure Modes / Edge Cases:",
        placeholder: "Note key algorithms, trace memory/thread state, explain protocol handshakes, or outline ACID anomalies...",
      };
    case "behavioral":
      return {
        label: "STAR Framework Scratchpad · Situation, Task, Action, and Result structure",
        buttonText: "+ Insert STAR Framework",
        template: "• Situation: Context, project, and challenge\n• Task: My specific responsibility\n• Action: Concrete steps taken and obstacles overcome\n• Result: Measurable outcome, impact, and learnings",
        placeholder: "Structure your responses using STAR: outline the situation, specify your individual actions, and quantify measurable outcomes...",
      };
    case "resume":
      return {
        label: "Project Defense Scratchpad · Defend architecture, metrics & project claims",
        buttonText: "+ Insert Project Defense Checklist",
        template: "• Project Scope & Role:\n• Architecture & Tech Stack Decisions:\n• Production Scale & Metrics:\n• Difficult Outage / Debugging Win:",
        placeholder: "Outline your resume projects, key technical contributions, failure recoveries, and tech choices...",
      };
    default:
      return {
        label: "Candidate Private Scratchpad · Rough notes, estimates, and reasoning",
        buttonText: "+ Insert Notes Template",
        template: "• Key Requirements:\n• Technical Trade-offs:\n• Observations & Follow-ups:",
        placeholder: "Take private technical notes or structure your reasoning here...",
      };
  }
}

export default function VoiceInterview({ onNavigate }: { onNavigate: (p: string) => void }) {
  // Load Candidate Resume Profile
  const [userResume] = useState(() => getEffectiveUserResume());
  const rawUserResume = getUserResume();
  const hasRealResume = Boolean(rawUserResume && (rawUserResume.filename || (rawUserResume.skills && rawUserResume.skills.length > 0 && rawUserResume.projects && rawUserResume.projects.length > 0)));
  const selectedTrack = useRef(getSelectedInterviewType()).current;
  const trackInfo = useRef(getInterviewTypeInfo(selectedTrack)).current;

  // Ground topics on selected interview track and candidate resume
  const interviewTopics = useRef<string[]>(
    getTrackAgenda(selectedTrack, {
      customTopics: userResume.interviewTopics,
      scenarioId:
        selectedTrack === "system-design"
          ? "fin-ledger"
          : undefined,
    })
  ).current;

  // Active DSA Problem
  const [dsaProblem, setDsaProblem] = useState<DsaProblem>(() => getDefaultDsaProblem());

  // Interview stage & phase
  const [uiPhase, setUiPhase] = useState<UIPhase>("splash");
  const [setupStep, setSetupStep] = useState(1);
  const [stage, setStage] = useState<InterviewStage>("self_intro");
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [mainQuestionsAsked, setMainQuestionsAsked] = useState(0);
  const [currentAlexText, setCurrentAlexText] = useState("");
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);
  const [thinkingStatusText, setThinkingStatusText] = useState("Analyzing response...");
  const [dsaProblemUnlocked, setDsaProblemUnlocked] = useState(false);
  const [dsaViewMode, setDsaViewMode] = useState<"briefing" | "coding">("coding");
  const [cameraCollapsed, setCameraCollapsed] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<"briefing" | "scratchpad">("briefing");
  const [candidateNotes, setCandidateNotes] = useState("");

  // Timers & Modals
  const [targetDurationMinutes, setTargetDurationMinutes] = useState(30);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const endDlgRef = useDialogA11y<HTMLDivElement>(confirmEnd, () => setConfirmEnd(false));
  const transcriptBottomRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  // Media Capture
  const {
    stream,
    attachVideoNode,
    cameraError,
    cameraOn,
    micOn,
    hasVideoTrack,
    toggleCamera,
    toggleMic,
    stopAll,
    retry: retryMedia,
  } = useMediaCapture();

  const liveMicLevel = useRef(0);
  const micVolume = useMicVolume(stream, micOn, liveMicLevel);
  const getLiveMicLevel = useCallback(() => liveMicLevel.current, []);
  const micVolumeRef = useRef(0);
  micVolumeRef.current = micVolume;

  // ElevenLabs TTS + Gemini Fallback + Web Audio Analyser
  const {
    speak,
    queueSentence,
    waitForDrain,
    prefetch,
    cancel: cancelTTS,
    unlockAudio,
    pulse,
    speaking,
    getAudioLevel,
    isUsingElevenLabs,
    isUsingGemini,
    quotaExceeded: ttsQuotaExceeded,
    ttsQuotaError,
  } = useElevenLabsTTS();

  // Dual-Engine STT (ElevenLabs + Gemini 3.5 Transcribe)
  const {
    startListening,
    stopListeningAndTranscribe,
    clear: clearSTT,
    liveTranscript,
    interimText,
    isTranscribing,
    sttError,
    quotaExceeded: sttQuotaExceeded,
    activeEngine: sttEngine,
  } = useElevenLabsSTT(stream);

  const liveTranscriptRef = useRef("");
  liveTranscriptRef.current = liveTranscript;

  // Lobby pre-flight: has the microphone picked anything up, has the speaker been tried, is the server reachable
  const [micHeard, setMicHeard] = useState(false);
  const [speakerTested, setSpeakerTested] = useState(false);
  const [serviceState, setServiceState] = useState<"checking" | "ok" | "down">("checking");
  const [serviceTick, setServiceTick] = useState(0);

  useEffect(() => {
    if (uiPhase === "splash" && micOn && micVolume > 0.05) setMicHeard(true);
  }, [uiPhase, micOn, micVolume]);

  useEffect(() => {
    if (uiPhase !== "splash") return;
    setServiceState("checking");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    fetch(`${API_BASE_URL}/health`, { signal: controller.signal })
      .then((res) => setServiceState(res.ok ? "ok" : "down"))
      .catch(() => setServiceState("down"))
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [uiPhase, serviceTick]);

  // A short two-note chime, generated locally so testing the speaker costs no voice credits
  const playTestSound = useCallback(async () => {
    try {
      await unlockAudio();
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const now = ctx.currentTime;
      [
        [523.25, 0],
        [783.99, 0.18],
      ].forEach(([freq, offset]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.55);
      });
      setSpeakerTested(true);
      setTimeout(() => ctx.close().catch(() => {}), 900);
    } catch {
      /* no audio output available: leave the check as "not tested" */
    }
  }, [unlockAudio]);

  // Editable candidate input
  const [manualInput, setManualInput] = useState("");
  const [isEditingInput, setIsEditingInput] = useState(false);

  // Orchestrator Session State
  const orchestratorSessionRef = useRef<OrchestratorSessionResponse | null>(null);
  const turnIndexRef = useRef<number>(0);
  const activeTurnAbortRef = useRef<AbortController | null>(null);
  const [inferenceError, setInferenceError] = useState<string | null>(null);

  const isUnmountedRef = useRef(false);

  const cancelActiveTurn = useCallback(() => {
    activeTurnAbortRef.current?.abort();
    activeTurnAbortRef.current = null;
  }, []);

  const handleEndAndExitSession = useCallback(() => {
    cancelTTS();
    cancelActiveTurn();
    stopAll();
    sessionStorage.removeItem("iq_active_session_id");
    setConfirmEnd(false);

    const sessionId = orchestratorSessionRef.current?.id;
    const candidateTurns = conversationHistory.filter(
      (t) => t.speaker === "Candidate"
    );

    if (sessionId && candidateTurns.length > 0) {
      try {
        // Lets the dashboard know a report is being written, so it refreshes until it appears
        try {
          sessionStorage.setItem("iq_eval_pending", String(Date.now()));
        } catch {}
        evaluateOrchestratorSessionAsync(sessionId, false).catch((e) => {
          console.warn("[VoiceInterview] Background evaluation trigger notice:", e);
        });
      } catch (e) {
        console.warn("[VoiceInterview] Failed to trigger background evaluation:", e);
      }
    }

    onNavigate("dashboard");
  }, [cancelTTS, cancelActiveTurn, stopAll, conversationHistory, onNavigate]);

  // Session timer with duration check
  useEffect(() => {
    if (uiPhase === "splash" || uiPhase === "completed") return;
    const timer = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);

      // At the limit the timer turns red and the interviewer closes after the candidate's next answer.
      // Safety net only: if nobody answers for 10 more minutes, end the session.
      if (elapsedRef.current >= targetDurationMinutes * 60 + 600) {
        clearInterval(timer);
        handleEndAndExitSession();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [uiPhase, targetDurationMinutes, conversationHistory, handleEndAndExitSession]);

  // Cleanup on unmount
  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
      cancelActiveTurn();
      cancelTTS();
      stopAll();
    };
  }, [cancelActiveTurn, cancelTTS, stopAll]);

  // Silence everything when completed
  useEffect(() => {
    if (uiPhase === "completed") {
      cancelActiveTurn();
      cancelTTS();
      stopAll();
    }
  }, [uiPhase, cancelActiveTurn, cancelTTS, stopAll]);

  // Smart auto-scroll transcript (only when candidate is near bottom, prevents jumping if reading older turns)
  useEffect(() => {
    if (isNearBottomRef.current) {
      transcriptBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationHistory, currentAlexText, liveTranscript, interimText]);

  // Session refresh restoration: restores active session across page refreshes
  useEffect(() => {
    const activeSessionId = sessionStorage.getItem("iq_active_session_id");
    if (!activeSessionId) return;

    let cancelled = false;
    getOrchestratorSession(activeSessionId)
      .then((session) => {
        if (cancelled) return;
        if (session.status === "completed" || session.evaluation_status === "completed") {
          sessionStorage.removeItem("iq_active_session_id");
          return;
        }
        orchestratorSessionRef.current = session;
        turnIndexRef.current = session.turn_index;

        if (session.transcript && session.transcript.length > 0) {
          setConversationHistory(
            session.transcript.map((t) => ({
              speaker: t.speaker,
              text: t.text,
              time: t.time || "",
            }))
          );
        }

        if (session.track === "dsa" || selectedTrack === "dsa") {
          const wmDsa = session.working_memory?.dsa_problem;
          syncDsaProblemFromBackend(wmDsa, setDsaProblem);
          if (wmDsa?.revealed) {
            setDsaProblemUnlocked(true);
            setStage("dsa_coding");
          }
        }

        if (session.turn_index > 0 || (session.transcript && session.transcript.length > 0)) {
          setUiPhase("candidate_turn");
        }
      })
      .catch((err) => {
        console.warn("[VoiceInterview] Could not restore active session:", err);
        sessionStorage.removeItem("iq_active_session_id");
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTrack]);

  // Synchronize STT with candidate turn
  useEffect(() => {
    if (uiPhase === "candidate_turn" && micOn) {
      setManualInput("");
      startListening();
    }
  }, [uiPhase, micOn, startListening]);

  // Alex speaks helper
  const alexSay = useCallback(
    async (text: string) => {
      if (isUnmountedRef.current) return;
      setCurrentAlexText(text);
      const timeStr = formatTime(elapsedRef.current);
      setConversationHistory((prev) => [...prev, { speaker: "Alex", text, time: timeStr }]);
      setUiPhase("alex_speaking");
      const played = await speak(text);
      if (isUnmountedRef.current) return;

      // If speech could not be played (e.g. cloud TTS quota exhausted), do NOT instantly jump in 0ms!
      // Give the candidate natural reading time to read Alex's question on-screen.
      if (!played) {
        const words = text.split(/\s+/).length;
        const readMs = Math.min(10000, Math.max(4500, (words / 140) * 60 * 1000));
        await new Promise((r) => setTimeout(r, readMs));
      }
    },
    [speak],
  );

  // ---------------------------------------------------------------------------
  // Answer Submission & State Machine — Wired to Backend Orchestrator
  // ---------------------------------------------------------------------------
  const handleSubmitRef = useRef<() => void>(() => {});

  const handleSubmit = useCallback(async () => {
    if (uiPhase !== "candidate_turn") return;

    setInferenceError(null);
    setUiPhase("thinking");
    setThinkingStatusText("Alex is analyzing your response...");
    cancelTTS();

    let transcribed = await stopListeningAndTranscribe();
    transcribed = transcribed.trim();

    const finalAnswer = manualInput.trim() || transcribed || liveTranscriptRef.current.trim();
    if (!finalAnswer) {
      // Never invent an answer on the candidate's behalf: it would be scored as if they had said it.
      setInferenceError("I didn't catch anything. Try speaking again, or choose Type text.");
      setUiPhase("candidate_turn");
      return;
    }

    clearSTT();
    setManualInput("");
    setIsEditingInput(false);

    const timeStr = formatTime(elapsedRef.current);
    const candidateTurn: ConversationTurn = {
      speaker: "Candidate",
      text: finalAnswer,
      time: timeStr,
    };

    const updatedHistory = [...conversationHistory, candidateTurn];
    setConversationHistory(updatedHistory);

    // Ensure session is initialized
    if (!orchestratorSessionRef.current) {
      try {
        const session = await createOrchestratorSession(
          selectedTrack,
          trackInfo.title,
          undefined,
          targetDurationMinutes * 60
        );
        orchestratorSessionRef.current = session;
        turnIndexRef.current = session.turn_index;
      } catch (err: any) {
        setInferenceError(`Failed to connect to backend: ${err.message || err}`);
        setUiPhase("candidate_turn");
        return;
      }
    }

    const currentTurnIndex = orchestratorSessionRef.current ? orchestratorSessionRef.current.turn_index : turnIndexRef.current;
    turnIndexRef.current = currentTurnIndex;
    setCurrentAlexText("");
    let streamedDialogue = "";
    const abortController = new AbortController();
    activeTurnAbortRef.current = abortController;

    try {
      const committed = await streamOrchestratorTurn(
        orchestratorSessionRef.current.id,
        currentTurnIndex,
        finalAnswer,
        {
          onTtft: (ttftMs) => {
            console.log(`[Telemetry] Turn ${currentTurnIndex} TTFT: ${ttftMs}ms`);
            setUiPhase("alex_speaking");
          },
          onToken: (tok) => {
            streamedDialogue += tok;
            setCurrentAlexText(streamedDialogue);
            setUiPhase("alex_speaking");
          },
          onSentence: (sentence) => {
            queueSentence(sentence);
          },
        },
        abortController.signal
      );

      // Update confirmed backend turn index
      turnIndexRef.current = committed.turn_index;
      if (orchestratorSessionRef.current) {
        orchestratorSessionRef.current.turn_index = committed.turn_index;
      }

      if (selectedTrack === "dsa") {
        const isRevealed = Boolean(
          committed.dsa_problem_revealed ||
          committed.working_memory?.dsa_problem?.revealed
        );
        if (isRevealed) {
          setDsaProblemUnlocked(true);
          setStage("dsa_coding");
        }
        const probMeta = committed.dsa_problem || committed.working_memory?.dsa_problem;
        syncDsaProblemFromBackend(probMeta, setDsaProblem);
      } else if (stage === "self_intro") {
        setStage("topics");
      }

      const alexTurnText = committed.assistant_response || streamedDialogue;
      const alexTurn: ConversationTurn = {
        speaker: "Alex",
        text: alexTurnText,
        time: formatTime(elapsedRef.current),
      };
      setConversationHistory([...updatedHistory, alexTurn]);

      // Await sequential audio completion
      await waitForDrain();

      if (isUnmountedRef.current) return;

      // Check for interview conclusion
      const socraticDirective = committed.delta_metadata?.socratic_directive;
      const directiveAction = committed.directive_action;
      if (
        directiveAction === "CONCLUDE" ||
        directiveAction === "CONCLUDE_TIME_BUDGET" ||
        committed.status === "completed"
      ) {
        setUiPhase("completed");
      } else {
        setUiPhase("candidate_turn");
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("[VoiceInterview] Stream aborted by client.");
        return;
      }
      console.error("[VoiceInterview] Turn error:", err);
      // Any failed turn (409 conflict, dropped stream, 5xx) may leave the client's turn index out of step with the
      // server, so always re-sync from the authoritative session before the candidate retries.
      if (orchestratorSessionRef.current?.id) {
        try {
          const freshSession = await getOrchestratorSession(orchestratorSessionRef.current.id);
          orchestratorSessionRef.current = freshSession;
          turnIndexRef.current = freshSession.turn_index;
          console.log(`[VoiceInterview] Auto-reconciled turn index to ${freshSession.turn_index}`);
        } catch (syncErr) {
          console.warn("[VoiceInterview] Failed to auto-reconcile session:", syncErr);
        }
      }
      setInferenceError(`Interviewer error: ${err.message || "Failed to process turn."}`);
      setUiPhase("candidate_turn");
    } finally {
      activeTurnAbortRef.current = null;
    }
  }, [
    uiPhase,
    cancelTTS,
    stopListeningAndTranscribe,
    manualInput,
    stage,
    clearSTT,
    conversationHistory,
    selectedTrack,
    trackInfo.title,
    queueSentence,
    waitForDrain,
  ]);

  handleSubmitRef.current = handleSubmit;

  // ---------------------------------------------------------------------------
  // DSA Code Submission Callback
  // ---------------------------------------------------------------------------
  const handleDsaCodeSubmitted = async (result: {
    passed: boolean;
    totalPassed: number;
    totalTests: number;
    code: string;
    language: string;
  }) => {
    const timeStr = formatTime(elapsedRef.current);
    const candidateTurn: ConversationTurn = {
      speaker: "Candidate",
      text: `[Submitted ${result.language} Implementation]: Result: ${result.totalPassed}/${result.totalTests} tests passed. All visible and hidden test cases executed.`,
      time: timeStr,
    };

    const updatedHistory = [...conversationHistory, candidateTurn];
    setConversationHistory(updatedHistory);

    setUiPhase("thinking");
    setThinkingStatusText("Alex is reviewing your test execution results...");

    try {
      if (!orchestratorSessionRef.current) throw new Error("No active session");
      const verdict = `Test run: ${result.totalPassed}/${result.totalTests} tests passed.`;
      const committed = await submitDsaCode(orchestratorSessionRef.current.id, {
        code: result.code,
        test_summary: verdict,
        language: result.language,
        expected_turn_index: turnIndexRef.current,
        client_turn_id: crypto.randomUUID(),
      });
      turnIndexRef.current = committed.turn_index;
      orchestratorSessionRef.current.turn_index = committed.turn_index;
      await alexSay(committed.assistant_response);
      if (isUnmountedRef.current) return;
      if (
        committed.directive_action === "CONCLUDE" ||
        committed.directive_action === "CONCLUDE_TIME_BUDGET" ||
        committed.status === "completed"
      ) {
        setUiPhase("completed");
      } else {
        setUiPhase("candidate_turn");
      }
    } catch (err: any) {
      setInferenceError(`Code review failed: ${err.message || err}`);
      setUiPhase("candidate_turn");
    }
  };

  // Manual skip function if candidate wants to answer before Alex finishes speaking
  const handleSkipAlexSpeech = useCallback(() => {
    if (uiPhase === "alex_speaking") {
      cancelTTS();
      setUiPhase("candidate_turn");
    }
  }, [uiPhase, cancelTTS]);

  // While the interview is live, warn before a refresh or tab close throws the session away.
  useEffect(() => {
    if (uiPhase === "splash" || uiPhase === "loading" || uiPhase === "completed") return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    (window as unknown as { __iqInterviewLive?: boolean }).__iqInterviewLive = true;
    return () => {
      window.removeEventListener("beforeunload", warn);
      (window as unknown as { __iqInterviewLive?: boolean }).__iqInterviewLive = false;
    };
  }, [uiPhase]);

  // Keyboard shortcut: Ctrl+Enter / Cmd+Enter to submit answer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (uiPhase === "candidate_turn") {
          handleSubmitRef.current();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [uiPhase]);

  // ---------------------------------------------------------------------------
  // Join Interview Click (Calibrates Models Upfront, Buffers Audio & Pre-warms Latency)
  // ---------------------------------------------------------------------------
  const handleJoinInterview = async () => {
    setUiPhase("loading");
    setSetupStep(1);
    setInferenceError(null);

    const candidateName = userResume.name ? userResume.name.split(" ")[0] : "Candidate";
    const introSpeech = `Hello ${candidateName}, I'm Alex. I'll be conducting your ${trackInfo.title} interview today. Before we dive into the technical assessment, could you please introduce yourself, walk me through your engineering journey, and highlight your primary technical focus?`;

    try {
      // Step 1: Unlock AudioContext and probe/lock TTS & STT models upfront
      await unlockAudio();
      await calibrateEngines();
      setSetupStep(2);

      // Step 2: Initialize Orchestrator Session on Backend
      // Phase 4: Do not pass hardcoded problem_id, allowing the adaptive question intelligence engine to select!
      const session = await createOrchestratorSession(
        selectedTrack,
        trackInfo.title,
        undefined,
        targetDurationMinutes * 60
      );
      orchestratorSessionRef.current = session;
      turnIndexRef.current = session.turn_index; // 0
      sessionStorage.setItem("iq_active_session_id", session.id);

      // Ground problem immutably from backend state if DSA track
      if (selectedTrack === "dsa") {
        const wmDsa = session.working_memory?.dsa_problem;
        syncDsaProblemFromBackend(wmDsa, setDsaProblem);
        setDsaProblemUnlocked(Boolean(wmDsa?.revealed));
      }

      setSetupStep(3);

      // Step 3: Test and calibrate microphone acoustics
      await new Promise((r) => setTimeout(r, 200));
      setSetupStep(4);

      // Step 4: Pre-generate opening dialogue buffer
      await prefetch(introSpeech);

      // Transition smoothly into room
      setStage("self_intro");
      setUiPhase("alex_speaking");
      await alexSay(introSpeech);
      setUiPhase("candidate_turn");
      setIsFollowUp(false);
    } catch (err: any) {
      console.warn("[VoiceInterview] Setup warning:", err);
      setInferenceError(`Session initialization notice: ${err.message || err}`);
      setStage("self_intro");
      setUiPhase("alex_speaking");
      await alexSay(introSpeech);
      setUiPhase("candidate_turn");
      setIsFollowUp(false);
    }
  };

  // Lobby shortcut: Enter joins, unless a button or field has focus (then Enter does that control's job)
  useEffect(() => {
    if (uiPhase !== "splash") return;
    const needsResume = selectedTrack === "resume" && !hasRealResume;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.ctrlKey || e.metaKey || e.altKey || needsResume) return;
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "button" || tag === "input" || tag === "textarea" || tag === "a") return;
      e.preventDefault();
      handleJoinInterview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [uiPhase, selectedTrack, hasRealResume, handleJoinInterview]);

  // ---------------------------------------------------------------------------
  // Interview finished: the evaluation is queued in the background and you land on the dashboard.
  // The short pause lets Alex's closing line and the "Interview complete" chip register first.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (uiPhase !== "completed") return;
    const timer = setTimeout(() => handleEndAndExitSession(), 900);
    return () => clearTimeout(timer);
  }, [uiPhase, handleEndAndExitSession]);

  const candidateCurrentText = manualInput || liveTranscript;

  // ---------------------------------------------------------------------------
  // SCREEN 1: PRE-INTERVIEW LOBBY
  // ---------------------------------------------------------------------------
  if (uiPhase === "splash") {
    const needsResumeFirst = selectedTrack === "resume" && !hasRealResume;
    const leave = (to: string) => {
      cancelTTS();
      cancelActiveTurn();
      stopAll();
      sessionStorage.removeItem("iq_active_session_id");
      onNavigate(to);
    };

    // "Live" means the browser is actually delivering frames: a stopped or stolen camera leaves hasVideoTrack true
    // but the track ended, which would otherwise show a black box with no explanation.
    const videoLive = Boolean(stream && stream.getVideoTracks().some((t) => t.readyState === "live"));
    const camOk = cameraOn && hasVideoTrack && videoLive;
    const camMessage = cameraError || (hasVideoTrack && !videoLive ? "Camera disconnected" : "");
    type CheckState = "ok" | "warn" | "idle";
    const checks: { key: string; label: string; state: CheckState; detail: string; action?: { label: string; onClick: () => void } }[] = [
      {
        key: "camera",
        label: "Camera",
        state: camOk ? "ok" : "warn",
        detail: camOk ? "Working" : camMessage || "Off",
        // With a live camera the button switches it on or off; with none it asks the browser for the camera again
        action: videoLive
          ? { label: camOk ? "Turn off" : "Turn on", onClick: toggleCamera }
          : { label: "Retry", onClick: retryMedia },
      },
      {
        key: "mic",
        label: "Microphone",
        state: !micOn ? "warn" : micHeard ? "ok" : "idle",
        detail: !micOn ? "Muted" : micHeard ? "Heard you" : "Say a few words",
        action: { label: micOn ? "Mute" : "Unmute", onClick: toggleMic },
      },
      {
        key: "speaker",
        label: "Speaker",
        state: speakerTested ? "ok" : "idle",
        detail: speakerTested ? "Played. Did you hear it?" : "Not tested yet",
        action: { label: speakerTested ? "Play again" : "Play test", onClick: playTestSound },
      },
      {
        key: "service",
        label: "Interviewer",
        state: serviceState === "ok" ? "ok" : serviceState === "down" ? "warn" : "idle",
        detail: serviceState === "ok" ? "Connected" : serviceState === "down" ? "Cannot reach the server" : "Checking...",
        action: serviceState === "down" ? { label: "Retry", onClick: () => setServiceTick((n) => n + 1) } : undefined,
      },
    ];
    const dotColor: Record<CheckState, string> = { ok: "var(--ob-ok)", warn: "var(--ob-wn)", idle: "var(--ob-ln3)" };
    const readyCount = checks.filter((c) => c.state === "ok").length;

    const level = Math.min(1, micVolume * 3.2);
    const initial = (userResume?.name || "Candidate").charAt(0).toUpperCase();

    return (
      <div className="ob-app h-full w-full flex flex-col overflow-y-auto" style={{ background: "var(--ob-bg1)" }}>
        <header className="flex items-center justify-between gap-4 px-4 sm:px-8 h-16 border-b ob-bd shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Logo size={26} />
            <span className="text-[14px] font-medium truncate">{trackInfo.title}</span>
          </div>
          <button type="button" className="ob-btn ob-sm" onClick={() => leave("interview-setup")}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
            Back
          </button>
        </header>

        <main className="flex-1 grid place-items-center px-5 sm:px-8 py-8 sm:py-12">
          <div className="w-full max-w-[1020px] grid gap-10 lg:gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] items-center">
            {/* Left: you, and whether everything works. No boxes, just the camera and a short checklist. */}
            <section className="ob-rise min-w-0" style={{ ["--i" as string]: 0 }}>
              <div className={`${camOk ? "ob-cam" : "relative overflow-hidden grid place-items-center border border-ob-ln bg-ob-bg2"} w-full h-[250px] sm:h-auto sm:aspect-[4/3]`} style={{ borderRadius: 16 }}>
                {camOk ? (
                  <video ref={attachVideoNode} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" />
                ) : (
                  <div className="text-center ob-tx3 px-6">
                    <span className="w-14 h-14 rounded-full border grid place-items-center mx-auto mb-3 text-lg font-medium ob-tx" style={{ borderColor: "var(--ob-ln2)", background: "var(--ob-bg3)" }}>
                      {initial}
                    </span>
                    <div className="text-[13px] ob-tx2">{camMessage ? "Camera unavailable" : "Camera off"}</div>
                    {camMessage && <div className="text-[12.5px] mt-1 max-w-[34ch] mx-auto leading-snug" style={{ color: "var(--ob-wn)" }}>{camMessage}</div>}
                  </div>
                )}
                <span className="ob-mo absolute left-4 bottom-4 text-[11.5px] ob-tx2 truncate max-w-[70%]">{userResume?.name || "You"}</span>
                {/* Mic level: one hairline that fills with your voice, instead of a bar chart */}
                <div className="absolute left-0 right-0 bottom-0 h-[3px]" style={{ background: "rgb(var(--ob-ov)/0.1)" }} aria-hidden="true">
                  <div
                    className="h-full origin-left"
                    style={{
                      background: "var(--ob-ok)",
                      transform: `scaleX(${micOn ? level : 0})`,
                      transition: "transform 140ms linear",
                    }}
                  />
                </div>
              </div>

              <ul className="list-none m-0 mt-6 p-0" aria-label="Pre-flight check" aria-live="polite">
                {checks.map((c, i) => (
                  <li key={c.key} className={`flex items-baseline gap-3 py-3 text-[13.5px] ${i > 0 ? "border-t ob-bd" : ""}`}>
                    <span
                      className="w-[7px] h-[7px] rounded-full shrink-0 translate-y-[-1px]"
                      style={{ background: dotColor[c.state], transition: `background-color .5s var(--ob-ease) ${i * 120}ms` }}
                      aria-hidden="true"
                    />
                    <span className="w-[92px] shrink-0 ob-tx">{c.label}</span>
                    <span className="flex-1 min-w-0 ob-tx3 leading-snug" style={c.state === "warn" ? { color: "var(--ob-wn)" } : undefined}>{c.detail}</span>
                    {c.action && (
                      <button
                        type="button"
                        onClick={c.action.onClick}
                        className="ob-mo text-[11.5px] ob-tx2 hover:text-ob-tx underline underline-offset-[5px] decoration-ob-ln3 hover:decoration-ob-ac transition-colors cursor-pointer shrink-0"
                      >
                        {c.action.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            {/* Right: what you are about to do */}
            <section className="min-w-0 ob-rise" style={{ ["--i" as string]: 1 }}>
              <div className="ob-lb">Interview with Alex</div>
              <h1 className="m-0 mt-4 text-[clamp(34px,4.6vw,54px)] font-medium tracking-[-0.035em] leading-[1.04]">{trackInfo.title}</h1>
              <p className="mt-4 mb-0 max-w-[38ch] text-[15px] ob-tx2 leading-relaxed">
                {trackInfo.badge}. Answer out loud, the way you would in the room.
              </p>

              <div className="mt-9">
                <div className="ob-lb mb-3">Length</div>
                <Segmented
                  label="Interview length"
                  value={String(targetDurationMinutes)}
                  onChange={(v) => setTargetDurationMinutes(Number(v))}
                  options={[15, 30, 45, 60].map((m) => ({ id: String(m), label: `${m} min` }))}
                />
              </div>

              <div className="mt-9">
                {needsResumeFirst ? (
                  <div className="rounded-xl border p-5 text-[13px]" style={{ borderColor: "color-mix(in srgb, var(--ob-wn) 35%, transparent)", background: "color-mix(in srgb, var(--ob-wn) 7%, transparent)", color: "var(--ob-wn)" }}>
                    This track questions you on your own projects, so it needs a resume first.
                    <button type="button" className="ob-btn ob-sm mt-3 block" onClick={() => leave("resume")}>Upload resume</button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-5 flex-wrap">
                      <button
                        type="button"
                        onClick={handleJoinInterview}
                        disabled={serviceState === "down"}
                        className={`ob-btn ob-pr ob-btn-lg group ${readyCount === checks.length ? "ob-ready" : ""}`}
                      >
                        Join interview
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                      </button>
                    </div>
                    {serviceState === "down" && (
                      <p className="m-0 mt-4 text-[12.5px] leading-snug" style={{ color: "var(--ob-wn)" }} role="status">
                        The interviewer is unreachable, so you cannot join yet. Use Retry in the checklist once the server is back.
                      </p>
                    )}
                  </>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // SCREEN 2: ENVIRONMENT CALIBRATION & PRE-WARMING
  // ---------------------------------------------------------------------------
  if (uiPhase === "loading") {
    const steps = [
      { label: "Audio system", done: "Ready", active: "Starting" },
      { label: "Interview session", done: "Connected", active: "Connecting" },
      { label: "Microphone", done: "Verified", active: "Checking" },
      { label: "Opening dialogue", done: "Prepared", active: "Preparing" },
    ];
    return (
      <div className="ob-app h-full w-full flex flex-col overflow-y-auto" style={{ background: "var(--ob-bg1)" }}>
        <header className="flex items-center gap-3 px-4 sm:px-8 h-16 border-b ob-bd shrink-0">
          <Logo size={26} />
          <span className="text-[14px] font-medium">{trackInfo.title}</span>
        </header>

        <main className="flex-1 grid place-items-center px-4 py-10">
          <div className="w-full max-w-[460px]">
            <div className="ob-lb">Getting ready</div>
            <h2 className="m-0 mt-2.5 text-[26px] font-medium tracking-[-0.02em]">Setting up your interview</h2>
            <div className="ob-bar mt-6" style={{ height: 3 }}>
              <i style={{ width: `${Math.min(100, setupStep * 25)}%`, animation: "none", transition: "width 500ms var(--ob-ease)" }} />
            </div>
            <ol className="list-none m-0 mt-6 p-0 ob-pane px-5 py-1.5" aria-live="polite">
              {steps.map((st, i) => {
                const n = i + 1;
                const done = setupStep > n || (n === 4 && setupStep >= 4);
                const active = !done && setupStep === n;
                return (
                  <li key={st.label} className={`flex items-center gap-3 py-3.5 text-[13.5px] ${i > 0 ? "border-t ob-bd" : ""}`}>
                    <span
                      className={`w-5 h-5 rounded-full border grid place-items-center shrink-0 ${done ? "bg-ob-ac border-ob-ac text-ob-onac" : active ? "border-ob-ac" : "border-ob-ln2"}`}
                      aria-hidden="true"
                    >
                      {done ? (
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path className="ob-tick" pathLength={1} d="M5 12l5 5 9-10" /></svg>
                      ) : active ? (
                        <span className="w-2.5 h-2.5 rounded-full border-[1.5px] border-ob-ln2 border-t-ob-ac animate-spin" />
                      ) : null}
                    </span>
                    <span className={done || active ? "" : "ob-tx3"}>{st.label}</span>
                    <span className="ml-auto ob-mo text-[11.5px] ob-tx3">{done ? st.done : active ? `${st.active}...` : "Waiting"}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // SCREEN 3: ACTIVE INTERVIEW ROOM
  // ---------------------------------------------------------------------------
  return (
    <div className="ob-app h-full w-full flex flex-col overflow-hidden">
      {/* Top bar: what this is, where you are, the clock, and a way out. Nothing else. */}
      <header className="flex items-center justify-between gap-4 px-4 sm:px-8 h-14 border-b ob-bd shrink-0 z-20">
        <div className="min-w-0 flex items-baseline gap-3">
          <span className="text-[14px] font-medium truncate">{trackInfo.title}</span>
          <span className="ob-mo text-[11.5px] ob-tx3 truncate hidden sm:inline" aria-label="Interview progress">
            {uiPhase === "completed"
              ? "Complete"
              : stage === "self_intro"
              ? "Introduction"
              : selectedTrack === "dsa"
              ? dsaProblemUnlocked ? "Coding discussion" : "Problem briefing"
              : `Question ${Math.min(mainQuestionsAsked + 1, interviewTopics.length)} of ${interviewTopics.length}`}
          </span>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {elapsed >= targetDurationMinutes * 60 && uiPhase !== "completed" && (
            <span className="ob-mo text-[11.5px] hidden md:inline" style={{ color: "var(--ob-hot)" }} role="status">
              Over time. Finish your answer and Alex will wrap up
            </span>
          )}
          <div
            className="ob-mo flex items-center gap-2.5 text-[12.5px] ob-tx2"
            // The clock warms toward orange across the final minute instead of switching at zero.
            style={{
              ["--warm" as string]: `${Math.round(Math.min(1, Math.max(0, (elapsed - (targetDurationMinutes * 60 - 60)) / 60)) * 100)}%`,
              color: "color-mix(in srgb, var(--ob-hot) var(--warm), var(--ob-tx2))",
              transition: "color 1s linear",
            }}
            aria-label={`Elapsed ${formatTime(elapsed)} of ${targetDurationMinutes} minutes${elapsed >= targetDurationMinutes * 60 ? ", time is up" : ""}`}
          >
            <span className="ob-rec" aria-hidden="true" />
            <span style={{ color: "color-mix(in srgb, var(--ob-hot) var(--warm), var(--ob-tx))", transition: "color 1s linear" }}>{formatTime(elapsed)}</span>
            <span className="ob-tx3 hidden sm:inline">/ {String(targetDurationMinutes).padStart(2, "0")}:00</span>
          </div>
          <button type="button" onClick={() => setConfirmEnd(true)} className="ob-btn ob-dg ob-sm">
            End call
          </button>
        </div>
      </header>
      <div
        className="ob-pb shrink-0"
        style={{ borderRadius: 0, height: 2 }}
        role="progressbar"
        aria-label="Interview time elapsed"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, Math.round((elapsed / (targetDurationMinutes * 60)) * 100))}
      >
        <i style={{ width: `${Math.min(100, (elapsed / (targetDurationMinutes * 60)) * 100)}%`, background: elapsed >= targetDurationMinutes * 60 ? "var(--ob-hot)" : undefined }} />
      </div>

      {inferenceError && (
        <div className="px-4 sm:px-8 py-2 flex items-center gap-3 border-b ob-bd text-[12.5px] shrink-0" role="alert" style={{ color: "var(--ob-er)" }}>
          <span className="flex-1 min-w-0">{inferenceError}</span>
          <button type="button" onClick={() => setInferenceError(null)} className="underline underline-offset-4 cursor-pointer shrink-0">Dismiss</button>
        </div>
      )}

      {/* Workspace Sub-renders for Modular, Persistent Layout */}
      {(() => {
        // One conversation pane: who is talking, the transcript, and where you answer.
        // Every turn is drawn the same way (same size, same colour per speaker). Only opacity changes as a line ages,
        // and the in-progress line keeps the same React key it will have once committed, so nothing flashes or recolours
        // when Alex finishes speaking.
        const renderConversationPane = ({ isPrimary = false, composerOnly = false }: { isPrimary?: boolean; composerOnly?: boolean } = {}) => {
          const lastTurn = conversationHistory[conversationHistory.length - 1];
          const alreadyInHistory = lastTurn?.speaker === "Alex";
          const streamingNow = uiPhase === "alex_speaking" && !!currentAlexText && !alreadyInHistory;
          const liveCandidate = uiPhase === "candidate_turn" && !isEditingInput ? candidateCurrentText.trim() : "";
          const fontSize = isPrimary ? 16 : 14.5;

          const rows: { speaker: string; text: string; time: string }[] = conversationHistory.map((t) => ({
            speaker: t.speaker,
            text: t.text,
            time: t.time,
          }));
          if (streamingNow) rows.push({ speaker: "Alex", text: currentAlexText, time: "now" });
          else if (liveCandidate) rows.push({ speaker: "Candidate", text: liveCandidate, time: "now" });
          const activeIdx = uiPhase === "thinking" ? -1 : rows.length - 1;

          const alexIsTalking = uiPhase === "alex_speaking";
          const stateLabel =
            uiPhase === "alex_speaking"
              ? "Speaking"
              : uiPhase === "candidate_turn"
              ? micOn
                ? micVolume > 0.03
                  ? "Hearing you"
                  : "Your turn. Listening"
                : "Your turn. Microphone is muted"
              : uiPhase === "thinking"
              ? thinkingStatusText
              : "Interview complete";
          const lastCommitted = conversationHistory[conversationHistory.length - 1];
          const lastAlexQuestion = [...conversationHistory].reverse().find((t) => t.speaker === "Alex")?.text ?? "";
          const voiceNote = ttsQuotaError && uiPhase !== "completed" ? " · voice unavailable, text only" : "";
          const wordsCaptured = candidateCurrentText.trim() ? candidateCurrentText.trim().split(/\s+/).length : 0;

          const composer = (
              <div className="ob-composer px-5 py-3.5 flex flex-col gap-3 shrink-0" style={{ background: "var(--ob-bg)" }}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    {isFollowUp && <span className="ob-chip ob-warn">Deep dive</span>}
                  </div>
                  {uiPhase === "candidate_turn" && !isEditingInput && (
                    <span className="ob-mo text-[11px] ob-tx3 hidden sm:inline">Ctrl + Enter to send</span>
                  )}
                  {uiPhase === "alex_speaking" && (
                    <button type="button" onClick={handleSkipAlexSpeech} className="ob-btn ob-sm">
                      Skip to answer
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                  <div className="flex-1 min-w-0 basis-full sm:basis-0 text-[13.5px]">
                    {isEditingInput ? (
                      <>
                      <textarea
                        rows={3}
                        value={manualInput || liveTranscript}
                        onChange={(e) => setManualInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit();
                          }
                        }}
                        placeholder="Type or refine your response here..."
                        aria-label="Your response"
                        autoFocus
                        className="ob-input resize-none leading-relaxed"
                      />
                      <div className="ob-mo text-[11px] ob-tx3 mt-1.5">Enter to send. Shift + Enter for a new line.</div>
                      </>
                    ) : candidateCurrentText ? (
                      <div className="flex items-center gap-2.5 ob-tx2">
                        <span className="ob-mo text-[12px]">{wordsCaptured} {wordsCaptured === 1 ? "word" : "words"} captured</span>
                        <button
                          type="button"
                          onClick={() => {
                            setManualInput(candidateCurrentText);
                            setIsEditingInput(true);
                          }}
                          className="ob-mo text-[11.5px] ob-txa hover:underline cursor-pointer"
                        >
                          edit
                        </button>
                      </div>
                    ) : (
                      <span className="ob-tx3">
                        {uiPhase === "candidate_turn"
                          ? micOn
                            ? "Start speaking, or choose Type text."
                            : "Microphone is muted. Unmute it or choose Type text."
                          : uiPhase === "alex_speaking"
                          ? "Alex is speaking. You can answer once he finishes."
                          : "Waiting for your turn..."}
                        {sttError && uiPhase === "candidate_turn" && (
                          <span className="block ob-mo text-[11px] mt-1" style={{ color: "var(--ob-wn)" }}>{sttError}</span>
                        )}
                      </span>
                    )}
                  </div>

                  {uiPhase === "candidate_turn" && (
                    <div className="flex items-center gap-2 shrink-0">
                      {!isEditingInput && (
                        <button
                          type="button"
                          onClick={() => {
                            setManualInput(candidateCurrentText);
                            setIsEditingInput(true);
                          }}
                          className="ob-btn"
                        >
                          Type text
                        </button>
                      )}
                      <button type="button" onClick={handleSubmit} disabled={isTranscribing} className="ob-btn ob-pr">
                        {isTranscribing ? (
                          <>
                            <span className="w-2.5 h-2.5 rounded-full border border-current border-t-transparent animate-spin" />
                            Transcribing...
                          </>
                        ) : (
                          <>
                            Send answer
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
          );

          const camLive = cameraOn && hasVideoTrack;
          const micLevel = micOn ? Math.min(1, micVolume * 3.2) : 0;
          const iconBtn = { width: 34, height: 34 } as const;

          // Alex's state on the left; your mic and camera on the right. One strip, no avatars or badges.
          const strip = (
            <div className="flex items-center gap-4 px-5 py-3 border-b ob-bd shrink-0">
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] leading-tight">Alex</div>
                <div key={uiPhase} className="anim-fade-in ob-mo text-[11.5px] ob-tx3 truncate mt-0.5" role="status">
                  {stateLabel}{voiceNote}
                </div>
              </div>
              {uiPhase === "thinking" && (
                <span className="w-3.5 h-3.5 border-[1.5px] border-ob-ln2 border-t-ob-ac rounded-full animate-spin shrink-0" aria-hidden="true" />
              )}
              {uiPhase === "candidate_turn" && (
                <div className="w-[84px] h-[3px] rounded-full overflow-hidden shrink-0 hidden sm:block" style={{ background: "rgb(var(--ob-ov)/0.1)" }} aria-hidden="true">
                  <div className="h-full origin-left" style={{ background: "var(--ob-ok)", transform: `scaleX(${micLevel})`, transition: "transform 140ms linear" }} />
                </div>
              )}
              <div className="flex items-center gap-1.5 shrink-0">
                <button type="button" onClick={toggleMic} className={`ob-cbtn ${micOn ? "" : "ob-off"}`} style={iconBtn} aria-label={micOn ? "Mute microphone" : "Unmute microphone"} aria-pressed={!micOn}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                    <path d={micOn ? "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3" : "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3M4 4l16 16"} />
                  </svg>
                </button>
                <button type="button" onClick={toggleCamera} className={`ob-cbtn ${cameraOn ? "" : "ob-off"}`} style={iconBtn} aria-label={cameraOn ? "Turn camera off" : "Turn camera on"} aria-pressed={!cameraOn}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={cameraOn ? "M3 7h12v10H3zM15 11l6-3v8l-6-3" : "M3 7h12v10H3zM15 11l6-3v8l-6-3M4 4l16 16"} />
                  </svg>
                </button>
              </div>
              {camLive && (
                <video ref={attachVideoNode} autoPlay playsInline muted className="w-[88px] h-[66px] rounded-[9px] object-cover scale-x-[-1] shrink-0 border border-ob-ln" />
              )}
            </div>
          );

          if (composerOnly) {
            return (
              <div className="ob-pane shrink-0 overflow-hidden">
                {strip}
                {composer}
              </div>
            );
          }

          return (
            <div className="ob-pane flex-1 flex flex-col overflow-hidden min-h-[360px]">
              {strip}

              {/* Announce each finished turn once, instead of every streamed word */}
              <div className="sr-only" aria-live="polite" role="log">
                {lastCommitted ? `${lastCommitted.speaker === "Alex" ? "Alex" : "You"}: ${lastCommitted.text}` : ""}
              </div>

              {/* Transcript */}
              <div
                onScroll={(e) => {
                  const el = e.currentTarget;
                  isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
                }}
                className="ob-scroll flex-1 overflow-y-auto px-5 py-2"
              >
                <div className="w-full">
                  {rows.length === 0 && (
                    <div className="py-10 text-center text-[13px] ob-tx3">
                      Your conversation with Alex will appear here as you talk.
                    </div>
                  )}

                  {rows.map((turn, idx) => {
                    const isAlex = turn.speaker === "Alex";
                    const active = idx === activeIdx;
                    return (
                      <div key={idx} className={`py-4 ${idx > 0 ? "border-t ob-bd" : ""}`} style={{ opacity: active ? 1 : 0.82, transition: "opacity .6s var(--ob-ease)" }}>
                        <div className="ob-mo text-[11px] uppercase tracking-[0.08em] mb-1.5 flex items-center gap-2" style={{ color: isAlex ? "var(--ob-tx3)" : "var(--ob-ac)" }}>
                          {isAlex ? "Alex" : "You"}
                          <span className="normal-case tracking-normal ob-tx3">{turn.time}</span>
                        </div>
                        <p
                          className="m-0 whitespace-pre-wrap break-words"
                          style={{
                            fontSize: isAlex && active && isPrimary ? 18 : fontSize,
                            lineHeight: 1.6,
                            color: isAlex ? "var(--ob-tx)" : "var(--ob-tx2)",
                          }}
                        >
                          {/* The live turn settles in word by word; earlier turns are plain text. */}
                          {active
                            ? turn.text.split(/(\s+)/).map((tok, i) => (/^\s*$/.test(tok) ? tok : <span key={i} className="st-word max-w-full">{tok}</span>))
                            : turn.text}
                          {active && isAlex && alexIsTalking && streamingNow && <span className="ob-cur" aria-hidden="true" />}
                        </p>
                      </div>
                    );
                  })}

                  {uiPhase === "thinking" && (
                    <div className={`py-4 ${rows.length > 0 ? "border-t ob-bd" : ""}`}>
                      <div className="ob-mo text-[11px] uppercase tracking-[0.08em] mb-1.5 ob-tx3">Alex</div>
                      <p className="m-0 ob-tx3" style={{ fontSize, lineHeight: 1.6 }}>
                        {thinkingStatusText}
                        <span className="ob-cur" aria-hidden="true" style={{ marginLeft: 4 }} />
                      </p>
                    </div>
                  )}
                </div>

                <div ref={transcriptBottomRef} />
              </div>

              <div className="border-t ob-bd">{composer}</div>
            </div>
          );
        };

        if (selectedTrack === "dsa") {
          if (!dsaProblemUnlocked) {
            // Before the problem is revealed: just the conversation
            return (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-4 sm:px-6 py-4 sm:py-5">
                <section className="mx-auto w-full max-w-[880px] flex-1 min-h-0 flex flex-col">
                  {renderConversationPane({ isPrimary: true })}
                </section>
              </div>
            );
          }

          // Problem revealed: code workspace beside the conversation
          return (
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden p-4 sm:p-6 gap-4">
              <div className="w-full lg:w-[64%] flex flex-col min-h-[520px] lg:h-full overflow-hidden ob-pane">
                <DsaCodingWorkspace
                  problem={dsaProblem}
                  onSolutionSubmitted={handleDsaCodeSubmitted}
                  className="w-full h-full"
                />
              </div>
              <div className="w-full lg:w-[36%] flex flex-col lg:h-full overflow-hidden min-h-[480px]">
                {renderConversationPane({ isPrimary: false })}
              </div>
            </div>
          );
        }

        // Other tracks: the conversation, with a notes tab
        return (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-4 sm:px-6 py-4 sm:py-5">
            <section className="mx-auto w-full max-w-[880px] flex-1 min-h-0 flex flex-col gap-3.5">
              <Segmented
                label="Workspace"
                quiet
                value={workspaceTab}
                onChange={(v) => setWorkspaceTab(v)}
                options={[
                  { id: "briefing", label: "Conversation" },
                  { id: "scratchpad", label: "Notes" },
                ]}
              />

              {workspaceTab === "briefing" ? (
                <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                  {renderConversationPane({ isPrimary: true })}
                </div>
              ) : (() => {
                  const scratchConfig = getTrackScratchpadConfig(selectedTrack);
                  return (
                    <div className="flex-1 flex flex-col gap-3.5 overflow-hidden min-h-0">
                      <div className="ob-pane flex-1 flex flex-col overflow-hidden min-h-[240px]">
                        <div className="ob-ph">
                          <span className="ob-lb">{scratchConfig.label}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setCandidateNotes((prev) =>
                                prev ? prev + "\n\n" + scratchConfig.template : scratchConfig.template
                              )
                            }
                            className="ob-mo text-[11.5px] ob-txa hover:underline cursor-pointer"
                          >
                            {scratchConfig.buttonText}
                          </button>
                        </div>
                        <textarea
                          value={candidateNotes}
                          onChange={(e) => setCandidateNotes(e.target.value)}
                          placeholder={scratchConfig.placeholder}
                          aria-label="Engineering notes"
                          className="ob-mo ob-scroll flex-1 w-full resize-none bg-transparent p-5 text-[12.5px] leading-relaxed outline-none ob-tx placeholder:text-[color:var(--ob-tx3)]"
                        />
                      </div>
                      {renderConversationPane({ composerOnly: true })}
                    </div>
                  );
                })()}
            </section>
          </div>
        );
      })()}


      {/* Confirmation Modal */}
      {confirmEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "color-mix(in srgb, var(--ob-bg) 78%, transparent)", backdropFilter: "blur(6px)" }} role="dialog" aria-modal="true" aria-labelledby="end-dialog-title">
          <div ref={endDlgRef} className="ob-app ob-pane max-w-md w-full p-7 flex flex-col gap-5" style={{ background: "var(--ob-bg2)" }}>
            <div>
              <h3 id="end-dialog-title" className="m-0 text-[17px] font-medium" style={{ letterSpacing: "-0.01em" }}>
                End this interview?
              </h3>
              <p className="text-[13px] ob-tx2 mt-2.5 mb-0 leading-relaxed">
                You have spoken for <span className="ob-mo ob-tx">{formatTime(elapsed)}</span> across{" "}
                <span className="ob-mo ob-tx">{conversationHistory.length}</span> turns. Ending scores your answers against the rubric and saves the session to your history.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" data-autofocus onClick={() => setConfirmEnd(false)} className="ob-btn flex-1">
                Keep going
              </button>
              <button type="button" onClick={handleEndAndExitSession} className="ob-btn ob-pr flex-1">
                End &amp; save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
