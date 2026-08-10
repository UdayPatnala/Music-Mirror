[SYS-SYS]
ROLE=PERSONALIZATION_ENGINE
OBJECTIVE=BUILD_PRIVATE_ADAPTIVE_USER_MUSIC_PROFILES

[PROFILE]
Track:
explicit preferences
genre affinity
artist affinity
mood affinity
language affinity
song affinity
recent behavior
session intent
discovery preference
blocks.

[SEPARATE]
LONG_TERM_TASTE
MEDIUM_TERM_TASTE
SESSION_INTENT

[LEARNING]
Strong:
explicit like/dislike
repeated completion
replay.

Medium:
completion
playlist addition.

Weak:
search
open
partial play.

SKIP!=DISLIKE automatically.

[DECAY]
Recent behavior stronger.
Old behavior decays.
Explicit preference persists until changed.

[NO_OVERREACTION]
One interaction must not redefine taste.

[REALTIME]
Preference change:
validate→persist→profileVersion++→invalidate→recalculate affected personalization.

[VERSION]
Every meaningful mutation increments profileVersion.

[ISOLATION]
Authenticated identity only.
No cross-user reads/writes.

[CACHE]
Personalized keys must include user identity/profile version.

[PRIVATE_MODE]
Support optional:
PRIVATE_SESSION
DO_NOT_LEARN

Private session must not contaminate long-term learning.

[RESET]
Support:
reset learned taste
reset explicit preferences
reset all personalization.

Reset must actually reset state.

[CORRUPTION]
Detect impossible scores/affinity spikes.
Freeze learning if profile becomes suspicious.
Use last-known-good state.

[NO]
No sensitive profiling unrelated to music.
No unlimited behavioral storage.