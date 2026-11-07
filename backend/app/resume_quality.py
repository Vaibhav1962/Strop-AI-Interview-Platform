"""Resume writing-quality checks: grammar, bullets, buzzwords, impact, voice.

Deterministic checks run in code so they are repeatable. The LLM only adds what rules cannot do (spelling,
grammar, rewrites), and every quote it returns must appear verbatim in the resume or it is dropped.
"""

from __future__ import annotations

import re
from typing import Any

BULLET = re.compile(r"^\s*[•●▪◦‣⁃∙\-\*–·>]+\s+")
NUMBER = re.compile(r"(\d+(?:[.,]\d+)?\s*(?:%|x|k|m|b|ms|s|gb|tb|\+)?|\$\s*\d)", re.I)

BUZZWORDS = [
    "results-oriented", "results oriented", "team player", "hard-working", "hard working", "hardworking",
    "detail-oriented", "detail oriented", "self-starter", "self starter", "go-getter", "passionate",
    "synergy", "dynamic", "think outside the box", "fast learner", "quick learner", "highly motivated",
    "proactive", "innovative", "cutting-edge", "cutting edge", "best-in-class", "best in class",
    "excellent communication", "strong work ethic", "problem solver", "problem-solver", "guru", "ninja",
    "rockstar", "visionary", "seasoned", "proven track record", "go-to", "thought leader",
]
WEAK_OPENERS = [
    "responsible for", "worked on", "worked with", "helped", "assisted", "involved in", "participated in",
    "duties included", "tasked with", "in charge of", "was part of", "various",
]
FILLER = ["etc", "and more", "and so on", "various", "several", "a lot of", "many different", "stuff"]
PAST_IRREGULAR = {"built", "led", "ran", "wrote", "made", "drove", "cut", "grew", "won", "took", "set", "taught", "shipped", "sped", "spun", "chose", "found", "got", "gave", "held", "kept", "lost", "met", "paid", "put", "read", "sent", "sold", "spent", "stood", "thought", "understood", "wrote"}
BASE_VERBS = {"build", "develop", "design", "implement", "lead", "manage", "create", "write", "deliver", "drive", "own", "run", "ship", "optimize", "reduce", "improve", "analyze", "architect", "maintain", "collaborate", "work", "support", "coordinate", "mentor", "test", "deploy", "integrate", "automate"}

SECTION_STOP = re.compile(r"^(education|skills|technical skills|certifications?|awards?|achievements?|publications?|interests?|languages?)\b", re.I)


def _norm(t: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9+#.% ]", " ", (t or "").lower())).strip()


def _looks_like_continuation(prev: str, line: str) -> bool:
    """A line that wraps a bullet: not a bullet, heading or entry header, and the sentence is not finished."""
    from app.resume_parser import DATE_RANGE, heading_of

    if not line or BULLET.match(line) or heading_of(line) or "|" in line or DATE_RANGE.search(line):
        return False
    if len(line) > 160:
        return False
    return line[:1].islower() or not re.search(r"[.!?]$", prev.strip())


def extract_bullets(resume: dict[str, Any]) -> list[str]:
    """Whole bullets (wrapped lines joined) from the resume text, skipping the education and skills blocks."""
    raw = str(resume.get("rawText") or resume.get("raw_text") or "")
    bullets: list[str] = []
    current: str | None = None
    skipping = False

    def flush() -> None:
        nonlocal current
        if current:
            bullets.append(re.sub(r"\s+", " ", current).strip())
        current = None

    for line in raw.splitlines():
        s = line.strip()
        if not s:
            flush()
            continue
        if SECTION_STOP.match(s) and len(s.split()) <= 4 and not BULLET.match(s):
            flush()
            skipping = True
            continue
        if re.match(r"^(experience|work experience|professional experience|projects?|internships?)\b", s, re.I) and len(s.split()) <= 4:
            flush()
            skipping = False
            continue
        if skipping:
            continue
        if BULLET.match(s):
            flush()
            current = BULLET.sub("", s).strip()
        elif current is not None and _looks_like_continuation(current, s):
            current += " " + s
        else:
            flush()
    flush()
    if not bullets:  # no bullet glyphs survived extraction: fall back to the parsed fields
        for x in resume.get("experience") or []:
            bullets += [str(h) for h in (x.get("highlights") or [])]
        for p in resume.get("projects") or []:
            if p.get("description"):
                bullets.append(str(p["description"]))
    return [b for b in bullets if len(b.split()) >= 3]


def _first_word(b: str) -> str:
    m = re.match(r"[A-Za-z']+", b.strip())
    return m.group(0).lower() if m else ""


def _issue(quote: str, problem: str, fix: str = "") -> dict[str, str]:
    return {"quote": quote.strip(), "problem": problem, "fix": fix}


def _status(n: int, warn: int = 1, bad: int = 4) -> str:
    return "bad" if n >= bad else "warn" if n >= warn else "good"


def deterministic_checks(resume: dict[str, Any]) -> dict[str, Any]:
    bullets = extract_bullets(resume)
    raw = str(resume.get("rawText") or resume.get("raw_text") or "")

    # ---- buzzwords and filler
    buzz_issues: list[dict[str, str]] = []
    for line in [l.strip() for l in raw.splitlines() if l.strip()]:
        hits = [w for w in BUZZWORDS + FILLER if re.search(r"\b" + re.escape(w) + r"\b", line, re.I)]
        if hits:
            quoted = ", ".join(f'"{w}"' for w in hits)
            buzz_issues.append(
                _issue(
                    BULLET.sub("", line)[:160],
                    f"Stock phrases or filler: {quoted}. They claim a quality or hide detail instead of showing it.",
                    "Replace each with the specific thing you did, the tool you used or a number you moved.",
                )
            )

    # ---- bullet quality: weak openers, length, repeated openers
    bullet_issues: list[dict[str, str]] = []
    for b in bullets:
        low = b.lower()
        weak = next((w for w in WEAK_OPENERS if low.startswith(w)), None)
        if weak:
            bullet_issues.append(_issue(b[:170], f'Starts with "{weak}", which describes a duty instead of an achievement.', "Open with a strong verb (Built, Cut, Led, Shipped) and state the result."))
        wc = len(b.split())
        if wc > 32:
            bullet_issues.append(_issue(b[:170] + "...", f"{wc} words long. Bullets this long are skimmed or skipped.", "Split it into two bullets or cut it to one clear result under about 25 words."))
    openers: dict[str, int] = {}
    for b in bullets:
        w = _first_word(b)
        if w:
            openers[w] = openers.get(w, 0) + 1
    for w, n in sorted(openers.items(), key=lambda x: -x[1]):
        if n >= 3 and w not in ("the", "a", "an"):
            bullet_issues.append(_issue(f'{n} bullets start with "{w.capitalize()}"', "Repeating the same opening verb makes the list read as one template.", "Vary the verbs so each bullet sounds like a different accomplishment."))
            break

    # ---- impact: bullets without any number
    no_number = [b for b in bullets if not NUMBER.search(b)]
    impact_issues = [
        _issue(b[:170], "No number, scale or result. A reader cannot tell how big or how good it was.", "Add a figure: users, requests per second, latency, cost, time saved, or team size.")
        for b in no_number[:6]
    ]
    share_without = (len(no_number) / len(bullets)) if bullets else 0.0

    # ---- voice: first person, passive, tense mix
    voice_issues: list[dict[str, str]] = []
    for b in bullets:
        if re.search(r"\b(i|my|me)\b", b, re.I):
            voice_issues.append(_issue(b[:170], "Uses first person. Resume bullets conventionally drop the pronoun.", "Start with the verb: remove \"I\" and \"my\"."))
        elif re.search(r"\b(was|were|been|being)\s+\w+ed\b", b, re.I):
            voice_issues.append(_issue(b[:170], "Passive voice hides who did the work.", "Rewrite it so you are the actor: \"Built X\" instead of \"X was built\"."))
    past = [b for b in bullets if _first_word(b).endswith("ed") or _first_word(b) in PAST_IRREGULAR]
    present = [b for b in bullets if _first_word(b) in BASE_VERBS]
    if past and present and len(past) >= len(present):
        for b in present[:3]:
            voice_issues.append(_issue(b[:170], "Present-tense opener among mostly past-tense bullets.", "Use past tense for finished work and keep it consistent."))

    return {
        "bullets": bullets,
        "buzz": buzz_issues[:8],
        "bullet_issues": bullet_issues[:8],
        "impact": impact_issues,
        "voice": voice_issues[:8],
        "no_number_share": share_without,
        "past": len(past),
        "present": len(present),
    }


GRAMMAR_RULES = """You proofread a resume. Return ONLY JSON:
{"grammar": [{"quote": str, "problem": str, "fix": str}],
 "rewrites": [{"quote": str, "problem": str, "fix": str}]}
RULES:
- "grammar": real spelling mistakes, grammar errors, wrong word forms, missing articles that matter, inconsistent capitalisation of the same technology (e.g. "Javascript" vs "JavaScript"), and clear typos. Up to 8. Do NOT flag stylistic preferences or resume-style fragments without a subject.
- "quote" must be copied EXACTLY from the resume text (a short phrase or the whole bullet). Never paraphrase it.
- "fix" is the corrected text for that quote.
- "rewrites": up to 3 of the weakest bullets (vague, duty-style, or missing a result). "fix" is a stronger version that keeps every fact. If the real number is unknown use a placeholder such as [X%] and never invent a figure, employer or technology.
- IGNORE spacing artifacts. The text came from a PDF, so words may be split ("T echnology"), joined ("schemawith") or oddly spaced around punctuation. These come from text extraction, not from the author. Never report a problem whose only fix is adding or removing a space.
- Return empty arrays when there is nothing to report."""


async def _llm_issues(raw: str) -> dict[str, list[dict[str, str]]]:
    from app.jd_analysis import _groq_json  # shared Groq JSON helper

    data = await _groq_json(GRAMMAR_RULES, "RESUME TEXT:\n" + raw[:9000], 2500)
    out: dict[str, list[dict[str, str]]] = {"grammar": [], "rewrites": []}
    if not data:
        return out
    corpus = _norm(raw)
    for key in out:
        for it in data.get(key) or []:
            if not isinstance(it, dict):
                continue
            quote = str(it.get("quote") or "").strip()
            fix = str(it.get("fix") or "").strip()
            if len(_norm(quote)) < 4 or not fix or _norm(quote) not in corpus or _norm(quote) == _norm(fix):
                continue  # quote not in the resume, or nothing actually changes
            if re.sub(r"[\s'\"`.,;:()\-]+", "", quote).lower() == re.sub(r"[\s'\"`.,;:()\-]+", "", fix).lower():
                continue  # only spacing or punctuation differs: that is PDF text extraction, not the author's writing
            out[key].append(_issue(quote[:200], str(it.get("problem") or "").strip() or "Needs a fix.", fix[:300]))
    out["grammar"] = out["grammar"][:8]
    out["rewrites"] = out["rewrites"][:3]
    return out


def _grade(issues: list[dict[str, str]], warn: int = 1, bad: int = 4) -> str:
    return _status(len(issues), warn, bad)


async def resume_quality(resume: dict[str, Any]) -> dict[str, Any] | None:
    raw = str(resume.get("rawText") or resume.get("raw_text") or "")
    if len(raw.strip()) < 80:
        return None
    det = deterministic_checks(resume)
    llm = await _llm_issues(raw)
    bullets: list[str] = det["bullets"]

    bullet_issues = det["bullet_issues"] + llm["rewrites"]
    checks = [
        {"id": "grammar", "title": "Grammar and spelling", "status": _grade(llm["grammar"], 1, 4),
         "hint": "Typos and grammar slips are the fastest way to lose a recruiter.", "issues": llm["grammar"]},
        {"id": "bullets", "title": "Bullet quality", "status": _grade(det["bullet_issues"], 1, 4),
         "hint": "Each bullet should open with a strong verb and end with a result.", "issues": bullet_issues},
        {"id": "buzzwords", "title": "Buzzwords and filler", "status": _grade(det["buzz"], 1, 3),
         "hint": "Words like \"passionate\" or \"team player\" claim a trait without proof.", "issues": det["buzz"]},
        {"id": "impact", "title": "Numbers and impact", "status": "bad" if det["no_number_share"] > 0.6 else "warn" if det["no_number_share"] > 0.3 else "good",
         "hint": "Measurable results make bullets believable.", "issues": det["impact"]},
        {"id": "voice", "title": "Tense and voice", "status": _grade(det["voice"], 1, 4),
         "hint": "Past tense, active voice, no first-person pronouns.", "issues": det["voice"]},
    ]

    penalty = (
        min(24, 4 * len(llm["grammar"]))
        + min(15, 3 * len(det["buzz"]))
        + min(20, 3 * sum(1 for i in det["bullet_issues"] if "duty" in i["problem"] or "template" in i["problem"]) + 2 * sum(1 for i in det["bullet_issues"] if "words long" in i["problem"]))
        + round(25 * det["no_number_share"])
        + min(12, 3 * len(det["voice"]))
    )
    score = max(10, min(100, 100 - penalty))

    problems = sorted(
        [(c["title"], len(c["issues"])) for c in checks if c["status"] != "good"], key=lambda x: -x[1]
    )
    if problems:
        summary = "Biggest fixes: " + ", ".join(t.lower() for t, _ in problems[:2]) + "."
    else:
        summary = "The writing is clean. Keep bullets specific and numeric."
    if bullets:
        with_nums = len(bullets) - round(det["no_number_share"] * len(bullets))
        summary += f" {with_nums} of {len(bullets)} bullets contain a measurable result."

    return {
        "score": score,
        "summary": summary,
        "stats": {
            "bullets": len(bullets),
            "withNumbers": len(bullets) - round(det["no_number_share"] * len(bullets)),
            "grammarIssues": len(llm["grammar"]),
            "buzzwords": len(det["buzz"]),
        },
        "checks": checks,
        "checkedByModel": bool(llm["grammar"] or llm["rewrites"]),
    }
