from __future__ import annotations

import math
import os
import sys
import unittest
from typing import Any

# Ensure project backend is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import backend.recommender as recommender


class StressTestRecommender(unittest.TestCase):

    # --- 1. Emotion Normalization & Input Validation ---

    def test_normalize_emotion_extreme_and_invalid_inputs(self):
        """Test emotion normalization with numeric, extreme float, empty, and non-string inputs."""
        test_cases = [
            ("0.0", "0.0"),
            ("1.0", "1.0"),
            ("0", "0"),
            ("1", "1"),
            (0.0, "neutral"),
            (1.0, "neutral"),
            (-1.0, "neutral"),
            (999.0, "neutral"),
            (float("nan"), "neutral"),
            (float("inf"), "neutral"),
            (float("-inf"), "neutral"),
            (None, "neutral"),
            ("", "neutral"),
            ("   ", "neutral"),
            ([], "neutral"),
            ({}, "neutral"),
            ("HAPPY", "happy"),
            ("  joyful  ", "happy"),
            ("SURPRISED", "surprise"),
            ("unknown_emotion_vibe", "unknown_emotion_vibe"),
        ]

        for input_val, expected in test_cases:
            with self.subTest(input_val=input_val):
                res = recommender.normalize_emotion(input_val)
                self.assertEqual(res, expected, f"Failed for input: {input_val}")

    # --- 2. Audio Feature Extraction & Clamping ---

    def test_extract_song_features_extreme_out_of_bounds(self):
        """Test feature extraction and clamping with out-of-bounds, negative, and extreme inputs."""

        # Extremely low / negative values
        song_low = {
            "title": "Low Bound Song",
            "valence": -100.0,
            "energy_numeric": -50.0,
            "bpm": -500.0,
        }
        feats_low = recommender.extract_song_features(song_low)
        self.assertEqual(feats_low["valence"], 0.0)
        self.assertEqual(feats_low["energy"], 0.0)
        self.assertEqual(feats_low["tempo"], 0.0)

        # Extremely high values
        song_high = {
            "title": "High Bound Song",
            "valence": 999.0,
            "energy_numeric": 500.0,
            "bpm": 100000.0,
        }
        feats_high = recommender.extract_song_features(song_high)
        self.assertEqual(feats_high["valence"], 1.0)
        self.assertEqual(feats_high["energy"], 1.0)
        self.assertEqual(feats_high["tempo"], 1.0)

        # Boundary values 0.0 and 1.0
        song_bound = {
            "title": "Exact Boundary Song",
            "valence": 0.0,
            "energy_numeric": 1.0,
            "tempo": 0.0,
        }
        feats_bound = recommender.extract_song_features(song_bound)
        self.assertEqual(feats_bound["valence"], 0.0)
        self.assertEqual(feats_bound["energy"], 1.0)
        self.assertEqual(feats_bound["tempo"], 0.0)

        # BPM normalization mapping (60 BPM = 0.0, 180 BPM = 1.0)
        song_bpm_60 = {"bpm": 60.0}
        feats_bpm_60 = recommender.extract_song_features(song_bpm_60)
        self.assertEqual(feats_bpm_60["tempo"], 0.0)

        song_bpm_180 = {"bpm": 180.0}
        feats_bpm_180 = recommender.extract_song_features(song_bpm_180)
        self.assertEqual(feats_bpm_180["tempo"], 1.0)

        song_bpm_120 = {"bpm": 120.0}
        feats_bpm_120 = recommender.extract_song_features(song_bpm_120)
        self.assertAlmostEqual(feats_bpm_120["tempo"], 0.5, places=2)

    def test_extract_song_features_string_energy_and_genre_heuristics(self):
        """Test energy string label mapping and missing valence genre heuristics."""

        # Energy string label fallback for unmapped strings
        song_unknown_energy = {"energy": "Super Hyper Mega", "genre": "Pop"}
        feats = recommender.extract_song_features(song_unknown_energy)
        self.assertEqual(feats["energy"], 0.5)

        # Pop genre valence boost (valence = energy + 0.1, clamped to 1.0)
        song_pop = {"energy": "High", "genre": "Pop Music"}  # energy = 0.85
        feats_pop = recommender.extract_song_features(song_pop)
        self.assertAlmostEqual(feats_pop["valence"], 0.95, places=2)

        # Acoustic genre valence reduction (valence = energy - 0.1, clamped to 0.1)
        song_ballad = {"energy": "Low", "genre": "Acoustic Ballad"}  # energy = 0.25
        feats_ballad = recommender.extract_song_features(song_ballad)
        self.assertAlmostEqual(feats_ballad["valence"], 0.15, places=2)

    # --- 3. Feature Similarity Calculation & Weights ---

    def test_compute_feature_similarity_weights_and_distances(self):
        """Test similarity score computation with zero, custom, and extreme weights."""

        target = {"valence": 0.9, "energy": 0.85, "tempo": 0.75}
        song_exact = {"valence": 0.9, "energy": 0.85, "tempo": 0.75}

        # Exact match -> 1.0
        score_exact = recommender.compute_feature_similarity(song_exact, target)
        self.assertEqual(score_exact, 1.0)

        # Opposite profile -> distance max
        song_opposite = {"valence": 0.0, "energy": 0.0, "tempo": 0.0}
        score_opp = recommender.compute_feature_similarity(song_opposite, target)
        self.assertTrue(0.0 <= score_opp < 0.4)

        # Zero weight handling
        zero_weights = {"valence": 0.0, "energy": 0.0, "tempo": 0.0}
        score_zero = recommender.compute_feature_similarity(song_exact, target, weights=zero_weights)
        self.assertEqual(score_zero, 0.0)

        # Single feature weight focus
        valence_only = {"valence": 1.0, "energy": 0.0, "tempo": 0.0}
        song_diff_energy = {"valence": 0.9, "energy": 0.0, "tempo": 0.0}
        score_val = recommender.compute_feature_similarity(song_diff_energy, target, weights=valence_only)
        self.assertEqual(score_val, 1.0)

    # --- 4. Recommendation Engine Core Logic ---

    def test_recommend_songs_extreme_filters_and_thresholds(self):
        """Test recommendation generation under extreme limit and min_score thresholds."""

        # Limit = 0 or negative
        _, songs_limit_0 = recommender.recommend_songs("happy", limit=0)
        self.assertEqual(len(songs_limit_0), 0)

        _, songs_limit_neg = recommender.recommend_songs("happy", limit=-5)
        self.assertEqual(len(songs_limit_neg), len(recommender.SONGS.get("happy", [])) + sum(len(v) for k, v in recommender.SONGS.items() if k != "happy"))

        # Min score impossible threshold (> 1.0)
        _, songs_impossible = recommender.recommend_songs("happy", min_score=1.5)
        self.assertEqual(len(songs_impossible), 0)

        # Min score lowest threshold (0.0)
        _, songs_all = recommender.recommend_songs("happy", min_score=0.0)
        self.assertTrue(len(songs_all) > 0)

        # Non-existent genre filter
        _, songs_no_genre = recommender.recommend_songs("happy", genre_filter="NonExistentGenre12345")
        self.assertEqual(len(songs_no_genre), 0)

        # Extreme numeric emotion strings
        norm_0, songs_0 = recommender.recommend_songs("0.0")
        self.assertEqual(norm_0, "0.0")
        self.assertTrue(len(songs_0) > 0)

        norm_1, songs_1 = recommender.recommend_songs("1.0")
        self.assertEqual(norm_1, "1.0")
        self.assertTrue(len(songs_1) > 0)

    def test_recommend_songs_ranking_order(self):
        """Ensure recommended songs are strictly ordered by recommendation score descending."""
        for emotion in ["happy", "sad", "angry", "neutral", "surprise", "0.0", "1.0", "unknown_vibe"]:
            norm_emotion, songs = recommender.recommend_songs(emotion)
            self.assertTrue(len(songs) > 0)
            scores = [s["recommendation_score"] for s in songs]
            self.assertEqual(scores, sorted(scores, reverse=True), f"Ranking order failed for emotion: {emotion}")


if __name__ == "__main__":
    unittest.main()
