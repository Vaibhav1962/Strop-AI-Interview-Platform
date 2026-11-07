export type InterviewMode = "standard" | "strict";

let currentMode: InterviewMode = "standard";
const listeners = new Set<() => void>();

/** Hands the chosen interview mode off from InterviewSetup to VoiceInterview — both are plain pages swapped by App's `page` state, with no router/params to carry it otherwise. Also drives the shared AppBackground's live accent while the user is still picking a mode. */
export function setInterviewMode(mode: InterviewMode) {
  if (mode === currentMode) return;
  currentMode = mode;
  listeners.forEach((l) => l());
}

export function getInterviewMode(): InterviewMode {
  return currentMode;
}

export function subscribeInterviewMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
