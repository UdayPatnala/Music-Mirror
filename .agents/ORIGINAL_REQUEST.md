# Original User Request

## Initial Request — 2026-08-10T12:32:00Z

Build the rest of the Music Mirror ecosystem, specifically focusing on Shared Contracts, Music Catalog, and Taxonomy layers as per the pre-existing project architecture.

Working directory: d:\PROJECT\Music Mirror
Integrity mode: demo

## Requirements

### R1. Establish Shared Contracts & Taxonomy
Implement the shared API contracts (Pydantic schemas) and baseline taxonomy logic (genres, moods, tags) for the Music Catalog, linking them to the existing SQLAlchemy models.

### R2. Develop Music Catalog Endpoints
Build out the `songs` API router to allow for catalog querying, filtering by taxonomy (genre, mood, etc.), and metadata ingestion, ensuring strict adherence to the existing `Song` and `Artist` database models.

## Acceptance Criteria

### Shared Contracts
- [ ] Pydantic schemas exist for all catalog and taxonomy models.
- [ ] Schemas correctly map to the existing database models.

### Catalog Endpoints
- [ ] The `GET /api/v2/songs` endpoint supports filtering by at least genre and mood.
- [ ] Endpoints handle missing data gracefully without 500 errors.
- [ ] A programmatic test (e.g., pytest) verifies that a user can retrieve a filtered catalog list successfully.

## Follow-up — 2026-08-21T07:50:10Z

# Teamwork Project Prompt — Draft

Upgrade the Music Mirror application into a fast, autonomous, fault-tolerant YouTube discovery and in-app playback system.

Working directory: d:/PROJECT/Btech/Music Mirror
Integrity mode: development

## Requirements

### R1. Query Intelligence & Candidate Discovery
- Automatically normalize and improve search queries (e.g. query rewriting/expansion strategies).
- Fetch a pool of multiple YouTube video candidates instead of a single result.

### R2. Weighted Scoring & Relevance Ranking
- Implement an intelligent, configurable, weighted ranking mechanism (based on title similarity, channel authority, duration, recency, etc.).

### R3. In-App Official Playback
- Integrate a native-feeling embedded playback experience inside the application using officially supported embedding APIs (e.g. IFrame Player API).
- Provide play, pause, seek, volume, progress, fullscreen, loading, and error states.

### R4. Automated Verification & Fallback Ladder
- Before playing, validate candidates (check if private, deleted, or embedding restricted).
- Automate a fallback ladder that tries candidates sequentially. If all pool candidates fail, expand the search query and try again.
- Implement a robust playback state machine and central recovery engine.

### R5. Optimization (Caching, Deduplication, and Preparation)
- Implement caching (Query cache & Video metadata cache) with expiration times.
- Implement request deduplication to prevent redundant active fetches.
- Prepare the next candidate metadata/player state in the background.

### R6. Observability & Performance Monitoring
- Record metrics (latencies, candidate counts, load times, recovery success rates, failure reasons) for diagnostic purposes without exposing them to normal users.

## Acceptance Criteria

### Playback Resiliency
- [ ] Searching a query automatically resolves and plays the most relevant playable video without manual intervention.
- [ ] If the top video fails playability validation or triggers an iframe error, the system automatically transitions to the next candidate within 3 seconds.
- [ ] If all candidate videos fail, the query strategy expands (e.g., appends "+ tutorial" or "+ explained") and performs a retry.
- [ ] When all recovery attempts are exhausted, the app enters a graceful final error state rather than getting stuck loading.

### Cache & Deduplication
- [ ] Repeated searches for the identical query return cached metadata instantly.
- [ ] Simultaneous duplicate search requests trigger exactly one external API call.

