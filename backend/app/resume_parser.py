"""Structured resume parsing.

Hybrid design (what production parsers converge on):
1. Layout-preserving text in (pypdf).
2. Deterministic section segmentation from a heading dictionary. This is the source of truth for
   *which section a line lives in*.
3. An LLM (Groq, JSON mode) fills the structured fields from the text.
4. Validation: every item the model returns is checked against the deterministic sections, and
   contact fields are sanity-checked, so an experience entry cannot end up under projects and a
   school cannot end up as a location.
5. If the model is unavailable, the deterministic parser alone still returns a usable result.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any

import httpx
from app.groq_keys import groq_keys

HEADINGS: dict[str, set[str]] = {
    "summary": {"summary", "professional summary", "profile", "objective", "career objective", "about me", "about"},
    "education": {
        "education", "academic background", "academics", "qualifications", "educational background",
        "education and training", "academic qualifications",
    },
    "experience": {
        "experience", "work experience", "professional experience", "employment", "employment history",
        "work history", "internships", "internship experience", "internship", "career history",
        "relevant experience", "industry experience", "technical experience",
    },
    "projects": {
        "projects", "personal projects", "academic projects", "selected projects", "key projects",
        "technical projects", "side projects", "project experience", "notable projects",
    },
    "skills": {
        "skills", "technical skills", "core competencies", "technologies", "tech stack", "skills and tools",
        "key skills", "technical proficiencies", "tools and technologies", "skills summary",
    },
    "certifications": {"certifications", "certificates", "licenses", "courses", "certifications and courses"},
    "achievements": {
        "achievements", "awards", "honors", "honours", "accomplishments", "awards and achievements",
        "honors and awards", "extracurricular", "extracurricular activities", "positions of responsibility",
        "leadership", "activities",
    },
    "publications": {"publications", "research", "research papers", "papers", "research experience", "patents"},
}

HEADING_LOOKUP = {alias: section for section, aliases in HEADINGS.items() for alias in aliases}

INSTITUTION_WORDS = re.compile(
    r"\b(university|institute|college|school|academy|iit|nit|iiit|polytechnic|campus|faculty)\b", re.I
)
BULLET = re.compile(r"^\s*[•●▪◦‣⁃∙\-\*–·>]+\s+")
DATE_RANGE = re.compile(
    r"((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*\d{4}|\b\d{1,2}/\d{4}\b|\b(19|20)\d{2}\b)"
    r"\s*(?:-|–|—|to)\s*"
    r"((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*\d{4}|\b\d{1,2}/\d{4}\b|\b(19|20)\d{2}\b|present|current|ongoing|now)",
    re.I,
)
EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE = re.compile(r"(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3,5}\)?[\s.-]?)\d{3}[\s.-]?\d{3,5}")


def _norm_heading(line: str) -> str:
    t = re.sub(r"[^A-Za-z&/ ]", " ", line).lower().replace("&", " and ").replace("/", " ")
    return re.sub(r"\s+", " ", t).strip()


def heading_of(line: str) -> str | None:
    s = line.strip().rstrip(":").strip()
    if not s or len(s) > 40 or BULLET.match(s) or "@" in s:
        return None
    if len(s.split()) > 5:
        return None
    return HEADING_LOOKUP.get(_norm_heading(s))


def segment_sections(text: str) -> dict[str, list[str]]:
    """Split resume text into named sections. Lines before the first heading are the 'header' block."""
    sections: dict[str, list[str]] = {"header": []}
    current = "header"
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        h = heading_of(line)
        if h:
            current = h
            sections.setdefault(current, [])
            continue
        sections.setdefault(current, []).append(line)
    return sections


def _split_entries(lines: list[str]) -> list[dict[str, Any]]:
    """Group section lines into entries: header lines followed by bullet lines."""
    entries: list[dict[str, Any]] = []
    cur: dict[str, Any] | None = None
    for line in lines:
        is_bullet = bool(BULLET.match(line))
        text = BULLET.sub("", line).strip()
        if is_bullet:
            if cur is None:
                cur = {"head": [], "bullets": []}
                entries.append(cur)
            cur["bullets"].append(text)
            continue
        starts_new = cur is None or bool(cur["bullets"]) or (
            bool(DATE_RANGE.search(text)) and bool(cur["head"]) and len(cur["head"]) >= 2
        )
        if starts_new:
            cur = {"head": [text], "bullets": []}
            entries.append(cur)
        else:
            cur["head"].append(text)
    return entries


def _first_name_line(header: list[str]) -> str:
    for line in header[:8]:
        if EMAIL.search(line) or "http" in line.lower() or re.search(r"\d{4,}", line) or "|" in line:
            continue
        words = line.split()
        if 2 <= len(words) <= 4 and re.fullmatch(r"[A-Za-z.'\- ]+", line) and not heading_of(line):
            return line.title() if line.isupper() else line
    return ""


def parse_deterministic(text: str) -> dict[str, Any]:
    secs = segment_sections(text)
    header_text = "\n".join(secs.get("header", [])[:10])

    contact: dict[str, str] = {}
    m = EMAIL.search(text)
    if m:
        contact["email"] = m.group(0)
    for line in secs.get("header", [])[:10]:
        pm = PHONE.search(line)
        if pm and len(re.sub(r"\D", "", pm.group(0))) >= 9:
            contact["phone"] = pm.group(0).strip()
            break
    gh = re.search(r"github\.com/([A-Za-z0-9_-]+)", text, re.I)
    if gh:
        contact["github"] = f"github.com/{gh.group(1)}"
    li = re.search(r"linkedin\.com/in/([A-Za-z0-9_%-]+)", text, re.I)
    if li:
        contact["linkedin"] = f"linkedin.com/in/{li.group(1)}"
    # Location only from the header block, and never an institution or company line.
    for line in secs.get("header", [])[:8]:
        for part in re.split(r"[|•·]", line):
            part = part.strip()
            if (
                re.fullmatch(r"[A-Z][A-Za-z .'-]+,\s*[A-Z][A-Za-z .'-]+(?:,\s*[A-Z][A-Za-z .'-]+)?", part)
                and not INSTITUTION_WORDS.search(part)
                and "@" not in part
                and len(part) < 45
            ):
                contact["location"] = part
                break
        if "location" in contact:
            break

    education = []
    for e in _split_entries(secs.get("education", [])):
        head = " | ".join(e["head"])
        if not head:
            continue
        education.append({"institution": e["head"][0], "details": head, "highlights": e["bullets"][:4]})

    def work_items(key: str) -> list[dict[str, Any]]:
        out = []
        for e in _split_entries(secs.get(key, [])):
            if not e["head"]:
                continue
            out.append({"title": e["head"][0], "details": " | ".join(e["head"][1:]), "highlights": e["bullets"][:6]})
        return out

    skills_raw = " , ".join(re.sub(r"^[A-Za-z &/]{2,30}:", "", l) for l in secs.get("skills", []))
    skills = [s.strip(" .;") for s in re.split(r"[,;|•]", skills_raw) if 1 < len(s.strip()) < 40]

    return {
        "name": _first_name_line(secs.get("header", [])),
        "contact": contact,
        "summary": " ".join(secs.get("summary", []))[:500],
        "education": education,
        "experience": work_items("experience"),
        "projects": work_items("projects"),
        "skills": list(dict.fromkeys(skills))[:60],
        "certifications": [BULLET.sub("", l) for l in secs.get("certifications", [])][:10],
        "achievements": [BULLET.sub("", l) for l in secs.get("achievements", [])][:10],
        "publications": [BULLET.sub("", l) for l in secs.get("publications", [])][:10],
        "_sections": secs,
    }


LLM_RULES = """You extract structured data from a resume. Return ONLY JSON with this shape:
{"name": str, "headline": str, "contact": {"email": str, "phone": str, "location": str, "github": str, "linkedin": str, "portfolio": str},
 "summary": str,
 "education": [{"institution": str, "degree": str, "field": str, "dates": str, "gpa": str}],
 "experience": [{"company": str, "role": str, "dates": str, "location": str, "highlights": [str]}],
 "projects": [{"name": str, "technologies": [str], "description": str, "highlights": [str]}],
 "skills": [str], "certifications": [str], "achievements": [str], "publications": [str]}
STRICT RULES:
- Put each item ONLY in the section whose heading it appears under in the resume text. A job or internship at a company belongs in "experience" even if it describes building something; "projects" is only for items listed under a Projects heading (personal, academic or open-source work).
- contact.location is a city/state/country only. NEVER a school, university, institute or company name.
- "education" lists schools and degrees only. Never put a school in contact or experience.
- Copy facts exactly as written. Do not invent employers, dates, metrics or skills. Use "" or [] when something is absent.
- skills: only technologies the resume explicitly lists or clearly uses; never verbs or generic words.
- Research papers and publications go in "publications", not projects."""


async def _llm_parse(text: str) -> dict[str, Any] | None:
    keys = groq_keys()
    if not keys:
        return None
    for model in ("openai/gpt-oss-120b", "openai/gpt-oss-20b"):
        for key_id, key in keys:
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    res = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                        json={
                            "model": model,
                            "messages": [
                                {"role": "system", "content": LLM_RULES},
                                {"role": "user", "content": "RESUME TEXT:\n" + text[:9000]},
                            ],
                            "response_format": {"type": "json_object"},
                            "temperature": 0,
                            "max_tokens": 4000,
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
                    print(f"[ResumeParser] {key_id} {model} status {res.status_code}: {res.text[:140]}")
            except Exception as exc:
                print(f"[ResumeParser] {key_id} {model} error: {str(exc)[:140]}")
    return None


def _section_of(needle: str, secs: dict[str, list[str]]) -> str | None:
    n = re.sub(r"\W+", " ", needle).strip().lower()
    if len(n) < 3:
        return None
    for section, lines in secs.items():
        for line in lines:
            if n in re.sub(r"\W+", " ", line).strip().lower():
                return section
    return None


def _as_list(v: Any) -> list:
    return v if isinstance(v, list) else []


def validate_and_merge(llm: dict[str, Any] | None, det: dict[str, Any]) -> dict[str, Any]:
    secs = det["_sections"]
    out: dict[str, Any] = {}

    llm = llm or {}
    name = (llm.get("name") or det["name"] or "").strip()
    out["name"] = name.title() if name.isupper() else name

    contact = {k: str(v).strip() for k, v in (llm.get("contact") or {}).items() if isinstance(v, str) and v.strip()}
    for k, v in det["contact"].items():
        contact.setdefault(k, v)
    loc = contact.get("location", "")
    if loc and (INSTITUTION_WORDS.search(loc) or loc.lower() in " ".join(secs.get("education", [])).lower() and len(loc.split()) > 3):
        contact.pop("location")
        if det["contact"].get("location"):
            contact["location"] = det["contact"]["location"]
    out["contact"] = contact
    out["headline"] = str(llm.get("headline") or "").strip()
    out["summary"] = str(llm.get("summary") or det["summary"] or "").strip()

    education = [e for e in _as_list(llm.get("education")) if isinstance(e, dict) and (e.get("institution") or e.get("degree"))]
    if not education:
        education = [
            {"institution": e["institution"], "degree": "", "field": "", "dates": "", "gpa": ""} for e in det["education"]
        ]
    out["education"] = education

    experience = [x for x in _as_list(llm.get("experience")) if isinstance(x, dict)]
    projects = [x for x in _as_list(llm.get("projects")) if isinstance(x, dict)]
    publications = [str(x) for x in _as_list(llm.get("publications"))]

    # Re-home anything the model placed in the wrong section, using the resume's own headings.
    fixed_projects = []
    for p in projects:
        sec = _section_of(str(p.get("name") or ""), secs)
        if sec == "experience":
            experience.append(
                {"company": p.get("name", ""), "role": "", "dates": "", "location": "",
                 "highlights": [h for h in _as_list(p.get("highlights"))] or ([p["description"]] if p.get("description") else [])}
            )
        elif sec == "publications":
            publications.append(str(p.get("name") or ""))
        elif sec == "education":
            continue
        else:
            fixed_projects.append(p)
    fixed_experience = []
    for x in experience:
        label = str(x.get("company") or x.get("role") or "")
        sec = _section_of(label, secs)
        if sec == "projects" and not x.get("role"):
            fixed_projects.append(
                {"name": label, "technologies": [], "description": " ".join(_as_list(x.get("highlights")))[:300], "highlights": _as_list(x.get("highlights"))}
            )
        elif sec == "education":
            continue
        else:
            fixed_experience.append(x)

    if not fixed_experience and not fixed_projects and not llm:
        fixed_experience = [
            {"company": e["title"], "role": "", "dates": "", "location": "", "highlights": e["highlights"]} for e in det["experience"]
        ]
        fixed_projects = [
            {"name": p["title"], "technologies": [], "description": " ".join(p["highlights"])[:300], "highlights": p["highlights"]}
            for p in det["projects"]
        ]

    out["experience"] = fixed_experience
    out["projects"] = fixed_projects
    out["publications"] = publications or det["publications"]
    out["skills"] = [str(s) for s in _as_list(llm.get("skills"))] or det["skills"]
    out["certifications"] = [str(s) for s in _as_list(llm.get("certifications"))] or det["certifications"]
    out["achievements"] = [str(s) for s in _as_list(llm.get("achievements"))] or det["achievements"]
    out["parser"] = "llm+validated" if llm else "deterministic"
    return out


async def parse_resume(text: str) -> dict[str, Any]:
    det = parse_deterministic(text)
    llm = await _llm_parse(text)
    return validate_and_merge(llm, det)
