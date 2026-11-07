import { mergeJdMatchReports, getDeletedJdMatchIds } from "./jdMatcher";
import { getStoredUser, getCurrentUserId, saveUserProfile, getUserProfile, type UserProfileResponse } from "./api";

export interface SkillCategories {
  languages: string[];
  frameworks: string[];
  cloudDevops: string[];
  databases: string[];
  architecture: string[];
}

export interface CandidateContact {
  email?: string;
  phone?: string;
  location?: string;
  github?: string;
  linkedin?: string;
  portfolio?: string;
}

export interface ExtractedProject {
  name: string;
  role?: string;
  technologies?: string[];
  metrics?: string[];
  description: string;
}

export interface ResumeEducation {
  institution: string;
  degree?: string;
  field?: string;
  dates?: string;
  gpa?: string;
}

export interface ResumeExperience {
  company: string;
  role?: string;
  dates?: string;
  location?: string;
  highlights?: string[];
}

export interface UserResumeData {
  education?: ResumeEducation[];
  experience?: ResumeExperience[];
  publications?: string[];
  certifications?: string[];
  achievements?: string[];
  name: string;
  headline?: string;
  contact?: CandidateContact;
  filename?: string;
  summary: string;
  skills: string[];
  skillCategories?: SkillCategories;
  claims: string[];
  experienceSummary: string;
  projects?: ExtractedProject[];
  strengths?: string[];
  pastStruggles?: string[];
  interviewTopics?: string[];
  rawText?: string;
}

export interface UserJDData {
  title: string;
  company: string;
  experience?: string;
  location?: string;
  type?: string;
  requiredSkills: string[];
  preferredSkills?: string[];
  responsibilities: string[];
  qualifications?: string[];
  technologies?: string[];
  rawText?: string;
}

export function getUserResumeKey(userId?: string | null): string | null {
  const uid = userId || getCurrentUserId();
  return uid ? `interviewiq_${uid}_resume` : null;
}

export function getUserJdKey(userId?: string | null): string | null {
  const uid = userId || getCurrentUserId();
  return uid ? `interviewiq_${uid}_jd` : null;
}

export function getUserOnboardedKey(userId?: string | null): string | null {
  const uid = userId || getCurrentUserId();
  return uid ? `interviewiq_${uid}_onboarding_completed` : null;
}

export function cleanCandidateName(name?: string): string {
  if (!name) return "Candidate";
  let cleaned = name
    .replace(/\b([A-Za-z])\s+([a-zA-Z]{2,})\b/g, "$1$2")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\(\d+\)/g, "")
    .replace(/\b\d+\b/g, "")
    .replace(/[_.-]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return (
    cleaned
      .split(/\s+/)
      .filter((w) => w.length > 0 && !/^(resume|cv|profile|pdf|candidate)$/i.test(w))
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ") || "Candidate"
  );
}

export function getUserResume(userId?: string): UserResumeData | null {
  const key = getUserResumeKey(userId);
  if (!key) return null;
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed: UserResumeData = JSON.parse(stored);
      if (parsed && parsed.name) {
        parsed.name = cleanCandidateName(parsed.name);
      }
      return parsed;
    }
  } catch {}
  return null;
}

export function getEffectiveUserResume(userId?: string): UserResumeData {
  const resume = getUserResume(userId);
  if (resume) return resume;

  const authUser = getStoredUser();
  const name = cleanCandidateName(authUser?.full_name || "Candidate");
  return {
    name,
    headline: "Software Engineer",
    contact: {
      email: authUser?.email,
    },
    filename: undefined,
    summary: "Upload your resume to personalize interview questions and highlight key projects from your experience.",
    skills: [],
    skillCategories: {
      languages: [],
      frameworks: [],
      cloudDevops: [],
      databases: [],
      architecture: [],
    },
    claims: [],
    experienceSummary: "",
    projects: [],
    strengths: [],
    pastStruggles: [],
    interviewTopics: [
      "System Architecture: High-level design tradeoffs and service boundaries",
      "Distributed Reliability: Fault tolerance, consistency, and network partitions",
      "Data & Storage: Query performance, caching invalidation, and data modeling",
      "Operational Engineering: Concurrency, latency bottlenecks, and production incidents",
    ],
  };
}

export function setUserResume(resume: UserResumeData, userId?: string) {
  const key = getUserResumeKey(userId);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(resume));
  } catch {}
  // Persist to backend user profile asynchronously
  saveUserProfile({ resume_data: resume as Record<string, any> }).catch((err) => {
    console.warn("[userDocuments] Failed to sync resume to backend:", err);
  });
}

export function hasUserUploadedResume(userId?: string): boolean {
  const key = getUserResumeKey(userId);
  if (!key) return false;
  try {
    return Boolean(localStorage.getItem(key));
  } catch {
    return false;
  }
}

export function clearUserResume(userId?: string): void {
  const key = getUserResumeKey(userId);
  if (!key) return;
  try {
    localStorage.removeItem(key);
  } catch {}
  saveUserProfile({ resume_data: null }).catch(() => {});
}

export function getUserJD(userId?: string): UserJDData | null {
  const key = getUserJdKey(userId);
  if (!key) return null;
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return null;
}

export function setUserJD(jd: UserJDData, userId?: string) {
  const key = getUserJdKey(userId);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(jd));
  } catch {}
  saveUserProfile({ jd_data: jd as Record<string, any> }).catch((err) => {
    console.warn("[userDocuments] Failed to sync JD to backend:", err);
  });
}

export function hasUserUploadedJD(userId?: string): boolean {
  const key = getUserJdKey(userId);
  if (!key) return false;
  try {
    return Boolean(localStorage.getItem(key));
  } catch {
    return false;
  }
}

export function clearUserJD(userId?: string): void {
  const key = getUserJdKey(userId);
  if (!key) return;
  try {
    localStorage.removeItem(key);
  } catch {}
  saveUserProfile({ jd_data: null }).catch(() => {});
}

export function hasCompletedOnboarding(userId?: string): boolean {
  const key = getUserOnboardedKey(userId);
  if (!key) return false;
  try {
    const val = localStorage.getItem(key);
    if (val === "true") return true;
    return hasUserUploadedResume(userId) && hasUserUploadedJD(userId);
  } catch {
    return false;
  }
}

export function setOnboardingCompleted(completed = true, userId?: string) {
  const key = getUserOnboardedKey(userId);
  if (!key) return;
  try {
    localStorage.setItem(key, completed ? "true" : "false");
  } catch {}
}

export async function syncUserProfileFromBackend(targetUserId?: string): Promise<UserProfileResponse | null> {
  const uid = targetUserId || getCurrentUserId();
  if (!uid) return null;
  try {
    const profile = await getUserProfile();
    if (profile) {
      if (profile.resume_data) {
        localStorage.setItem(`interviewiq_${uid}_resume`, JSON.stringify(profile.resume_data));
      }
      if (profile.jd_data) {
        localStorage.setItem(`interviewiq_${uid}_jd`, JSON.stringify(profile.jd_data));
      }
      if (profile.jd_matches && Array.isArray(profile.jd_matches)) {
        // Merge instead of overwrite so a report saved moments ago (backend write still in flight) is not lost.
        const mergedMatches = mergeJdMatchReports(
          JSON.parse(localStorage.getItem(`interviewiq_${uid}_jd_matches_history`) || "[]"),
          profile.jd_matches,
          getDeletedJdMatchIds(uid),
        );
        localStorage.setItem(`interviewiq_${uid}_jd_matches_history`, JSON.stringify(mergedMatches));
        if (mergedMatches.length > 0) {
          localStorage.setItem(`interviewiq_${uid}_active_jd_match`, JSON.stringify(mergedMatches[0]));
        } else {
          localStorage.removeItem(`interviewiq_${uid}_active_jd_match`);
        }
      }
      if (profile.target_role) {
        localStorage.setItem(`interviewiq_${uid}_target_role`, profile.target_role);
      }
      if (profile.target_company) {
        localStorage.setItem(`interviewiq_${uid}_target_company`, profile.target_company);
      }
      window.dispatchEvent(new CustomEvent("interviewiq-profile-synced", { detail: profile }));
    }
    return profile;
  } catch (err) {
    console.warn("[userDocuments] Failed to sync profile from backend:", err);
    return null;
  }
}
