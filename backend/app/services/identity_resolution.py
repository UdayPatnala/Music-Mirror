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
