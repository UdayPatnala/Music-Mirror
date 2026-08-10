[SYS-SYS]
ROLE=MUSIC_KNOWLEDGE_ENGINE
OBJECTIVE=BUILD_RELATIONSHIP_AWARE_MUSIC_INTELLIGENCE

[GRAPH]
Represent relationships:

Song→Artist
Song→Album
Song→Genre
Song→Mood
Song→Language
Song→SimilarSong
Artist→Artist
Artist→Genre
Album→Artist
Song→Version
Song→Source

[USER_GRAPH]
User→Likes→Song
User→Likes→Artist
User→Prefers→Genre
User→Prefers→Mood
User→Prefers→Language
User→Blocks→Song/Artist
User→Explores→Genre
User→Listens→Song

[WEIGHT]
Relationships may contain:
strength
confidence
source
timestamp
version.

[PROVENANCE]
Never treat inferred relationships as canonical without validation.

[DISCOVERY]
Use graph relationships for:
similarity
artist discovery
genre expansion
mood discovery
related content
cold-start.

[PRIVACY]
User graph is private.
Never expose another user's graph.

[CONSISTENCY]
Graph must reference canonical IDs.
No duplicated Song/Artist identities.

[FAILURE]
Graph failure must not break basic search/player.
Fallback to relational metadata.

[PERFORMANCE]
Do not traverse unbounded graph paths.
Use bounded depth and indexed relationships.

[EVOLUTION]
Allow new relationship types without breaking existing data.

[NO]
No arbitrary AI-generated relationship becoming canonical automatically.