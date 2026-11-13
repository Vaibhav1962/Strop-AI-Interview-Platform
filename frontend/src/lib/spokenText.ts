/**
 * Makes Alex's replies sound like a person talking, not like a code listing read aloud.
 * A literal array such as "[1, 2, 3, 4, 5]" is awkward both spoken and in the transcript, so describe it in words instead.
 * Mirrors backend/app/orchestrator/spoken_text.py, which applies the same rewrite to the committed reply.
 */

const NUM = String.raw`-?\d+(?:\.\d+)?`;
// A flat list of at least two numbers. Nested lists ("[[1,2],[3,4]]") are left alone: they cannot be read naturally.
const FLAT_NUMBER_LIST = new RegExp(String.raw`(?<![\[\w])\[\s*(${NUM}(?:\s*,\s*${NUM})+)\s*\](?![\]\w])`, "g");
const MAX_SPOKEN_ITEMS = 6;

function sayNumber(token: string): string {
  const t = token.trim();
  return t.startsWith("-") ? `minus ${t.slice(1)}` : t;
}

export function toSpokenText(text: string): string {
  if (!text || !text.includes("[") || text.includes("[[")) return text;
  return text.replace(FLAT_NUMBER_LIST, (_m, body: string) => {
    const items = body.split(",").map(sayNumber);
    if (items.length > MAX_SPOKEN_ITEMS) return "the example array";
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
  });
}
