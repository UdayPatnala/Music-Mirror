import asyncio
import time
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.services.cache_service import (
    LRUTTLCache,
    SingleFlightRegistry,
    DiscoveryCacheService,
    discovery_cache,
)
from app.schemas.songs import (
    YouTubeSearchResponseDTO,
    YouTubeCandidateDTO,
    ScoreBreakdownDTO,
)


class TestDualCachingLayer:
    """Test suite for L1 Query Cache and L2 Video Metadata Cache (R5)."""

    @pytest.mark.anyio
    async def test_l1_query_cache_hit_and_expiration(self):
        cache = LRUTTLCache(max_capacity=5, default_ttl_seconds=1)
        response_dto = YouTubeSearchResponseDTO(
            query="test query",
            normalized_query="test query",
            cached=False,
            candidates=[],
            total_candidates=0,
        )

        await cache.set("test_key", response_dto, ttl_seconds=1)
        cached = await cache.get("test_key")
        assert cached is not None
        assert cached.query == "test query"

        # Wait for TTL expiration (1s)
        await asyncio.sleep(1.1)
        expired = await cache.get("test_key")
        assert expired is None

    @pytest.mark.anyio
    async def test_l1_query_cache_lru_eviction(self):
        cache = LRUTTLCache(max_capacity=3, default_ttl_seconds=300)

        await cache.set("k1", "v1")
        await cache.set("k2", "v2")
        await cache.set("k3", "v3")

        # Access k1 so k2 becomes the least recently used
        assert await cache.get("k1") == "v1"

        # Insert k4 -> should evict k2
        await cache.set("k4", "v4")

        assert await cache.get("k1") == "v1"
        assert await cache.get("k2") is None
        assert await cache.get("k3") == "v3"
        assert await cache.get("k4") == "v4"

    @pytest.mark.anyio
    async def test_l2_metadata_cache(self):
        cache = LRUTTLCache(max_capacity=100, default_ttl_seconds=86400)

        meta = {
            "video_id": "vid_123456789",
            "title": "Song Title",
            "channel_name": "Artist VEVO",
            "duration": 210,
        }

        await cache.set("vid_123456789", meta)
        retrieved = await cache.get("vid_123456789")
        assert retrieved is not None
        assert retrieved["video_id"] == "vid_123456789"
        assert retrieved["duration"] == 210


class TestSingleFlightDeduplication:
    """Test suite for In-Flight Request Deduplication (R5)."""

    @pytest.mark.anyio
    async def test_concurrent_singleflight_deduplication(self):
        registry = SingleFlightRegistry()
        call_count = 0

        async def expensive_fetch():
            nonlocal call_count
            call_count += 1
            await asyncio.sleep(0.05)  # Simulate network latency
            return {"status": "ok", "call_id": call_count}

        # Launch 10 simultaneous concurrent calls for the exact same key
        tasks = [
            registry.execute("shared_query_key", expensive_fetch)
            for _ in range(10)
        ]

        results = await asyncio.gather(*tasks)

        # Assert external fetch was executed EXACTLY ONCE
        assert call_count == 1
        assert len(results) == 10
        for res in results:
            assert res["status"] == "ok"
            assert res["call_id"] == 1

        # Assert in-flight map is clean after execution
        assert registry.in_flight_count() == 0

    @pytest.mark.anyio
    async def test_singleflight_exception_propagation(self):
        registry = SingleFlightRegistry()
        call_count = 0

        async def failing_fetch():
            nonlocal call_count
            call_count += 1
            await asyncio.sleep(0.02)
            raise ValueError("YouTube API rate limited")

        tasks = [
            registry.execute("failing_query_key", failing_fetch)
            for _ in range(5)
        ]

        # All 5 callers must receive the ValueError
        results = await asyncio.gather(*tasks, return_exceptions=True)
        assert len(results) == 5
        assert call_count == 1
        for res in results:
            assert isinstance(res, ValueError)
            assert str(res) == "YouTube API rate limited"

        # Verify in-flight registry cleared
        assert registry.in_flight_count() == 0


class TestYouTubeSearchAPIEndpoint:
    """Test suite for Upgraded YouTube Search Endpoint & Caching."""

    @pytest.fixture(autouse=True)
    def clear_cache(self):
        discovery_cache.clear_all_sync()
        yield
        discovery_cache.clear_all_sync()

    def test_youtube_search_success_and_caching(self):
        client = TestClient(app)

        mock_candidates = [
            {
                "video_id": "vid_official_1",
                "title": "Starboy (Official Music Video)",
                "channel_name": "TheWeekndVEVO",
                "channel_is_vevo": True,
                "channel_is_verified": True,
                "channel_is_topic": False,
                "duration_seconds": 230,
                "view_count": 500000000,
                "published_at": "2016",
                "thumbnail_url": "https://img.youtube.com/vi/vid_official_1/hqdefault.jpg",
                "watch_url": "https://www.youtube.com/watch?v=vid_official_1",
            },
            {
                "video_id": "vid_cover_2",
                "title": "Starboy (Acoustic Cover)",
                "channel_name": "Cover Artist",
                "channel_is_vevo": False,
                "channel_is_verified": False,
                "channel_is_topic": False,
                "duration_seconds": 220,
                "view_count": 10000,
                "published_at": "2020",
                "thumbnail_url": "https://img.youtube.com/vi/vid_cover_2/hqdefault.jpg",
                "watch_url": "https://www.youtube.com/watch?v=vid_cover_2",
            },
        ]

        with patch("app.ingestion.youtube_provider.YouTubeMetadataProvider.search_metadata") as mock_search:
            mock_search.return_value = mock_candidates

            # Request 1: Fresh lookup
            resp1 = client.get("/api/v2/songs/youtube-search?query=The+Weeknd+Starboy&limit=10")
            assert resp1.status_code == 200
            data1 = resp1.json()

            assert data1["query"] == "The Weeknd Starboy"
            assert data1["normalized_query"] == "the weeknd starboy"
            assert data1["cached"] is False
            assert len(data1["candidates"]) == 2

            # Candidate 0 must be official video with high score
            top = data1["candidates"][0]
            assert top["video_id"] == "vid_official_1"
            assert top["score"] > 0.80
            assert top["score_breakdown"]["authority"] == 1.00

            # Verify mock was called once
            assert mock_search.call_count == 1

            # Request 2: Identical lookup should be served from L1 cache
            resp2 = client.get("/api/v2/songs/youtube-search?query=The+Weeknd+Starboy&limit=10")
            assert resp2.status_code == 200
            data2 = resp2.json()

            assert data2["cached"] is True
            assert len(data2["candidates"]) == 2
            # External search was NOT called again
            assert mock_search.call_count == 1

    def test_youtube_search_empty_query_validation(self):
        client = TestClient(app)

        # Empty string
        resp = client.get("/api/v2/songs/youtube-search?query=")
        assert resp.status_code == 400

        # Whitespace only
        resp_ws = client.get("/api/v2/songs/youtube-search?query=   ")
        assert resp_ws.status_code == 400

        # Missing query parameter
        resp_missing = client.get("/api/v2/songs/youtube-search")
        assert resp_missing.status_code == 400
