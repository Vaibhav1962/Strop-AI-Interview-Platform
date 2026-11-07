import { useSyncExternalStore } from "react";
import { getInterviewMode, subscribeInterviewMode, type InterviewMode } from "../lib/sessionConfig";

/** Reactive read of the current interview mode — re-renders live as InterviewSetup's mode picker changes it, so shared chrome (like AppBackground) can react before the user even commits to "Begin Interview". */
export function useInterviewMode(): InterviewMode {
  return useSyncExternalStore(subscribeInterviewMode, getInterviewMode);
}
