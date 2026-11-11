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
import AudioVisualizer from "../components/AudioVisualizer";
import PresenceRing from "../components/PresenceRing";
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

  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [customElevenKey, setCustomElevenKey] = useState(
    () => (typeof window !== "undefined" && localStorage.getItem("iq_custom_elevenlabs_key")) || "",
  );
  const [customGeminiKey, setCustomGeminiKey] = useState(
    () => localStorage.getItem("iq_custom_gemini_key") || "",
  );
  const [allowBrowserVoice, setAllowBrowserVoice] = useState(
    () => localStorage.getItem("iq_allow_browser_voice") !== "false",
  );

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

        <main
          className="flex-1 grid place-items-center px-4 sm:px-8 py-8 sm:py-10"
          style={{
            backgroundImage:
              "radial-gradient(900px 480px at 80% -10%, rgb(var(--ob-ac-rgb)/0.075), transparent 62%), radial-gradient(720px 420px at 4% 108%, rgba(255,106,61,0.05), transparent 62%)",
          }}
        >
          <div className="w-full max-w-[1120px] grid gap-5 items-start grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            {/* ── Left: camera and pre-flight ── */}
            <section className="ob-pane p-3 ob-rise" style={{ ["--i" as string]: 0 }}>
              <div className="ob-cam" style={{ aspectRatio: "16 / 10" }}>
                {camOk ? (
                  <video ref={attachVideoNode} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" />
                ) : (
                  <div className="text-center ob-tx3 px-6">
                    <span className="w-16 h-16 rounded-full border grid place-items-center mx-auto mb-3 text-xl font-semibold ob-tx" style={{ borderColor: "var(--ob-ln2)", background: "var(--ob-bg3)" }}>
                      {initial}
                    </span>
                    <div className="ob-mo text-[11.5px]">{camMessage ? "Camera unavailable" : "Camera off"}</div>
                    {camMessage && <div className="text-[12px] mt-1.5" style={{ color: "var(--ob-wn)" }}>{camMessage}</div>}
                    {camMessage && (
                      <button type="button" onClick={retryMedia} className="ob-btn ob-sm mt-3">
                        Retry camera
                      </button>
                    )}
                  </div>
                )}
                <div className="ob-scan" aria-hidden="true" />
                <i className="ob-cb a" /><i className="ob-cb b" /><i className="ob-cb c" /><i className="ob-cb d" />

                {/* Overlays */}
                <span className="ob-chip absolute left-3.5 top-3.5" style={{ background: "color-mix(in srgb, var(--ob-bg) 60%, transparent)", backdropFilter: "blur(6px)" }}>
                  <span className="ob-rec" aria-hidden="true" />
                  Preview
                </span>
                <div
                  className="absolute left-3.5 right-3.5 bottom-3.5 flex items-end justify-between gap-3"
                  style={{ textShadow: "0 1px 8px rgb(var(--ob-sh)/0.8)" }}
                >
                  <span className="ob-mo text-[11.5px] ob-tx truncate">{userResume?.name || "You"}</span>
                  <div className="flex items-end gap-[3px] h-6 shrink-0" aria-hidden="true">
                    {Array.from({ length: 18 }).map((_, i) => {
                      const on = micOn && level * 18 > i;
                      return (
                        <i
                          key={i}
                          style={{
                            width: 3,
                            height: 7 + (i % 6) * 3,
                            borderRadius: 2,
                            background: on ? "var(--ob-ok)" : "rgb(var(--ob-ov)/0.22)",
                            transition: "background 90ms linear",
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Pre-flight checks */}
              <div className="px-2 pt-4 pb-1">
                <div className="flex items-baseline justify-between">
                  <span className="ob-lb">Pre-flight check</span>
                  <span className="ob-mo text-[11.5px] ob-tx3">{readyCount} of {checks.length} ready</span>
                </div>
                <ul className="list-none m-0 mt-2 p-0" aria-live="polite">
                  {checks.map((c, i) => (
                    <li key={c.key} className={`flex items-center gap-3 py-2.5 text-[13px] ${i > 0 ? "border-t ob-bd" : ""}`}>
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: dotColor[c.state], boxShadow: c.state === "ok" ? "0 0 0 3px rgba(111,214,164,0.14)" : "none", transition: `background-color .5s var(--ob-ease) ${i * 140}ms, box-shadow .5s var(--ob-ease) ${i * 140}ms` }}
                        aria-hidden="true"
                      />
                      <span className="w-[92px] shrink-0">{c.label}</span>
                      <span className="flex-1 min-w-0 truncate ob-tx3" style={c.state === "warn" ? { color: "var(--ob-wn)" } : undefined}>{c.detail}</span>
                      {c.action && (
                        <button type="button" onClick={c.action.onClick} className="ob-btn ob-sm" style={{ height: 28, padding: "0 11px" }}>
                          {c.action.label}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* ── Right: the brief and the join button ── */}
            <section className="grid gap-4">
              <div className="ob-pane p-6 ob-rise" style={{ ["--i" as string]: 1 }}>
                <div className="flex items-center gap-3.5">
                  <span
                    className="w-12 h-12 rounded-full border grid place-items-center text-[15px] font-semibold shrink-0"
                    style={{ borderColor: "var(--ob-ac3)", background: "var(--ob-bg3)", boxShadow: "0 0 0 5px var(--ob-ac2)" }}
                    aria-hidden="true"
                  >
                    A
                  </span>
                  <div className="min-w-0">
                    <div className="ob-lb">Interview with Alex</div>
                    <div className="text-[12.5px] ob-tx3 mt-0.5">Staff engineer · {trackInfo.badge}</div>
                  </div>
                </div>
                <h1 className="m-0 mt-5 text-[30px] sm:text-[34px] font-medium tracking-[-0.03em] leading-[1.1]">{trackInfo.title}</h1>
              </div>

              <div className="ob-pane p-6 ob-rise" style={{ ["--i" as string]: 2 }}>
                <span className="ob-lb">Length</span>
                <div className="grid grid-cols-4 gap-2 mt-3.5" role="radiogroup" aria-label="Interview length">
                  {[15, 30, 45, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={targetDurationMinutes === m}
                      onClick={() => setTargetDurationMinutes(m)}
                      className={`h-12 rounded-[10px] border text-[14px] cursor-pointer transition duration-300 ${
                        targetDurationMinutes === m
                          ? "bg-[rgb(var(--ob-ac-rgb)/0.08)] border-[rgb(var(--ob-ac-rgb)/0.5)] text-ob-tx"
                          : "border-ob-ln2 text-ob-tx2 hover:text-ob-tx hover:border-ob-ln3"
                      }`}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
              </div>

              <div className="ob-rise" style={{ ["--i" as string]: 3 }}>
                {needsResumeFirst ? (
                  <div className="rounded-xl border p-5 text-[13px]" style={{ borderColor: "rgba(232,189,111,.35)", background: "rgba(232,189,111,.06)", color: "var(--ob-wn)" }}>
                    This track questions you on your own projects, so it needs a resume first.
                    <button type="button" className="ob-btn ob-sm mt-3 block" onClick={() => leave("resume")}>Upload resume</button>
                  </div>
                ) : (
                  <>
                    <button type="button" onClick={handleJoinInterview} className={`ob-btn ob-pr ob-btn-lg w-full group ${readyCount === checks.length ? "ob-ready" : ""}`} style={{ height: 56, fontSize: 15 }}>
                      Join interview
                      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </button>
                    <div className="flex items-center justify-between gap-3 mt-3 px-1 ob-mo text-[11px] ob-tx3">
                      <span>The clock starts when you join</span>
                      <span className="flex items-center gap-1.5">press <kbd className="px-1.5 py-0.5 rounded border border-ob-ln2 text-[10.5px] ob-tx2">Enter</kbd></span>
                    </div>
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
      {/* Top bar: interviewer identity, live status, recording clock, end call */}
      <header className="flex items-center justify-between flex-wrap gap-x-6 gap-y-3 px-4 sm:px-8 py-3.5 border-b ob-bd shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="w-9 h-9 rounded-full border grid place-items-center text-xs font-semibold shrink-0"
            style={{ borderColor: "var(--ob-ln2)", background: "var(--ob-bg3)" }}
            aria-hidden="true"
          >
            A
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[13.5px]">
              <span>Alex</span>
              <span className="ob-chip">Staff interviewer</span>
            </div>
            <div className="ob-mo text-[11px] ob-tx3 truncate">
              {trackInfo.title} · {userResume.name}
            </div>
          </div>
        </div>

        {/* Errors only: who is talking now lives in the conversation pane, next to the words */}
        <div className="flex items-center justify-center flex-1 min-w-[220px] min-h-[38px]">
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {uiPhase === "completed" && <span className="ob-chip ob-live">Interview complete</span>}

            {inferenceError && (
              <span className="ob-chip ob-err" role="alert" style={{ height: "auto", minHeight: 24, whiteSpace: "normal", padding: "3px 10px" }}>
                {inferenceError}
                <button
                  type="button"
                  onClick={() => setInferenceError(null)}
                  className="underline font-semibold cursor-pointer"
                >
                  Dismiss
                </button>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {selectedTrack === "dsa" && (
            <span className={`ob-chip hidden sm:inline-flex ${dsaProblemUnlocked ? "ob-live" : "ob-warn"}`}>
              {dsaProblemUnlocked ? "Coding active" : "Briefing stage"}
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
            <span className="hidden sm:inline">{elapsed >= targetDurationMinutes * 60 ? "time up" : "rec"}</span>
            <span style={{ color: "color-mix(in srgb, var(--ob-hot) var(--warm), var(--ob-tx))", transition: "color 1s linear" }}>{formatTime(elapsed)}</span>
            <span className={elapsed >= targetDurationMinutes * 60 ? "hidden sm:inline" : "ob-tx3 hidden sm:inline"}>
              / {String(targetDurationMinutes).padStart(2, "0")}:00
            </span>
          </div>
          {elapsed >= targetDurationMinutes * 60 && uiPhase !== "completed" && (
            <span className="ob-chip ob-err hidden md:inline-flex" style={{ color: "var(--ob-hot)", borderColor: "rgba(255,106,61,.45)", background: "rgba(255,106,61,.08)" }} role="status">
              Over time. Finish your answer and Alex will wrap up
            </span>
          )}
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

      {/* Workspace Sub-renders for Modular, Persistent Layout */}
      {(() => {
        const renderFaceCamTile = ({ isCompact = false }: { isCompact?: boolean } = {}) => (
          <div className="ob-pane p-2.5 shrink-0">
            <div className="ob-cam" style={isCompact ? { height: 150 } : { aspectRatio: "4 / 3" }}>
              {cameraOn && hasVideoTrack ? (
                <video
                  ref={attachVideoNode}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="text-center ob-tx3">
                  <span
                    className="w-11 h-11 rounded-full border grid place-items-center mx-auto mb-1.5 text-sm font-semibold ob-tx"
                    style={{ borderColor: "var(--ob-ln2)", background: "var(--ob-bg3)" }}
                  >
                    {(userResume?.name || "Candidate").charAt(0).toUpperCase()}
                  </span>
                  <div className="ob-mo text-[11px]">{cameraError ? "Camera unavailable" : "Camera off"}</div>
                </div>
              )}
              <div className="ob-scan" aria-hidden="true" />
              <i className="ob-cb a" /><i className="ob-cb b" /><i className="ob-cb c" /><i className="ob-cb d" />
              <span className="ob-mo absolute left-3 bottom-8 text-[10.5px] ob-tx2 truncate max-w-[70%]" style={{ textShadow: "0 1px 6px #000" }}>
                {userResume?.name || "You"}
              </span>
              <span className="ob-mo absolute right-3 top-7 text-[10.5px] flex items-center gap-1.5" style={{ color: "var(--ob-hot)" }}>
                <span className="ob-rec" aria-hidden="true" />
                LIVE
              </span>
            </div>

            <div className="flex items-center justify-center gap-3.5 pt-4 pb-2">
              <button
                type="button"
                onClick={toggleMic}
                className={`ob-cbtn ${micOn ? "" : "ob-off"}`}
                aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
                aria-pressed={!micOn}
              >
                <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                  <path d={micOn
                    ? "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3"
                    : "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3M4 4l16 16"} />
                </svg>
              </button>
              <button
                type="button"
                onClick={toggleCamera}
                className={`ob-cbtn ${cameraOn ? "" : "ob-off"}`}
                aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
                aria-pressed={!cameraOn}
              >
                <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={cameraOn ? "M3 7h12v10H3zM15 11l6-3v8l-6-3" : "M3 7h12v10H3zM15 11l6-3v8l-6-3M4 4l16 16"} />
                </svg>
              </button>
            </div>
            <div className="ob-mo flex items-center justify-between px-2 pb-1.5 text-[11px] ob-tx3">
              <span>{micOn ? "Microphone on" : "Microphone muted"}</span>
              <span className={`ob-lv ${micOn && micVolume > 0.03 ? "" : "ob-mute"}`} aria-hidden="true">
                <i /><i /><i /><i /><i />
              </span>
            </div>
          </div>
        );

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
          const wordsCaptured = candidateCurrentText.trim() ? candidateCurrentText.trim().split(/\s+/).length : 0;

          const composer = (
              <div className="ob-composer px-5 py-3.5 flex flex-col gap-3 shrink-0" style={{ background: "var(--ob-bg)" }}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <span className="ob-lb">
                      {stage === "self_intro"
                        ? "Your introduction"
                        : selectedTrack === "dsa"
                        ? "Algorithmic discussion"
                        : `Question ${Math.min(mainQuestionsAsked + 1, interviewTopics.length)}`}
                    </span>
                    {isFollowUp && <span className="ob-chip ob-warn">Deep dive</span>}
                  </div>
                  {uiPhase === "alex_speaking" && (
                    <button type="button" onClick={handleSkipAlexSpeech} className="ob-btn ob-sm">
                      Skip to answer
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                  <div className="flex-1 min-w-0 text-[13.5px]">
                    {isEditingInput ? (
                      <input
                        type="text"
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
                        className="ob-input"
                      />
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

          if (composerOnly) return <div className="ob-pane shrink-0 overflow-hidden">{composer}</div>;

          return (
            <div className="ob-pane flex-1 flex flex-col overflow-hidden min-h-[360px]">
              {/* Who is talking */}
              <div className="flex items-center gap-3.5 px-5 py-3.5 border-b ob-bd shrink-0">
                <PresenceRing getLevel={getAudioLevel} active={alexIsTalking && speaking}>A</PresenceRing>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] leading-tight">
                    Alex <span className="ob-tx3">· interviewer</span>
                  </div>
                  <div key={uiPhase} className="anim-fade-in ob-mo text-[11.5px] ob-tx3 truncate mt-0.5" role="status">
                    {stateLabel}
                  </div>
                </div>
                <div className="shrink-0 flex items-center justify-end min-w-[110px]">
                  {/* While Alex speaks, the halo around his avatar carries the level; the bars are the candidate's mic. */}
                  {uiPhase === "candidate_turn" ? (
                    <AudioVisualizer level={micVolume} getLevel={getLiveMicLevel} active={micOn && micVolume > 0.03} source="candidate" bars={20} height={30} />
                  ) : uiPhase === "thinking" ? (
                    <span className="w-3.5 h-3.5 border-[1.5px] border-ob-ln2 border-t-ob-ac rounded-full animate-spin" aria-hidden="true" />
                  ) : null}
                </div>
              </div>

              {/* Transcript */}
              <div
                onScroll={(e) => {
                  const el = e.currentTarget;
                  isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
                }}
                className="ob-scroll flex-1 overflow-y-auto px-5 sm:px-[22px] pt-1.5 pb-3.5"
                aria-live="polite"
              >
                {rows.length === 0 && (
                  <div className="py-10 text-center text-[13px] ob-tx3">
                    Your conversation with Alex will appear here as you talk.
                  </div>
                )}

                {rows.map((turn, idx) => {
                  const isAlex = turn.speaker === "Alex";
                  const active = idx === activeIdx;
                  return (
                    <div key={idx} className="ob-tn" style={{ opacity: active ? 1 : 0.62, transition: "opacity .6s var(--ob-ease)" }}>
                      <div className="ob-who" style={isAlex ? undefined : { color: "var(--ob-ac)" }}>
                        <div className="inline-flex items-center gap-1.5">
                          {isAlex ? "Alex" : "You"}
                          {active && isAlex && alexIsTalking && <i className="ob-rec" aria-hidden="true" style={{ width: 6, height: 6 }} />}
                        </div>
                        <span>{turn.time}</span>
                      </div>
                      <p
                        className="m-0 whitespace-pre-wrap break-words"
                        style={{
                          fontSize,
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
                  <div className="ob-tn">
                    <div className="ob-who">
                      Alex<span>thinking</span>
                    </div>
                    <p className="m-0 ob-tx3" style={{ fontSize, lineHeight: 1.6 }}>
                      {thinkingStatusText}
                      <span className="ob-cur" aria-hidden="true" style={{ marginLeft: 4 }} />
                    </p>
                  </div>
                )}

                <div ref={transcriptBottomRef} />
              </div>

              <div className="border-t ob-bd">{composer}</div>
            </div>
          );
        };

        const renderSkillsPane = (fallback: string[], max: number) => (
          <div className="mt-4 pt-4 border-t ob-bd">
            <div className="flex items-center justify-between mb-2.5">
              <span className="ob-lb">Verified tech profile</span>
              <span className="ob-mo text-[10.5px]" style={{ color: "var(--ob-ok)" }}>grounded</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {((userResume?.skills && userResume.skills.length > 0) ? userResume.skills : fallback)
                .slice(0, max)
                .map((sk) => (
                  <span key={sk} className="ob-chip">{sk}</span>
                ))}
            </div>
          </div>
        );

        if (selectedTrack === "dsa") {
          if (!dsaProblemUnlocked) {
            // State A: DSA track before problem is revealed
            return (
              <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden p-4 sm:p-6 gap-4">
                <aside className="w-full lg:w-[300px] shrink-0 flex flex-col gap-3.5 lg:overflow-y-auto ob-scroll">
                  {renderFaceCamTile({ isCompact: false })}
                  <div className="ob-pane p-[18px]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="ob-lb">Interview protocol</span>
                      <span className="ob-mo text-[10.5px] ob-txa text-right">{trackInfo.badge}</span>
                    </div>
                    <ol className="list-none m-0 mt-3 p-0 flex flex-col gap-1.5 text-[13px] ob-tx2">
                      <li className="ob-step ob-now"><span className="ob-dot">1</span>Walk Alex through your background and approach</li>
                      <li className="ob-step"><span className="ob-dot">2</span>Discuss constraints, edge cases and complexity</li>
                      <li className="ob-step"><span className="ob-dot">3</span>Move to code once you and Alex agree</li>
                    </ol>
                    <p className="text-[12px] ob-tx3 mt-3 mb-0">
                      The coding workspace unlocks automatically once your approach is clear. Runs on Judge0; graded on BARS evidence.
                    </p>
                    {renderSkillsPane(["Algorithms", "Data Structures", "Time Complexity", "Space Complexity"], 5)}
                  </div>
                </aside>

                <section className="flex-1 min-w-0 flex flex-col gap-3.5 lg:overflow-hidden min-h-[480px]">
                  <div className="flex items-center justify-between gap-3 px-1">
                    <span className="text-[13.5px]">
                      DSA &amp; problem solving <span className="ob-tx3">· algorithmic calibration</span>
                    </span>
                    <span className="ob-chip ob-warn">Problem briefing pending</span>
                  </div>
                  {renderConversationPane({ isPrimary: true })}
                </section>
              </div>
            );
          }

          // State B: DSA track after problem is revealed
          return (
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden p-4 sm:p-6 gap-4">
              <div className="w-full lg:w-[69%] flex flex-col min-h-[520px] lg:h-full overflow-hidden ob-pane">
                <DsaCodingWorkspace
                  problem={dsaProblem}
                  onSolutionSubmitted={handleDsaCodeSubmitted}
                  className="w-full h-full"
                />
              </div>
              <div className="w-full lg:w-[31%] flex flex-col lg:h-full overflow-hidden gap-3.5 min-h-[480px]">
                {renderFaceCamTile({ isCompact: true })}
                {renderConversationPane({ isPrimary: false })}
              </div>
            </div>
          );
        }

        // State C: non-coding tracks (System Design, Core CS, Behavioral, Resume Technical)
        return (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden p-4 sm:p-6 gap-4">
            {/* Left: camera, controls and the track agenda */}
            <aside className="w-full lg:w-[300px] shrink-0 flex flex-col gap-3.5 lg:overflow-y-auto ob-scroll">
              {renderFaceCamTile({ isCompact: false })}

              <div className="ob-pane p-[18px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="ob-lb">Track milestones</span>
                  <span className="ob-mo text-[10.5px] ob-txa text-right">{trackInfo.badge}</span>
                </div>
                <ol className="list-none m-0 mt-3 p-0 flex flex-col gap-1">
                  {getTrackAgenda(selectedTrack).map((topic, tidx) => {
                    const isCurrent = tidx === mainQuestionsAsked;
                    const isDone = tidx < mainQuestionsAsked;
                    return (
                      <li key={tidx} className={`ob-step ${isCurrent ? "ob-now" : isDone ? "ob-done" : ""}`} aria-current={isCurrent ? "step" : undefined}>
                        <span className="ob-dot">{isDone ? "✓" : tidx + 1}</span>
                        <span className="truncate flex-1">{topic}</span>
                      </li>
                    );
                  })}
                </ol>
                {renderSkillsPane(["Algorithms", "Distributed Systems", "Database Design", "System Reliability"], 6)}
              </div>
            </aside>

            {/* Right: dialogue + notes workspace */}
            <section className="flex-1 min-w-0 flex flex-col gap-3.5 lg:overflow-hidden min-h-[480px]">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2" role="tablist" aria-label="Workspace">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={workspaceTab === "briefing"}
                    onClick={() => setWorkspaceTab("briefing")}
                    className={`ob-chip cursor-pointer ${workspaceTab === "briefing" ? "ob-live" : ""}`}
                    style={{ height: 30, padding: "0 14px" }}
                  >
                    Live dialogue
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={workspaceTab === "scratchpad"}
                    onClick={() => setWorkspaceTab("scratchpad")}
                    className={`ob-chip cursor-pointer ${workspaceTab === "scratchpad" ? "ob-live" : ""}`}
                    style={{ height: 30, padding: "0 14px" }}
                  >
                    Notes &amp; scratchpad
                  </button>
                </div>
                <span className="ob-mo text-[11.5px] ob-tx3">{trackInfo.title}</span>
              </div>

              {workspaceTab === "briefing" ? (
                <div className="flex-1 flex flex-col gap-3.5 overflow-hidden min-h-0">
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
          <div className="ob-app ob-pane max-w-md w-full p-7 flex flex-col gap-5" style={{ background: "var(--ob-bg2)" }}>
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
              <button type="button" onClick={() => setConfirmEnd(false)} className="ob-btn flex-1">
                Keep going
              </button>
              <button type="button" onClick={handleEndAndExitSession} className="ob-btn ob-pr flex-1">
                End &amp; save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice & API Key Configuration Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-ob-bg2 border border-ob-ov/10 rounded-2xl w-full max-w-md p-6 shadow-2xl shadow-black/30 relative">
            <button
              onClick={() => setShowApiKeyModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-ob-tx text-xs px-2 py-1 rounded-lg border border-ob-ov/10 hover:bg-ob-ov/5 transition-colors cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
                AI
              </div>
              <div>
                <h3 className="text-base font-semibold text-ob-tx">Neural Voice & API Key Settings</h3>
                <p className="text-xs text-zinc-400">Configure your TTS voice provider</p>
              </div>
            </div>

            {/* Quota Diagnostics Warning */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 mb-4 text-xs text-amber-300 flex flex-col gap-1.5">
              <div className="font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Current Voice Status
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                ElevenLabs: <strong>0 credits remaining (401 Quota Exceeded)</strong>.<br />
                Google Gemini TTS: <strong>10 requests/day limit reached (Free Tier 429)</strong>.
              </p>
            </div>

            <div className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  ElevenLabs API Key (Brian HD Voice)
                </label>
                <input
                  type="password"
                  value={customElevenKey}
                  onChange={(e) => setCustomElevenKey(e.target.value)}
                  placeholder="sk_..."
                  className="w-full bg-ob-bg border border-ob-ov/10 rounded-xl px-3.5 py-2 text-xs text-ob-tx placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Google Gemini API Key (Charon Voice / Billed Project)
                </label>
                <input
                  type="password"
                  value={customGeminiKey}
                  onChange={(e) => setCustomGeminiKey(e.target.value)}
                  placeholder="AIzaSy... or AQ..."
                  className="w-full bg-ob-bg border border-ob-ov/10 rounded-xl px-3.5 py-2 text-xs text-ob-tx placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Emergency Browser Natural Voice Option */}
              <div className="pt-2 border-t border-ob-ov/5 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="browser_voice_toggle"
                  checked={allowBrowserVoice}
                  onChange={(e) => setAllowBrowserVoice(e.target.checked)}
                  className="mt-0.5 rounded border-ob-ov/20 text-indigo-600 focus:ring-indigo-500 bg-ob-bg cursor-pointer"
                />
                <label htmlFor="browser_voice_toggle" className="text-xs text-zinc-300 cursor-pointer leading-tight">
                  <span className="font-semibold text-ob-tx">Emergency Browser Voice Fallback</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    If cloud quotas are exhausted, speak aloud using your browser's online natural voice rather than staying silent.
                  </p>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-ob-ov/10">
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="px-3.5 py-2 text-xs text-zinc-400 hover:text-ob-tx rounded-lg hover:bg-ob-ov/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (customElevenKey.trim()) {
                    localStorage.setItem("iq_custom_elevenlabs_key", customElevenKey.trim());
                  } else {
                    localStorage.removeItem("iq_custom_elevenlabs_key");
                  }
                  if (customGeminiKey.trim()) {
                    localStorage.setItem("iq_custom_gemini_key", customGeminiKey.trim());
                  } else {
                    localStorage.removeItem("iq_custom_gemini_key");
                  }
                  localStorage.setItem("iq_allow_browser_voice", allowBrowserVoice ? "true" : "false");
                  setShowApiKeyModal(false);
                }}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-ob-onac rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
