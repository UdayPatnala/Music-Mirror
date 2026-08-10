[SYS-SYS]
ROLE=PROJECT_CONTINUITY_AND_EXTRA_CONTEXT_LAYER
PURPOSE=CONVERT_HISTORICAL_PROJECT_DECISIONS_INTO_IMPLEMENTATION_CONTEXT
MODE=SUPPLEMENTARY_NOT_COMPETING_WITH_MASTER_RULES

[PROJECT]
PROJECT_NAME=Music Mirror

[PRODUCT_DIRECTION]
Build a premium AI-powered web music player rather than a basic audio player.

The product should feel like a complete music intelligence platform:

DISCOVER
SEARCH
UNDERSTAND
PERSONALIZE
RECOMMEND
PLAY
LEARN
REPORT
REPAIR
IMPROVE

Do not reduce the product to a simple playlist/player implementation.

[CORE_MUSIC_DATABASE]

Maintain a central canonical music database.

The database should contain:

songs
artists
albums
genres
moods
languages
audio attributes
external metadata
playback sources
source health
relationships
versions
confidence
provenance
freshness.

The database itself must evolve from validated system/user signals.

User preference data must remain user-scoped while global music knowledge remains shared.

Never mix user-specific preference state into global Song records.

[REALTIME_USER_PERSONALIZATION]

Users should be able to update their music preferences from the Profile section.

Preference changes should propagate in near real time.

Examples:

preferred genres
artists
moods
languages
energy
tempo
explicit likes/dislikes
blocked artists/songs
discovery preferences.

Flow:

PROFILE
→PREFERENCE_CHANGE
→VALIDATE
→PERSIST
→UPDATE_USER_PROFILE
→UPDATE_AFFINITY
→INVALIDATE_RELEVANT_CACHE
→RECOMPUTE_AFFECTED_RECOMMENDATIONS
→REFLECT_IN_UI

Do not require a full application reload.

Do not rebuild the entire database for a local preference change.

[DATABASE_LEARNING]

The system should learn user preference categories from behavior.

Signals may include:

likes
dislikes
plays
completion
replays
skips
playlist additions
search behavior
artist interactions
genre interactions
explicit settings.

Distinguish:

explicit preference
from
inferred preference.

Explicit preference has higher authority.

[RECOMMENDATION_BEHAVIOR]

Recommendations should adapt to both:

LONG_TERM_TASTE
and
CURRENT_SESSION_INTENT.

Example:

A user may generally prefer Rock but temporarily want calm instrumental music.

Do not let temporary behavior permanently corrupt long-term preference.

[USER_PROFILE_CONTROLS]

Profile should provide meaningful control over personalization.

Include where appropriate:

view preferences
edit preferences
reset learned preferences
manage blocked content
private listening/do-not-learn
optional experimental AI features
personalization controls.

Controls must affect actual backend behavior, not merely UI state.

[SONG_SOURCE_AUTOMATION]

External song source links are not permanent truth.

The system should periodically validate important source links.

Detect:

dead source
unavailable source
wrong song
wrong artist
wrong version
changed metadata
provider failure
region/availability issue where detectable.

Automatically search for an approved alternative when confidence is sufficient.

Verify the replacement before promotion.

[USER_PLAYBACK_REPORTING]

Users should be able to report playback problems directly from the player.

Provide useful report categories such as:

SONG_NOT_PLAYING
WRONG_SONG
WRONG_ARTIST
WRONG_VERSION
SOURCE_UNAVAILABLE
PLAYBACK_STOPS
METADATA_WRONG
OTHER.

Reports should feed the diagnostic/self-healing pipeline.

Report flow:

USER_REPORT
→CORRELATE
→DIAGNOSE
→VERIFY
→REPAIR
→TEST
→UPDATE_SOURCE_HEALTH
→LEARN.

A report is evidence, not automatic truth.

[SELF_HEALING_EXPECTATION]

The system should solve routine operational problems without requiring developer intervention.

Examples:

broken source
wrong source
stale metadata
duplicate source
provider failure
temporary playback failure
low-quality source.

Routine repair:

DETECT
→ANALYZE
→FIND_ALTERNATIVE
→VERIFY
→REPLACE/DEPRIORITIZE
→TEST
→MONITOR
→ROLLBACK_IF_NEEDED.

Developer intervention should be reserved for systemic, ambiguous, security-sensitive, or unrecoverable issues.

[SELF_LEARNING_EXPECTATION]

The system should improve from actual outcomes.

Example:

Source repeatedly succeeds
→reliability increases.

Source repeatedly fails
→reliability decreases.

Recommendation repeatedly skipped
→ranking signal decreases.

Recommendation repeatedly completed/liked
→positive signal increases.

Do not learn from attempts alone.
Learn from verified outcomes.

[GLOBAL_DATABASE_VS_USER_DATA]

Maintain a strict distinction:

# GLOBAL_KNOWLEDGE

music/catalog/source facts

# USER_KNOWLEDGE

personal preference/behavior.

User actions may influence:

personalized ranking
user affinity
source diagnostics
aggregated anonymous/system-level reliability where appropriate.

A user must not directly rewrite canonical global music truth.

[DATABASE_CAPACITY]

The system must anticipate:

database growth
duplicate records
large event history
large embedding storage
source history growth
model metadata growth.

Use:

pagination
indexes
aggregation
retention
archival
cleanup
batch processing
incremental updates.

Never allow unlimited event/storage growth.

[DATA_CONFLICTS]

Possible conflicts include:

two providers disagree on title
artist mismatch
different durations
duplicate songs
remix vs original
regional versions
user preference conflicts
model disagreement
stale cache vs updated profile.

Resolve using:

provenance
confidence
freshness
identity
explicit user preference
verification.

Do not blindly select the newest record.

[WRONG_USER_DATA_PROTECTION]

A major failure scenario is mixing preferences between users.

Prevent through:

authenticated identity
server-side ownership checks
user-scoped queries
user-scoped cache
user-scoped events
profile versioning
concurrency protection.

Test explicitly with multiple users.

[REALTIME_CONCURRENCY]

Handle:

multiple tabs
multiple devices
rapid preference changes
simultaneous likes
simultaneous reports
simultaneous source repairs.

Use:

transactions
optimistic concurrency/versioning
idempotent events
conflict resolution.

Newest valid state should not be silently overwritten by stale requests.

[PREMIUM_PLAYER_EXPECTATION]

The player should feel responsive and polished.

AI processing must not unnecessarily block:

play
pause
seek
next
previous
volume
queue.

Background intelligence should run asynchronously when possible.

[UI_DIRECTION]

The previously defined visual direction is premium and modern.

Preferred design language:

Liquid Glass
Bento
Aurora
Spatial UI
Motion-driven interfaces.

Use these as design direction rather than forcing every element to use every style.

The interface should remain:

clean
premium
coherent
usable
responsive
accessible.

Avoid visual overload.

[PREMIUM_COLOR_DIRECTION]

Use a sophisticated light-theme palette suitable for a premium AI music product.

Colors should support:

glass surfaces
aurora gradients
soft accent colors
high-contrast typography
subtle borders
depth
spatial layering.

Do not sacrifice readability for aesthetics.

[ANIMATION]

Motion should communicate:

navigation
state changes
playback
loading
recommendation updates
source recovery
preference updates.

Prefer:

micro-interactions
smooth transitions
spring-like motion where appropriate
subtle hover states
progressive reveal
spatial depth.

Avoid:

constant movement
excessive animation
long blocking transitions
motion that interferes with playback controls.

Respect reduced-motion preferences.

[LANDING/PRESENTATION_DIRECTION]

The product presentation should communicate:

what Music Mirror is
how it works
how personalization works
how AI improves discovery
how the system handles playback problems
why user control/privacy matters.

Do not expose unnecessary technical complexity to normal users.

[OPTIONAL_EYE_CONTROL]

Eye-based webpage control was previously considered as an optional feature.

If implemented:

OPTIONAL
PROFILE_CONTROLLED
EXPLICIT_OPT_IN
DISABLEABLE.

Do not make it a core dependency.

Possible interaction concepts:

gaze detection
dwell selection
scroll/navigation
playback control.

The feature must include:

permission handling
calibration
confidence thresholds
false-positive prevention
fallback to normal input
clear activation/deactivation.

Do not assume gaze intent from every detected eye movement.

[OPTIONAL_FACE_CONTEXT]

Facial-expression recognition was also considered as an optional AI feature.

It should remain:

OPTIONAL
EXPLICIT_OPT_IN
CONTEXTUAL.

Use it only as a weak music-context signal.

Do not treat expression as objective emotional truth.

[FEATURE_ISOLATION]

Optional experimental features must not destabilize the core product.

If:

camera unavailable
eye tracking unavailable
model unavailable
browser unsupported
permissions denied

the normal player must continue working.

[PRODUCT_PHILOSOPHY]

The product should make repetitive music tasks easier through automation.

The user should not need to manually maintain:

every source link
every genre preference
every recommendation rule
every metadata correction.

The system should handle routine maintenance automatically while keeping user control over meaningful preferences.

[NO_BLACK_BOX_USER_CONTROL]

Automation must not remove user control.

Users should be able to understand and influence:

preferences
blocked content
personalization
optional sensors
private listening
recommendation behavior.

[ERROR_UX]

Errors should be actionable.

Avoid generic:

"Something went wrong."

Prefer contextual states:

"Source unavailable. Finding another source."

"Couldn't verify this song."

"Your preference was saved, but recommendations are updating."

"Playback failed. Trying another verified source."

Do not claim recovery until recovery is confirmed.

[LOADING_UX]

Use skeletons/placeholders where appropriate.

Do not block the entire interface while one AI operation runs.

Partial functionality should remain available.

[EMPTY_STATES]

Design meaningful empty states for:

no recommendations
new user
no history
no search results
no playable source
no playlists
private session
AI unavailable.

[ACCESSIBILITY]

Maintain:

keyboard navigation
screen-reader semantics
contrast
focus states
reduced motion
usable controls
touch compatibility.

Premium visual design must not compromise accessibility.

[RESPONSIVE]

Support:

desktop
tablet
mobile.

The player must remain usable on smaller screens.

Do not simply shrink desktop UI.

[PERFORMANCE]

Prioritize:

fast initial load
fast player controls
incremental data loading
lazy loading
cached metadata
precomputed embeddings
background AI
bounded network requests.

Do not perform expensive ML inference unnecessarily.

[PROJECT_CLEANUP]

At completion inspect the repository for:

dead code
unused files
duplicate components
duplicate APIs
unused dependencies
obsolete models
old schemas
temporary scripts
debug statements
test artifacts
unused assets.

Remove confirmed obsolete material.

Do not delete something merely because it appears unused without checking dynamic/runtime references.

[TESTING_EXPECTATION]

Test real workflows, not only isolated functions.

Required scenarios:

new user
existing user
multiple users
preference update
rapid preference update
private session
blocked artist
new song
duplicate song
broken source
wrong source
provider outage
user playback report
automatic repair
failed repair
rollback
AI unavailable
database unavailable
cache stale
concurrent devices
large catalog
large event history.

[FINAL_BEHAVIOR]

The system should feel:

PERSONAL
FAST
RELIABLE
AUTOMATIC
TRANSPARENT
PREMIUM
RESILIENT.

The complexity should remain behind the interface.

[IMPLEMENTATION_FREEDOM]

These historical details define product intent, not mandatory implementation technology.

Antigravity may choose the best:

framework
database structure
ML architecture
model
API design
cache
queue
storage
deployment
UI implementation

based on actual repository constraints.

Prefer existing infrastructure when adequate.

Do not introduce technology merely because this context mentions a capability.

[CONFLICT_RULE]

If this context conflicts with:

security rules
privacy rules
data-integrity rules
master architecture

the higher-priority system rule wins.

[FINAL_PRINCIPLE]

AUTOMATE_ROUTINE_WORK.
KEEP_USER_CONTROL.
PROTECT_CANONICAL_TRUTH.
LEARN_FROM_VERIFIED_OUTCOMES.
FAIL_GRACEFULLY.
MAKE_AUTOMATION_REVERSIBLE.
KEEP_THE_PLAYER_WORKING.

[END_SYS-SYS]
