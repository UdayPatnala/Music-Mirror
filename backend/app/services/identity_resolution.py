from typing import Dict, Any, List, Optional
import uuid

class SongIdentity:
    """
    Core representation of a Canonical Song Identity.
    """
    def __init__(self, title: str, artist_name: str, album: Optional[str] = None, version_label: Optional[str] = None):
        self.title = title
        self.artist_name = artist_name
        self.album = album
        self.version_label = version_label
        self.confidence_score = 0.0
        self.isrc = None
        self.provider_ids = {}

class IdentityResolutionService:
    """
    [01_SONG_IDENTITY_RESOLUTION]
    Every song requires a canonical internal ID.
    Identity must not depend only on title.
    Uses confidence-based matching.
    """
    
    @staticmethod
    def resolve_identity(candidate_metadata: Dict[str, Any], existing_records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Attempts to match a candidate song against existing records.
        Returns the matched canonical ID, or generates a new one if no match is found.
        """
        best_match = None
        highest_confidence = 0.0

        for record in existing_records:
            confidence = IdentityResolutionService._calculate_match_confidence(candidate_metadata, record)
            if confidence > highest_confidence:
                highest_confidence = confidence
                best_match = record
                
        if highest_confidence > 0.85:
            return {"status": "matched", "canonical_id": best_match["id"], "confidence": highest_confidence}
        elif highest_confidence > 0.6:
            return {"status": "quarantined", "reason": "ambiguous match", "confidence": highest_confidence}
        else:
            return {"status": "new", "canonical_id": str(uuid.uuid4()), "confidence": 1.0}

    @staticmethod
    def _calculate_match_confidence(candidate: Dict[str, Any], record: Dict[str, Any]) -> float:
        score = 0.0
        
        # ISRC match is extremely strong
        if candidate.get("isrc") and candidate.get("isrc") == record.get("isrc"):
            score += 0.5
            
        # Provider ID match is strong
        for provider, pid in candidate.get("provider_ids", {}).items():
            if record.get("provider_ids", {}).get(provider) == pid:
                score += 0.4
                
        # Title and Artist
        if candidate.get("title", "").lower() == record.get("title", "").lower():
            score += 0.3
        if candidate.get("artist_name", "").lower() == record.get("artist_name", "").lower():
            score += 0.2
            
        # Version and Duration
        if candidate.get("version_label") == record.get("version_label"):
            score += 0.1
        
        # Duration within 3 seconds
        cand_dur = candidate.get("duration_ms")
        rec_dur = record.get("duration_ms")
        if cand_dur and rec_dur and abs(cand_dur - rec_dur) < 3000:
            score += 0.15
            
        return min(1.0, score)

    @staticmethod
    def cross_match_spotify_youtube(spotify_track: Any, youtube_candidate: Any) -> Dict[str, Any]:
        """
        Cross-matches an authoritative Spotify track with a YouTube candidate video.
        Calculates confidence across:
          - Title token overlap
          - Artist token overlap
          - Duration proximity (|delta| <= 5s)
        Returns match status and confidence score.
        """
        sp_title = getattr(spotify_track, "name", "").lower().strip()
        sp_artists = [a.lower().strip() for a in getattr(spotify_track, "artists", [])]
        sp_dur_sec = getattr(spotify_track, "duration_ms", 0) / 1000.0
        sp_isrc = getattr(spotify_track, "isrc", None)

        yt_title = getattr(youtube_candidate, "title", "").lower().strip()
        yt_channel = getattr(youtube_candidate, "channel_name", "").lower().strip()
        yt_dur_sec = float(getattr(youtube_candidate, "duration_seconds", 0) or 0)
        yt_isrc = getattr(youtube_candidate, "isrc", None)

        confidence = 0.0

        # 1. Deterministic ISRC match
        if sp_isrc and yt_isrc and sp_isrc.upper() == yt_isrc.upper():
            return {
                "status": "EXACT",
                "confidence": 1.0,
                "reason": "ISRC deterministic match",
                "spotify_id": getattr(spotify_track, "id", None),
                "isrc": sp_isrc,
            }

        # 2. Title matching
        title_words = [w for w in sp_title.split() if len(w) > 2]
        matched_words = [w for w in title_words if w in yt_title]
        title_ratio = len(matched_words) / max(1, len(title_words))
        confidence += title_ratio * 0.45

        # 3. Artist matching (in title or channel)
        artist_matched = any(a in yt_title or a in yt_channel for a in sp_artists)
        if artist_matched:
            confidence += 0.35

        # 4. Duration proximity
        if sp_dur_sec > 0 and yt_dur_sec > 0:
            dur_diff = abs(sp_dur_sec - yt_dur_sec)
            if dur_diff <= 3.0:
                confidence += 0.20
            elif dur_diff <= 7.0:
                confidence += 0.10
            elif dur_diff > 30.0:
                confidence -= 0.25

        confidence = max(0.0, min(1.0, confidence))

        if confidence >= 0.80:
            status = "HIGH_CONFIDENCE"
        elif confidence >= 0.60:
            status = "MEDIUM_CONFIDENCE"
        elif confidence >= 0.40:
            status = "AMBIGUOUS"
        else:
            status = "UNMATCHED"

        return {
            "status": status,
            "confidence": round(confidence, 3),
            "spotify_id": getattr(spotify_track, "id", None),
            "isrc": sp_isrc,
        }


class MetadataConflictEngine:
    """
    [05_METADATA_CONFLICT_ENGINE]
    Resolves conflicts when multiple providers return different metadata for the same canonical song.
    """
    
    @staticmethod
    def resolve_conflicts(provider_data_list: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Takes a list of metadata dictionaries from different providers and merges them based on evidence.
        """
        if not provider_data_list:
            return {}
            
        if len(provider_data_list) == 1:
            return provider_data_list[0]
            
        resolved = {}
        
        # For simplicity in this demo layer, we prefer fields from the provider with the highest "confidence" rating
        # or we vote on fields if they are common.
        # In a full implementation, this uses field-level provenance.
        
        # Gather all titles and artists to find the most common or most reliable
        titles = [p.get("title") for p in provider_data_list if p.get("title")]
        if titles:
            # Pick the longest title that isn't overly verbose, or majority
            resolved["title"] = max(set(titles), key=titles.count)
            
        artists = [p.get("artist_name") for p in provider_data_list if p.get("artist_name")]
        if artists:
            resolved["artist_name"] = max(set(artists), key=artists.count)
            
        # Merge provider IDs
        provider_ids = {}
        for p in provider_data_list:
            if "provider_ids" in p:
                provider_ids.update(p["provider_ids"])
        resolved["provider_ids"] = provider_ids
        
        return resolved
