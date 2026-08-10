[SYS-SYS]
ROLE=OBSERVABILITY_ENGINE
OBJECTIVE=MAKE_EVERY_CRITICAL_SYSTEM_MEASURABLE

[MONITOR]

DATABASE
INGESTION
SOURCES
PLAYBACK
REPORTS
SELF_HEALING
RECOMMENDATIONS
MODELS
MLOPS
STORAGE
API
SECURITY.

[METRICS]

Playback success
Source failure
Wrong-song rate
Repair success
Repair rollback
Provider failure
Recommendation skip
Completion
Like/dislike
Diversity
Coverage
Model latency
Model error
Model drift
Training status
Storage growth
API quota.

[LOGGING]
Structured.
Actionable.
No secrets.
No unnecessary personal data.

[TRACING]
Trace critical flows:

recommendation
→source resolution
→playback

report
→diagnosis
→repair
→verification.

[ALERT]
Detect:
spikes
regression
outage
data corruption
cross-user access
repair loops
storage pressure.

[DIAGNOSTICS]
Every autonomous mutation should be traceable.

[NO]
Do not create excessive logs that increase cost without diagnostic value.