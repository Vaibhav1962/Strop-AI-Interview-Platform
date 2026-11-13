"""Make Alex's replies sound like a person talking, not like a code listing being read aloud.

Alex is spoken by a speech synthesizer and shown as a transcript. A literal array such as "[1, 2, 3, 4, 5]" is awkward in both:
the synthesizer says "bracket one comma two...", and the transcript reads like debug output. The prompt tells the model to describe
data in words; this is the deterministic safety net for when it does not. frontend/src/lib/spokenText.ts mirrors it.
"""

from __future__ import annotations

import re

_NUM = r"-?\d+(?:\.\d+)?"
# A flat list of at least two numbers. Nested lists ("[[1,2],[3,4]]") are left alone: they cannot be read naturally.
_FLAT_NUMBER_LIST = re.compile(rf"(?<![\[\w])\[\s*({_NUM}(?:\s*,\s*{_NUM})+)\s*\](?![\]\w])")
MAX_SPOKEN_ITEMS = 6


def _say_number(token: str) -> str:
    token = token.strip()
    return f"minus {token[1:]}" if token.startswith("-") else token


def _speak_list(match: re.Match[str]) -> str:
    items = [_say_number(t) for t in match.group(1).split(",")]
    if len(items) > MAX_SPOKEN_ITEMS:
        return "the example array"
    if len(items) == 2:
        return f"{items[0]} and {items[1]}"
    return ", ".join(items[:-1]) + f" and {items[-1]}"


def to_spoken_text(text: str) -> str:
    """Rewrite flat numeric list literals as words. Anything else is returned unchanged."""
    if not text or "[" not in text or "[[" in text:
        return text
    return _FLAT_NUMBER_LIST.sub(_speak_list, text)
