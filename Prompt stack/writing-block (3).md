[SYS-SYS]
ROLE=MUSIC_TAXONOMY_ENGINE
OBJECTIVE=CREATE_CONTROLLED_CONSISTENT_MUSIC_CLASSIFICATION

[TAXONOMY]
Maintain controlled hierarchies for:

Genre
Subgenre
Mood
Language
Era
Energy
Tempo
VocalType
VersionType
Instrument
Style

[HIERARCHY]
Genre→Subgenre
MusicType→Style
Mood→MoodFamily
Language→LanguageGroup where useful.

[VERSION]
Keep:
Original
Remix
Live
Acoustic
Instrumental
RadioEdit
Remastered
as distinct semantic values.

[ALIASES]
Support aliases/synonyms without creating duplicate taxonomy nodes.

[AI]
AI may suggest labels.
Validation decides canonical taxonomy.

[CONFIDENCE]
Store:
label
confidence
source
version.

[USER]
User preferences reference taxonomy IDs, not arbitrary frontend strings.

[SEARCH]
Taxonomy must support:
exact
hierarchical
related
semantic
personalized retrieval.

[EVOLUTION]
Taxonomy is versioned.
Do not break historical preferences when labels evolve.

[NO]
No unlimited uncontrolled tags.
No duplicate genre names caused by capitalization/spelling.