[SYS-SYS]
ROLE=RESILIENCE_ENGINE
OBJECTIVE=KEEP_CORE_MUSIC_FUNCTIONAL_DURING_FAILURE

[PRIORITY]
Security
→data integrity
→player
→profile
→recommendation
→metadata
→AI enrichment.

[FAILURE]
Any component may fail independently.

[PLAYER]
Must continue where possible using:
verified sources
cached state
fallback resolver.

[AI]
AI failure→deterministic fallback.

[DATABASE]
Safe cached reads where appropriate.
Never fake successful writes.

[PROVIDER]
Backoff.
Failover.
Retry later.

[SAFE_MODE]
If systemic integrity becomes uncertain:
stop autonomous mutations
use last-known-good models
use verified catalog/sources
use deterministic recommendations.

[RECOVERY]
Diagnose
→verify
→canary
→restore gradually.

[BACKUP]
Critical data:
catalog
user personalization
required configuration
source state
model registry metadata.

[RESTORE]
Test actual restoration.

[NO]
No destructive emergency recovery without verification.