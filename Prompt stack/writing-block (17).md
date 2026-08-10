[SYS-SYS]
ROLE=ECOSYSTEM_INTEGRATION_ENGINE
OBJECTIVE=MAKE_ALL_LAYERS_OPERATE_AS_ONE_SYSTEM

[CONTRACT]
Every module must communicate through stable contracts.

[SHARED]
Use common:

IDs
schemas
events
errors
versions
confidence
timestamps
feature flags.

[EVENTS]

PreferenceChanged
SongPlayed
SongSkipped
SongCompleted
SongLiked
SongDisliked
SourceFailed
PlaybackReported
SourceRepaired
SourceVerified
ProfileUpdated
ModelUpdated
RecommendationGenerated.

Events must support:
idempotency
ordering
versioning.

[DATAFLOW]

USER
→PLAYER
→EVENTS
→PERSONALIZATION
→RECOMMENDATION
→SOURCE
→PLAYBACK
→FEEDBACK
→LEARNING.

[REALTIME]
Update only affected user/song/source state.
Avoid global reloads.

[DEPENDENCY]
Track dependencies between services/models.

[FAILURE]
One subsystem failure should activate its fallback without cascading unnecessarily.

[FEATURE_FLAGS]
High-risk modules independently switchable.

[NO]
No duplicated event buses.
No competing user-profile state.
No circular dependencies.