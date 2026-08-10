from typing import List, Dict, Any
from abc import ABC, abstractmethod

class MetadataProviderAdapter(ABC):
    """
    [02_METADATA_SOURCE_ORCHESTRATION]
    Provider-agnostic interface for fetching metadata.
    """
    
    @abstractmethod
    def fetch_metadata(self, query: str) -> List[Dict[str, Any]]:
        """Fetch candidate metadata based on query."""
        pass
        
    @abstractmethod
    def get_provider_name(self) -> str:
        """Return the name of the provider."""
        pass


class MetadataOrchestrator:
    """
    [02_METADATA_SOURCE_ORCHESTRATION]
    Orchestrates metadata fetching across multiple providers.
    """
    
    def __init__(self, providers: List[MetadataProviderAdapter]):
        self.providers = providers
        
    def fetch_and_merge(self, query: str) -> Dict[str, Any]:
        """
        Queries all providers, collects candidates, and delegates to the Conflict Engine to merge.
        """
        all_candidates = []
        for provider in self.providers:
            try:
                candidates = provider.fetch_metadata(query)
                # Attach provenance [03_FIELD_LEVEL_PROVENANCE]
                for candidate in candidates:
                    candidate["_provenance"] = {
                        "provider": provider.get_provider_name(),
                        "confidence": candidate.get("confidence", 0.5)
                    }
                all_candidates.extend(candidates)
            except Exception as e:
                # Provider failure must not crash the catalog
                print(f"Provider {provider.get_provider_name()} failed: {e}")
                
        if not all_candidates:
            return {}
            
        from app.services.identity_resolution import MetadataConflictEngine
        
        # In a real scenario, we would group by identity first, then merge.
        # For this completeness layer, we demonstrate the merge flow.
        merged_metadata = MetadataConflictEngine.resolve_conflicts(all_candidates)
        return merged_metadata
