"""In-memory sliding window rate limiter for security-critical endpoints."""

import time
from collections import defaultdict

from fastapi import Depends, HTTPException, status


class SlidingWindowRateLimiter:
    def __init__(self, max_requests: int, window_seconds: float):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._history: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str) -> None:
        now = time.time()
        window_start = now - self.window_seconds
        
        # Prune old timestamps
        timestamps = [t for t in self._history[key] if t > window_start]
        if len(self._history) > 20000:  # keep memory bounded: drop keys with no recent activity
            for k in [k for k, v in self._history.items() if not v or v[-1] <= window_start]:
                self._history.pop(k, None)
        
        if len(timestamps) >= self.max_requests:
            oldest = timestamps[0] if timestamps else now
            retry_after = int(self.window_seconds - (now - oldest)) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Please wait {retry_after} seconds.",
                headers={"Retry-After": str(max(1, retry_after))},
            )
        
        timestamps.append(now)
        self._history[key] = timestamps


def limit_user(limiter: "SlidingWindowRateLimiter"):
    """FastAPI dependency: throttle an endpoint per signed-in user. Use as `dependencies=[Depends(limit_user(x))]`."""
    from app.api.deps import get_current_user  # local import: deps must not depend on this module
    from app.models.user import User

    async def _check(current_user: User = Depends(get_current_user)) -> None:
        limiter.check(str(current_user.id))

    return _check


# Pre-configured rate limiters. All are per user (or per IP for auth) and held in this process's memory:
# if the API ever runs as several processes/instances, move them to a shared store such as Redis.
#
# Code is compiled and run in the candidate's browser, so there is no execution endpoint to protect.

# Speech-to-text: 75 per minute per user (live snapshots re-send the growing recording every few seconds)
stt_limiter = SlidingWindowRateLimiter(max_requests=75, window_seconds=60.0)

# Text-to-speech: 45 syntheses per minute per user
tts_limiter = SlidingWindowRateLimiter(max_requests=45, window_seconds=60.0)

# Document extraction: 10 uploads per minute per user
doc_limiter = SlidingWindowRateLimiter(max_requests=10, window_seconds=60.0)


# Authentication: slow down password guessing and mass account creation.
login_ip_limiter = SlidingWindowRateLimiter(max_requests=20, window_seconds=300.0)
login_account_limiter = SlidingWindowRateLimiter(max_requests=8, window_seconds=300.0)
signup_limiter = SlidingWindowRateLimiter(max_requests=6, window_seconds=3600.0)

# Job description analysis uses model calls: 6 per minute per user
analysis_limiter = SlidingWindowRateLimiter(max_requests=6, window_seconds=60.0)

# Interview orchestration. Each turn is an LLM call, so these protect the provider keys and the bill.
# A natural conversation is ~2-6 turns a minute; 30 leaves room for retries and code submissions.
session_create_limiter = SlidingWindowRateLimiter(max_requests=20, window_seconds=600.0)
turn_limiter = SlidingWindowRateLimiter(max_requests=30, window_seconds=60.0)
scratchpad_limiter = SlidingWindowRateLimiter(max_requests=120, window_seconds=60.0)
# Post-interview evaluation is the heaviest call (a long multi-step LLM run): a handful per ten minutes.
evaluate_limiter = SlidingWindowRateLimiter(max_requests=10, window_seconds=600.0)
pdf_limiter = SlidingWindowRateLimiter(max_requests=10, window_seconds=60.0)

# Everything that writes to the user's own data (save/delete sessions, profile): stops runaway client loops.
write_limiter = SlidingWindowRateLimiter(max_requests=60, window_seconds=60.0)

# Unauthenticated database ping, per IP.
health_db_limiter = SlidingWindowRateLimiter(max_requests=30, window_seconds=60.0)
