/** Real interview length from stored timestamps (never an estimate from the number of turns). */
export function realSessionSeconds(os: any, memory?: any): number {
  const startMs = os?.created_at ? Date.parse(os.created_at) : NaN;
  let best = 0;
  for (const t of os?.transcript || []) {
    const ts = t?.timestamp ? Date.parse(t.timestamp) : NaN;
    if (!Number.isNaN(ts) && !Number.isNaN(startMs)) best = Math.max(best, Math.round((ts - startMs) / 1000));
    const parts = String(t?.time || "").split(":").map(Number);
    if (parts.length >= 2 && parts.every((n) => Number.isFinite(n))) {
      const secs = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
      best = Math.max(best, secs);
    }
  }
  const mem = memory ?? os?.working_memory ?? {};
  const delib = typeof mem.deliberation_seconds_spent === "number" ? mem.deliberation_seconds_spent : 0;
  return Math.max(best, delib);
}

/** How many questions the interviewer actually asked. */
export function interviewerQuestionCount(os: any): number {
  return (os?.transcript || []).filter((t: any) => t?.speaker === "Alex").length;
}

/** Interview titles used to carry the word "Calibration". Never show it, including on sessions saved earlier. */
export function cleanSessionTitle(title?: string | null): string {
  const cleaned = (title || "")
    .replace(/\s*\bcalibration\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!cleaned) return "Interview";
  // "Technical Calibration Round" becomes "Technical Round"; make that read naturally.
  return /^technical round$/i.test(cleaned) ? "Technical Interview" : cleaned;
}
