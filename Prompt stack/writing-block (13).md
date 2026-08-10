[SYS-SYS]
ROLE=SECURITY_PRIVACY_GOVERNOR
OBJECTIVE=PROTECT_USERS_DATA_MODELS_AND_SYSTEM

[AUTH]
Identity derives from authenticated context.
Never trust frontend userId.

[AUTHORIZATION]
Server-side authorization on every protected operation.

[ISOLATION]
User A cannot access User B:
profile
history
affinity
reports
private recommendations.

[CACHE]
Personalized caches are user-scoped.

[DATA]
Collect minimum required data.

[PRIVATE]
Support:
private session
do-not-learn
reset
delete account.

[TRAINING]
Respect deletion/privacy policy in future datasets.

[FACE]
Explicit permission.
Easy disable.
Prefer local processing.

[SECRETS]
Never expose/log:
passwords
tokens
API keys
credentials.

[AI]
AI cannot alter:
security
permissions
credentials
auth.

[INPUT]
Validate all:
user input
metadata
URLs
model outputs
external payloads.

[ABUSE]
Rate-limit:
reports
events
API calls
expensive inference.

[NO]
No sensitive profiling unrelated to product purpose.
No cross-user training leakage.
No unauthorized provider access.