"""Groq API keys, in priority order, with a short per-key cooldown after a rate limit.

Groq's free tier limits tokens and requests per organization, so a second key from another account roughly doubles
the headroom. Callers loop `for key_id, key in groq_keys()` for each model, so a 429 on the first key moves on to
the second one immediately instead of failing the whole step.

Keys: GROQ_API_KEY first, then GROQ2_API_KEY (either may be missing).

Each key has its own per-minute token budget per model, so with two keys the budgets add up. `ordered_keys` puts the
key that has used the fewest tokens in the last minute first, which spreads requests across both instead of
exhausting the first key and paying for a failed request before using the second.
"""

import os
import time

RATE_LIMIT_COOLDOWN_SECONDS = 60.0

_cooldown_until: dict[str, float] = {}
_usage: dict[tuple[str, str], list[tuple[float, int]]] = {}
USAGE_WINDOW_SECONDS = 60.0


def groq_keys() -> list[tuple[str, str]]:
    """[(key_id, key)] for every configured key, skipping blanks and duplicates. key_id is safe to log."""
    from app.config import get_settings

    settings = get_settings()
    candidates = [
        ("groq1", os.getenv("GROQ_API_KEY") or getattr(settings, "groq_api_key", "")),
        ("groq2", os.getenv("GROQ2_API_KEY") or getattr(settings, "groq2_api_key", "")),
    ]
    keys: list[tuple[str, str]] = []
    seen: set[str] = set()
    for key_id, key in candidates:
        key = (key or "").strip()
        if key and key not in seen:
            seen.add(key)
            keys.append((key_id, key))
    return keys


def has_groq() -> bool:
    return bool(groq_keys())


def cooling_down(*parts: str) -> bool:
    return _cooldown_until.get(":".join(parts), 0.0) > time.monotonic()


def start_cooldown(*parts: str, seconds: float = RATE_LIMIT_COOLDOWN_SECONDS) -> None:
    _cooldown_until[":".join(parts)] = time.monotonic() + seconds


def record_usage(key_id: str, model: str, tokens: int) -> None:
    """Remember roughly how many tokens a request cost, for load balancing."""
    now = time.monotonic()
    entries = _usage.setdefault((key_id, model), [])
    entries.append((now, max(0, int(tokens))))
    cutoff = now - USAGE_WINDOW_SECONDS
    _usage[(key_id, model)] = [e for e in entries if e[0] >= cutoff]


def recent_tokens(key_id: str, model: str) -> int:
    cutoff = time.monotonic() - USAGE_WINDOW_SECONDS
    return sum(t for ts, t in _usage.get((key_id, model), []) if ts >= cutoff)


def ordered_keys(model: str) -> list[tuple[str, str]]:
    """Configured keys, least-used (last minute) first. Ties keep the configured order."""
    keys = groq_keys()
    return sorted(keys, key=lambda kv: recent_tokens(kv[0], model))


def estimate_tokens(*texts: str) -> int:
    """Rough token count (about 4 characters per token); good enough to balance load."""
    return sum(len(t or "") for t in texts) // 4
