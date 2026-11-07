"""PDF text extraction that survives small caps, kerning and letter-spaced headings.

pypdf's default mode starts a new chunk whenever the font size changes, so "Vaibhav" set as a large V followed
by smaller aibhav comes out as "V" / "aibhav". Layout mode places characters by position instead, which keeps
words intact. The default mode is only a fallback, and a conservative repair pass runs on it.
"""

from __future__ import annotations

import io
import re

from pypdf import PdfReader

# Single capitals that are legitimate words or language names, so they must never be joined to the next word.
_KEEP_SINGLE = set("AICR")
_BROKEN_HEAD = re.compile(r"\b([A-Z]) ([a-z]{3,})\b")


def _collapse_spaces(text: str) -> str:
    lines = []
    for line in text.splitlines():
        lead = len(line) - len(line.lstrip(" "))
        body = re.sub(r"[ \t]{2,}", " ", line.strip())
        # keep a little indentation so wrapped bullet lines stay recognisable, but never wide column padding
        lines.append((" " * min(lead, 2)) + body if body else "")
    return "\n".join(lines)


def repair_text(text: str) -> str:
    """Fix 'T echnology' style splits that remain when only the default extraction was possible."""

    def join(m: re.Match) -> str:
        return m.group(0) if m.group(1) in _KEEP_SINGLE else m.group(1) + m.group(2)

    return _BROKEN_HEAD.sub(join, text)


def extract_pdf_text(data: bytes) -> str:
    reader = PdfReader(io.BytesIO(data))
    layout_pages: list[str] = []
    plain_pages: list[str] = []
    for page in reader.pages:
        try:
            layout_pages.append(page.extract_text(extraction_mode="layout") or "")
        except Exception:
            layout_pages.append("")
        try:
            plain_pages.append(page.extract_text() or "")
        except Exception:
            plain_pages.append("")

    layout = _collapse_spaces("\n".join(layout_pages)).strip()
    plain = "\n".join(plain_pages).strip()
    # Layout mode can come back empty or truncated on unusual PDFs; then use the default mode.
    if len(layout) >= max(40, int(len(plain) * 0.6)):
        return layout
    return repair_text(plain)
