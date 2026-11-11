"""Deterministic, evidence-based scoring of how a candidate sounded.

The radar's delivery axes used to lean on the model's default "Strong" rating and on a six-word filler list. Speech
to text engines also drop "um" and "uh", so the signal that is actually left in a transcript is verbal tics such as
"simply", "basically" and "you know". This module counts those, turns the rate into a level (1 to 4), and uses it to
cap the axes it makes unreliable. The same rules are mirrored in frontend/src/lib/deliveryScoring.ts: keep them in sync.
"""

import re
from typing import Iterable

# (label, regex, weight). Weight 1 for words that add nothing; softer hedges that can be legitimate count half.
TICS: list[tuple[str, str, float]] = [
    ("um/uh", r"\b(?:um+|uh+|erm|er|hmm+)\b", 1.0),
    ("you know", r"\byou know\b", 1.0),
    ("i mean", r"\bi mean\b", 1.0),
    ("like", r",\s*like\b|\blike,", 1.0),
    ("basically", r"\bbasically\b", 1.0),
    ("simply", r"\bsimply\b", 1.0),
    ("literally", r"\bliterally\b", 1.0),
    ("essentially", r"\bessentially\b", 1.0),
    ("honestly", r"\bhonestly\b", 1.0),
    ("obviously", r"\bobviously\b", 1.0),
    ("kind of", r"\bkind of\b", 1.0),
    ("sort of", r"\bsort of\b", 1.0),
    ("i guess", r"\bi guess\b", 1.0),
    ("actually", r"\bactually\b", 0.5),
    ("i think", r"\bi think\b", 0.5),
    ("maybe", r"\bmaybe\b", 0.5),
    ("probably", r"\bprobably\b", 0.5),
]
_COMPILED = [(label, re.compile(rx), w) for label, rx, w in TICS]

# Below this many words a rate means nothing, so the axis is left unscored rather than guessed.
MIN_WORDS_FOR_RATE = 40


def count_tics(text: str) -> tuple[float, dict[str, int]]:
    """(weighted total, {label: occurrences}) for one block of spoken text."""
    low = (text or "").lower()
    breakdown: dict[str, int] = {}
    weighted = 0.0
    for label, rx, weight in _COMPILED:
        n = len(rx.findall(low))
        if n:
            breakdown[label] = n
            weighted += n * weight
    return weighted, breakdown


def tic_stats(turns: Iterable[str]) -> tuple[float, dict[str, int], int, float | None]:
    """(weighted tics, breakdown, total words, tics per 100 words or None when there is too little speech)."""
    weighted = 0.0
    breakdown: dict[str, int] = {}
    words = 0
    for turn in turns:
        w, b = count_tics(turn)
        weighted += w
        for k, v in b.items():
            breakdown[k] = breakdown.get(k, 0) + v
        words += len((turn or "").split())
    rate = (weighted / words * 100.0) if words >= MIN_WORDS_FOR_RATE else None
    return weighted, breakdown, words, rate


def filler_level(rate: float) -> int:
    """Tics per 100 words to a 1-4 level. Strict: 4 means almost none."""
    if rate < 0.4:
        return 4
    if rate < 1.0:
        return 3
    if rate < 2.0:
        return 2
    return 1


def cap_level(level: int, dimension_id: str, rate: float | None) -> int:
    """Lower a model-given level when the transcript contradicts it. Never raises a level."""
    if rate is None:
        return level
    if dimension_id == "verbal_fluency":
        return min(level, filler_level(rate))
    if dimension_id in ("confidence", "conciseness"):
        return min(level, filler_level(rate * 0.7))
    if dimension_id in ("clarity", "structure", "technical_communication") and rate >= 3.0:
        return min(level, 2)
    return level


def pace_level(wpm: float) -> int | None:
    """Words per minute to a 1-4 level, or None when the estimate is not believable."""
    if wpm < 40 or wpm > 260:
        return None
    if 125 <= wpm <= 165:
        return 4
    if 110 <= wpm <= 180:
        return 3
    if 95 <= wpm <= 195:
        return 2
    return 1
