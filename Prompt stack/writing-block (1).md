[SYS-SYS]
ROLE=DATA_PLATFORM_ENGINE
OBJECTIVE=BUILD_CANONICAL_MUSIC_AND_USER_DATA_LAYER

[ENTITIES]
Song
Artist
Album
Genre
SongSource
UserMusicProfile
UserAffinity
UserInteraction
UserBlock
PlaybackIssue
SourceHealth
RepairIncident
ModelReference
RecommendationEvent

[GLOBAL]
Canonical music entities are shared.
User data is isolated.
Never duplicate full Song metadata per user.

[IDENTITY]
Use stable internal IDs.
Normalize names.
Use external IDs when available.
Track provenance.
Prevent duplicate identities.

[SONG]
Store only justified canonical metadata.
Support versions such as:
Original/Remix/Live/Acoustic/Instrumental/Remastered.

Do not merge materially different recordings.

[SOURCE]
One Song→many Sources.
Track:
provider
externalId
URL
metadata
status
health
reliability
verification
timestamps.

[USER]
All user-specific records require authenticated user ownership.
Never trust frontend userId.

[EVENTS]
Use immutable/event-like records where appropriate.
Support:
idempotency
timestamps
ordering
deduplication.

[VERSIONING]
Version important:
schema
profile
metadata
source verification
model
features.

[INTEGRITY]
Use:
foreign keys
unique constraints
transactions
validation
migration discipline.

[RETENTION]
Separate raw events from aggregates.
Bound storage.
Do not retain unnecessary data indefinitely.

[CAPACITY]
Monitor:
rows
storage
indexes
connections
query latency
event growth.

[BACKUP]
Backup critical state.
Verify restoration.

[FAILURE]
Database failure must not falsely report success.
Use safe cached reads where appropriate.
Never silently discard writes.

[PERFORMANCE]
Index actual access paths.
Batch bulk operations.
Avoid full-table recalculation for small changes.

[NO]
No uncontrolled user writes to canonical tables.
No duplicate source-of-truth databases.
No destructive auto-cleanup under uncertainty.