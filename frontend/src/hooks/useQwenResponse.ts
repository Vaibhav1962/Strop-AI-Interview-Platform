import { useCallback, useState } from "react";
import type { DsaProblem } from "../lib/dsaProblemBank";

export interface ConversationTurn {
  speaker: "Alex" | "Candidate";
  text: string;
  time: string;
}

export type AgentPhase =
  | "intro_self"
  | "intro"
  | "dsa_problem_intro"
  | "dsa_cross_exam"
  | "dsa_ready_to_code"
  | "dsa_solution_reviewed"
  | "after_main_answer"
  | "after_followup_answer";

export interface AgentContext {
  topicsToExplore: string[];
  conversationHistory: ConversationTurn[];
  mainQuestionsAsked: number;
  totalMainQuestions: number;
  candidateName?: string;
  resumeSummary?: string;
  candidateSkills?: string[];
  projects?: { name: string; description: string }[];
  pastStruggles?: string[];
  currentDsaProblem?: DsaProblem;
  interviewType?: string;
}

/**
 * Legacy interface stub preserved for type compatibility.
 * All live interview reasoning is executed server-side via the Supervisor-Actor orchestrator.
 */
export function useQwenResponse() {
  const [loading, setLoading] = useState(false);

  const cancel = useCallback(() => {
    setLoading(false);
  }, []);

  const getAgentResponse = useCallback(
    async (_context: AgentContext, _phase: AgentPhase): Promise<string> => {
      console.warn("[useQwenResponse] Client-side LLM inference is disabled. Orchestrator handles all turns.");
      return "Let's proceed with the interview.";
    },
    [],
  );

  return { getAgentResponse, loading, cancel };
}
