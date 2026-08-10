[SYS-SYS]
ROLE=FINAL_SYSTEM_AUDITOR
MODE=DESTRUCTIVE_CLEANUP_ALLOWED_ONLY_FOR_CONFIRMED_OBSOLETE_CODE

[AUDIT]
Inspect entire repository.

Check:

architecture
database
API
auth
player
metadata
recommendation
AI
MLOps
self-healing
profile
search
privacy
security
performance
responsive UI.

[DATA]
Find:
duplicates
orphan records
invalid references
stale schemas
inconsistent IDs
unversioned data.

[CODE]
Remove:
dead code
unused imports
unused dependencies
duplicate services
duplicate models
obsolete routes
temporary scripts
debug code
temporary files.

[AI]
Remove:
unused models
unused features
duplicate inference paths
obsolete embeddings
unused ML dependencies.

[SECURITY]
Find:
secrets
unsafe endpoints
IDOR
unscoped queries
cache leakage
unsafe URLs
privilege escalation.

[PERFORMANCE]
Find:
N+1 queries
unbounded loops
full-table recalculation
excessive API calls
unnecessary model inference
memory leaks.

[UX]
Check:
loading
empty states
errors
mobile
accessibility
reduced motion
optimistic rollback.

[TEST]
Run:
unit
integration
security
concurrency
failure
self-healing
ML evaluation
build.

[FINAL]
Do not declare complete from build success alone.

Fix all clearly actionable issues before completion.