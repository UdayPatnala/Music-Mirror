import sys
import os
import time
import json
from typing import List, Dict, Any
from pydantic import ValidationError

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, r"d:\PROJECT\Music Mirror\backend")

from app.db.models import Artist, Album, Song, SongSource, UserMusicPreference
from app.schemas.song import ArtistDTO, AlbumDTO, SongDTO, SongCreateDTO, SongUpdateDTO, PaginatedSongsResponse
from app.schemas.taxonomy import GenreDTO, MoodDTO, TagDTO, TaxonomySummaryDTO, SongSourceDTO
from app.api.routes.songs import build_song_dto, format_duration


def make_fully_populated_song_orm(song_id: str = "song-1") -> Song:
    """Creates a Song ORM object with all non-nullable columns explicitly assigned (simulating DB loaded record)."""
    return Song(
        id=song_id,
        title="Full Song",
        normalized_title="full song",
        artist_id="art-1",
        album_id="alb-1",
        album_title="Full Album",
        duration=200,
        release_date="2024",
        genre="Pop",
        sub_genre="Dance Pop",
        language="English",
        explicit=False,
        track_number=1,
        disc_number=1,
        cover_image_url="http://example.com/cover.jpg",
        audio_url="http://example.com/audio.mp3",
        preview_url="http://example.com/preview.mp3",
        lyrics_availability=True,
        isrc="US1234567890",
        popularity=85,
        energy=0.8,
        danceability=0.7,
        valence=0.9,
        acousticness=0.1,
        instrumentalness=0.0,
        tempo=124.0,
        key=5,
        mode=1,
        loudness=-5.0,
        mood="happy",
        tags="pop, energetic, 2024",
        description="Full description",
        youtube_id="abc123xyz"
    )

def make_fully_populated_source_orm(source_id: str = "src-1") -> SongSource:
    return SongSource(
        id=source_id,
        song_id="song-1",
        source_type="youtube",
        source_id="yt-123",
        source_url="https://youtube.com/watch?v=yt-123",
        status="ACTIVE",
        health_score=0.95,
        priority=1,
        success_count=10,
        failure_count=0,
        consecutive_failures=0,
        reliability_score=0.98,
        title_at_source="Song Title",
        duration_at_source=200,
        thumbnail_url="http://example.com/thumb.jpg",
        channel_name="Official Channel",
        stale_after_hours=168
    )


class EmpiricalChallengerRunner:
    def __init__(self):
        self.results = []
        self.defects = []

    def record_pass(self, test_name: str, details: str):
        print(f"[PASS] [{test_name}] {details}")
        self.results.append({"test": test_name, "status": "PASS", "details": details})

    def record_fail(self, test_name: str, details: str, severity: str = "HIGH"):
        print(f"[FAIL] [{severity}]: [{test_name}] {details}")
        self.results.append({"test": test_name, "status": "FAIL", "severity": severity, "details": details})
        self.defects.append({"test": test_name, "severity": severity, "details": details})

    def run_all(self):
        print("\n==================================================================")
        print("STARTING EMPIRICAL CHALLENGER STRESS TEST SUITE FOR MILESTONE 1")
        print("==================================================================\n")
        self.test_1_artist_orm_to_pydantic()
        self.test_2_album_orm_to_pydantic()
        self.test_3_song_source_orm_to_pydantic()
        self.test_4_raw_song_orm_to_pydantic_direct_validate()
        self.test_5_song_orm_with_attached_artist_name()
        self.test_6_unflushed_orm_defaults_issue()
        self.test_7_build_song_dto_helper()
        self.test_8_song_dto_tag_list_derivation()
        self.test_9_song_source_dto_field_bounds()
        self.test_10_song_create_dto_validations()
        self.test_11_song_update_dto_optionality()
        self.test_12_taxonomy_summary_dto()
        self.test_13_json_roundtrips_and_unicode()
        self.test_14_performance_benchmarks()
        self.summary()

    def test_1_artist_orm_to_pydantic(self):
        artist = Artist(
            id="art-001",
            name="Sid Sriram",
            normalized_name="sid sriram",
            image_url="https://img.example.com/sid.jpg",
            bio="Playback singer",
            genres="Telugu Pop, Carnatic",
            country="India"
        )
        try:
            dto = ArtistDTO.model_validate(artist)
            assert dto.id == "art-001"
            assert dto.name == "Sid Sriram"
            assert dto.normalized_name == "sid sriram"
            assert dto.genres == "Telugu Pop, Carnatic"
            self.record_pass("Artist ORM -> ArtistDTO", "Direct model_validate succeeds completely.")
        except Exception as e:
            self.record_fail("Artist ORM -> ArtistDTO", f"Failed with exception: {e}")

    def test_2_album_orm_to_pydantic(self):
        album = Album(
            id="alb-001",
            title="Guntur Kaaram",
            normalized_title="guntur kaaram",
            artist_id="art-002",
            cover_image_url="https://img.example.com/guntur.jpg",
            release_date="2024",
            total_tracks=10
        )
        try:
            dto = AlbumDTO.model_validate(album)
            assert dto.id == "alb-001"
            assert dto.title == "Guntur Kaaram"
            assert dto.total_tracks == 10
            self.record_pass("Album ORM -> AlbumDTO", "Direct model_validate succeeds completely.")
        except Exception as e:
            self.record_fail("Album ORM -> AlbumDTO", f"Failed with exception: {e}")

    def test_3_song_source_orm_to_pydantic(self):
        source = make_fully_populated_source_orm("src-001")
        try:
            dto = SongSourceDTO.model_validate(source)
            assert dto.id == "src-001"
            assert dto.health_score == 0.95
            assert dto.reliability_score == 0.98
            assert dto.channel_name == "Official Channel"
            self.record_pass("SongSource ORM -> SongSourceDTO", "Direct model_validate succeeds completely on fully populated ORM.")
        except Exception as e:
            self.record_fail("SongSource ORM -> SongSourceDTO", f"Failed with exception: {e}")

    def test_4_raw_song_orm_to_pydantic_direct_validate(self):
        song = make_fully_populated_song_orm("song-100")
        try:
            dto = SongDTO.model_validate(song)
            self.record_pass("Raw Song ORM -> SongDTO model_validate", "Succeeded unexpectedly!")
        except ValidationError as e:
            err_fields = [err['loc'][0] for err in e.errors()]
            self.record_fail(
                "Raw Song ORM -> SongDTO model_validate",
                f"SongDTO.model_validate(song) FAILS because 'artist_name' attribute is missing on Song ORM model. Missing fields: {err_fields}",
                severity="HIGH"
            )
        except Exception as e:
            self.record_fail("Raw Song ORM -> SongDTO model_validate", f"Unexpected error: {e}")

    def test_5_song_orm_with_attached_artist_name(self):
        song = make_fully_populated_song_orm("song-101")
        # Monkey patch artist_name onto ORM instance
        song.artist_name = "Thaman S"
        try:
            dto = SongDTO.model_validate(song)
            assert dto.id == "song-101"
            assert dto.artist_name == "Thaman S"
            assert dto.tag_list == ["pop", "energetic", "2024"]
            self.record_pass(
                "Song ORM + artist_name attribute -> SongDTO",
                "When artist_name attribute is dynamically set on Song instance, model_validate succeeds completely."
            )
        except Exception as e:
            self.record_fail("Song ORM + artist_name attribute -> SongDTO", f"Failed: {e}")

    def test_6_unflushed_orm_defaults_issue(self):
        """Demonstrate issue when SQLAlchemy model is initialized without explicit default kwargs before DB flush."""
        unflushed_song = Song(
            id="song-unflushed",
            title="Unflushed",
            normalized_title="unflushed",
            artist_id="art-1"
        )
        unflushed_song.artist_name = "Some Artist"
        try:
            SongDTO.model_validate(unflushed_song)
            self.record_pass("Unflushed ORM model_validate", "Unexpectedly passed.")
        except ValidationError as e:
            err_count = len(e.errors())
            err_fields = [err['loc'][0] for err in e.errors()]
            self.record_fail(
                "Unflushed ORM Defaults Issue",
                f"Unflushed SQLAlchemy model instances have None for Column default values (e.g. energy, explicit, popularity, genre). Result: {err_count} ValidationErrors for fields: {err_fields}",
                severity="MEDIUM"
            )

    def test_7_build_song_dto_helper(self):
        artist = Artist(id="art-002", name="Thaman S", normalized_name="thaman s")
        album = Album(id="alb-001", title="Guntur Kaaram", normalized_title="guntur kaaram", artist_id="art-002", total_tracks=10)
        song = make_fully_populated_song_orm("song-102")
        song.artist = artist
        song.album = album

        try:
            dto = build_song_dto(song)
            assert dto.id == "song-102"
            assert dto.artist_name == "Thaman S"
            assert dto.artist is not None and dto.artist.name == "Thaman S"
            assert dto.album is not None and dto.album.title == "Guntur Kaaram"
            assert dto.duration_str == "3:20"
            self.record_pass("build_song_dto helper function", "Successfully converted Song with relationships to SongDTO.")
        except Exception as e:
            self.record_fail("build_song_dto helper function", f"Failed: {e}")

        # Edge case: song without artist relationship loaded
        song_no_artist = make_fully_populated_song_orm("song-103")
        song_no_artist.artist = None
        song_no_artist.album = None
        try:
            dto_no_artist = build_song_dto(song_no_artist)
            assert dto_no_artist.artist_name == "Unknown Artist"
            assert dto_no_artist.artist is None
            self.record_pass("build_song_dto (No Artist relationship)", "Gracefully handles None artist relationship.")
        except Exception as e:
            self.record_fail("build_song_dto (No Artist relationship)", f"Failed: {e}")

    def test_8_song_dto_tag_list_derivation(self):
        cases = [
            ("pop, rock, indie", ["pop", "rock", "indie"]),
            ("  pop  ,   rock  ", ["pop", "rock"]),
            ("single", ["single"]),
            ("", []),
            (None, []),
            ("pop, , rock, ,,", ["pop", "rock"])
        ]
        for tags_in, expected_list in cases:
            dto = SongDTO(
                id="s-tag",
                title="Tag Test",
                normalized_title="tag test",
                artist_id="a-tag",
                artist_name="Tag Artist",
                tags=tags_in
            )
            if dto.tag_list != expected_list:
                self.record_fail("SongDTO tag_list derivation", f"Input tags='{tags_in}' expected {expected_list}, got {dto.tag_list}")
                return
        self.record_pass("SongDTO tag_list derivation", "All tag string parsing edge cases passed.")

    def test_9_song_source_dto_field_bounds(self):
        # health_score out of bounds (> 1.0)
        try:
            SongSourceDTO(id="s1", song_id="s1", source_type="youtube", source_id="1", health_score=1.1)
            self.record_fail("SongSourceDTO health_score validation", "Failed to reject health_score > 1.0")
        except ValidationError:
            pass

        # health_score out of bounds (< 0.0)
        try:
            SongSourceDTO(id="s1", song_id="s1", source_type="youtube", source_id="1", health_score=-0.1)
            self.record_fail("SongSourceDTO health_score validation", "Failed to reject health_score < 0.0")
        except ValidationError:
            pass

        # reliability_score out of bounds (> 1.0)
        try:
            SongSourceDTO(id="s1", song_id="s1", source_type="youtube", source_id="1", reliability_score=1.05)
            self.record_fail("SongSourceDTO reliability_score validation", "Failed to reject reliability_score > 1.0")
        except ValidationError:
            pass

        # reliability_score out of bounds (< 0.0)
        try:
            SongSourceDTO(id="s1", song_id="s1", source_type="youtube", source_id="1", reliability_score=-0.01)
            self.record_fail("SongSourceDTO reliability_score validation", "Failed to reject reliability_score < 0.0")
        except ValidationError:
            pass

        self.record_pass("SongSourceDTO field bounds", "Correctly enforces ge=0.0 and le=1.0 constraints on scores.")

    def test_10_song_create_dto_validations(self):
        # Valid instantiation
        dto = SongCreateDTO(title="Master Song", artist_name="Anirudh")
        assert dto.duration == 180
        assert dto.genre == "Pop"

        # Check bounds: energy, danceability, valence, acousticness, instrumentalness, popularity, duration
        invalid_cases = [
            ("title", "", "Empty title"),
            ("artist_name", "", "Empty artist_name"),
            ("duration", 0, "Duration = 0"),
            ("duration", -10, "Duration negative"),
            ("popularity", 101, "Popularity > 100"),
            ("popularity", -1, "Popularity < 0"),
            ("energy", 1.2, "Energy > 1.0"),
            ("energy", -0.1, "Energy < 0.0"),
            ("danceability", 1.5, "Danceability > 1.0"),
            ("valence", -0.5, "Valence < 0.0"),
            ("acousticness", 2.0, "Acousticness > 1.0"),
            ("instrumentalness", -0.1, "Instrumentalness < 0.0"),
            ("tempo", -10.0, "Tempo < 0.0")
        ]

        failed_rejections = []
        for field_name, bad_val, desc in invalid_cases:
            payload = {"title": "Valid Title", "artist_name": "Valid Artist"}
            payload[field_name] = bad_val
            try:
                SongCreateDTO(**payload)
                failed_rejections.append(f"{desc} (field: {field_name}, val: {bad_val})")
            except ValidationError:
                pass

        if failed_rejections:
            self.record_fail("SongCreateDTO validation bounds", f"Failed to reject invalid inputs: {failed_rejections}")
        else:
            self.record_pass("SongCreateDTO validation bounds", "Successfully rejected all out-of-bound & invalid inputs.")

    def test_11_song_update_dto_optionality(self):
        # Empty update
        u1 = SongUpdateDTO()
        assert u1.title is None
        assert u1.artist_name is None

        # Partial update
        u2 = SongUpdateDTO(title="New Title", tempo=128.0)
        assert u2.title == "New Title"
        assert u2.tempo == 128.0

        # Boundary checks on update DTO
        try:
            SongUpdateDTO(energy=1.5)
            self.record_fail("SongUpdateDTO bounds", "Failed to reject energy > 1.0 in update DTO")
        except ValidationError:
            pass

        self.record_pass("SongUpdateDTO optionality & bounds", "Verified optional fields and range validations on update payload.")

    def test_12_taxonomy_summary_dto(self):
        summary = TaxonomySummaryDTO(
            genres=[GenreDTO(name="Rock", normalized_name="rock", song_count=10)],
            moods=[MoodDTO(name="Chill", normalized_name="chill", valence_range=(0.2, 0.5), energy_range=(0.1, 0.4), song_count=5)],
            tags=[TagDTO(name="acoustic", category="mood", usage_count=8)],
            total_genres=1,
            total_moods=1,
            total_tags=1
        )
        assert summary.genres[0].name == "Rock"
        assert summary.moods[0].valence_range == (0.2, 0.5)
        self.record_pass("TaxonomySummaryDTO", "Taxonomy structures and nested tuples validated.")

    def test_13_json_roundtrips_and_unicode(self):
        dto = SongDTO(
            id="s-unicode-1",
            title="Kurchi Madathapetti — くるち まだたぺてぃ",
            normalized_title="kurchi madathapetti",
            artist_id="art-telugu",
            artist_name="Thaman S (తమన్)",
            tags="తెలుగు, mass, 🎵",
            artist=ArtistDTO(id="art-telugu", name="Thaman S (తమన్)", normalized_name="thaman s")
        )

        json_bytes = dto.model_dump_json()
        roundtrip_dto = SongDTO.model_validate_json(json_bytes)
        assert roundtrip_dto.title == dto.title
        assert roundtrip_dto.artist_name == dto.artist_name
        assert roundtrip_dto.tag_list == ["తెలుగు", "mass", "🎵"]

        # Paginated response serialization
        page_resp = PaginatedSongsResponse(
            items=[roundtrip_dto],
            total=1,
            page=1,
            limit=10,
            total_pages=1
        )
        page_json = page_resp.model_dump_json()
        page_deser = PaginatedSongsResponse.model_validate_json(page_json)
        assert page_deser.items[0].artist_name == dto.artist_name

        self.record_pass("JSON Roundtrips & Unicode", "Successfully serialized/deserialized UTF-8 multi-language strings and paginated responses.")

    def test_14_performance_benchmarks(self):
        # Benchmark 1: 10,000 SongSourceDTO validations
        sources = [
            make_fully_populated_source_orm(f"src-{i}")
            for i in range(10000)
        ]
        t0 = time.perf_counter()
        dtos_src = [SongSourceDTO.model_validate(s) for s in sources]
        t1 = time.perf_counter()
        dur_src = t1 - t0

        # Benchmark 2: 10,000 SongDTO validations (with monkey-patched artist_name)
        songs = [
            make_fully_populated_song_orm(f"song-{i}")
            for i in range(10000)
        ]
        for s in songs:
            s.artist_name = "Benchmark Artist"

        t0 = time.perf_counter()
        dtos_song = [SongDTO.model_validate(s) for s in songs]
        t1 = time.perf_counter()
        dur_song = t1 - t0

        # Benchmark 3: 10,000 build_song_dto calls
        t0 = time.perf_counter()
        dtos_built = [build_song_dto(s) for s in songs]
        t1 = time.perf_counter()
        dur_build = t1 - t0

        # Benchmark 4: 10,000 JSON serialization + deserialization roundtrips
        t0 = time.perf_counter()
        sample_dto = dtos_song[0]
        for _ in range(10000):
            js = sample_dto.model_dump_json()
            SongDTO.model_validate_json(js)
        t1 = time.perf_counter()
        dur_json = t1 - t0

        print(f"   - 10,000 SongSourceDTO.model_validate: {dur_src:.3f}s ({10000/dur_src:.1f} ops/sec)")
        print(f"   - 10,000 SongDTO.model_validate: {dur_song:.3f}s ({10000/dur_song:.1f} ops/sec)")
        print(f"   - 10,000 build_song_dto calls: {dur_build:.3f}s ({10000/dur_build:.1f} ops/sec)")
        print(f"   - 10,000 JSON dump/validate roundtrips: {dur_json:.3f}s ({10000/dur_json:.1f} ops/sec)")

        self.record_pass(
            "Performance Benchmarks",
            f"10k SongSourceDTO: {dur_src:.3f}s ({10000/dur_src:.0f}/s); 10k SongDTO: {dur_song:.3f}s ({10000/dur_song:.0f}/s); 10k build_song_dto: {dur_build:.3f}s ({10000/dur_build:.0f}/s); 10k JSON Roundtrips: {dur_json:.3f}s ({10000/dur_json:.0f}/s)"
        )

    def summary(self):
        print("\n==================================================================")
        print("EMPIRICAL TEST RESULTS SUMMARY")
        print("==================================================================")
        total = len(self.results)
        passed = sum(1 for r in self.results if r["status"] == "PASS")
        failed = sum(1 for r in self.results if r["status"] == "FAIL")

        print(f"Total Tests Executed: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        if self.defects:
            print("\nFOUND DEFECTS / INCOMPATIBILITIES:")
            for d in self.defects:
                print(f" - [{d['severity']}] {d['test']}: {d['details']}")
        print("==================================================================\n")


if __name__ == "__main__":
    runner = EmpiricalChallengerRunner()
    runner.run_all()
