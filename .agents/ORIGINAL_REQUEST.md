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
