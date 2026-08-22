import pytest

from app.services.ranking_service import RankingService, levenshtein_distance
from app.schemas.songs import YouTubeCandidateDTO, ScoreBreakdownDTO


class TestWeightedRankingEngine:
    """Test suite for Multi-Criteria Weighted Relevance Scoring & Ranking (R2)."""

    def test_levenshtein_distance(self):
        assert levenshtein_distance("kitten", "sitting") == 3
        assert levenshtein_distance("hello", "hello") == 0
        assert levenshtein_distance("", "test") == 4
        assert levenshtein_distance("test", "") == 4

    def test_similarity_scoring_and_artist_bonus(self):
        # High token match
        s1 = RankingService.calculate_similarity_score("Blinding Lights", "The Weeknd - Blinding Lights (Official Audio)")
        assert s1 >= 0.70

        # Exact title match
        s2 = RankingService.calculate_similarity_score("Starboy", "Starboy")
        assert s2 >= 0.95

        # Completely unrelated title
        s3 = RankingService.calculate_similarity_score("Blinding Lights", "Shape of You Ed Sheeran")
        assert s3 < 0.20

        # Target artist match bonus (+0.15)
        s_no_artist = RankingService.calculate_similarity_score("Levitating", "Levitating", channel_name="Dua Lipa")
        s_with_artist = RankingService.calculate_similarity_score("Levitating", "Levitating", channel_name="Dua Lipa", target_artist="Dua Lipa")
        assert s_with_artist >= s_no_artist

    def test_channel_authority_scoring(self):
        # VEVO -> 1.00
        assert RankingService.calculate_authority_score("TheWeekndVEVO", channel_is_vevo=True) == 1.00
        assert RankingService.calculate_authority_score("TaylorSwiftVEVO") == 1.00

        # Topic -> 0.95
        assert RankingService.calculate_authority_score("A. R. Rahman - Topic", channel_is_topic=True) == 0.95

        # Major Record Label -> 0.90
        assert RankingService.calculate_authority_score("T-Series") == 0.90
        assert RankingService.calculate_authority_score("Sony Music India") == 0.90
        assert RankingService.calculate_authority_score("Universal Music Group") == 0.90
        assert RankingService.calculate_authority_score("Aditya Music") == 0.90
        assert RankingService.calculate_authority_score("Lahari Music") == 0.90

        # Verified independent -> 0.70
        assert RankingService.calculate_authority_score("Verified Indie Artist", channel_is_verified=True) == 0.70

        # General user upload -> 0.30
        assert RankingService.calculate_authority_score("music_fan_2024") == 0.30

    def test_duration_scoring_known_expected_duration(self):
        expected_sec = 210  # 3m 30s
        # Delta <= 5s -> 1.00
        assert RankingService.calculate_duration_score(212, expected_duration_seconds=expected_sec) == 1.00
        # Delta <= 15s -> 0.85
        assert RankingService.calculate_duration_score(220, expected_duration_seconds=expected_sec) == 0.85
        # Delta <= 30s -> 0.60
        assert RankingService.calculate_duration_score(235, expected_duration_seconds=expected_sec) == 0.60
        # Delta <= 60s -> decay
        s_decay = RankingService.calculate_duration_score(260, expected_duration_seconds=expected_sec)
        assert 0.0 < s_decay < 0.60
        # Delta > 60s -> 0.00
        assert RankingService.calculate_duration_score(300, expected_duration_seconds=expected_sec) == 0.00

    def test_duration_scoring_unknown_heuristic(self):
        # Standard song (120 - 360s) -> 1.00
        assert RankingService.calculate_duration_score(180) == 1.00
        assert RankingService.calculate_duration_score(240) == 1.00
        # Extended / Short (90-120s, 360-480s) -> 0.75
        assert RankingService.calculate_duration_score(100) == 0.75
        assert RankingService.calculate_duration_score(400) == 0.75
        # Snippets (<45s) -> 0.00
        assert RankingService.calculate_duration_score(30) == 0.00
        # Loops / Compilations (>900s) -> 0.00
        assert RankingService.calculate_duration_score(3600) == 0.00

    def test_popularity_scoring(self):
        assert RankingService.calculate_popularity_score(0) == 0.0
        assert RankingService.calculate_popularity_score(None) == 0.0
        s_10k = RankingService.calculate_popularity_score(10000)
        assert 0.50 <= s_10k <= 0.65
        s_10m = RankingService.calculate_popularity_score(10000000)
        assert s_10m >= 0.99

    def test_recency_scoring(self):
        # Target year matching
        assert RankingService.calculate_recency_score("20240501", target_year=2024) == 1.00
        assert RankingService.calculate_recency_score("20230501", target_year=2024) == 1.00
        # Baseline freshness
        assert RankingService.calculate_recency_score("2025") >= 0.85
        assert RankingService.calculate_recency_score(None) == 0.50

    def test_negative_penalty_deductions(self):
        # Reaction penalty (0.60)
        assert RankingService.calculate_penalties("Blinding Lights", "Blinding Lights REACTION VIDEO") >= 0.60
        # Loop penalty (0.50)
        assert RankingService.calculate_penalties("Blinding Lights", "Blinding Lights (1 Hour Loop)") >= 0.50
        # Bass boosted penalty (0.45)
        assert RankingService.calculate_penalties("Blinding Lights", "Blinding Lights Bass Boosted 8D Audio") >= 0.45
        # Cover penalty (0.30)
        assert RankingService.calculate_penalties("Blinding Lights", "Blinding Lights - Acoustic Cover by John") >= 0.30
        # Live penalty (0.25)
        assert RankingService.calculate_penalties("Blinding Lights", "Blinding Lights (Live at Super Bowl)") >= 0.25

    def test_negative_penalty_exception_when_queried(self):
        # When user explicitly searches for "karaoke", do not apply karaoke penalty
        assert RankingService.calculate_penalties("Blinding Lights Karaoke", "Blinding Lights (Karaoke Version)") == 0.0
        assert RankingService.calculate_penalties("Hotel California Live", "Hotel California (Live in Concert)") == 0.0

    def test_composite_ranking_pool_order(self):
        candidates = [
            {
                "video_id": "cover_vid",
                "title": "Blinding Lights (Cover by Fan)",
                "channel_name": "Fan Covers",
                "channel_is_verified": False,
                "duration_seconds": 200,
                "view_count": 5000,
                "published_at": "2024",
            },
            {
                "video_id": "loop_vid",
                "title": "Blinding Lights 1 Hour Loop",
                "channel_name": "Loop Masters",
                "channel_is_verified": False,
                "duration_seconds": 3600,
                "view_count": 200000,
                "published_at": "2024",
            },
            {
                "video_id": "official_vid",
                "title": "The Weeknd - Blinding Lights (Official Video)",
                "channel_name": "TheWeekndVEVO",
                "channel_is_vevo": True,
                "channel_is_verified": True,
                "duration_seconds": 200,
                "view_count": 800000000,
                "published_at": "2020",
            },
            {
                "video_id": "topic_vid",
                "title": "Blinding Lights",
                "channel_name": "The Weeknd - Topic",
                "channel_is_topic": True,
                "channel_is_verified": True,
                "duration_seconds": 200,
                "view_count": 50000000,
                "published_at": "2020",
            },
        ]

        ranked = RankingService.rank_candidates(
            query="The Weeknd Blinding Lights",
            candidates=candidates,
            expected_duration_seconds=200,
            target_artist="The Weeknd",
        )

        assert len(ranked) == 4
        # The top result must be the official VEVO video
        assert ranked[0].video_id == "official_vid"
        assert ranked[0].score > 0.85
        assert ranked[0].score_breakdown is not None
        assert ranked[0].score_breakdown.authority == 1.00

        # Topic audio must rank #2
        assert ranked[1].video_id == "topic_vid"
        assert ranked[1].score > 0.80

        # Penalized items (cover & 1 hour loop) must rank lowest
        assert ranked[2].video_id in ["cover_vid", "loop_vid"]
        assert ranked[3].video_id in ["cover_vid", "loop_vid"]
        assert ranked[3].score < 0.40
