## 2026-08-10T12:38:29Z
You are Explorer M2_1 for Music Mirror Milestone 2 (Music Catalog Endpoints & Filtering).
Your working directory is: d:\PROJECT\Music Mirror\.agents\teamwork_preview_explorer_m2_1
Original User Request is at: d:\PROJECT\Music Mirror\.agents\ORIGINAL_REQUEST.md
Project Scope Document is at: d:\PROJECT\Music Mirror\.agents\orchestrator\PROJECT.md

Task:
1. Read ORIGINAL_REQUEST.md and PROJECT.md.
2. Investigate `backend/app/api/routes/songs.py` and `backend/app/db/models.py`.
3. Design the exact implementation for `GET /api/v2/songs` in `songs.py`:
   - Expand query parameters to support: `page`, `limit`, `genre`, `mood`, `language`, `tag`, `sub_genre`, `artist_id`, `explicit`, `search`, `energy_min`, `energy_max`, `valence_min`, `valence_max`.
   - Ensure case-insensitive string filtering for genre, mood, language, sub_genre.
   - Implement substring matching for `tag` in comma-separated `Song.tags`.
   - Ensure non-500 handling: all queries with zero matching results or missing data return HTTP 200 with `items: []`, `total: 0`, `page: page`, `limit: limit`, `total_pages: 1`.
4. Write your detailed design and handoff report to `d:\PROJECT\Music Mirror\.agents\teamwork_preview_explorer_m2_1\handoff.md` following Handoff Protocol.
