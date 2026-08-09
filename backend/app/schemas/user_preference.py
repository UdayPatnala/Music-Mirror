import json
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class UserMusicPreferenceDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str = "default_user"
    discovery_mode: str = Field("balanced", description="'more_familiar', 'balanced', 'more_exploratory'")
    energy_preference: str = Field("balanced", description="'low', 'balanced', 'high'")
    tempo_preference: str = Field("moderate", description="'slow', 'moderate', 'fast'")
    vocal_preference: str = Field("mixed", description="'vocal', 'mixed', 'instrumental'")
    explicit_content_mode: str = Field("filter", description="'allow', 'filter', 'hide'")

    preferred_genres: List[str] = Field(default_factory=list)
    preferred_artists: List[str] = Field(default_factory=list)
    preferred_moods: List[str] = Field(default_factory=list)
    preferred_languages: List[str] = Field(default_factory=list)


class UpdateUserMusicPreferencePayload(BaseModel):
    discovery_mode: Optional[str] = None
    energy_preference: Optional[str] = None
    tempo_preference: Optional[str] = None
    vocal_preference: Optional[str] = None
    explicit_content_mode: Optional[str] = None

    preferred_genres: Optional[List[str]] = None
    preferred_artists: Optional[List[str]] = None
    preferred_moods: Optional[List[str]] = None
    preferred_languages: Optional[List[str]] = None
