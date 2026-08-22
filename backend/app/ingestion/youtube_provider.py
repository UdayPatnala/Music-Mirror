import logging
import re
from typing import List, Dict, Any, Optional
import yt_dlp

from app.ingestion.normalizer import normalize_string, clean_title

logger = logging.getLogger("YouTubeMetadataProvider")

# Recognized major record labels and authoritative music distributors
MAJOR_RECORD_LABELS = {
    "t-series",
    "tseries",
    "sony music",
    "sony music india",
    "sony music entertainment",
    "warner music",
    "universal music",
    "universal music group",
    "aditya music",
    "lahari music",
    "zee music",
    "zee music company",
    "spinnin' records",
    "spinnin records",
    "atlantic records",
    "columbia records",
    "geffen records",
    "def jam",
    "rca records",
    "interscope records",
    "yash raj films",
    "yrf",
    "saregama",
    "saregama music",
    "speed records",
    "tips official",
    "tips music",
    "ultra bollywood",
    "eros now",
}


class YouTubeMetadataProvider:
    """
    High-performance YouTube metadata provider extracting multi-candidate pools (K=10..25).
    Zero copyrighted audio/video stream is downloaded or rehosted.
    """

    def __init__(self):
        self.ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": "in_playlist",
            "skip_download": True,
            "ignoreerrors": True,
        }

    @staticmethod
    def _is_vevo_channel(channel_name: str) -> bool:
        if not channel_name:
            return False
        clean = channel_name.strip().lower()
        return clean.endswith("vevo") or " vevo" in clean or clean == "vevo"

    @staticmethod
    def _is_topic_channel(channel_name: str) -> bool:
        if not channel_name:
            return False
        clean = channel_name.strip().lower()
        return "topic" in clean

    @classmethod
    def _is_verified_or_official(cls, channel_name: str, entry: Optional[Dict[str, Any]] = None) -> bool:
        if not channel_name:
            return False
        if cls._is_vevo_channel(channel_name) or cls._is_topic_channel(channel_name):
            return True

        if entry:
            if entry.get("channel_is_verified") or entry.get("uploader_is_verified"):
                return True

        clean = channel_name.strip().lower()
        for label in MAJOR_RECORD_LABELS:
            if label in clean:
                return True

        return False

    def search_metadata(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Retrieves real song metadata from YouTube search via yt-dlp metadata API extraction.
        Extracts multi-candidate pools (K=10..25) with full channel and duration metadata.
        """
        if not query or not query.strip():
            return []

        clean_query = query.strip()
        clamped_limit = max(1, min(25, limit))
        candidates: List[Dict[str, Any]] = []
        seen_video_ids = set()
        search_term = f"ytsearch{clamped_limit}:{clean_query}"

        try:
            with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                result = ydl.extract_info(search_term, download=False)
                if not result or "entries" not in result:
                    return candidates

                for entry in result["entries"]:
                    if not entry:
                        continue

                    video_id = entry.get("id")
                    title = entry.get("title")

                    if not video_id or not title:
                        continue

                    # Deduplicate in-pool
                    if video_id in seen_video_ids:
                        continue
                    seen_video_ids.add(video_id)

                    channel_name = (
                        entry.get("uploader")
                        or entry.get("channel")
                        or entry.get("uploader_id")
                        or "YouTube Artist"
                    )

                    duration_raw = entry.get("duration")
                    try:
                        duration = int(duration_raw) if duration_raw is not None else 180
                    except (ValueError, TypeError):
                        duration = 180

                    # Extract upload date
                    published_at = entry.get("upload_date") or entry.get("timestamp")
                    if published_at:
                        published_at = str(published_at)

                    # Extract view count
                    view_count_raw = entry.get("view_count")
                    try:
                        view_count = int(view_count_raw) if view_count_raw is not None else 0
                    except (ValueError, TypeError):
                        view_count = 0

                    thumbnail = (
                        entry.get("thumbnail")
                        or f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
                    )

                    is_vevo = self._is_vevo_channel(channel_name)
                    is_topic = self._is_topic_channel(channel_name)
                    is_verified = self._is_verified_or_official(channel_name, entry)

                    candidates.append({
                        "source_type": "youtube",
                        "source_id": video_id,
                        "video_id": video_id,
                        "source_url": f"https://www.youtube.com/watch?v={video_id}",
                        "watch_url": f"https://www.youtube.com/watch?v={video_id}",
                        "title": title,
                        "raw_title": title,
                        "channel_name": channel_name,
                        "channel_is_verified": is_verified,
                        "channel_is_topic": is_topic,
                        "channel_is_vevo": is_vevo,
                        "duration_seconds": duration,
                        "duration": duration,
                        "thumbnail_url": thumbnail,
                        "published_at": published_at,
                        "view_count": view_count,
                    })

                    if len(candidates) >= clamped_limit:
                        break

        except Exception as err:
            logger.warning(f"YouTube metadata extraction warning for query '{query}': {err}")

        return candidates
