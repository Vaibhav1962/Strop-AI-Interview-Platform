"""In-memory sliding window rate limiter for security-critical endpoints."""

import time
from collections import defaultdict
from fastapi import HTTPException, status


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
            retry_after = int(self.window_seconds - (now - timestamps[0])) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Please wait {retry_after} seconds.",
                headers={"Retry-After": str(max(1, retry_after))},
            )
        
        timestamps.append(now)
        self._history[key] = timestamps


# Pre-configured rate limiters
# Code execution: 15 runs per minute per user
execute_limiter = SlidingWindowRateLimiter(max_requests=15, window_seconds=60.0)

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
