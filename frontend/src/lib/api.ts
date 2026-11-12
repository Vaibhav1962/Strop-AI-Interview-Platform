export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface AuthUser {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

function extractErrorMessage(data: unknown): string {
  const detail = (data as { detail?: unknown } | null)?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (item && typeof item === "object" && "msg" in item ? String((item as { msg: unknown }).msg) : null))
      .filter((msg): msg is string => Boolean(msg));
    if (messages.length > 0) return messages.join(" ");
  }

  return "Something went wrong. Please try again.";
}

async function request<T>(path: string, body: unknown, extraHeaders?: Record<string, string>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...extraHeaders },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Couldn't reach the server. Is the backend running?", 0);
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(extractErrorMessage(data), res.status);
  }

  return data as T;
}

export function signup(input: { full_name: string; email: string; password: string; confirm_password: string }) {
  return request<AuthResponse>("/auth/signup", input);
}

export function login(input: { email: string; password: string }) {
  return request<AuthResponse>("/auth/login", input);
}

const TOKEN_KEY = "interviewiq_token";
const USER_KEY = "interviewiq_user";

export function saveSession(auth: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, auth.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getCurrentUserId(): string | null {
  const user = getStoredUser();
  return user?.id ? String(user.id) : null;
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export interface TranscriptLine {
  speaker: "AI" | "You" | "Candidate" | "Alex";
  text: string;
  time: string;
}

export interface InterviewSession {
  id: string;
  title: string;
  track?: string | null;
  question_count: number;
  duration_seconds: number;
  transcript: TranscriptLine[];
  overall_score?: number | null;
  competency_level?: string | null;
  metrics?: Record<string, any> | null;
  strengths?: string[] | null;
  weaknesses?: string[] | null;
  report?: Record<string, any> | null;
  created_at: string;
}

export interface ScoreTrendItem {
  date: string;
  session_id: string;
  title: string;
  overall: number;
  technical?: number | null;
  behavioral?: number | null;
  communication?: number | null;
}

export interface SpeechAnalyticsSummary {
  wordsPerMinute: number | null;
  fillerWords?: { count: number; breakdown?: Record<string, number> } | null;
  pauseDuration?: Record<string, any> | null;
  totalCandidateSpeakingMinutes: number;
  insights: string[];
}

export interface AnalyticsSummaryResponse {
  total_sessions: number;
  evaluated_sessions: number;
  average_score: number | null;
  best_score: number | null;
  total_duration_minutes: number;
  score_trend: ScoreTrendItem[];
  speech_summary: SpeechAnalyticsSummary;
  common_strengths: string[];
  common_weaknesses: string[];
}

export interface UserProfileResponse {
  user_id: string;
  resume_data: Record<string, any> | null;
  target_role: string | null;
  target_company: string | null;
  jd_data: Record<string, any> | null;
  jd_matches: any[] | null;
  updated_at: string;
}

async function authedRequest<T>(path: string, options: { method: "GET" | "POST" | "DELETE"; body?: unknown }): Promise<T> {
  const token = getToken();
  if (!token) {
    throw new ApiError("You need to be signed in.", 401);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("Couldn't reach the server. Is the backend running?", 0);
  }

  if (res.status === 204) {
    return null as T;
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(extractErrorMessage(data), res.status);
  }

  return data as T;
}

export function saveInterviewSession(input: {
  title: string;
  track?: string;
  question_count: number;
  duration_seconds: number;
  transcript: TranscriptLine[];
  overall_score?: number;
  competency_level?: string;
  metrics?: Record<string, any>;
  strengths?: string[];
  weaknesses?: string[];
  report?: Record<string, any>;
}) {
  return authedRequest<InterviewSession>("/interviews", { method: "POST", body: input });
}

export function listInterviewSessions() {
  return authedRequest<InterviewSession[]>("/interviews", { method: "GET" });
}

export function getInterviewSession(id: string) {
  return authedRequest<InterviewSession>(`/interviews/${id}`, { method: "GET" });
}

export function deleteInterviewSession(id: string) {
  return authedRequest<void>(`/interviews/${id}`, { method: "DELETE" });
}

export function resetInterviewSessions() {
  return authedRequest<{ message: string }>("/interviews", { method: "DELETE" });
}

export function getInterviewAnalytics() {
  return authedRequest<AnalyticsSummaryResponse>("/interviews/analytics/summary", { method: "GET" });
}

export function getUserProfile() {
  return authedRequest<UserProfileResponse>("/interviews/profile", { method: "GET" });
}

export function saveUserProfile(payload: {
  resume_data?: Record<string, any> | null;
  target_role?: string | null;
  target_company?: string | null;
  jd_data?: Record<string, any> | null;
  jd_matches?: any[] | null;
}) {
  return authedRequest<UserProfileResponse>("/interviews/profile", { method: "POST", body: payload });
}

export interface AnalyzedResumeResponse {
  name: string;
  filename: string;
  summary: string;
  skills: string[];
  projects: { name: string; description: string }[];
  past_struggles: string[];
  interview_topics: string[];
}

export async function analyzeResume(file: File): Promise<AnalyzedResumeResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/interviews/analyze-resume`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    throw new ApiError("Failed to analyze resume", res.status);
  }

  return (await res.json()) as AnalyzedResumeResponse;
}
