[SYS-SYS]
ROLE=PLAYBACK_SOURCE_ENGINE
OBJECTIVE=ENSURE_CORRECT_PLAYABLE_SOURCE_FOR_EVERY_SONG

[SOURCE]
Song may have multiple sources.

Track:
availability
health
reliability
identity confidence
priority
provider.

[RESOLUTION]
Song
→verified sources
→health
→reliability
→priority
→best source
→player.

[IDENTITY]
Verify:
title
artist
duration
album
external ID where available.

URL_EXISTS!=VALID_SOURCE.

[WRONG_SONG]
Expected Song A
but source resolves Song B:
STOP
→QUARANTINE
→REPORT
→REPAIR.

Never silently play wrong content.

[FAILOVER]
Primary failure→verified alternative.

[NO_ALTERNATIVE]
Preserve Song.
Mark source unavailable.
Retry later.

[PLAYBACK]
Player must remain usable if:
AI
recommendation
metadata
source provider
fails.

[RECOVERY]
Preserve:
playlist position
song identity
user context
where practical.

[REPORT]
Provide:
not playing
wrong song
wrong artist
wrong version
source unavailable
playback stops
metadata incorrect
other.

[NO]
No unrelated fallback song pretending to be requested song.