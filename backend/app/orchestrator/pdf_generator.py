"""PDF report for Strop interviews, in the same Obsidian look as the web app.

Sections: header, technical skill profile (radar) with what went well / what didn't / key improvements,
communication delivery profile (radar) with what went well / what didn't / advice, and the full transcript.
The content rules mirror the web report (frontend/src/lib/reportNormalizer.ts) so both show the same thing.
"""

from __future__ import annotations

import io
import math
import re
from datetime import datetime
from typing import Any
from xml.sax.saxutils import escape

from reportlab.lib.colors import Color, HexColor
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

# ---- Obsidian palette (matches --ob-* tokens in index.css) ----
BG = HexColor("#121211")
PANEL = HexColor("#181817")
PANEL2 = HexColor("#20201e")
LINE = HexColor("#2b2b28")
LINE2 = HexColor("#3a3a36")
TEXT = HexColor("#ebe9e2")
TEXT2 = HexColor("#aaa89f")
TEXT3 = HexColor("#8f8d85")
CREAM = HexColor("#e6dfcc")
OK = HexColor("#6fd6a4")
WARN = HexColor("#e8bd6f")
HOT = HexColor("#ff6a3d")
BLUE = HexColor("#8fb4e8")

PAGE_W, PAGE_H = letter
MARGIN = 44
CONTENT_W = PAGE_W - 2 * MARGIN

LEVEL_WORDS = ["", "Developing", "Working", "Fluent", "Expert"]

RADAR_LABELS = {
    "problem_clarification": "Clarifying",
    "data_structure_and_algorithm_selection": "Data Structures",
    "solution_correctness": "Correctness",
    "time_and_space_complexity": "Complexity",
    "edge_case_identification": "Edge Cases",
    "code_quality_and_implementation": "Code Quality",
    "debugging_and_optimization": "Debugging",
    "scope_and_quantitative_estimation": "Scoping & Sizing",
    "system_architecture_and_data_flow": "Architecture",
    "data_modeling_and_storage": "Data & Storage",
    "distributed_consistency_and_transactions": "Consistency",
    "resilience_and_failure_recovery": "Resilience",
    "tradeoff_analysis_and_retrospective": "Trade-offs",
    "os_internals_and_memory": "OS & Memory",
    "networking_and_protocols": "Networking",
    "concurrency_and_synchronization": "Concurrency",
    "database_engine_internals": "Databases",
    "technical_depth_and_rigor": "Systems Reasoning",
    "systems_troubleshooting": "Troubleshooting",
    "ownership_and_accountability": "Ownership",
    "technical_leadership_and_collaboration": "Collaboration",
    "conflict_resolution": "Conflict Handling",
    "handling_ambiguity_and_crisis": "Crisis Handling",
    "communication_and_star_structure": "Story Structure",
    "retrospective_growth_and_learning": "Reflection",
    "resume_project_architecture": "Project Design",
    "technical_depth_and_claims": "Technical Depth",
    "production_incident_recovery": "Incident Recovery",
    "scaling_tradeoffs_and_evolution": "Scaling",
    "strategic_technical_vision": "Vision",
    "rfc_craft_and_stakeholder_influence": "RFC & Influence",
    "cross_functional_alignment": "Alignment",
    "engineering_governance_and_standards": "Governance",
}
NOT_RADAR = {"hint_responsiveness"}
COMM_LABELS = {
    "clarity": "Clarity",
    "structure": "Structure",
    "conciseness": "Conciseness",
    "verbal_fluency": "Fluency",
    "confidence": "Confidence",
    "technical_communication": "Tech Explaining",
    "responsiveness": "Listening",
}
BUZZWORDS = [
    "leverage", "robust", "seamless", "scalable", "best practices", "cutting-edge", "cutting edge", "synergy",
    "holistic", "paradigm", "state of the art", "game changer", "end-to-end", "optimal", "efficient",
]
from app.orchestrator.delivery_scoring import cap_level, filler_level, pace_level, tic_stats  # noqa: E402

HEDGES = ["basically", "kind of", "sort of", "i guess", "maybe", "probably", "simply", "i think", "you know"]

_UNICODE_MAP = {
    "‘": "'", "’": "'", "“": '"', "”": '"', "–": "-", "—": "-", "…": "...",
    "•": "-", "→": "->", "≤": "<=", "≥": ">=", "×": "x", "≈": "~",
    " ": " ", "​": "", "‐": "-", "‑": "-", "‒": "-", "−": "-", " ": " ", " ": " ", "­": "",
}


def clean(text: Any) -> str:
    """Helvetica only covers Latin-1, so map common unicode and drop what cannot be drawn."""
    t = str(text or "")
    for k, v in _UNICODE_MAP.items():
        t = t.replace(k, v)
    return t.encode("latin-1", "ignore").decode("latin-1")


def esc(text: Any) -> str:
    return escape(clean(text))


# --------------------------------------------------------------------------- content
def _level(rating: str) -> int:
    r = (rating or "").lower()
    if "exemplary" in r:
        return 4
    if "strong" in r:
        return 3
    if "adequate" in r:
        return 2
    return 1


def _split_title(item: str) -> tuple[str, str]:
    head, sep, rest = str(item).partition(":")
    title = re.sub(r"^[0-9.\s]+", "", head).strip()
    return (title, rest.strip()) if sep else (title, "")


def _snippet(text: str, idx: int, n: int) -> str:
    start, end = max(0, idx - 45), min(len(text), idx + n + 60)
    return ("..." if start else "") + text[start:end].strip() + ("..." if end < len(text) else "")


def _patterns(turns: list[str]) -> list[dict[str, Any]]:
    out = []
    for kind, terms in (("buzzword", BUZZWORDS), ("hedge", HEDGES)):
        for term in terms:
            count, example = 0, ""
            for t in turns:
                low = t.lower()
                i = low.find(term)
                while i != -1:
                    count += 1
                    example = example or _snippet(t, i, len(term))
                    i = low.find(term, i + len(term))
            if count >= 2:
                out.append({"kind": kind, "term": term, "count": count, "example": example})
    return sorted(out, key=lambda p: -p["count"])[:4]


_STOP = {"with", "that", "this", "from", "their", "into", "were", "have", "been", "when", "which", "also", "about", "across", "while"}


def _tokens(text: str) -> set[str]:
    return {w for w in re.split(r"[^a-z0-9]+", (text or "").lower()) if len(w) > 3 and w not in _STOP}


def _best_evidence(text: str, comps: list[dict[str, Any]], kind: str) -> tuple[str, str]:
    """(quote, note) of the interview quote that best supports a strength or gap, matched by wording."""
    want = _tokens(text)
    best, best_score = None, 0
    for c in comps:
        if not (c.get("evidence_quotes") or []) or c.get("competency_id") in NOT_RADAR:
            continue
        pool = " ".join((c.get("strengths") if kind == "strength" else c.get("gaps_or_limitations")) or []) + " " + str(c.get("competency_name", ""))
        score = len(want & _tokens(pool))
        if kind == "gap" and c.get("gaps_or_limitations") and score > 0:
            score += 1
        if score > best_score:
            best, best_score = c, score
    if not best:
        return "", ""
    qs = best.get("evidence_quotes") or []
    q = next((x for x in qs if re.search(r"candidate|you", str(x.get("speaker", "")), re.I)), qs[0])
    note = re.sub(r"^(shows|show|demonstrates)\s+", "", str(q.get("relevance") or "").strip(), flags=re.I)
    return str(q.get("quote", ""))[:190], note


def build_content(report: dict[str, Any], transcript: list[dict[str, Any]]) -> dict[str, Any]:
    comps = report.get("competency_evaluations") or []

    radar = []
    for c in comps:
        if c.get("bars_level") and c.get("evidence_classification") != "Insufficient coverage" and c.get("competency_id") not in NOT_RADAR:
            label = RADAR_LABELS.get(c.get("competency_id")) or re.split(r"[&,]", c.get("competency_name", ""))[0].strip()[:16]
            radar.append((label, int(c["bars_level"])))

    strengths = []
    for s in (report.get("key_technical_strengths") or [])[:3]:
        t, b = _split_title(s)
        quote, note = _best_evidence(s, comps, "strength")
        strengths.append({"title": t, "body": b or s, "quote": quote, "note": note})
    if not strengths:
        for c in comps:
            if len(strengths) < 3 and c.get("strengths"):
                strengths.append({"title": c.get("competency_name", ""), "body": c["strengths"][0], "quote": ""})

    gaps = []
    for g in (report.get("key_technical_weaknesses") or [])[:3]:
        t, b = _split_title(g)
        quote, note = _best_evidence(g, comps, "gap")
        gaps.append({"title": t, "body": b or g, "quote": quote, "note": note})
    if not gaps:
        for c in comps:
            if len(gaps) < 3 and c.get("gaps_or_limitations") and c.get("evidence_classification") != "Insufficient coverage":
                gaps.append({"title": c.get("competency_name", ""), "body": c["gaps_or_limitations"][0]})

    recs = []
    for i, item in enumerate((report.get("actionable_growth_plan") or [])[:3]):
        t, b = _split_title(item)
        recs.append({"title": t, "body": b or item, "chip": "High" if i == 0 else "Medium"})

    card = report.get("communication_scorecard") or {}
    dims = card.get("dimensions") or []
    tele = card.get("telemetry") or {}
    cand_turns = [str(t.get("text", "")) for t in transcript if t.get("speaker") in ("Candidate", "You")]

    # Evidence from the transcript, not the model's default rating: verbal tics cap the axes they make unreliable.
    tic_total, tic_breakdown, tic_words, rate = tic_stats(cand_turns)

    def lvl(d: dict[str, Any]) -> int:
        return cap_level(_level(d.get("rating", "")), str(d.get("dimension_id", "")), rate)

    comm_radar = [(COMM_LABELS.get(d.get("dimension_id"), str(d.get("name", ""))[:14]), lvl(d)) for d in dims]
    wpm = float(tele.get("estimated_wpm") or 0)
    pace = pace_level(wpm) if wpm > 0 else None
    if pace is not None:
        comm_radar.append(("Pace", pace))
    if rate is not None:
        comm_radar.append(("Filler Control", filler_level(rate)))

    went = [{"title": d.get("name", ""), "body": d.get("observation", ""), "quote": d.get("evidence_quote") or ""} for d in dims if lvl(d) >= 3]
    work = [{"title": d.get("name", ""), "body": d.get("observation", ""), "quote": d.get("evidence_quote") or ""} for d in dims if lvl(d) <= 2]
    pats = _patterns(cand_turns)
    for p in pats:
        if p["kind"] == "buzzword":
            work.append({"title": f'Leaned on the buzzword "{p["term"]}"', "quote": p["example"],
                         "body": f'You used "{p["term"]}" {p["count"]} times without saying what it meant in your solution. Interviewers hear this as a claim with nothing behind it.'})
        else:
            work.append({"title": f'Hedged with "{p["term"]}"', "quote": p["example"],
                         "body": f'"{p["term"]}" came up {p["count"]} times. It softens points you actually know and makes answers sound less certain than they are.'})
    if rate is not None:
        top = ", ".join(f'"{w}" {n}x' for w, n in sorted(tic_breakdown.items(), key=lambda kv: -kv[1])[:3])
        total = round(tic_total)
        if rate >= 1.0:
            work.append({"title": "Filler words and verbal tics", "quote": "",
                         "body": f"{total} filler or hedge words in {tic_words} words ({rate:.1f} per 100)" + (f": {top}." if top else ".")})
        elif rate < 0.5:
            went.append({"title": "Controlled delivery", "body": f"Only {total} filler or hedge words across {tic_words} words.", "quote": ""})
    if pace is not None and pace <= 2:
        work.append({"title": "Speaking pace", "body": f"{int(wpm)} words per minute is outside the comfortable 125-165 range.", "quote": ""})
    elif pace == 4:
        went.append({"title": "Speaking pace", "body": f"{int(wpm)} words per minute sits in the comfortable 125-165 range.", "quote": ""})

    advice = []
    for p in pats:
        advice.append(
            f'Replace "{p["term"]}" with the concrete fact behind it, for example the data structure, the number or the trade-off you chose.'
            if p["kind"] == "buzzword"
            else f'Drop "{p["term"]}" and state the point directly. A short pause reads as more confident than a hedge.'
        )
    for d in dims:
        if lvl(d) <= 2:
            advice.append(f'{d.get("name", "")}: {d.get("observation", "")}')
    advice += [
        "Lead with the decision, then the reasoning. For example: 'I will use a hash map keyed by the sorted string, because ...'.",
        "Signpost transitions out loud ('First the constraints, then the baseline, then the optimization') so the interviewer can follow your plan.",
    ]

    return {
        "radar": radar, "strengths": strengths, "gaps": gaps, "recs": recs,
        "comm_radar": comm_radar, "went": went, "work": work, "advice": advice[:6],
    }


# --------------------------------------------------------------------------- drawing
class Radar(Flowable):
    """Spider chart on the Obsidian panel: grid rings, spokes, cream polygon."""

    def __init__(self, data: list[tuple[str, int]], width: float, height: float):
        super().__init__()
        self.data, self.width, self.height = data, width, height

    def wrap(self, *_):
        return self.width, self.height

    def draw(self):
        c = self.canv
        n = len(self.data)
        cx, cy = self.width / 2, self.height / 2
        r = min(self.width, self.height) / 2 - 34
        if n < 3:
            return
        c.saveState()
        c.setStrokeColor(LINE2)
        c.setLineWidth(0.5)
        for ring in range(1, 5):
            rr = r * ring / 4
            pts = [(cx + rr * math.sin(2 * math.pi * i / n), cy + rr * math.cos(2 * math.pi * i / n)) for i in range(n)]
            p = c.beginPath()
            p.moveTo(*pts[0])
            for pt in pts[1:]:
                p.lineTo(*pt)
            p.close()
            c.drawPath(p, stroke=1, fill=0)
        for i in range(n):
            c.line(cx, cy, cx + r * math.sin(2 * math.pi * i / n), cy + r * math.cos(2 * math.pi * i / n))
        pts = [(cx + r * lv / 4 * math.sin(2 * math.pi * i / n), cy + r * lv / 4 * math.cos(2 * math.pi * i / n)) for i, (_, lv) in enumerate(self.data)]
        p = c.beginPath()
        p.moveTo(*pts[0])
        for pt in pts[1:]:
            p.lineTo(*pt)
        p.close()
        c.setFillColor(Color(0.902, 0.875, 0.8, alpha=0.28))
        c.setStrokeColor(CREAM)
        c.setLineWidth(1.4)
        c.drawPath(p, stroke=1, fill=1)
        c.setFillColor(CREAM)
        for x, y in pts:
            c.circle(x, y, 2.2, stroke=0, fill=1)
        c.setFillColor(TEXT2)
        c.setFont("Helvetica", 8)
        for i, (label, _) in enumerate(self.data):
            ang = 2 * math.pi * i / n
            x, y = cx + (r + 14) * math.sin(ang), cy + (r + 14) * math.cos(ang)
            s = math.sin(ang)
            if abs(s) < 0.2:
                c.drawCentredString(x, y - 3, clean(label))
            elif s > 0:
                c.drawString(x, y - 3, clean(label))
            else:
                c.drawRightString(x, y - 3, clean(label))
        c.restoreState()


class NumberedCanvas(canvas.Canvas):
    def __init__(self, *a, **k):
        super().__init__(*a, **k)
        self._pages: list[dict] = []

    def showPage(self):
        self._pages.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._pages)
        for state in self._pages:
            self.__dict__.update(state)
            self.setFont("Courier", 7.5)
            self.setFillColor(TEXT3)
            self.drawString(MARGIN, 26, "STROP  /  INTERVIEW REPORT")
            self.drawRightString(PAGE_W - MARGIN, 26, f"{self._pageNumber} / {total}")
            super().showPage()
        super().save()


def _paint_background(c, _doc):
    c.saveState()
    c.setFillColor(BG)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.5)
    c.line(MARGIN, 40, PAGE_W - MARGIN, 40)
    c.restoreState()


# --------------------------------------------------------------------------- styles + blocks
def _styles() -> dict[str, ParagraphStyle]:
    base = dict(fontName="Helvetica", textColor=TEXT, fontSize=9.5, leading=14)
    return {
        "title": ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=24, leading=28, textColor=TEXT),
        "label": ParagraphStyle("l", fontName="Courier", fontSize=7.5, leading=10, textColor=TEXT3),
        "meta": ParagraphStyle("m", fontName="Courier", fontSize=8.5, leading=12, textColor=TEXT2),
        "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=13, leading=17, textColor=TEXT),
        "h3": ParagraphStyle("h3", fontName="Helvetica-Bold", fontSize=10.5, leading=14, textColor=TEXT),
        "body": ParagraphStyle("b", **base),
        "muted": ParagraphStyle("mu", **{**base, "textColor": TEXT2}),
        "quote": ParagraphStyle("q", fontName="Helvetica-Oblique", fontSize=8.5, leading=12, textColor=TEXT2),
        "tx_speaker": ParagraphStyle("ts", fontName="Courier-Bold", fontSize=7.5, leading=11, textColor=TEXT3),
        "tx_body": ParagraphStyle("tb", **{**base, "fontSize": 9, "leading": 13}),
    }


def _section_title(label: str, title: str, st):
    return [Spacer(1, 6), Paragraph(esc(label.upper()), st["label"]), Spacer(1, 3), Paragraph(esc(title), st["h2"]), Spacer(1, 8)]


def _group_title(text: str, color, st):
    return Paragraph(f'<font color="{color.hexval().replace("0x", "#")}">&#9679;</font>&nbsp;&nbsp;{esc(text)}', st["h3"])


def _card(accent, title: str, body: str, st, quote: str = "", chip: str = "", note: str = ""):
    norm = lambda x: re.sub(r"\W+", " ", (x or "").lower()).strip()
    dup = not body or norm(body) == norm(title) or norm(body).startswith(norm(title))
    hx = accent.hexval().replace("0x", "#")
    parts: list[Any] = []
    if dup:
        parts.append(Paragraph(esc(body or title), st["body"]))
    else:
        parts.append(Paragraph(f'<font color="{hx}"><b>{esc(title)}</b></font>', st["body"]))
        parts.append(Spacer(1, 2))
        parts.append(Paragraph(esc(body), st["body"]))
    if quote:
        parts.append(Spacer(1, 4))
        parts.append(Paragraph(f'<font name="Courier" size="6.5" color="#8f8d85">EXAMPLE&nbsp;&nbsp;</font>"{esc(quote)}"', st["quote"]))
    if note:
        parts.append(Spacer(1, 3))
        parts.append(Paragraph(f'<font color="#8f8d85">What this shows: {esc(note)}</font>', st["muted"]))
    if chip:
        parts.append(Spacer(1, 3))
        parts.append(Paragraph(f'<font name="Courier" size="7" color="#8f8d85">PRIORITY: {esc(chip.upper())}</font>', st["body"]))
    t = Table([[parts]], colWidths=[CONTENT_W])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PANEL),
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("LINEBEFORE", (0, 0), (0, -1), 2.2, accent),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    return KeepTogether([t, Spacer(1, 7)])


def _radar_panel(title: str, subtitle: str, data: list[tuple[str, int]], empty: str, st):
    head = [Paragraph(esc(title), st["h3"]), Paragraph(esc(subtitle), st["muted"]), Spacer(1, 4)]
    if len(data) < 3:
        body: list[Any] = head + [Paragraph(esc(empty), st["muted"])]
        t = Table([[body]], colWidths=[CONTENT_W])
    else:
        legend = Table(
            [[Paragraph(esc(lbl), st["body"]), Paragraph(f'<font name="Courier" size="7.5" color="#8f8d85">{lv}/4&nbsp;&nbsp;{LEVEL_WORDS[lv]}</font>', st["body"])] for lbl, lv in data],
            colWidths=[112, 92],
        )
        legend.setStyle(TableStyle([("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
        t = Table([[head], [Table([[Radar(data, 270, 215), legend]], colWidths=[280, CONTENT_W - 280 - 24])]], colWidths=[CONTENT_W])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PANEL),
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return [t, Spacer(1, 14)]


# --------------------------------------------------------------------------- entry point
def generate_bars_pdf(
    report_data: dict[str, Any],
    candidate_name: str = "Candidate",
    track: str | None = None,
    transcript: list[dict[str, Any]] | None = None,
) -> bytes:
    st = _styles()
    transcript = transcript or []
    content = build_content(report_data, transcript)

    buf = io.BytesIO()
    doc = BaseDocTemplate(buf, pagesize=letter, leftMargin=MARGIN, rightMargin=MARGIN, topMargin=MARGIN, bottomMargin=54,
                          title="Strop Interview Report", author="Strop")
    doc.addPageTemplates([PageTemplate(id="p", frames=[Frame(MARGIN, 54, CONTENT_W, PAGE_H - MARGIN - 54, id="f", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)], onPage=_paint_background)])

    track_name = (report_data.get("track") or track or "Technical Interview").replace("_", " ")
    evaluated = report_data.get("evaluated_at")
    try:
        date_txt = datetime.fromisoformat(str(evaluated).replace("Z", "+00:00")).strftime("%b %d, %Y")
    except Exception:
        date_txt = datetime.now().strftime("%b %d, %Y")

    s: list[Any] = [
        Paragraph("STROP  /  INTERVIEW REPORT", st["label"]),
        Spacer(1, 8),
        Paragraph("Interview Assessment Report", st["title"]),
        Spacer(1, 6),
        Paragraph(esc(f"{track_name}  /  {date_txt}  /  {candidate_name}"), st["meta"]),
        Spacer(1, 16),
    ]

    # ---- technical
    s += _section_title("Part 1", "Technical assessment", st)
    s += _radar_panel("Skill profile", f"How you did on each {track_name} skill that came up", content["radar"],
                      "Not enough of the interview was covered to draw a profile. Three or more skills need evidence.", st)

    s.append(_group_title("What went well", OK, st)); s.append(Spacer(1, 6))
    if content["strengths"]:
        for x in content["strengths"]:
            s.append(_card(OK, x["title"], x["body"], st, quote=x["quote"], note=x.get("note", "")))
    else:
        s.append(Paragraph("No standout strengths were recorded for this session.", st["muted"]))

    s += [Spacer(1, 8), _group_title("What didn't go as well", WARN, st), Spacer(1, 6)]
    if content["gaps"]:
        for x in content["gaps"]:
            s.append(_card(WARN, x["title"], x["body"], st, quote=x.get("quote", ""), note=x.get("note", "")))
    else:
        s.append(Paragraph("No major gaps were recorded for this session.", st["muted"]))

    s += [Spacer(1, 8), _group_title("Key improvements", BLUE, st), Spacer(1, 6)]
    if content["recs"]:
        for x in content["recs"]:
            s.append(_card(BLUE, x["title"], x["body"], st, chip=x["chip"]))
    else:
        s.append(Paragraph("No practice recommendations were generated.", st["muted"]))

    # ---- communication
    s.append(PageBreak())
    s += _section_title("Part 2", "Communication and delivery", st)
    s += _radar_panel("Delivery profile", "How you came across, from your spoken answers", content["comm_radar"],
                      "Not enough spoken answers were recorded to draw a delivery profile.", st)

    s += [_group_title("What went well", OK, st), Spacer(1, 6)]
    if content["went"]:
        for x in content["went"]:
            s.append(_card(OK, x["title"], x["body"], st, quote=x["quote"]))
    else:
        s.append(Paragraph("No clear communication strengths were recorded.", st["muted"]))

    s += [Spacer(1, 8), _group_title("What didn't go as well", WARN, st), Spacer(1, 6)]
    if content["work"]:
        for x in content["work"]:
            s.append(_card(WARN, x["title"], x["body"], st, quote=x["quote"]))
    else:
        s.append(Paragraph("No communication problems stood out.", st["muted"]))

    s += [Spacer(1, 8), _group_title("Advice", BLUE, st), Spacer(1, 6)]
    for tip in content["advice"]:
        s.append(_card(BLUE, tip, "", st))

    # ---- transcript
    s.append(PageBreak())
    s += _section_title("Part 3", "Transcript", st)
    if not transcript:
        s.append(Paragraph("No transcript was recorded for this session.", st["muted"]))
    for turn in transcript:
        who = "Alex" if turn.get("speaker") in ("Alex", "AI", "Interviewer") else "You"
        hx = "#e6dfcc" if who == "Alex" else "#6fd6a4"
        when = turn.get("time") or ""
        head = Paragraph(f'<font color="{hx}">{who.upper()}</font>' + (f'&nbsp;&nbsp;<font color="#55544e">{esc(when)}</font>' if when and when != "00:00" else ""), st["tx_speaker"])
        body = Paragraph(esc(turn.get("text", "")).replace("\n", "<br/>"), st["tx_body"])
        row = Table([[[head, Spacer(1, 2), body]]], colWidths=[CONTENT_W])
        row.setStyle(TableStyle([
            ("LINEBEFORE", (0, 0), (0, -1), 1.4, CREAM if who == "Alex" else OK),
            ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        s += [row, Spacer(1, 6)]

    doc.build(s, canvasmaker=NumberedCanvas)
    return buf.getvalue()
