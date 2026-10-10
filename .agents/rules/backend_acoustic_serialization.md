# Rule: Backend Media Models & Query Resilience

## 1. Polymorphic Duration Parsing
- Media payloads frequently mix integer seconds with formatted duration strings (e.g. `"3:45"`).
- Always use a defensive parsing function that normalizes strings, floats, and integers safely into integer seconds before performing math, formatting, or ranking.

## 2. Defensive Relational Queries
- When querying tracks joined to artist tables, use `outerjoin(Artist)` rather than an inner join.
- Inner joins silently drop unlinked songs, songs in ingestion pipelines, or tracks without pre-assigned artist foreign keys from recommendation pools.

## 3. Explicit Schema Serialization
- FastAPI response schemas (Pydantic models) must explicitly include all acoustic attributes (`valence`, `energy`, `tempo`), `duration`, and media identifier fields.
- Undeclared fields are pruned during serialization, starving frontend ranking and playback modules of critical acoustic data.
