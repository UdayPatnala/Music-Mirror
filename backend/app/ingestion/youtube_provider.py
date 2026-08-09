import logging
from typing import List, Dict, Any, Optional
import yt_dlp

logger = logging.getLogger("YouTubeMetadataProvider")


class YouTubeMetadataProvider:
    def __init__(self):
        self.ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": "in_playlist",
            "skip_download": True,
            "ignoreerrors": True,
        }

    def search_metadata(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Retrieves real song metadata from YouTube search via yt-dlp metadata API extraction.
        Zero copyrighted audio is downloaded or rehosted.
        """
        candidates: List[Dict[str, Any]] = []
        search_term = f"ytsearch{limit}:{query}"

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
                    channel_name = entry.get("uploader") or entry.get("channel") or "YouTube Artist"
                    duration = entry.get("duration") or 180
                    thumbnail = entry.get("thumbnail") or f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"

                    if not video_id or not title:
                        continue

                    candidates.append({
                        "source_type": "youtube",
                        "source_id": video_id,
                        "source_url": f"https://www.youtube.com/watch?v={video_id}",
                        "raw_title": title,
                        "channel_name": channel_name,
                        "duration": int(duration),
                        "thumbnail_url": thumbnail,
                        "published_at": entry.get("upload_date"),
                        "view_count": entry.get("view_count", 0),
                    })
        except Exception as err:
            logger.warning(f"YouTube metadata extraction warning for query '{query}': {err}")

        return candidates
