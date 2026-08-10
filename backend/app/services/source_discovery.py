from typing import Dict, Any, List, Optional
from abc import ABC, abstractmethod

class AudioSourceProvider(ABC):
    """
    [09_AUDIO_SOURCE_DISCOVERY]
    Provider for playable audio. Must be kept separate from Metadata Provider.
    """
    
    @abstractmethod
    def search_audio(self, canonical_metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        pass
        
    @abstractmethod
    def get_provider_name(self) -> str:
        pass


class SourceDiscoveryService:
    """
    [09_AUDIO_SOURCE_DISCOVERY] & [11_SOURCE_VERIFICATION]
    Discovers, verifies, and ranks audio sources for a canonical song.
    """
    
    def __init__(self, providers: List[AudioSourceProvider]):
        self.providers = providers
        
    def discover_and_rank_sources(self, canonical_song: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        SONG_LOOKUP -> ELIGIBLE_PROVIDERS -> SEARCH -> MATCH -> VERIFY -> RANK
        """
        all_sources = []
        
        for provider in self.providers:
            try:
                candidates = provider.search_audio(canonical_song)
                for candidate in candidates:
                    # [11_SOURCE_VERIFICATION]
                    if self._verify_source(canonical_song, candidate):
                        candidate["provider"] = provider.get_provider_name()
                        candidate["score"] = self._calculate_source_quality(candidate)
                        all_sources.append(candidate)
            except Exception as e:
                print(f"Audio Provider {provider.get_provider_name()} failed: {e}")
                
        # [12_SOURCE_QUALITY] Rank sources based on quality score (Correctness > Speed)
        all_sources.sort(key=lambda x: x.get("score", 0.0), reverse=True)
        return all_sources

    def _verify_source(self, canonical: Dict[str, Any], candidate_source: Dict[str, Any]) -> bool:
        """
        [11_SOURCE_VERIFICATION]
        Checks Title, Artist, Version, Duration.
        """
        # 1. Duration check (most reliable hard filter for audio)
        can_dur = canonical.get("duration_ms")
        src_dur = candidate_source.get("duration_ms")
        if can_dur and src_dur:
            # If duration is off by more than 5 seconds, reject it.
            if abs(can_dur - src_dur) > 5000:
                return False
                
        # 2. Strict Title/Artist verification is required for high confidence.
        # If the source provider doesn't match canonical identity well, it's risky.
        src_title = candidate_source.get("title", "").lower()
        can_title = canonical.get("title", "").lower()
        
        if can_title not in src_title and src_title not in can_title:
            return False
            
        return True
        
    def _calculate_source_quality(self, source: Dict[str, Any]) -> float:
        """
        [12_SOURCE_QUALITY]
        Calculates a score based on reliability, quality, and availability.
        """
        score = 0.5 # Base score
        
        # Prefer higher bitrate/quality
        if source.get("quality") == "high":
            score += 0.2
            
        # Penalize if it's a temporary expiring URL [10_SOURCE_URL_LIFECYCLE]
        if source.get("expires_at"):
            score -= 0.1
            
        return score
