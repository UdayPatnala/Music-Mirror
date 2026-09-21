import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.ingestion.spotify_provider import SpotifyMetadataProvider
from app.schemas.spotify import SpotifyTrackDTO
from app.services.identity_resolution import IdentityResolutionService


@pytest.mark.anyio
async def test_spotify_provider_disabled_when_unconfigured():
    provider = SpotifyMetadataProvider(client_id="", client_secret="")
    assert not provider.is_configured
    assert not provider.is_available
    tracks = await provider.search_tracks("Test Query")
    assert tracks == []
    track = await provider.get_track("track123")
    assert track is None


@pytest.mark.anyio
async def test_spotify_provider_token_acquisition_and_caching():
    provider = SpotifyMetadataProvider(client_id="mock_id", client_secret="mock_secret")
    assert provider.is_configured

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"access_token": "token_abc123", "expires_in": 3600}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        token = await provider._get_access_token()
        assert token == "token_abc123"
        assert mock_post.call_count == 1

        # Subsequent call should return cached token without HTTP request
        token_cached = await provider._get_access_token()
        assert token_cached == "token_abc123"
        assert mock_post.call_count == 1


@pytest.mark.anyio
async def test_spotify_provider_search_success():
    provider = SpotifyMetadataProvider(client_id="mock_id", client_secret="mock_secret")
    provider._access_token = "token_abc123"
    provider._token_expires_at = 9999999999.0

    mock_search_resp = MagicMock()
    mock_search_resp.status_code = 200
    mock_search_resp.json.return_value = {
        "tracks": {
            "items": [
                {
                    "id": "sp_111",
                    "name": "Samajavaragamana",
                    "artists": [{"name": "Sid Sriram"}],
                    "album": {
                        "name": "Ala Vaikunthapurramuloo",
                        "id": "alb_1",
                        "release_date": "2020-01-12",
                        "images": [{"url": "https://img.spotify.com/cover.jpg"}],
                    },
                    "duration_ms": 223000,
                    "external_ids": {"isrc": "INS171900123"},
                    "popularity": 85,
                    "explicit": False,
                    "preview_url": "https://p.scdn.co/preview.mp3",
                    "external_urls": {"spotify": "https://open.spotify.com/track/sp_111"},
                }
            ]
        }
    }

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_search_resp
        results = await provider.search_tracks("Samajavaragamana")
        assert len(results) == 1
        assert results[0].id == "sp_111"
        assert results[0].name == "Samajavaragamana"
        assert results[0].artists == ["Sid Sriram"]
        assert results[0].isrc == "INS171900123"
        assert results[0].duration_ms == 223000


@pytest.mark.anyio
async def test_spotify_provider_rate_limit_backoff():
    provider = SpotifyMetadataProvider(client_id="mock_id", client_secret="mock_secret")
    provider._access_token = "token_abc123"
    provider._token_expires_at = 9999999999.0

    mock_429_resp = MagicMock()
    mock_429_resp.status_code = 429
    mock_429_resp.headers = {"Retry-After": "5"}

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_429_resp
        results = await provider.search_tracks("Rate Limited Query")
        assert results == []
        # Provider should now be temporarily unavailable
        assert not provider.is_available


def test_cross_provider_matching_deterministic_isrc():
    spotify_track = SpotifyTrackDTO(
        id="sp_111",
        name="Samajavaragamana",
        artists=["Sid Sriram"],
        duration_ms=223000,
        isrc="INS171900123",
    )

    youtube_candidate = MagicMock()
    youtube_candidate.title = "Sid Sriram - Samajavaragamana (Official Video)"
    youtube_candidate.channel_name = "Aditya Music"
    youtube_candidate.duration_seconds = 223
    youtube_candidate.isrc = "INS171900123"

    match = IdentityResolutionService.cross_match_spotify_youtube(spotify_track, youtube_candidate)
    assert match["status"] == "EXACT"
    assert match["confidence"] == 1.0
    assert match["spotify_id"] == "sp_111"


def test_cross_provider_matching_high_confidence():
    spotify_track = SpotifyTrackDTO(
        id="sp_222",
        name="Blinding Lights",
        artists=["The Weeknd"],
        duration_ms=200000, # 3:20
    )

    youtube_candidate = MagicMock()
    youtube_candidate.title = "The Weeknd - Blinding Lights (Official Audio)"
    youtube_candidate.channel_name = "TheWeekndVEVO"
    youtube_candidate.duration_seconds = 202
    youtube_candidate.isrc = None

    match = IdentityResolutionService.cross_match_spotify_youtube(spotify_track, youtube_candidate)
    assert match["status"] == "HIGH_CONFIDENCE"
    assert match["confidence"] >= 0.80
    assert match["spotify_id"] == "sp_222"
