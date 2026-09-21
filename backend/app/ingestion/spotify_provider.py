import logging
import time
import base64
from typing import List, Dict, Any, Optional
import httpx

from app.core.config import settings
from app.schemas.spotify import SpotifyTrackDTO

logger = logging.getLogger("SpotifyMetadataProvider")


class SpotifyMetadataProvider:
    """
    Production-grade Spotify metadata provider utilizing OAuth2 Client Credentials.
    Strictly used for metadata enrichment, ISRC extraction, and artist/track identity resolution.
    Zero audio extraction or stream decryption.
    """

    TOKEN_URL = "https://accounts.spotify.com/api/token"
    API_BASE = "https://api.spotify.com/v1"

    def __init__(self, client_id: Optional[str] = None, client_secret: Optional[str] = None):
        self.client_id = client_id if client_id is not None else settings.SPOTIFY_CLIENT_ID
        self.client_secret = client_secret if client_secret is not None else settings.SPOTIFY_CLIENT_SECRET
        self._access_token: Optional[str] = None
        self._token_expires_at: float = 0.0
        self._rate_limited_until: float = 0.0

    @property
    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret)

    @property
    def is_available(self) -> bool:
        if not self.is_configured:
            return False
        if time.time() < self._rate_limited_until:
            return False
        return True

    async def _get_access_token(self) -> Optional[str]:
        """
        Retrieves or returns a cached OAuth2 access token via Client Credentials.
        """
        if not self.is_configured:
            return None

        # Return cached token if valid for more than 60 seconds
        if self._access_token and time.time() < (self._token_expires_at - 60):
            return self._access_token

        auth_header = base64.b64encode(f"{self.client_id}:{self.client_secret}".encode()).decode()
        headers = {
            "Authorization": f"Basic {auth_header}",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        data = {"grant_type": "client_credentials"}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(self.TOKEN_URL, headers=headers, data=data)
                if resp.status_code == 200:
                    payload = resp.json()
                    self._access_token = payload.get("access_token")
                    expires_in = payload.get("expires_in", 3600)
                    self._token_expires_at = time.time() + expires_in
                    logger.info("Spotify OAuth2 access token acquired successfully.")
                    return self._access_token
                elif resp.status_code == 429:
                    retry_after = int(resp.headers.get("Retry-After", 30))
                    self._rate_limited_until = time.time() + retry_after
                    logger.warning(f"Spotify token endpoint rate-limited. Retrying after {retry_after}s.")
                    return None
                else:
                    logger.error(f"Failed to authenticate with Spotify API. HTTP {resp.status_code}")
                    return None
        except Exception as e:
            logger.error(f"Network error during Spotify token acquisition: {e}")
            return None

    async def search_tracks(self, query: str, limit: int = 10) -> List[SpotifyTrackDTO]:
        """
        Searches Spotify for tracks matching a musical query.
        """
        if not self.is_available:
            return []

        token = await self._get_access_token()
        if not token:
            return []

        clean_query = query.strip()
        if not clean_query:
            return []

        url = f"{self.API_BASE}/search"
        headers = {"Authorization": f"Bearer {token}"}
        params = {
            "q": clean_query,
            "type": "track",
            "limit": max(1, min(limit, 50)),
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, headers=headers, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    items = data.get("tracks", {}).get("items", [])
                    return [self._map_item_to_dto(item) for item in items if item]
                elif resp.status_code == 429:
                    retry_after = int(resp.headers.get("Retry-After", 10))
                    self._rate_limited_until = time.time() + retry_after
                    logger.warning(f"Spotify search endpoint rate-limited for {retry_after}s.")
                    return []
                elif resp.status_code in (401, 403):
                    # Invalidate cached token
                    self._access_token = None
                    logger.warning(f"Spotify access token rejected with HTTP {resp.status_code}.")
                    return []
                else:
                    logger.warning(f"Spotify search failed with HTTP {resp.status_code}.")
                    return []
        except Exception as e:
            logger.error(f"Error during Spotify search execution: {e}")
            return []

    async def get_track(self, track_id: str) -> Optional[SpotifyTrackDTO]:
        """
        Retrieves complete metadata for a specific Spotify track ID.
        """
        if not self.is_available or not track_id:
            return None

        token = await self._get_access_token()
        if not token:
            return None

        url = f"{self.API_BASE}/tracks/{track_id}"
        headers = {"Authorization": f"Bearer {token}"}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    return self._map_item_to_dto(resp.json())
                elif resp.status_code == 429:
                    retry_after = int(resp.headers.get("Retry-After", 10))
                    self._rate_limited_until = time.time() + retry_after
                    return None
                return None
        except Exception as e:
            logger.error(f"Error fetching Spotify track {track_id}: {e}")
            return None

    @staticmethod
    def _map_item_to_dto(item: Dict[str, Any]) -> SpotifyTrackDTO:
        artists = [a.get("name", "") for a in item.get("artists", []) if a.get("name")]
        album = item.get("album", {})
        images = album.get("images", [])
        artwork_url = images[0].get("url") if images else None
        external_ids = item.get("external_ids", {})
        external_urls = item.get("external_urls", {})

        return SpotifyTrackDTO(
            id=item.get("id", ""),
            name=item.get("name", ""),
            artists=artists if artists else ["Unknown Artist"],
            album_name=album.get("name"),
            album_id=album.get("id"),
            release_date=album.get("release_date"),
            duration_ms=item.get("duration_ms", 0),
            isrc=external_ids.get("isrc"),
            popularity=item.get("popularity", 0),
            artwork_url=artwork_url,
            explicit=bool(item.get("explicit", False)),
            preview_url=item.get("preview_url"),
            spotify_url=external_urls.get("spotify"),
        )


spotify_provider = SpotifyMetadataProvider()
