import asyncio
import time
from collections import OrderedDict
from typing import Dict, Any, Optional, TypeVar, Callable, Awaitable
import logging

from app.schemas.songs import YouTubeSearchResponseDTO, YouTubeCandidateDTO

logger = logging.getLogger("DiscoveryCacheService")

T = TypeVar("T")


class LRUTTLCache:
    """
    Thread-safe and async-safe LRU Cache with individual entry Time-To-Live (TTL) expiration.
    """

    def __init__(self, max_capacity: int = 250, default_ttl_seconds: int = 1800):
        self.max_capacity = max_capacity
        self.default_ttl_seconds = default_ttl_seconds
        self._cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self._lock = asyncio.Lock()

    def _evict_expired_or_overflow(self) -> None:
        now = time.time()
        # Remove expired keys
        expired_keys = [
            k for k, entry in self._cache.items()
            if entry.get("expires_at", 0) <= now
        ]
        for k in expired_keys:
            self._cache.pop(k, None)

        # Evict oldest if exceeding capacity
        while len(self._cache) > self.max_capacity:
            self._cache.popitem(last=False)

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            if key not in self._cache:
                return None

            entry = self._cache[key]
            now = time.time()
            if entry.get("expires_at", 0) <= now:
                self._cache.pop(key, None)
                return None

            # Move to end (most recently used)
            self._cache.move_to_end(key)
            return entry.get("value")

    def get_sync(self, key: str) -> Optional[Any]:
        """Synchronous read for fast in-memory lookups."""
        if key not in self._cache:
            return None

        entry = self._cache[key]
        now = time.time()
        if entry.get("expires_at", 0) <= now:
            self._cache.pop(key, None)
            return None

        self._cache.move_to_end(key)
        return entry.get("value")

    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl_seconds
        expires_at = time.time() + ttl

        async with self._lock:
            self._cache[key] = {
                "value": value,
                "expires_at": expires_at,
                "created_at": time.time(),
            }
            self._cache.move_to_end(key)
            self._evict_expired_or_overflow()

    def set_sync(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        """Synchronous write for immediate memory updates."""
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl_seconds
        expires_at = time.time() + ttl
        self._cache[key] = {
            "value": value,
            "expires_at": expires_at,
            "created_at": time.time(),
        }
        self._cache.move_to_end(key)
        self._evict_expired_or_overflow()

    async def clear(self) -> None:
        async with self._lock:
            self._cache.clear()

    def clear_sync(self) -> None:
        self._cache.clear()

    def size(self) -> int:
        return len(self._cache)


class SingleFlightRegistry:
    """
    In-flight request deduplication registry.
    Ensures that multiple concurrent callers requesting the same resource share a single external fetch.
    """

    def __init__(self):
        self._in_flight: Dict[str, asyncio.Future] = {}
        self._lock = asyncio.Lock()

    async def execute(self, key: str, fetcher: Callable[[], Awaitable[T]]) -> T:
        """
        Executes fetcher for the given key, deduplicating concurrent calls.
        If another call with the same key is in-flight, waits for and returns its result.
        """
        is_leader = False
        async with self._lock:
            if key in self._in_flight:
                future = self._in_flight[key]
            else:
                loop = asyncio.get_running_loop()
                future = loop.create_future()
                self._in_flight[key] = future
                is_leader = True

        if not is_leader:
            # Follower: await the leader's future
            return await future

        # Leader: execute external fetcher and resolve future
        try:
            result = await fetcher()
            if not future.done():
                future.set_result(result)
            return result
        except Exception as exc:
            if not future.done():
                future.set_exception(exc)
            raise
        finally:
            async with self._lock:
                self._in_flight.pop(key, None)

    def in_flight_count(self) -> int:
        return len(self._in_flight)


class DiscoveryCacheService:
    """
    Dual-Tier Cache & SingleFlight Orchestration Service:
    - L1 Query Cache: 30-minute TTL, LRU capacity 250.
    - L2 Video Metadata Cache: 24-hour TTL, LRU capacity 2000.
    - SingleFlight deduplicator preventing concurrent duplicate provider searches.
    """

    def __init__(self):
        # L1 Query Cache: TTL 30 minutes (1800s)
        self.l1_query_cache = LRUTTLCache(max_capacity=250, default_ttl_seconds=1800)
        # L2 Video Metadata Cache: TTL 24 hours (86400s)
        self.l2_metadata_cache = LRUTTLCache(max_capacity=2000, default_ttl_seconds=86400)
        # SingleFlight Concurrency Registry
        self.single_flight = SingleFlightRegistry()

    async def get_query_cache(self, key: str) -> Optional[YouTubeSearchResponseDTO]:
        return await self.l1_query_cache.get(key)

    def get_query_cache_sync(self, key: str) -> Optional[YouTubeSearchResponseDTO]:
        return self.l1_query_cache.get_sync(key)

    async def set_query_cache(
        self, key: str, value: YouTubeSearchResponseDTO, ttl_seconds: int = 1800
    ) -> None:
        await self.l1_query_cache.set(key, value, ttl_seconds=ttl_seconds)

    def set_query_cache_sync(
        self, key: str, value: YouTubeSearchResponseDTO, ttl_seconds: int = 1800
    ) -> None:
        self.l1_query_cache.set_sync(key, value, ttl_seconds=ttl_seconds)

    async def get_video_metadata(self, video_id: str) -> Optional[Dict[str, Any]]:
        return await self.l2_metadata_cache.get(video_id)

    def get_video_metadata_sync(self, video_id: str) -> Optional[Dict[str, Any]]:
        return self.l2_metadata_cache.get_sync(video_id)

    async def set_video_metadata(
        self, video_id: str, value: Dict[str, Any], ttl_seconds: int = 86400
    ) -> None:
        await self.l2_metadata_cache.set(video_id, value, ttl_seconds=ttl_seconds)

    def set_video_metadata_sync(
        self, video_id: str, value: Dict[str, Any], ttl_seconds: int = 86400
    ) -> None:
        self.l2_metadata_cache.set_sync(video_id, value, ttl_seconds=ttl_seconds)

    async def clear_all(self) -> None:
        await self.l1_query_cache.clear()
        await self.l2_metadata_cache.clear()

    def clear_all_sync(self) -> None:
        self.l1_query_cache.clear_sync()
        self.l2_metadata_cache.clear_sync()

    def stats(self) -> Dict[str, Any]:
        return {
            "l1_query_cache_size": self.l1_query_cache.size(),
            "l2_metadata_cache_size": self.l2_metadata_cache.size(),
            "active_single_flight_count": self.single_flight.in_flight_count(),
        }


# Global singleton instance for discovery cache service
discovery_cache = DiscoveryCacheService()
