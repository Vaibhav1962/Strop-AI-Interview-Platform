"""Job-description parsing and resume matching.

Hybrid, like the resume parser: an LLM reads the text, deterministic code verifies what it claims.
1. parse_jd: structured fields from the posting. Company and every skill must actually appear in the text.
2. match: the LLM judges each requirement against the resume and must quote its evidence. A claim whose
   quote cannot be found in the resume is downgraded to "missing".
3. Scores are computed here from the verified verdicts, never taken from the model.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any

import httpx
from app.groq_keys import groq_keys

MODELS = ("openai/gpt-oss-120b", "openai/gpt-oss-20b")

PARSE_RULES = """You extract structured data from a job posting. Return ONLY JSON:
{"title": str, "company": str, "location": str, "experience": str, "employment_type": str,
 "required_skills": [str], "preferred_skills": [str], "responsibilities": [str], "qualifications": [str]}
RULES:
- "company" is the hiring organisation's real name as written in the posting. If the posting never names it, use "". NEVER write placeholders such as "Target Company" or "The Company".
- "title" is the role title exactly as written.
- required_skills / preferred_skills: concrete technologies, tools, languages, methods or domains. Use the posting's own wording, one item per skill, no sentences. When the posting offers alternatives (\"Go or Java\", \"Kafka or similar event streaming\"), keep them together as ONE item written the same way, never split them. Put "nice to have", "plus", "bonus" and "preferred" items in preferred_skills. Never invent a skill the posting does not mention.
- responsibilities: up to 8 short phrases of what the person will do. qualifications: degrees, years of experience, certifications.
- Use "" or [] when something is absent."""

MATCH_RULES = """You judge how well a candidate's resume meets each requirement of a job posting. Return ONLY JSON:
{"items": [{"requirement": str, "category": "required"|"preferred"|"responsibility",
            "verdict": "met"|"partial"|"missing", "evidence": str, "recommendation": str}],
 "summary": str}
RULES:
- Output one item per requirement given, in the same order, using the requirement text exactly.
- A requirement written as alternatives ("X or Y") is met if the resume shows ANY one of them.
- "met": the resume clearly shows hands-on use or equivalent experience. "partial": related or adjacent experience only (say what is adjacent). "missing": no support.
- "evidence" must be a short quote copied EXACTLY from the resume (a bullet, sentence or skills line). Leave "" when verdict is "missing". Never paraphrase and never invent evidence.
- Do not count a skill as met just because it appears in a list of tools if the resume shows no use; mark it "partial".
- "recommendation": for partial and missing items, one concrete, specific action to close the gap (a project to build, a topic to study, how to phrase existing experience). "" for met items.
- "summary": 2 or 3 plain sentences naming the role and company if known, the strongest alignment and the most important gap. No hype."""


async def _groq_json(system: str, user: str, max_tokens: int) -> dict[str, Any] | None:
    keys = groq_keys()
    if not keys:
        return None
    for model in MODELS:
        for key_id, key in keys:
            try:
                async with httpx.AsyncClient(timeout=70.0) as client:
                    res = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                        json={
                            "model": model,
                            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                            "response_format": {"type": "json_object"},
                            "temperature": 0,
                            "max_tokens": max_tokens,
                            "reasoning_effort": "low",
                        },
                    )
                if res.status_code == 200:
                    content = (res.json().get("choices") or [{}])[0].get("message", {}).get("content") or ""
                    content = re.sub(r"^```(?:json)?\s*|\s*```$", "", content.strip())
                    data = json.loads(content)
                    if isinstance(data, dict):
                        return data
                else:
                    print(f"[JDAnalysis] {key_id} {model} status {res.status_code}: {res.text[:140]}")
            except Exception as exc:
                print(f"[JDAnalysis] {key_id} {model} error: {str(exc)[:140]}")
    return None


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9+#. ]", " ", (text or "").lower())).strip()


def _words(text: str) -> list[str]:
    return [w for w in _norm(text).split(" ") if w]


def _str_list(v: Any, limit: int = 40) -> list[str]:
    if not isinstance(v, list):
        return []
    out: list[str] = []
    for x in v:
        s = str(x).strip()
        if s and s.lower() not in {o.lower() for o in out}:
            out.append(s)
    return out[:limit]


_PLACEHOLDER_COMPANIES = {"target company", "the company", "company", "our company", "n/a", "confidential", "unknown"}


def _company_from_text(text: str) -> str:
    """Deterministic fallback for the hiring company when the model cannot be used or got it wrong."""
    head = text[:3000]
    patterns = [
        r"(?im)^\s*company\s*[:\-]\s*([A-Z][\w&.,' \-]{1,60})$",
        r"(?im)^\s*about\s+([A-Z][\w&.'\-]*(?:\s+[A-Z][\w&.'\-]*){0,3})\s*$",
        r"\b([A-Z][\w&.'\-]*(?:\s+[A-Z][\w&.'\-]*){0,3})\s+is\s+(?:hiring|looking for|seeking|a\s+(?:leading|global|fast|growing))",
        r"(?i)\bjoin\s+(?:the\s+team\s+at\s+|us\s+at\s+)?([A-Z][\w&.'\-]*(?:\s+[A-Z][\w&.'\-]*){0,3})",
        r"\bat\s+([A-Z][\w&.'\-]*(?:\s+[A-Z][\w&.'\-]*){0,3})\b(?=[,.\n])",
    ]
    for pat in patterns:
        m = re.search(pat, head)
        if m:
            cand = m.group(1).strip(" .,-")
            if cand.lower() not in _PLACEHOLDER_COMPANIES and len(cand) > 1:
                return cand
    return ""


def _term_in_text(term: str, norm_text: str, text_words: set[str]) -> bool:
    t = _norm(term)
    if not t:
        return False
    if t in norm_text:
        return True
    ws = [w for w in t.split(" ") if len(w) > 1]
    return bool(ws) and all(w in text_words for w in ws)


def verify_parsed_jd(parsed: dict[str, Any], jd_text: str) -> dict[str, Any]:
    norm_text = _norm(jd_text)
    text_words = set(norm_text.split(" "))

    company = str(parsed.get("company") or "").strip()
    if company.lower() in _PLACEHOLDER_COMPANIES or not _term_in_text(company, norm_text, text_words):
        company = _company_from_text(jd_text)

    title = str(parsed.get("title") or "").strip()
    if not title or not _term_in_text(title, norm_text, text_words):
        first = next((l.strip() for l in jd_text.splitlines() if l.strip()), "")
        title = first[:80] if 3 <= len(first) <= 80 else title or "Job description"

    req = [s for s in _str_list(parsed.get("required_skills")) if _term_in_text(s, norm_text, text_words)]
    pref = [s for s in _str_list(parsed.get("preferred_skills")) if _term_in_text(s, norm_text, text_words) and s.lower() not in {r.lower() for r in req}]
    return {
        "title": title,
        "company": company,
        "location": str(parsed.get("location") or "").strip(),
        "experience": str(parsed.get("experience") or "").strip(),
        "type": str(parsed.get("employment_type") or "").strip(),
        "requiredSkills": req[:20],
        "preferredSkills": pref[:15],
        "responsibilities": _str_list(parsed.get("responsibilities"), 8),
        "qualifications": _str_list(parsed.get("qualifications"), 8),
    }


def _resume_corpus(resume: dict[str, Any]) -> tuple[str, str]:
    """(prompt text, verification text). Structured fields first, then the raw resume."""
    parts: list[str] = []
    for key in ("name", "headline", "summary"):
        if resume.get(key):
            parts.append(f"{key}: {resume[key]}")
    if resume.get("skills"):
        parts.append("skills: " + ", ".join(map(str, resume["skills"])))
    for x in resume.get("experience") or []:
        parts.append(f'experience: {x.get("role", "")} at {x.get("company", "")} {x.get("dates", "")}: ' + " | ".join(map(str, x.get("highlights") or [])))
    for p in resume.get("projects") or []:
        parts.append(f'project: {p.get("name", "")} [{", ".join(map(str, p.get("technologies") or []))}]: {p.get("description", "")}')
    for e in resume.get("education") or []:
        parts.append(f'education: {e.get("institution", "")} {e.get("degree", "")} {e.get("field", "")}')
    for key in ("certifications", "achievements", "publications"):
        if resume.get(key):
            parts.append(f"{key}: " + "; ".join(map(str, resume[key])))
    structured = "\n".join(parts)
    raw = str(resume.get("rawText") or resume.get("raw_text") or "")
    return (structured + "\n\nFULL RESUME TEXT:\n" + raw)[:9000], structured + "\n" + raw


def _evidence_found(evidence: str, corpus_norm: str) -> bool:
    ev = _norm(evidence)
    if len(ev) < 6:
        return False
    if ev in corpus_norm:
        return True
    toks = ev.split(" ")
    if len(toks) < 4:
        return False
    corpus_set = set(corpus_norm.split(" "))
    return sum(1 for t in toks if t in corpus_set) / len(toks) >= 0.85


def _pct(items: list[dict[str, Any]]) -> int | None:
    if not items:
        return None
    score = sum(1.0 if i["verdict"] == "met" else 0.5 if i["verdict"] == "partial" else 0.0 for i in items)
    return round(100 * score / len(items))


async def analyze(jd_text: str, resume: dict[str, Any]) -> dict[str, Any]:
    import asyncio

    from app.resume_quality import resume_quality

    # Writing-quality check is independent of the posting, so it runs alongside the parse and match calls.
    quality_task = asyncio.create_task(resume_quality(resume))
    parsed_raw = await _groq_json(PARSE_RULES, "JOB POSTING:\n" + jd_text[:9000], 2000)
    jd = verify_parsed_jd(parsed_raw or {}, jd_text)

    reqs: list[tuple[str, str]] = (
        [(s, "required") for s in jd["requiredSkills"]]
        + [(s, "preferred") for s in jd["preferredSkills"]]
        + [(s, "responsibility") for s in jd["responsibilities"][:6]]
    )
    prompt_resume, corpus = _resume_corpus(resume)
    corpus_norm = _norm(corpus)

    judged: dict[str, dict[str, Any]] = {}
    summary = ""
    if reqs:
        listing = "\n".join(f"{i + 1}. [{cat}] {text}" for i, (text, cat) in enumerate(reqs))
        data = await _groq_json(
            MATCH_RULES,
            f"JOB: {jd['title']} at {jd['company'] or 'an unnamed company'}\n\nREQUIREMENTS:\n{listing}\n\nRESUME:\n{prompt_resume}",
            4000,
        )
        if data:
            summary = str(data.get("summary") or "").strip()
            for it in data.get("items") or []:
                if isinstance(it, dict) and it.get("requirement"):
                    judged[_norm(str(it["requirement"]))] = it

    items: list[dict[str, Any]] = []
    for text, cat in reqs:
        it = judged.get(_norm(text), {})
        verdict = str(it.get("verdict") or "missing").lower()
        if verdict not in ("met", "partial", "missing"):
            verdict = "missing"
        evidence = str(it.get("evidence") or "").strip()
        if verdict != "missing" and not _evidence_found(evidence, corpus_norm):
            # The model claimed support but its quote is not in the resume, so it does not count.
            verdict, evidence = "missing", ""
        if verdict == "missing":
            evidence = ""
        items.append(
            {"requirement": text, "category": cat, "verdict": verdict, "evidence": evidence,
             "recommendation": str(it.get("recommendation") or "").strip()}
        )

    req_items = [i for i in items if i["category"] == "required"]
    pref_items = [i for i in items if i["category"] == "preferred"]
    resp_items = [i for i in items if i["category"] == "responsibility"]
    skill_items = req_items + pref_items

    req_pct, pref_pct, resp_pct = _pct(req_items), _pct(pref_items), _pct(resp_items)
    skill_fit = _pct(skill_items)
    technical_fit = req_pct if req_pct is not None else (pref_pct or 0)
    experience_fit = resp_pct if resp_pct is not None else technical_fit

    weights, parts = [], []
    for w, v in ((0.55, req_pct), (0.15, pref_pct), (0.30, resp_pct)):
        if v is not None:
            weights.append(w)
            parts.append(w * v)
    overall = round(sum(parts) / sum(weights)) if weights else 0

    matching = [i["requirement"] for i in skill_items if i["verdict"] == "met"]
    partial = [i["requirement"] for i in skill_items if i["verdict"] == "partial"]
    missing = [i["requirement"] for i in skill_items if i["verdict"] == "missing"]

    gaps = []
    for i in items:
        if i["verdict"] == "met":
            continue
        required = i["category"] == "required"
        severity = ("critical" if i["verdict"] == "missing" else "high") if required else "medium"
        gaps.append(
            {
                "jdRequirement": i["requirement"],
                "category": "responsibility" if i["category"] == "responsibility" else "skill",
                "severity": severity,
                "recommendation": i["recommendation"] or (
                    f"The resume shows no clear use of {i['requirement']}. Add a project or bullet that demonstrates it."
                    if i["verdict"] == "missing"
                    else f"Related experience exists. State plainly how it applies to {i['requirement']}."
                ),
            }
        )
    order = {"critical": 0, "high": 1, "medium": 2}
    gaps.sort(key=lambda g: order[g["severity"]])

    strong = [
        {"jdRequirement": i["requirement"], "resumeEvidence": i["evidence"], "strength": "direct" if i["category"] == "required" else "demonstrated"}
        for i in items
        if i["verdict"] == "met"
    ]

    if not summary:
        who = f"{jd['title']}" + (f" at {jd['company']}" if jd["company"] else "")
        summary = (
            f"For {who}, the resume meets {len(matching)} of {len(skill_items)} listed skills."
            + (f" Strongest: {', '.join(matching[:3])}." if matching else "")
            + (f" Biggest gaps: {', '.join(missing[:3])}." if missing else "")
        )

    try:
        quality = await quality_task
    except Exception as exc:  # never let the optional check break the match
        print(f"[JDAnalysis] resume quality failed: {exc}")
        quality = None

    return {
        "jd": jd,
        "analysis": {
            "overallScore": overall,
            "technicalFit": technical_fit,
            "experienceFit": experience_fit,
            "skillFit": skill_fit if skill_fit is not None else 0,
            "matchingSkills": matching,
            "missingSkills": missing,
            "partialSkills": partial,
            "skillMatrix": [
                {
                    "skill": i["requirement"],
                    "category": i["category"],
                    "matched": i["verdict"] == "met",
                    "evidence": i["evidence"] or None,
                }
                for i in skill_items
            ],
            "gaps": gaps[:8],
            "strongMatches": strong[:8],
            "executiveVerdict": summary,
            "resumeQuality": quality,
            "extractedResumeName": str(resume.get("name") or ""),
            "jdTitle": jd["title"],
            "jdCompany": jd["company"],
        },
        "parser": "llm+verified" if parsed_raw else "deterministic",
        "judged_by_llm": bool(judged),
    }
