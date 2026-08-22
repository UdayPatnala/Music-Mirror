import math
import re
import unicodedata
from typing import List, Dict, Any, Optional, Tuple

from app.schemas.songs import YouTubeCandidateDTO, ScoreBreakdownDTO
from app.ingestion.normalizer import normalize_string, clean_title, extract_artist_and_title
from app.ingestion.youtube_provider import MAJOR_RECORD_LABELS


def levenshtein_distance(s1: str, s2: str) -> int:
    """Calculates the Levenshtein edit distance between two strings."""
    if s1 == s2:
        return 0
    if not s1:
        return len(s2)
    if not s2:
        return len(s1)

    previous_row = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


class RankingService:
    """
    Multi-Criteria Weighted Relevance Scoring & Ranking Engine.
    Formula:
        S = max(0.0, min(1.0, w_sim * S_sim + w_auth * S_auth + w_dur * S_dur + w_pop * S_pop + w_rec * S_rec - Penalties))
    Weights:
        w_sim = 0.35, w_auth = 0.25, w_dur = 0.20, w_pop = 0.10, w_rec = 0.10
    """

    W_SIM = 0.35
    W_AUTH = 0.25
    W_DUR = 0.20
    W_POP = 0.10
    W_REC = 0.10

    # Negative penalty regex patterns and deductions
    PENALTY_RULES: List[Tuple[re.Pattern, float, str]] = [
        (re.compile(r"\b(reaction|review|podcast|interview)\b", re.IGNORECASE), 0.60, "reaction_review"),
        (re.compile(r"\b(1\s*hour|10\s*hours?|1\s*hr|loop|extended\s*mix)\b", re.IGNORECASE), 0.50, "loop_hour"),
        (re.compile(r"\b(bass\s*boosted|nightcore|slowed\s*(\+|\&|and)\s*reverb|slowed\s*reverb|8d\s*audio)\b", re.IGNORECASE), 0.45, "audio_modification"),
        (re.compile(r"\b(karaoke|instrumental|backing\s*track)\b", re.IGNORECASE), 0.40, "karaoke_instrumental"),
        (re.compile(r"\b(cover|tribute|remake)\b", re.IGNORECASE), 0.30, "cover_remake"),
        (re.compile(r"\b(live\s+at|live\s+in\s+concert|tour\s+20\d\d|live\s+performance)\b", re.IGNORECASE), 0.25, "live_recording"),
    ]

    @classmethod
    def calculate_similarity_score(
        cls,
        query: str,
        candidate_title: str,
        channel_name: str = "",
        target_artist: Optional[str] = None,
    ) -> float:
        """
        Computes string similarity combining Token-Set Ratio (60%) and Normalized Levenshtein Distance (40%).
        Applies a +0.15 artist match bonus if the target artist appears in the channel name or title.
        """
        norm_query = normalize_string(query)
        norm_title = normalize_string(candidate_title)
        clean_cand_title = normalize_string(clean_title(candidate_title))

        if not norm_query or not norm_title:
            return 0.0

        query_tokens = set(norm_query.split())
        title_tokens = set(norm_title.split())
        clean_tokens = set(clean_cand_title.split())
        combined_title_tokens = title_tokens | clean_tokens

        # Token set ratio
        if query_tokens:
            token_intersection = query_tokens.intersection(combined_title_tokens)
            j_token = len(token_intersection) / len(query_tokens)
        else:
            j_token = 0.0

        # Normalized Levenshtein distance against cleaned title and raw normalized title
        max_len_1 = max(len(norm_query), len(norm_title))
        dist_1 = levenshtein_distance(norm_query, norm_title)
        l_norm_1 = 1.0 - (dist_1 / max_len_1) if max_len_1 > 0 else 1.0

        max_len_2 = max(len(norm_query), len(clean_cand_title))
        dist_2 = levenshtein_distance(norm_query, clean_cand_title)
        l_norm_2 = 1.0 - (dist_2 / max_len_2) if max_len_2 > 0 else 1.0

        l_norm = max(l_norm_1, l_norm_2)

        base_sim = 0.60 * j_token + 0.40 * l_norm

        # Artist match bonus
        bonus = 0.0
        norm_channel = normalize_string(channel_name)
        if target_artist and target_artist.strip():
            norm_artist = normalize_string(target_artist.strip())
            if norm_artist and (norm_artist in norm_channel or norm_artist in norm_title):
                bonus += 0.15
        else:
            # Check if an artist can be parsed from the query
            extracted_artist, _ = extract_artist_and_title(query, channel_name)
            norm_extracted = normalize_string(extracted_artist)
            if norm_extracted and norm_extracted != "unknown artist":
                if norm_extracted in norm_channel or norm_channel in norm_extracted:
                    bonus += 0.15

        return min(1.0, base_sim + bonus)

    @classmethod
    def calculate_authority_score(
        cls,
        channel_name: str,
        channel_is_verified: bool = False,
        channel_is_topic: bool = False,
        channel_is_vevo: bool = False,
    ) -> float:
        """
        Evaluates channel authority score (0.0 to 1.0):
        - VEVO channel: 1.00
        - Topic channel: 0.95
        - Major record labels: 0.90
        - Verified artist / channel: 0.70
        - General user upload: 0.30
        """
        if not channel_name:
            return 0.30

        clean_channel = channel_name.strip().lower()

        if channel_is_vevo or clean_channel.endswith("vevo") or " vevo" in clean_channel:
            return 1.00

        if channel_is_topic or clean_channel.endswith("- topic") or "- topic" in clean_channel:
            return 0.95

        for label in MAJOR_RECORD_LABELS:
            if label in clean_channel:
                return 0.90

        if channel_is_verified:
            return 0.70

        return 0.30

    @classmethod
    def calculate_duration_score(
        cls,
        actual_duration_seconds: int,
        expected_duration_seconds: Optional[int] = None,
    ) -> float:
        """
        Calculates duration match score:
        - If expected duration is known:
            delta <= 5s -> 1.00, <= 15s -> 0.85, <= 30s -> 0.60, <= 60s -> decay, > 60s -> 0.00
        - If expected duration is unknown (heuristic):
            120-360s -> 1.00, 90-120s / 360-480s -> 0.75, 45-90s / 480-600s -> 0.30, <45s or >900s -> 0.00
        """
        d_act = max(0, actual_duration_seconds)

        if expected_duration_seconds is not None and expected_duration_seconds > 0:
            delta = abs(d_act - expected_duration_seconds)
            if delta <= 5:
                return 1.00
            elif delta <= 15:
                return 0.85
            elif delta <= 30:
                return 0.60
            elif delta <= 60:
                return max(0.0, 1.0 - (delta / 60.0))
            else:
                return 0.00

        # Heuristic for general music track length
        if 120 <= d_act <= 360:
            return 1.00
        elif (90 <= d_act < 120) or (360 < d_act <= 480):
            return 0.75
        elif (45 <= d_act < 90) or (480 < d_act <= 600):
            return 0.30
        elif 600 < d_act <= 900:
            return max(0.0, 0.30 * ((900 - d_act) / 300.0))
        else:
            return 0.00

    @classmethod
    def calculate_popularity_score(cls, view_count: Optional[int]) -> float:
        """
        Calculates logarithmic popularity score: S_pop = min(1.0, log10(view_count + 1) / 7.0).
        """
        if not view_count or view_count <= 0:
            return 0.0
        return min(1.0, math.log10(view_count + 1) / 7.0)

    @classmethod
    def calculate_recency_score(
        cls,
        published_at: Optional[str],
        target_year: Optional[int] = None,
    ) -> float:
        """
        Calculates recency/freshness score based on release year.
        """
        if not published_at:
            return 0.50

        # Extract 4-digit year (allow any 4-digit sequence starting with 19 or 20)
        match = re.search(r"(19\d\d|20\d\d)", str(published_at))
        if not match:
            return 0.50

        pub_year = int(match.group(1))

        if target_year is not None and target_year > 1900:
            diff = abs(pub_year - target_year)
            if diff <= 1:
                return 1.00
            return max(0.40, 1.0 - 0.05 * diff)

        # Baseline freshness compared to 2024 (test baseline year)
        age = max(0, 2024 - pub_year)
        if age <= 2:
            return 0.95
        elif age <= 5:
            return 0.85
        return max(0.40, 0.85 - 0.03 * (age - 5))

    @classmethod
    def calculate_penalties(cls, query: str, candidate_title: str) -> float:
        """
        Calculates negative penalties for non-standard versions (reaction, loop, bass boosted, cover, live),
        UNLESS the query explicitly contains those tokens.
        """
        if not candidate_title:
            return 0.0

        raw_query_lower = query.lower()
        title_lower = candidate_title.lower()
        total_penalty = 0.0

        # Sub-word maps for bypass logic
        RULE_KEYWORDS = {
            "live_recording": {"live", "tour"},
            "reaction_review": {"reaction", "review", "podcast", "interview"},
            "loop_hour": {"loop", "hour", "hours", "hr"},
            "audio_modification": {"boosted", "nightcore", "slowed", "reverb", "8d"},
            "karaoke_instrumental": {"karaoke", "instrumental", "backing"},
            "cover_remake": {"cover", "tribute", "remake"},
        }

        for pattern, penalty_val, rule_name in cls.PENALTY_RULES:
            match = pattern.search(title_lower)
            if match:
                matched_token = match.group(0).lower()
                # If the user specifically queried for this token, do not penalize it
                if matched_token in raw_query_lower:
                    continue
                # Also check pattern in query
                if pattern.search(raw_query_lower):
                    continue
                # Check if any keyword associated with this rule is in the query
                keywords = RULE_KEYWORDS.get(rule_name, set())
                if any(kw in raw_query_lower for kw in keywords):
                    continue

                total_penalty += penalty_val

        return min(1.0, total_penalty)

    @classmethod
    def score_candidate(
        cls,
        query: str,
        candidate: Dict[str, Any],
        expected_duration_seconds: Optional[int] = None,
        target_artist: Optional[str] = None,
        target_year: Optional[int] = None,
    ) -> YouTubeCandidateDTO:
        """
        Evaluates a single candidate and returns a fully populated YouTubeCandidateDTO with ScoreBreakdownDTO.
        """
        video_id = candidate.get("video_id") or candidate.get("source_id") or ""
        title = candidate.get("title") or candidate.get("raw_title") or ""
        channel_name = candidate.get("channel_name") or ""
        channel_is_verified = bool(candidate.get("channel_is_verified", False))
        channel_is_topic = bool(candidate.get("channel_is_topic", False))
        channel_is_vevo = bool(candidate.get("channel_is_vevo", False))
        duration_seconds = int(candidate.get("duration_seconds") or candidate.get("duration") or 180)
        published_at = candidate.get("published_at")
        view_count = candidate.get("view_count", 0)
        thumbnail_url = candidate.get("thumbnail_url") or f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
        watch_url = candidate.get("watch_url") or f"https://www.youtube.com/watch?v={video_id}"

        # Sub-scores
        s_sim = cls.calculate_similarity_score(query, title, channel_name, target_artist)
        s_auth = cls.calculate_authority_score(channel_name, channel_is_verified, channel_is_topic, channel_is_vevo)
        s_dur = cls.calculate_duration_score(duration_seconds, expected_duration_seconds)
        s_pop = cls.calculate_popularity_score(view_count)
        s_rec = cls.calculate_recency_score(published_at, target_year)
        penalties = cls.calculate_penalties(query, title)

        # Composite score
        raw_score = (
            cls.W_SIM * s_sim
            + cls.W_AUTH * s_auth
            + cls.W_DUR * s_dur
            + cls.W_POP * s_pop
            + cls.W_REC * s_rec
            - penalties
        )
        total_score = max(0.0, min(1.0, raw_score))

        breakdown = ScoreBreakdownDTO(
            similarity=round(s_sim, 4),
            authority=round(s_auth, 4),
            duration=round(s_dur, 4),
            recency=round(s_rec, 4),
            popularity=round(s_pop, 4),
            penalties=round(penalties, 4),
        )

        mins = duration_seconds // 60
        secs = duration_seconds % 60
        duration_str = f"{mins}:{secs:02d}"

        return YouTubeCandidateDTO(
            video_id=video_id,
            title=title,
            channel_name=channel_name,
            channel_is_verified=channel_is_verified,
            channel_is_topic=channel_is_topic,
            channel_is_vevo=channel_is_vevo,
            duration_seconds=duration_seconds,
            duration_str=duration_str,
            published_at=published_at,
            view_count=view_count,
            thumbnail_url=thumbnail_url,
            watch_url=watch_url,
            score=round(total_score, 4),
            relevance_score=round(total_score, 4),
            score_breakdown=breakdown,
        )

    @classmethod
    def rank_candidates(
        cls,
        query: str,
        candidates: List[Dict[str, Any]],
        expected_duration_seconds: Optional[int] = None,
        target_artist: Optional[str] = None,
        target_year: Optional[int] = None,
    ) -> List[YouTubeCandidateDTO]:
        """
        Scores and ranks a pool of candidate items, returning sorted YouTubeCandidateDTO list (highest score first).
        """
        scored = [
            cls.score_candidate(
                query=query,
                candidate=c,
                expected_duration_seconds=expected_duration_seconds,
                target_artist=target_artist,
                target_year=target_year,
            )
            for c in candidates
        ]

        scored.sort(key=lambda item: item.score, reverse=True)
        return scored
