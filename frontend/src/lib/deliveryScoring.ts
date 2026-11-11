/**
 * Deterministic, evidence-based scoring of how a candidate sounded.
 *
 * The radar's delivery axes used to lean on the model's default "Strong" rating and on a six-word filler list. Speech
 * to text engines also drop "um" and "uh", so what survives in a transcript is verbal tics such as "simply",
 * "basically" and "you know". This counts them, turns the rate into a level (1 to 4), and uses it to cap the axes it
 * makes unreliable. Mirrors backend/app/orchestrator/delivery_scoring.py: keep the two in sync.
 */

// [label, pattern, weight]: weight 1 for words that add nothing, 0.5 for hedges that can be legitimate.
const TICS: [string, RegExp, number][] = [
  ["um/uh", /\b(?:um+|uh+|erm|er|hmm+)\b/g, 1],
  ["you know", /\byou know\b/g, 1],
  ["i mean", /\bi mean\b/g, 1],
  ["like", /,\s*like\b|\blike,/g, 1],
  ["basically", /\bbasically\b/g, 1],
  ["simply", /\bsimply\b/g, 1],
  ["literally", /\bliterally\b/g, 1],
  ["essentially", /\bessentially\b/g, 1],
  ["honestly", /\bhonestly\b/g, 1],
  ["obviously", /\bobviously\b/g, 1],
  ["kind of", /\bkind of\b/g, 1],
  ["sort of", /\bsort of\b/g, 1],
  ["i guess", /\bi guess\b/g, 1],
  ["actually", /\bactually\b/g, 0.5],
  ["i think", /\bi think\b/g, 0.5],
  ["maybe", /\bmaybe\b/g, 0.5],
  ["probably", /\bprobably\b/g, 0.5],
];

/** Below this many words a rate means nothing, so the axis is left unscored rather than guessed. */
export const MIN_WORDS_FOR_RATE = 40;

export interface TicStats {
  weighted: number;
  breakdown: Record<string, number>;
  words: number;
  /** Tics per 100 words, or null when there is too little speech to judge. */
  rate: number | null;
}

export function ticStats(turns: string[]): TicStats {
  const breakdown: Record<string, number> = {};
  let weighted = 0;
  let words = 0;
  for (const turn of turns) {
    const low = (turn || "").toLowerCase();
    for (const [label, rx, weight] of TICS) {
      const n = (low.match(rx) || []).length;
      if (n) {
        breakdown[label] = (breakdown[label] || 0) + n;
        weighted += n * weight;
      }
    }
    words += (turn || "").split(/\s+/).filter(Boolean).length;
  }
  return { weighted, breakdown, words, rate: words >= MIN_WORDS_FOR_RATE ? (weighted / words) * 100 : null };
}

/** Tics per 100 words to a 1-4 level. Strict: 4 means almost none. */
export function fillerLevel(rate: number): number {
  if (rate < 0.4) return 4;
  if (rate < 1.0) return 3;
  if (rate < 2.0) return 2;
  return 1;
}

/** Lower a model-given level when the transcript contradicts it. Never raises a level. */
export function capLevel(level: number, dimensionId: string, rate: number | null): number {
  if (rate === null) return level;
  if (dimensionId === "verbal_fluency") return Math.min(level, fillerLevel(rate));
  if (dimensionId === "confidence" || dimensionId === "conciseness") return Math.min(level, fillerLevel(rate * 0.7));
  if ((dimensionId === "clarity" || dimensionId === "structure" || dimensionId === "technical_communication") && rate >= 3.0) {
    return Math.min(level, 2);
  }
  return level;
}

/** Words per minute to a 1-4 level, or null when the estimate is not believable. */
export function paceLevel(wpm: number): number | null {
  if (wpm < 40 || wpm > 260) return null;
  if (wpm >= 125 && wpm <= 165) return 4;
  if (wpm >= 110 && wpm <= 180) return 3;
  if (wpm >= 95 && wpm <= 195) return 2;
  return 1;
}
