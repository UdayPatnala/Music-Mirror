# Handoff Report: Playback, Fallback Engine & E2E Test Strategy (R3, R4 & Tiers 1-4)

**Agent:** Explorer 3 (`teamwork_preview_explorer_survey_3`)  
**Role:** Playback, Fallback Engine & E2E Test Strategist  
**Handoff Type:** Hard (Task Complete)  
**Date:** 2026-08-21  

---

## 1. Observation

1. **Existing Frontend Playback Infrastructure**:
   - `frontend/src/architecture/layers/PlaybackLayer/PlaybackProvider.ts:8-31` defines the core contract `PlaybackProvider` with methods `initialize()`, `load()`, `prepare()`, `play()`, `pause()`, `resume()`, `seek()`, `setVolume()`, `setMute()`, `stop()`, `getCurrentTrack()`, `getPosition()`, `getDuration()`, `getPlaybackState()`, `subscribe()`, `dispose()`.
   - `frontend/src/architecture/layers/PlaybackLayer/YouTubePlaybackAdapter.ts:72-122` initializes `YT.Player` with `playerVars: { autoplay: 1, controls: 0, rel: 0, modestbranding: 1, origin: window.location.origin }` and binds event listeners `onReady`, `onStateChange`, and `onError`.
   - `frontend/src/architecture/layers/PlaybackLayer/YouTubePlaybackAdapter.ts:106-110` logs YouTube error events with `logger.warn('YouTubePlaybackAdapter', 'YouTube Player error: ' + errorCode)` and emits `error` event.
   - `frontend/src/pages/MoodRoom.tsx:185-196` handles video failure via `triggerFallback()`, skipping from unplayable video to the next in the queue.
   - `frontend/src/pages/MoodRoom.tsx:581-584` mounts the player inside a container with DOM ID `youtube-player-element`.

2. **Existing Recovery & Discovery State Machine**:
   - `frontend/src/architecture/orchestrator/SessionOrchestrator.ts:433-457` implements `executePlaybackRecovery()` with single retry step, marking candidate `restricted` and advancing to the next queue candidate or falling back to offline catalog `NO_PLAYABLE_MUSIC`.
   - `frontend/src/architecture/orchestrator/SessionOrchestrator.ts:462-484` implements `discoverCandidatesForLevel()` spanning 5 levels (Level 0: Intent, Level 1: Relaxed genres/languages, Level 2: Broadened specificity, Level 3: Neutral baseline, Level 4: Royalty-free fallback).
   - `frontend/src/architecture/layers/DiscoveryLayer.ts:121-135` implements candidate caching (`cacheTtlMs = 15 min`) and request cancellation via `AbortController`.

3. **Existing Backend APIs & Discovery Endpoints**:
   - `backend/app/api/routes/songs.py:280-313` implements `GET /api/v2/songs/youtube-search` querying `YouTubeMetadataProvider` and computing word-overlap relevance scoring.
   - `backend/app/api/routes/songs.py:316-337` implements `GET /api/v2/songs/auto-discover` dynamically querying external music APIs (iTunes, Jamendo) and persisting records into SQLite.
   - `backend/app/ingestion/youtube_provider.py:18-59` extracts YouTube video metadata via `yt_dlp` without downloading media.

4. **Test Suite Baseline & Execution**:
   - Frontend unit test command `npm test -- --run` in `frontend/` completed with exit code 0 (`68 passed across 9 test files`).
   - Backend test command `python -m pytest` in `backend/` completed with exit code 0 (`116 passed in 36.22s`).

---

## 2. Logic Chain

1. **Analysis of R3 Requirements**:
   - The user requires in-app official playback via official APIs with lifecycle events and rich controls.
   - Observations in `YouTubePlaybackAdapter.ts` show that while basic IFrame instantiation exists, the error handling is currently generic and lacks explicit error code mapping for `101`, `150`, `100`, `2`, `5`.
   - Adding explicit mapping for YouTube error codes directly to recovery actions ensures sub-3-second failover.
   - The UI in `MoodRoom.tsx` contains play/pause, seek, volume, and mute controls, but needs visual loading/buffering indicators and contextual recovery banners when fallback occurs.

2. **Analysis of R4 Requirements**:
   - The user requires pre-playback validation, a sequential fallback ladder with sub-3s transition time, query expansion retry upon pool exhaustion, and a graceful terminal error state.
   - Observations in `SessionOrchestrator.ts` and `DiscoveryLayer.ts` show that candidate pooling and 5-level broadening exist.
   - However, pre-validation currently relies only on URL string sanitization rather than checking 11-char Video ID formats or probing oEmbed endpoints.
   - The fallback ladder needs explicit transition timing guarantees ($< 3.0\text{s}$) where candidate $N$ is marked restricted and candidate $N+1$ is loaded immediately without user disruption.
   - When the candidate pool is exhausted, YouTube queries must be augmented with search tokens (e.g. `+ "official audio"`, `+ "lyric video"`) before entering terminal state `NO_PLAYABLE_MUSIC`.

3. **Design of the 4-Tier E2E Testing Strategy**:
   - To prevent rate limiting and network flakiness, external API calls must be isolated in test environments using a deterministic `MockYouTubePlayer` and simulated discovery providers.
   - **Tier 1 (Feature Coverage, $\ge 5$ tests/feature)**: Probes nominal operations for all R3 and R4 sub-features (script loading, state transitions, controls, pre-validation, error handling, query expansion, terminal state).
   - **Tier 2 (Boundary & Corner Cases, $\ge 5$ tests/feature)**: Validates limits (seek beyond duration, rapid spamming, token race conditions, autoplay blocks, corrupt local storage).
   - **Tier 3 (Cross-Feature Combinations)**: Validates inter-layer interactions (emotion shift during fallback, cache hit with restricted video, multi-provider cascade).
   - **Tier 4 (Real-World Workload Scenarios)**: Validates endurance (continuous 60s emotion stream, 100-track endurance run, background tab throttling).

---

## 3. Caveats

1. **Browser Autoplay Policies**: Modern browsers (Chrome, Safari, Edge) strictly enforce user gesture requirements before unmuted audio playback can begin. The engine design accommodates this via `autoplayBlocked` state and a 1-tap gesture prompt (`enablePlayback()`).
2. **YouTube Embedding Restrictions**: Error codes 101 and 150 are server-enforced by YouTube when content owners restrict iframe embeds. The fallback ladder is specifically designed to handle this automatically within $< 3.0\text{s}$.
3. **No Code Modifications**: As a read-only explorer, no source code was altered; all findings and test designs are documented in `analysis.md` and `handoff.md`.

---

## 4. Conclusion

The Music Mirror playback and fallback architecture has strong foundational layers in place (`PlaybackProvider`, `YouTubePlaybackAdapter`, `SessionOrchestrator`, `DiscoveryLayer`). To satisfy the full requirements of R3, R4, and the acceptance criteria:
1. Complete the YouTube error code mapping (`2, 5, 100, 101, 150`) with sub-3s transition SLA in `YouTubePlaybackAdapter` and `SessionOrchestrator`.
2. Introduce pre-playback candidate validation (format check & fast oEmbed verification).
3. Enhance query expansion with dynamic acoustic keyword modifiers (`+ "official audio"`, `+ "lyric video"`).
4. Implement the comprehensive 4-Tier E2E test suite with the `MockYouTubePlayer` test fixture harness.

---

## 5. Verification Method

To independently verify all claims and specifications:

1. **Verify Frontend Test Execution**:
   ```bash
   cd "d:/PROJECT/Btech/Music Mirror/frontend"
   npm test -- --run
   ```
   *Expected:* 68 passed tests across 9 test files.

2. **Verify Backend Test Execution**:
   ```bash
   cd "d:/PROJECT/Btech/Music Mirror/backend"
   python -m pytest
   ```
   *Expected:* 116 passed tests.

3. **Inspect Detailed Specification Document**:
   - View `d:\PROJECT\Btech\Music Mirror\.agents\teamwork_preview_explorer_survey_3\analysis.md` for complete feature discovery tables, lifecycle state diagrams, error code matrices, fallback ladder timing budgets, mock implementation code, and the 4-tier E2E test catalogue.
