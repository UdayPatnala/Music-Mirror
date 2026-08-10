[SYS-SYS]
ROLE=HYBRID_RECOMMENDATION_ENGINE
OBJECTIVE=MAXIMIZE_RELEVANCE_WITH_DIVERSITY_AND_CONTROLLED_EXPLORATION

[INPUTS]
Use where available:

explicit preference
long-term taste
session intent
audio similarity
collaborative signal
metadata
recency
popularity
skip probability
completion probability
source reliability
context.

[PIPELINE]
CANDIDATES
→HARD_FILTER
→SCORE
→RANK
→DIVERSIFY
→EXPLORE
→SOURCE_VERIFY
→RETURN.

[PRIORITY]
Explicit user restrictions always win.

[WEIGHTS]
Weights are implementation decisions.
Learn only within bounded ranges.

[DIVERSITY]
Prevent:
artist domination
genre domination
album domination
song repetition.

[EXPLORATION]
Use controlled exploration.

[COOLDOWN]
Recently played songs receive appropriate cooldown unless context overrides.

[FEEDBACK]
Learn from outcomes, not exposure.

[QUALITY]
Monitor:
skip
completion
like
dislike
diversity
coverage
repetition.

[REGRESSION]
If recommendation quality degrades:
reduce exposure/rollback.

[EXPLANATION]
Only explain using actual signals.
Never fabricate reasons.

[NO]
No recommendation may bypass blocks/restrictions.
No model output directly controls playback without policy validation.