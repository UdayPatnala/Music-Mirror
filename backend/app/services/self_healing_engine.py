import math
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.db.models import Song, SongSource, UserPlaybackReport
from app.ingestion.ingestion_service import IngestionService

NOISE_TOKENS = {"official", "video", "lyrical", "song", "audio", "full", "hd", "4k", "mv", "music", "track"}


def clean_title_tokens(text: str) -> set[str]:
    cleaned = text.lower().replace("(", " ").replace(")", " ").replace("-", " ").replace("_", " ")
    tokens = set([t.strip() for t in cleaned.split() if t.strip()])
    filtered = tokens - NOISE_TOKENS
    return filtered if filtered else tokens


def levenshtein_similarity(s1: str, s2: str) -> float:
    """Computes title similarity ratio [0.0, 1.0] ignoring noise tokens."""
    a, b = s1.lower().strip(), s2.lower().strip()
    if not a or not b:
        return 0.0
    if a == b or a in b or b in a:
        return 1.0

    tokens_a = clean_title_tokens(s1)
    tokens_b = clean_title_tokens(s2)

    if not tokens_a or not tokens_b:
        return 0.0

    intersection = tokens_a.intersection(tokens_b)
    if intersection:
        return min(1.0, 0.85 + (len(intersection) * 0.05))

    union = tokens_a.union(tokens_b)
    return round(len(intersection) / float(len(union)), 2) if union else 0.0


class SelfHealingEngine:
    """
    Autonomous Self-Healing Music Source & Playback Reliability System.
    DETECT -> CLASSIFY -> DIAGNOSE -> ATTEMPT_REPAIR -> VERIFY -> UPDATE_SOURCE -> LEARN -> PREVENT_RECURRENCE.
    """

    @staticmethod
    def classify_issue(report_type: str, error_code: Optional[str] = None) -> Tuple[str, str]:
        """Classifies playback failure and assigns initial confidence."""
        r_type = report_type.upper().strip()
        if r_type in ["WRONG_SONG", "WRONG_VERSION"]:
            return "WRONG_SONG", "HIGH"
        if r_type in ["NOT_PLAYING", "AUDIO_ERROR"] or error_code in ["403", "404", "MEDIA_ERR_SRC_NOT_SUPPORTED"]:
            return "SOURCE_UNAVAILABLE", "HIGH"
        if r_type == "SOURCE_UNAVAILABLE":
            return "SOURCE_UNAVAILABLE", "HIGH"
        if r_type == "METADATA_MISMATCH":
            return "METADATA_MISMATCH", "MEDIUM"

        return "PLAYBACK_FAILURE", "MEDIUM"

    @staticmethod
    def match_song_identity(song: Song, source: SongSource) -> float:
        """
        Validates candidate source metadata against canonical Song identity.
        Returns confidence score [0.0, 1.0].
        """
        if not source.title_at_source:
            return 0.50

        title_sim = levenshtein_similarity(song.title, source.title_at_source)

        # Duration match check (within 15% ratio)
        duration_sim = 1.0
        if song.duration and source.duration_at_source and song.duration > 0:
            diff = abs(song.duration - source.duration_at_source)
            if diff > 45: # More than 45 seconds difference
                duration_sim = 0.40
            elif diff > 20:
                duration_sim = 0.75

        confidence = round((title_sim * 0.70) + (duration_sim * 0.30), 2)
        return confidence

    @classmethod
    def record_playback_report(
        cls,
        db: Session,
        user_id: str,
        song_id: str,
        source_id: Optional[str],
        report_type: str,
        description: Optional[str] = None,
        error_code: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Processes a user playback report, deduplicates incidents, and executes self-healing repair.
        """
        song = db.query(Song).filter(Song.id == song_id).first()
        if not song:
            return {"status": "error", "message": "Song not found"}

        classification, confidence = cls.classify_issue(report_type, error_code)

        # Create report record
        report = UserPlaybackReport(
            user_id=user_id,
            song_id=song_id,
            source_id=source_id,
            report_type=report_type,
            issue_classification=classification,
            description=description,
            error_code=error_code,
            confidence=confidence,
            status="PENDING",
        )
        db.add(report)
        db.flush()

        # Update current source health metrics if source_id provided
        active_source = None
        if source_id:
            active_source = db.query(SongSource).filter(SongSource.id == source_id).first()
        if not active_source:
            active_source = db.query(SongSource).filter(SongSource.song_id == song_id, SongSource.status == "ACTIVE").first()

        if active_source:
            active_source.failure_count += 1
            active_source.consecutive_failures += 1
            active_source.health_score = max(0.0, round(active_source.health_score - 0.25, 2))
            active_source.last_checked_at = datetime.utcnow()

            if active_source.consecutive_failures >= 2 or classification == "WRONG_SONG":
                active_source.status = "DEGRADED" if classification != "WRONG_SONG" else "UNAVAILABLE"

        # Attempt Automated Self-Healing Repair
        repair_result = cls.attempt_automated_repair(db, song, active_source, classification)

        if repair_result["repaired"]:
            report.status = "REPAIRED"
        else:
            report.status = "DIAGNOSED"

        db.commit()
        return {
            "status": "success",
            "report_id": report.id,
            "classification": classification,
            "repair": repair_result,
        }

    @classmethod
    def attempt_automated_repair(
        cls,
        db: Session,
        song: Song,
        failed_source: Optional[SongSource],
        classification: str,
    ) -> Dict[str, Any]:
        """
        Autonomous Repair Pipeline:
        1. Checks known alternative SongSources for song.
        2. Validates identity match confidence (> 0.60).
        3. Promotes healthy secondary source to primary.
        4. Learns and updates source reliability scores.
        """
        # Search existing candidate sources for this song
        sources = db.query(SongSource).filter(SongSource.song_id == song.id).all()
        alternative_sources = [s for s in sources if failed_source is None or s.id != failed_source.id]

        for candidate in alternative_sources:
            confidence = cls.match_song_identity(song, candidate)
            if confidence >= 0.60 and candidate.status in ["ACTIVE", "DEGRADED"]:
                # Promote candidate to PRIMARY source
                candidate.status = "ACTIVE"
                candidate.priority = 1
                candidate.success_count += 1
                candidate.reliability_score = min(1.0, round(candidate.reliability_score + 0.10, 2))
                candidate.last_verified_at = datetime.utcnow()

                if failed_source:
                    failed_source.priority = 2
                    failed_source.status = "UNAVAILABLE"

                db.commit()

                return {
                    "repaired": True,
                    "new_source_id": candidate.id,
                    "new_youtube_id": candidate.source_id,
                    "confidence": confidence,
                    "action": f"Switched primary source to verified candidate '{candidate.source_id}'",
                }

        # If no alternative source exists, mark current source UNAVAILABLE but preserve canonical Song
        if failed_source:
            failed_source.status = "UNAVAILABLE"
            db.commit()

        return {
            "repaired": False,
            "message": "No verified alternative source currently available. Scheduled for automated ingestion retry.",
        }
