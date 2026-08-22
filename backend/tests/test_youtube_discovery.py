import pytest
from unittest.mock import patch, MagicMock

from app.ingestion.normalizer import normalize_string, clean_title, extract_artist_and_title
from app.ingestion.youtube_provider import YouTubeMetadataProvider, MAJOR_RECORD_LABELS


class TestQueryNormalizationAndPreprocessing:
    """Test suite for Query Normalization & Preprocessing (R1)."""

    def test_unicode_nfkd_diacritics_normalization(self):
        # Accents and diacritics
        assert normalize_string("Café del Mar") == "cafe del mar"
        assert normalize_string("Beyoncé - CUFF IT") == "beyonce cuff it"
        assert normalize_string("Mötley Crüe") == "motley crue"
        assert normalize_string("  Naatu   Naatu  ") == "naatu naatu"

    def test_noise_patterns_and_metadata_stripping(self):
        # Video metadata noise removal
        raw_1 = "Blinding Lights [Official Music Video]"
        cleaned_1 = clean_title(raw_1)
        assert "official" not in cleaned_1.lower()
        assert "video" not in cleaned_1.lower()
        assert "Blinding Lights" in cleaned_1

        raw_2 = "Starboy (Official Audio) [4K 60FPS] (Lyrics)"
        cleaned_2 = clean_title(raw_2)
        assert "4k" not in cleaned_2.lower()
        assert "lyrics" not in cleaned_2.lower()

        raw_3 = "Kesariya - Brahmāstra | Full Video Song | Ranbir | Alia"
        cleaned_3 = clean_title(raw_3)
        assert "full video song" not in cleaned_3.lower()

    def test_artist_and_title_extraction(self):
        artist, title = extract_artist_and_title("The Weeknd - Blinding Lights", "TheWeekndVEVO")
        assert artist == "The Weeknd"
        assert title == "Blinding Lights"

        artist_2, title_2 = extract_artist_and_title("Levitating - Dua Lipa", "Dua Lipa")
        # Inverted format with channel hint
        assert "Dua Lipa" in [artist_2, title_2]
        assert "Levitating" in [artist_2, title_2]

    def test_empty_and_whitespace_normalization(self):
        assert normalize_string("") == ""
        assert normalize_string("   ") == ""
        assert normalize_string(None) == ""
        assert clean_title("") == ""
        assert clean_title(None) == ""


class TestYouTubeCandidateDiscoveryPool:
    """Test suite for Multi-Candidate YouTube Discovery Provider (R1)."""

    def test_channel_vevo_detection(self):
        assert YouTubeMetadataProvider._is_vevo_channel("TheWeekndVEVO") is True
        assert YouTubeMetadataProvider._is_vevo_channel("TaylorSwiftVEVO") is True
        assert YouTubeMetadataProvider._is_vevo_channel("vevo") is True
        assert YouTubeMetadataProvider._is_vevo_channel("RandomChannel") is False

    def test_channel_topic_detection(self):
        assert YouTubeMetadataProvider._is_topic_channel("A. R. Rahman - Topic") is True
        assert YouTubeMetadataProvider._is_topic_channel("Dua Lipa - Topic") is True
        assert YouTubeMetadataProvider._is_topic_channel("The Weeknd Topic") is True
        assert YouTubeMetadataProvider._is_topic_channel("Topic Channel Fans") is True
        assert YouTubeMetadataProvider._is_topic_channel("Standard Channel") is False

    def test_major_label_verification_detection(self):
        assert YouTubeMetadataProvider._is_verified_or_official("T-Series") is True
        assert YouTubeMetadataProvider._is_verified_or_official("Sony Music India") is True
        assert YouTubeMetadataProvider._is_verified_or_official("Universal Music Group") is True
        assert YouTubeMetadataProvider._is_verified_or_official("Aditya Music") is True
        assert YouTubeMetadataProvider._is_verified_or_official("Lahari Music | T-Series") is True
        assert YouTubeMetadataProvider._is_verified_or_official("Zee Music Company") is True
        assert YouTubeMetadataProvider._is_verified_or_official("Spinnin' Records") is True
        assert YouTubeMetadataProvider._is_verified_or_official("independent_uploader_99") is False

    def test_candidate_pool_extraction_mocked(self):
        provider = YouTubeMetadataProvider()

        mock_entries = [
            {
                "id": f"vid_{i:02d}",
                "title": f"Song Title Variant {i}",
                "uploader": "TheWeekndVEVO" if i == 0 else (f"Artist - Topic" if i == 1 else "User Channel"),
                "duration": 200 + i * 5,
                "upload_date": "20230501",
                "view_count": 1000000 // (i + 1),
                "thumbnail": f"https://img.youtube.com/vi/vid_{i:02d}/hqdefault.jpg",
            }
            for i in range(15)
        ]

        with patch("yt_dlp.YoutubeDL") as mock_ydl_cls:
            mock_ydl_instance = MagicMock()
            mock_ydl_instance.extract_info.return_value = {"entries": mock_entries}
            mock_ydl_cls.return_value.__enter__.return_value = mock_ydl_instance

            candidates = provider.search_metadata("The Weeknd Blinding Lights", limit=12)

            assert len(candidates) == 12
            # Validate candidate 0
            c0 = candidates[0]
            assert c0["video_id"] == "vid_00"
            assert c0["channel_name"] == "TheWeekndVEVO"
            assert c0["channel_is_vevo"] is True
            assert c0["channel_is_verified"] is True
            assert c0["duration_seconds"] == 200
            assert c0["published_at"] == "20230501"
            assert c0["view_count"] == 1000000
            assert c0["thumbnail_url"] == "https://img.youtube.com/vi/vid_00/hqdefault.jpg"
            assert c0["watch_url"] == "https://www.youtube.com/watch?v=vid_00"

            # Validate candidate 1 (Topic)
            c1 = candidates[1]
            assert c1["channel_is_topic"] is True
            assert c1["channel_is_verified"] is True

            # Validate candidate 2 (User)
            c2 = candidates[2]
            assert c2["channel_is_vevo"] is False
            assert c2["channel_is_topic"] is False
            assert c2["channel_is_verified"] is False

    def test_candidate_pool_deduplication(self):
        provider = YouTubeMetadataProvider()

        # Duplicate video IDs in entries
        mock_entries = [
            {"id": "duplicate_id", "title": "First Instance", "uploader": "VEVO Channel", "duration": 180},
            {"id": "duplicate_id", "title": "Second Instance Duplicate", "uploader": "VEVO Channel", "duration": 180},
            {"id": "unique_id_2", "title": "Second Unique Song", "uploader": "Artist - Topic", "duration": 190},
        ]

        with patch("yt_dlp.YoutubeDL") as mock_ydl_cls:
            mock_ydl_instance = MagicMock()
            mock_ydl_instance.extract_info.return_value = {"entries": mock_entries}
            mock_ydl_cls.return_value.__enter__.return_value = mock_ydl_instance

            candidates = provider.search_metadata("Duplicate Test Query", limit=10)
            assert len(candidates) == 2
            assert candidates[0]["video_id"] == "duplicate_id"
            assert candidates[1]["video_id"] == "unique_id_2"

    def test_empty_and_error_handling(self):
        provider = YouTubeMetadataProvider()

        # Empty search query
        assert provider.search_metadata("") == []
        assert provider.search_metadata("   ") == []

        # Exception during extraction
        with patch("yt_dlp.YoutubeDL") as mock_ydl_cls:
            mock_ydl_instance = MagicMock()
            mock_ydl_instance.extract_info.side_effect = RuntimeError("Network blackout")
            mock_ydl_cls.return_value.__enter__.return_value = mock_ydl_instance

            # Must handle gracefully and return empty list
            candidates = provider.search_metadata("Query Under Network Failure", limit=10)
            assert candidates == []
