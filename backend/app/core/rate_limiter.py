import time
from typing import Dict, Tuple
from fastapi import HTTPException, Request


class MemoryRateLimiter:
    """
    In-memory window rate limiter protecting endpoints against spam and event flooding.
    """
    def __init__(self, requests_per_minute: int = 120):
        self.rpm = requests_per_minute
        self.hits: Dict[str, Tuple[int, float]] = {}

    def check_rate_limit(self, client_identifier: str) -> bool:
        now = time.time()
        count, start_window = self.hits.get(client_identifier, (0, now))

        if now - start_window > 60.0:
            # Window expired, reset counter
            self.hits[client_identifier] = (1, now)
            return True

        if count >= self.rpm:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded ({self.rpm} requests/min). Please slow down your requests.",
                headers={"Retry-After": "60"},
            )

        self.hits[client_identifier] = (count + 1, start_window)
        return True


rate_limiter = MemoryRateLimiter(requests_per_minute=300)
