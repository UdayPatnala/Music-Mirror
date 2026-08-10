from fastapi import Request, HTTPException
import time
from typing import Dict, Tuple

class RateLimiter:
    """
    [40_RATE_LIMITING]
    In-memory rate limiter for Predeployment Release demo.
    In production, this would be backed by Redis.
    """
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.clients: Dict[str, Tuple[int, float]] = {}

    def check(self, request: Request):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        
        if client_ip in self.clients:
            count, start_time = self.clients[client_ip]
            if now - start_time > 60:
                self.clients[client_ip] = (1, now)
            elif count >= self.requests_per_minute:
                raise HTTPException(status_code=429, detail="Too Many Requests")
            else:
                self.clients[client_ip] = (count + 1, start_time)
        else:
            self.clients[client_ip] = (1, now)

# Create instances for different scopes
search_limiter = RateLimiter(requests_per_minute=30)
action_limiter = RateLimiter(requests_per_minute=100)
