/**
 * Orchestrator Client for Strop.
 *
 * Connects the frontend to the Stage 0.1-0.4 Supervisor-Actor engine:
 * - Session initialization: POST /api/v1/orchestrator/session
 * - Session retrieval:      GET  /api/v1/orchestrator/session/{id}
 * - Streaming turn loop:    POST /api/v1/orchestrator/session/{id}/turn/stream (SSE via fetch)
 * - Evaluation trigger:     POST /api/v1/orchestrator/session/{id}/evaluate
 */

import { getToken, ApiError } from "./api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export interface OrchestratorSessionResponse {
  id: string;
  user_id: string;
  title: string;
  track: string;
  status: string;
  evaluation_status?: "idle" | "processing" | "completed" | "failed";
  evaluation_error?: string | null;
  turn_index: number;
  fencing_token: number;
  in_flight_turn_id?: string | null;
  in_flight_expires_at?: string | null;
  working_memory: {
    current_milestone?: string;
    milestone_history?: string[];
    architectural_facts?: string[];
    confirmed_vulnerabilities?: string[];
    deliberation_seconds_spent?: number;
    stagnation_turn_count?: number;
    [key: string]: any;
  };
  transcript: Array<{
    speaker: "Alex" | "Candidate";
    text: string;
    turn_index?: number;
    time?: string;
    delta_metadata?: Record<string, any>;
  }>;
  target_duration_seconds?: number;
  scheduled_deadline?: string;
  remaining_seconds?: number;
  created_at: string;
  updated_at: string;
}

export interface CommittedTurnResult {
  session_id: string;
  /** Authoritative supervisor action for this turn (e.g. "CONCLUDE"); delta_metadata.socratic_directive is LLM free text. */
  directive_action?: string;
  turn_index: number;
  fencing_token: number;
  assistant_response: string;
  delta_metadata: {
    technical_claims?: string[];
    identified_vulnerabilities?: string[];
    progress_classification?: string;
    socratic_directive?: string;
    observed_competencies?: string[];
    [key: string]: any;
  };
  is_cached_replay?: boolean;
  dsa_problem_revealed?: boolean;
  dsa_problem?: {
    id: string;
    title: string;
    revealed?: boolean;
    revealed_at_turn?: number;
  };
  working_memory?: Record<string, any>;
  status?: string;
  scheduled_deadline?: string;
  remaining_seconds?: number;
}

// ==============================================================================
// Stage 0.4 BARS Evaluation Schema & Types
// ==============================================================================

export type EvidenceClassification =
  | "Demonstrated competence"
  | "Weak evidence"
  | "Insufficient coverage"
  | "Contradictory evidence";

export type CalibrationSignal =
  | "Strong Evidence in Covered Areas"
  | "Solid Evidence with Specific Gaps"
  | "Mixed Evidence with Critical Concerns"
  | "Inconclusive Due to Limited Coverage"
  | "Developing / Requires Fundamental Strengthening";

export interface EvidenceQuote {
  turn_index: number;
  speaker: string;
  quote: string;
  relevance: string;
}

export interface CompetencyEvaluation {
  competency_id: string;
  competency_name: string;
  evidence_classification: EvidenceClassification;
  bars_level: number | null;
  bars_anchor: string;
  behavioral_observation: string;
  evidence_quotes: EvidenceQuote[];
  strengths: string[];
  gaps_or_limitations: string[];
}

export interface InterviewCoverageSummary {
  total_competencies: number;
  demonstrated_count: number;
  weak_count: number;
  insufficient_coverage_count: number;
  contradictory_count: number;
  coverage_percentage: number;
  coverage_assessment: string;
}

export interface CommunicationDimension {
  dimension_id: string;
  name: string;
  rating: string;
  observation: string;
  evidence_quote?: string | null;
}

export interface SpeechTelemetry {
  total_words: number;
  candidate_speaking_minutes: number;
  estimated_wpm: number;
  filler_word_count: number;
  filler_words_breakdown?: Record<string, number>;
}

export interface CommunicationScorecard {
  overall_rating: string;
  telemetry: SpeechTelemetry;
  dimensions: CommunicationDimension[];
}

export interface BarsEvaluationReport {
  session_id: string;
  track: string;
  title: string;
  calibration_signal: CalibrationSignal;
  overall_hiring_recommendation: string;
  coverage_summary: InterviewCoverageSummary;
  executive_summary: string;
  competency_evaluations: CompetencyEvaluation[];
  key_technical_strengths: string[];
  key_technical_weaknesses: string[];
  unresolved_architectural_areas: string[];
  communication_and_deliberation: string;
  communication_scorecard?: CommunicationScorecard | null;
  actionable_growth_plan: string[];
  evaluation_limitations: string[];
  /** True when the session was too short to assess; the report then carries no ratings. */
  insufficient_data?: boolean;
  insufficient_reason?: string | null;
  evaluated_at: string;
}

export function isBarsReport(report: any): report is BarsEvaluationReport {
  return Boolean(
    report &&
    (report.calibration_signal || report.competency_evaluations || report.coverage_summary)
  );
}

export interface StreamTurnCallbacks {
  onToken?: (token: string) => void;
  onTtft?: (ttftMs: number) => void;
  onSentence?: (sentence: string) => void;
  onCommitted?: (result: CommittedTurnResult) => void;
  onError?: (err: Error) => void;
}

/**
 * Creates a new orchestrator interview session.
 */
export async function createOrchestratorSession(
  track: string = "System Design",
  title: string = "Technical Interview",
  problemId?: string,
  targetDurationSeconds: number = 1800
): Promise<OrchestratorSessionResponse> {
  const token = getToken();
  if (!token) {
    throw new ApiError("Authentication required to start an interview session.", 401);
  }

  const res = await fetch(`${API_BASE_URL}/orchestrator/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      track,
      title,
      problem_id: problemId,
      target_duration_seconds: targetDurationSeconds,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = data?.detail || `Failed to create session (${res.status})`;
    throw new ApiError(msg, res.status);
  }

  return (await res.json()) as OrchestratorSessionResponse;
}

/**
 * Retrieves the current state of an orchestrator session.
 */
export async function getOrchestratorSession(
  sessionId: string
): Promise<OrchestratorSessionResponse> {
  const token = getToken();
  if (!token) {
    throw new ApiError("Authentication required.", 401);
  }

  const res = await fetch(`${API_BASE_URL}/orchestrator/session/${sessionId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = data?.detail || `Failed to get session (${res.status})`;
    throw new ApiError(msg, res.status);
  }

  return (await res.json()) as OrchestratorSessionResponse;
}

/**
 * Streams an interview turn using fetch and ReadableStream over SSE.
 *
 * Parses line-delimited events:
 * - ttft:      Time-to-first-token in milliseconds
 * - token:     Clean incremental dialogue token
 * - committed: Turn finalized and persisted in PostgreSQL
 * - final:     Cached replay or final model output
 */
export async function streamOrchestratorTurn(
  sessionId: string,
  turnIndex: number,
  candidateText: string,
  callbacks: StreamTurnCallbacks,
  signal?: AbortSignal
): Promise<CommittedTurnResult> {
  const token = getToken();
  if (!token) {
    throw new ApiError("Authentication required.", 401);
  }

  const clientTurnId = crypto.randomUUID();

  const res = await fetch(`${API_BASE_URL}/orchestrator/session/${sessionId}/turn/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      client_turn_id: clientTurnId,
      expected_turn_index: turnIndex,
      candidate_text: candidateText,
    }),
    signal,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = data?.detail || `Inference error: HTTP ${res.status}`;
    const err = new ApiError(msg, res.status);
    callbacks.onError?.(err);
    throw err;
  }

  if (!res.body) {
    const err = new ApiError("Streaming response body is unavailable.", 500);
    callbacks.onError?.(err);
    throw err;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let accumulatedDialogue = "";
  let committedResult: CommittedTurnResult | null = null;
  let sentenceBuffer = "";

  const checkSentenceBoundaries = (newText: string) => {
    sentenceBuffer += newText;
    // Punctuation followed by space or newline or end of sentence:
    const sentenceRegex = /([^.?!]+[.?!]+(?:\s+|\n+|$))/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = sentenceRegex.exec(sentenceBuffer)) !== null) {
      const sentence = match[1].trim();
      if (sentence) {
        callbacks.onSentence?.(sentence);
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex > 0) {
      sentenceBuffer = sentenceBuffer.slice(lastIndex);
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by double newline
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const payloadStr = trimmed.slice(6).trim();
        if (!payloadStr || payloadStr === "[DONE]") continue;

        try {
          const event = JSON.parse(payloadStr);

          if (event.type === "ttft") {
            callbacks.onTtft?.(event.ttft_ms);
          } else if (event.type === "token") {
            const tok = event.token || "";
            accumulatedDialogue += tok;
            callbacks.onToken?.(tok);
            checkSentenceBoundaries(tok);
          } else if (event.type === "error") {
            const errMsg = event.message || "Interviewer response generation error.";
            const err = new ApiError(errMsg, 500);
            (err as any).errorType = event.error_type;
            (err as any).partialResponse = event.partial_response || accumulatedDialogue;
            callbacks.onError?.(err);
            throw err;
          } else if (event.type === "committed") {
            committedResult = {
              session_id: sessionId,
              turn_index: event.turn_index,
              fencing_token: event.fencing_token,
              assistant_response: event.assistant_response || accumulatedDialogue,
              delta_metadata: event.delta_metadata || {},
              directive_action: event.directive_action,
              is_cached_replay: false,
              dsa_problem_revealed: event.dsa_problem_revealed,
              dsa_problem: event.dsa_problem,
              working_memory: event.working_memory,
              status: event.status,
              scheduled_deadline: event.scheduled_deadline,
              remaining_seconds: event.remaining_seconds,
            };
          } else if (event.type === "final" && event.is_cached_replay) {
            committedResult = {
              session_id: sessionId,
              turn_index: turnIndex,
              fencing_token: 0,
              assistant_response: event.assistant_response,
              delta_metadata: {},
              is_cached_replay: true,
            };
            accumulatedDialogue = event.assistant_response;
            callbacks.onToken?.(event.assistant_response);
            checkSentenceBoundaries(event.assistant_response);
          }
        } catch (parseErr) {
          console.warn("[orchestratorClient] Failed to parse SSE event chunk:", payloadStr, parseErr);
        }
      }
    }

    // Flush any remaining trailing sentence
    if (sentenceBuffer.trim()) {
      callbacks.onSentence?.(sentenceBuffer.trim());
      sentenceBuffer = "";
    }

    if (!committedResult) {
      // The stream closed without a `committed` frame (server reload, dropped connection, proxy timeout).
      // Never guess the next turn index: the server is the source of truth, and guessing desyncs the client
      // ("Turn index mismatch: expected N, got N+1"). Ask the server whether the turn was actually saved.
      let serverSession: OrchestratorSessionResponse | null = null;
      try {
        serverSession = await getOrchestratorSession(sessionId);
      } catch {
        serverSession = null;
      }
      if (serverSession && serverSession.turn_index > turnIndex) {
        const savedReply = (serverSession.transcript || []).find(
          (t) => t.turn_index === turnIndex && t.speaker === "Alex"
        );
        committedResult = {
          session_id: sessionId,
          turn_index: serverSession.turn_index,
          fencing_token: 0,
          assistant_response: savedReply?.text || accumulatedDialogue,
          delta_metadata: savedReply?.delta_metadata || {},
          working_memory: serverSession.working_memory,
          status: serverSession.status,
        };
      } else {
        const err = new ApiError(
          "The connection to the interviewer was interrupted before your answer was saved. Please send it again.",
          503
        );
        (err as any).partialResponse = accumulatedDialogue;
        throw err;
      }
    }

    callbacks.onCommitted?.(committedResult);
    return committedResult;

  } catch (err: any) {
    if (err.name === "AbortError") {
      console.log("[orchestratorClient] Turn stream aborted by client.");
    } else {
      if (!err.partialResponse && accumulatedDialogue) {
        err.partialResponse = accumulatedDialogue;
      }
      callbacks.onError?.(err);
    }
    throw err;
  } finally {
    reader.releaseLock();
  }
}

/**
 * Triggers post-interview evidence-based BARS evaluation on the completed session.
 * Idempotent: If an evaluation already exists and forceRecompute is false, returns cached evaluation.
 */
export async function evaluateOrchestratorSession(
  sessionId: string,
  forceRecompute: boolean = false
): Promise<BarsEvaluationReport> {
  const token = getToken();
  if (!token) {
    throw new ApiError("Authentication required to evaluate interview session.", 401);
  }

  const url = `${API_BASE_URL}/orchestrator/session/${sessionId}/evaluate${
    forceRecompute ? "?force_recompute=true" : ""
  }`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = data?.detail || `Failed to evaluate session (${res.status})`;
    throw new ApiError(msg, res.status);
  }

  return (await res.json()) as BarsEvaluationReport;
}

/**
 * Retrieves the previously generated BARS evaluation report for an orchestrator session.
 */
export async function getOrchestratorEvaluation(
  sessionId: string
): Promise<BarsEvaluationReport> {
  const token = getToken();
  if (!token) {
    throw new ApiError("Authentication required to retrieve interview evaluation.", 401);
  }

  const res = await fetch(`${API_BASE_URL}/orchestrator/session/${sessionId}/evaluation`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = data?.detail || `Failed to fetch session evaluation (${res.status})`;
    throw new ApiError(msg, res.status);
  }

  return (await res.json()) as BarsEvaluationReport;
}

export interface EvaluationStatusResponse {
  session_id: string;
  status: string;
  evaluation_status: "idle" | "processing" | "completed" | "failed";
  evaluation_error?: string | null;
  has_report: boolean;
}

/**
 * Initiates asynchronous qualitative BARS evaluation in a background worker.
 */
export async function evaluateOrchestratorSessionAsync(
  sessionId: string,
  forceRecompute: boolean = false
): Promise<EvaluationStatusResponse> {
  const token = getToken();
  if (!token) {
    throw new ApiError("Authentication required to evaluate interview session.", 401);
  }

  const res = await fetch(
    `${API_BASE_URL}/orchestrator/session/${sessionId}/evaluate-async?force_recompute=${forceRecompute}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = data?.detail || `Failed to initiate evaluation (${res.status})`;
    throw new ApiError(msg, res.status);
  }

  return (await res.json()) as EvaluationStatusResponse;
}

/**
 * Retrieves interview execution and evaluation background processing status.
 */
export async function getOrchestratorSessionStatus(
  sessionId: string
): Promise<EvaluationStatusResponse> {
  const token = getToken();
  if (!token) {
    throw new ApiError("Authentication required.", 401);
  }

  const res = await fetch(`${API_BASE_URL}/orchestrator/session/${sessionId}/status`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = data?.detail || `Failed to get session status (${res.status})`;
    throw new ApiError(msg, res.status);
  }

  return (await res.json()) as EvaluationStatusResponse;
}

/**
 * Initiates direct browser download of the post-interview BARS PDF report.
 * Completely eliminates window.print() and print dialogs.
 */
export async function downloadOrchestratorSessionPdf(
  sessionId: string,
  suggestedFilename?: string
): Promise<void> {
  const token = getToken();
  if (!token) {
    throw new ApiError("Authentication required to download PDF report.", 401);
  }

  const res = await fetch(`${API_BASE_URL}/orchestrator/session/${sessionId}/pdf`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = data?.detail || `Failed to download PDF report (${res.status})`;
    throw new ApiError(msg, res.status);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = suggestedFilename || `Strop-Report-${sessionId.slice(0, 8)}.pdf`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}


/**
 * Lists all orchestrator interview sessions for the current user.
 */
export async function listOrchestratorSessions(): Promise<OrchestratorSessionResponse[]> {
  const token = getToken();
  if (!token) {
    throw new ApiError("Authentication required to list interview sessions.", 401);
  }

  const res = await fetch(`${API_BASE_URL}/orchestrator/sessions`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = data?.detail || `Failed to list orchestrator sessions (${res.status})`;
    throw new ApiError(msg, res.status);
  }

  return (await res.json()) as OrchestratorSessionResponse[];
}

/**
 * Deletes an orchestrator session and its synchronized legacy record.
 */
export async function deleteOrchestratorSession(sessionId: string): Promise<void> {
  const token = getToken();
  if (!token) {
    throw new ApiError("Authentication required.", 401);
  }

  const res = await fetch(`${API_BASE_URL}/orchestrator/session/${sessionId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok && res.status !== 404) {
    const data = await res.json().catch(() => null);
    const msg = data?.detail || `Failed to delete session (${res.status})`;
    throw new ApiError(msg, res.status);
  }
}

/**
 * Resets all interview sessions for the current user.
 */
export async function resetOrchestratorSessions(): Promise<{ message: string }> {
  const token = getToken();
  if (!token) {
    throw new ApiError("Authentication required.", 401);
  }

  const res = await fetch(`${API_BASE_URL}/orchestrator/sessions`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = data?.detail || `Failed to reset sessions (${res.status})`;
    throw new ApiError(msg, res.status);
  }

  return (await res.json()) as { message: string };
}

/**
 * Submits candidate code to orchestrator session for server-side evaluation & review.
 */
export async function submitDsaCode(
  sessionId: string,
  payload: {
    code: string;
    language: string;
    expected_turn_index: number;
    client_turn_id: string;
    test_summary?: string;
  }
): Promise<CommittedTurnResult> {
  const token = getToken();
  if (!token) {
    throw new ApiError("Authentication required.", 401);
  }

  const res = await fetch(`${API_BASE_URL}/orchestrator/session/${sessionId}/submit-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = data?.detail || `Failed to submit code (${res.status})`;
    throw new ApiError(msg, res.status);
  }

  return (await res.json()) as CommittedTurnResult;
}

/**
 * Synchronizes candidate scratchpad notes to backend working memory.
 */
export async function syncScratchpadNotes(
  sessionId: string,
  notes: string
): Promise<{ status: string; notes_length: number }> {
  const token = getToken();
  if (!token) {
    throw new ApiError("Authentication required.", 401);
  }

  const res = await fetch(`${API_BASE_URL}/orchestrator/session/${sessionId}/scratchpad`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ notes }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = data?.detail || `Failed to sync scratchpad (${res.status})`;
    throw new ApiError(msg, res.status);
  }

  return (await res.json()) as { status: string; notes_length: number };
}

