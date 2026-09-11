# UNIVERSAL PROJECT ENGINEERING & EXECUTION SYSTEM — WORKSPACE RULE

## 1. MASTER OPERATING RULE: PERMANENT EXECUTION LOOP
NEVER START BY CODING.

FIRST:
Understand the product → recover previous conversations → inspect all relevant project files/docs → read complete relevant Git history → inspect current state → identify what exists, what is missing, what failed, what was intentionally removed, and what is over-engineered → research only what is necessary → make the engineering/product decision → create a safe recoverable checkpoint.

THEN:
Implement the simplest correct working solution → verify → improve only where justified → test → audit security/privacy/performance/accessibility/UX/deployment → inspect Git diff/status → re-check history → update VERSION_HISTORY.md and EXECUTION_HISTORY.md → preserve the final known-good state → record remaining work.

IF THE TASK IS TOO LARGE:
Do NOT rush or force completion in one session. Stop at a safe checkpoint, document the exact state, and continue in a later session.

IF SOMETHING FAILS:
Do not repeatedly retry blindly. Diagnose → compare alternatives → use a workaround/indirect approach where possible → rollback to the safe version if necessary → try a better approach.

IF SOMETHING CANNOT BE DONE DIRECTLY:
Do not simply give up. Find the closest technically reliable result achievable with the available tools, technologies, free resources, and constraints.

ALWAYS:
Preserve project intent.
Preserve working versions.
Preserve history.
Do not overwrite unrelated work.
Do not fabricate.
Do not over-engineer.
Do not add unnecessary features.
Do not waste model credits.
Do not introduce paid services without approval.
Do not declare completion without verification.

FINAL PIPELINE:
ANALYZE → LIST → RECOVER → RESEARCH → DECIDE → PLAN → SAFE VERSION → IMPLEMENT → CHECK → FIX → AUDIT → UPDATE → VERIFY → FINISH

## 2. THREE-LAYER PROJECT MEMORY SYSTEM
Every task in Music Mirror must cross-check all three memory layers:

- **LAYER 1 — PRODUCT MEMORY**:
  - Emotion-first, music-first AI companion delivering adaptive playback with minimal user interaction.
  - Progressive disclosure, dark neutral backgrounds (#090909), glass surfaces (
gba(22,22,22,0.85)), album-derived accents, cinematic studio theme.
  - Strict zero-PII biometrics (facial feature inference is 100% client-side via WebGL).

- **LAYER 2 — ENGINEERING MEMORY**:
  - docs/VERSION_HISTORY.md (authoritative release ledger & milestone completions).
  - docs/EXECUTION_HISTORY.md (operational ledger recording pre-execution audits, findings, regressions, lessons, and guards).
  - PROJECT_STATE.md (system verification matrix, component status, architectural invariants).
  - docs/architecture.md (data flow, player adapters, discovery ladder, fault-tolerant fallbacks).

- **LAYER 3 — ACTUAL STATE**:
  - Git repository: complete history, commit baseline, uncommitted working tree safety.
  - Production build: TypeScript verification (	sc -b), Vite bundle integrity, Oxlint zero-warning policy.
  - Test suites: Pytest (143/143 passing), Vitest (138/138 passing).
  - Deployment configuration: ercel.json, client routing, static headers, SEO artifacts (sitemap.xml, 
obots.txt, llms.txt).
