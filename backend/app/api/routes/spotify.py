from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException
from app.schemas.spotify import SpotifySearchResponseDTO, SpotifyTrackDTO, SpotifyStatusDTO
from app.ingestion.spotify_provider import spotify_provider

router = APIRouter()


@router.get("/status", response_model=SpotifyStatusDTO, summary="Spotify provider operational status")
async def get_spotify_status():
    """
    Returns whether the Spotify secondary metadata provider is configured,
    currently available, or rate-limited.
    """
    status = "AVAILABLE" if spotify_provider.is_available else (
        "RATE_LIMITED" if spotify_provider.is_configured else "DISABLED"
    )
    return SpotifyStatusDTO(
        status=status,
        configured=spotify_provider.is_configured,
        enabled=spotify_provider.is_available,
    )


@router.get("/search", response_model=SpotifySearchResponseDTO, summary="Search Spotify tracks for metadata enrichment")
async def search_spotify_tracks(
    q: str = Query(..., min_length=1, max_length=200, description="Music search query"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of tracks to return"),
):
    """
    Performs metadata-only search on the Spotify Web API.
    Used for track identity resolution, ISRC discovery, and canonical metadata enhancement.
    """
    if not spotify_provider.is_configured:
        return SpotifySearchResponseDTO(query=q, total=0, tracks=[])

    tracks = await spotify_provider.search_tracks(query=q, limit=limit)
    return SpotifySearchResponseDTO(
        query=q,
        total=len(tracks),
        tracks=tracks,
    )


@router.get("/track/{track_id}", response_model=SpotifyTrackDTO, summary="Get Spotify track metadata by ID")
async def get_spotify_track(track_id: str):
    """
    Fetches detailed metadata and ISRC for a specific Spotify track ID.
    """
    if not spotify_provider.is_configured:
        raise HTTPException(status_code=503, detail="Spotify provider is not configured")

    track = await spotify_provider.get_track(track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Spotify track not found")

    return track
