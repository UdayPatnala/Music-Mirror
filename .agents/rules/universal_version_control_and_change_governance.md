# UNIVERSAL VERSION CONTROL & CHANGE GOVERNANCE SYSTEM

You are operating under a strict, hierarchical version-control and change-governance system.

This system applies to **EVERY command, task, feature, fix, modification, refactor, configuration change, dependency change, architecture change, documentation change, deployment change, and automated action** performed on this project.

Do NOT treat versioning as something done only at release time.

**Every project-changing operation must pass through this version-control system.**

---

# 1. AUTHORITATIVE VERSION FORMAT

The project version MUST use:

`A.BC.DE.F`

Where:

* `A` = Major Version
* `BC` = Sub-Version / Release Line
* `DE` = Functional Change
* `F` = Minor Fix / Patch

Example:

`1.04.12.7`

Meaning:

* Major = `1`
* Sub-version = `04`
* Functional revision = `12`
* Minor fix = `7`

---

# 2. VERSION HIERARCHY

The version hierarchy is strictly ordered:

```text
A
└── BC
    └── DE
        └── F
```

Higher-level changes MUST reset every lower level.

### Major change

```text
A+1.BC. DE.F
```

becomes:

```text
A+1.00.00.0
```

### Sub-version change

```text
A.BC+1.DE.F
```

becomes:

```text
A.BC+1.00.0
```

### Functional change

```text
A.BC.DE+1.F
```

becomes:

```text
A.BC.DE+1.0
```

### Minor/bug change

```text
A.BC.DE.F+1
```

---

# 3. RANGE RULES

`A`:

```text
0–∞
```

`BC`:

```text
01–99
```

`DE`:

```text
01–99
```

`F`:

```text
0–9
```

`00` is reserved for reset states.

Therefore:

```text
1.00.00.0
```

is valid.

But:

```text
1.00.01.0
```

is NOT automatically valid unless `BC=00` is explicitly being used as the reset state of a major release.

Normal development after a major release begins by incrementing the appropriate lower level.

---

# 4. CHANGE CLASSIFICATION IS MANDATORY

Before modifying the project, classify the requested operation.

Determine whether it is:

### LEVEL A — MAJOR

Use a major version when the change materially alters the project's fundamental identity, architecture, compatibility contract, or operating model.

Examples:

* major architecture replacement
* breaking API contract
* incompatible data-model migration
* fundamental product restructuring
* replacement of the core technology/platform
* breaking change affecting existing consumers
* removal of a fundamental capability
* migration that requires substantial user/developer migration
* security or compliance restructuring that materially changes the system architecture

Result:

```text
A+1.00.00.0
```

---

### LEVEL BC — SUB-VERSION

Use a sub-version when the project enters a meaningful new release stage or coherent milestone without constituting a major architectural/breaking change.

Examples:

* substantial release milestone
* coordinated group of functional improvements
* product/module maturity milestone
* significant release preparation
* substantial internal improvement that deserves a new release line
* completed development phase

Result:

```text
A.BC+1.00.0
```

---

### LEVEL DE — FUNCTIONAL

Use a functional version when adding, changing, or substantially improving behavior/capability.

Examples:

* new feature
* new module
* new workflow
* new API endpoint
* new user capability
* substantial feature enhancement
* new integration
* new processing capability
* new configuration capability

Result:

```text
A.BC.DE+1.0
```

---

### LEVEL F — MINOR/PATCH

Use the patch level for small corrections that do not materially introduce or change functionality.

Examples:

* bug fix
* typo correction
* small UI correction
* error-message correction
* minor validation fix
* small performance correction
* small compatibility correction
* documentation correction
* minor styling correction
* dependency patch update when behavior remains compatible

Result:

```text
A.BC.DE.F+1
```

---

# 5. NEVER GUESS THE VERSION

Before changing anything, determine the project's current authoritative version.

Check, where applicable:

```text
package.json
pyproject.toml
pom.xml
build.gradle
Cargo.toml
composer.json
*.csproj
manifest files
application configuration
release metadata
CHANGELOG
Git tags
release files
CI/CD configuration
deployment metadata
project documentation
```

Also inspect the actual repository state.

If multiple versions exist:

1. Identify which one is authoritative.
2. Identify discrepancies.
3. Do NOT silently overwrite conflicting version information.
4. Report the conflict.
5. Resolve it using the project's established source of truth.

---

# 6. EVERY COMMAND MUST PASS THROUGH CHANGE ANALYSIS

Before executing ANY project-changing command, determine:

```text
1. What is being changed?
2. Why is it being changed?
3. Which project component is affected?
4. Is the change behavioral?
5. Is it architectural?
6. Is it breaking?
7. Does it affect compatibility?
8. Does it affect data/schema?
9. Does it affect security/privacy/compliance?
10. Does it affect dependencies?
11. Does it affect deployment?
12. Does it affect documentation?
13. What version level does this change belong to?
14. What tests/verification are required?
15. What rollback/recovery path exists?
```

Do not blindly execute commands.

---

# 7. PRE-CHANGE SNAPSHOT

Before making a meaningful project change, establish:

```text
CURRENT VERSION
CURRENT GIT/WORKING STATE
CURRENT ARCHITECTURE STATE
AFFECTED FILES/MODULES
DEPENDENCIES
KNOWN TEST STATUS
BUILD STATUS
CURRENT BEHAVIOR
```

If Git is available, inspect:

```bash
git status
git branch
git log
git diff
```

Do NOT create commits, tags, branches, pushes, releases, or other Git writes unless the project's Git policy explicitly authorizes them.

---

# 8. VERSION DECISION MUST HAPPEN BEFORE IMPLEMENTATION

For every requested change, produce an internal classification:

```text
CHANGE:
<what is changing>

CLASS:
MAJOR / SUB-VERSION / FUNCTIONAL / PATCH

CURRENT VERSION:
A.BC.DE.F

TARGET VERSION:
A.BC.DE.F

REASON:
<why this version level applies>

RESET:
<which lower levels must reset>

IMPACT:
<compatibility / architecture / data / deployment / security>

VERIFICATION:
<tests/build/lint/manual checks required>
```

Then implement according to that classification.

Do NOT classify a change after implementation merely to justify a version number.

---

# 9. VERSION MUST REPRESENT ACTUAL PROJECT STATE

Never increase the version merely because the user requested a higher number.

Never decrease a version to hide a problem.

Never reuse an already-published version for a materially different state.

Never claim a version is complete if the corresponding implementation has not actually been completed and verified.

Version numbers are **state identifiers**, not decoration.

---

# 10. ATOMIC CHANGE RULE

Each meaningful change must be traceable.

Maintain a relationship:

```text
USER REQUEST
↓
CHANGE CLASSIFICATION
↓
VERSION IMPACT
↓
IMPLEMENTATION
↓
TESTING
↓
VERIFICATION
↓
VERSION RECORD
↓
RELEASE/COMMIT (ONLY IF AUTHORIZED)
```

A version must never exist without an explainable reason.

---

# 11. MULTIPLE CHANGES IN ONE COMMAND

If one user request contains multiple independent changes:

First decompose them.

Example:

```text
Feature A
Bug B
Architecture C
Documentation D
```

Classify each independently.

Then determine the **highest required version level**.

Example:

```text
Feature A → DE
Bug B → F
Documentation D → F
```

Overall release:

```text
DE increment
F reset to 0
```

Therefore:

```text
1.05.13.7
→
1.05.14.0
```

Do NOT produce:

```text
1.05.14.8
```

because the functional change supersedes the patch-level changes.

---

# 12. SAME-LEVEL MULTIPLE CHANGES

If multiple changes belong to the same version level within one coherent operation, they belong to the same resulting version.

Example:

```text
Add search
Add filtering
Improve pagination
```

If classified as one functional release:

```text
1.05.08.4
→
1.05.09.0
```

Do not artificially create:

```text
1.05.09.0
1.05.10.0
1.05.11.0
```

unless those are independently released states.

---

# 13. VERSION COLLISION PREVENTION

Before assigning a new version:

Check whether the target version already exists in:

* Git tags
* releases
* package metadata
* changelog
* deployment metadata
* published artifacts
* documentation

If it already represents another project state:

**DO NOT reuse it.**

Advance to the next valid version.

---

# 14. VERSION OVERFLOW

When:

```text
F = 9
```

and another patch-level change is required:

Do NOT create:

```text
F = 10
```

Instead escalate to the next appropriate level.

Normally:

```text
1.05.08.9
```

becomes:

```text
1.05.09.0
```

if the change warrants a functional increment.

Similarly, when:

```text
DE = 99
```

the next functional change cannot become:

```text
DE = 100
```

Instead increment the parent level:

```text
1.05.99.9
→
1.06.00.0
```

When:

```text
BC = 99
```

the next sub-version becomes:

```text
2.00.00.0
```

unless the project's release governance explicitly defines another major-version policy.

---

# 15. BUG FIX RULE

A bug does NOT automatically mean patch-level.

Classify according to impact.

### Small isolated defect

```text
PATCH
```

### Bug requiring behavioral redesign

```text
FUNCTIONAL
```

### Bug requiring architectural replacement

```text
MAJOR
```

Example:

```text
Fix incorrect button alignment
→ F

Fix authentication workflow
→ DE

Replace authentication architecture
→ A
```

---

# 16. REFACTORING RULE

Refactoring is classified according to impact, not effort.

Small internal refactor:

```text
F
```

Substantial refactor affecting behavior/performance:

```text
DE
```

Architectural restructuring:

```text
BC or A
```

A large amount of code changed does NOT automatically mean a major version.

---

# 17. DEPENDENCY UPDATE RULE

Classify dependency updates based on actual impact.

Patch-compatible dependency update:

```text
F
```

Dependency update introducing functional behavior:

```text
DE
```

Dependency update causing breaking compatibility or architecture change:

```text
A
```

Do not classify solely from semantic-version numbers of the dependency.

Verify actual project impact.

---

# 18. DOCUMENTATION RULE

Documentation-only changes normally do not require a product version increment unless the documentation itself is a versioned deliverable.

For versioned documentation:

```text
small correction → F
substantial documentation capability/change → DE
```

Never inflate software versions for trivial documentation edits.

---

# 19. TESTING GATE

A version transition is NOT considered complete until the appropriate verification passes.

Depending on the project, verify:

```text
Unit tests
Integration tests
End-to-end tests
Type checking
Lint
Build
Static analysis
Security checks
Performance checks
Migration checks
API compatibility
Manual verification
Deployment verification
```

If tests fail:

* Do not falsely mark the version as verified.
* Do not claim release readiness.
* Record the failure.
* Fix or explicitly report the blocker.

---

# 20. VERSION STATUS

Every version should have a lifecycle state:

```text
PLANNED
↓
IN DEVELOPMENT
↓
IMPLEMENTED
↓
VERIFIED
↓
RELEASED
↓
SUPERSEDED
```

Example:

```text
1.08.14.0 — IN DEVELOPMENT
1.08.14.0 — VERIFIED
1.08.14.0 — RELEASED
```

Do not describe an unverified version as released.

---

# 21. CHANGELOG REQUIREMENT

Maintain a structured changelog where the project supports one.

Each release should record:

```text
Version
Date
Status
Change classification
Features
Fixes
Breaking changes
Architecture changes
Security/privacy changes
Dependencies
Tests
Known issues
Migration requirements
```

Example:

```text
## 1.08.14.0

Type: Functional
Status: Verified

### Added
- Local media queue

### Changed
- Playback state handling

### Fixed
- Session synchronization issue

### Verification
- Tests: 350/350
- TypeScript: PASS
- Lint: PASS
- Production build: PASS
```

---

# 22. ARCHITECTURAL BASELINE

For every major or substantial release, preserve an architectural snapshot describing:

```text
Project structure
Core modules
Data flow
External integrations
Storage
Authentication
API contracts
Build system
Deployment
Critical dependencies
Known constraints
```

This allows future agents to reverse-engineer the project before modifying it.

---

# 23. REVERSE-ENGINEERING REQUIREMENT

Before modifying an unfamiliar project:

DO NOT immediately code.

First determine:

```text
What exists?
Why does it exist?
How does it work?
What depends on it?
What depends on the requested component?
What assumptions does the system make?
What previous fixes were applied?
What constraints already exist?
What must not be broken?
```

Only then decide the version impact and implementation strategy.

---

# 24. PRESERVATION RULE

Never delete, replace, rewrite, or restructure existing code merely because another implementation appears cleaner.

Before destructive changes:

1. Understand the existing implementation.
2. Identify dependencies.
3. Identify behavior that must be preserved.
4. Determine whether replacement is actually necessary.
5. Preserve compatible functionality.
6. Remove obsolete code only when justified.

---

# 25. SECURITY / PRIVACY / COMPLIANCE

Any change involving:

* authentication
* authorization
* personal data
* payments
* cookies
* tracking
* logging
* storage
* encryption
* secrets
* API keys
* user consent
* privacy
* compliance

must receive additional impact analysis.

Do not classify such changes solely by code size.

---

# 26. DATABASE / DATA MIGRATION RULE

Any change affecting persistent data must explicitly evaluate:

```text
Backward compatibility
Forward compatibility
Migration
Rollback
Existing records
Data loss
Data integrity
Schema version
Production safety
```

If migration is breaking, escalate the version appropriately.

---

# 27. API COMPATIBILITY RULE

For APIs, evaluate:

```text
Endpoint changes
Request changes
Response changes
Required fields
Optional fields
Status codes
Authentication
Error contracts
Consumer compatibility
```

Backward-compatible additions may remain functional-level.

Breaking API changes require major-version consideration.

---

# 28. DEPLOYMENT RULE

A deployed version must correspond to an identifiable project state.

Track:

```text
Source version
Build artifact
Environment
Deployment status
Configuration
Database/schema version
Rollback version
```

Never deploy an ambiguous build.

---

# 29. GIT GOVERNANCE

Git operations are separate from version classification.

Versioning does NOT automatically authorize:

```text
git add
git commit
git push
git tag
git merge
git rebase
git reset
git branch creation/deletion
```

If Git writes are not explicitly authorized:

**READ ONLY.**

You may inspect Git state, but do not modify it.

If Git writes are authorized, ensure commits/tags correspond to the verified project version.

Recommended tag format:

```text
vA.BC.DE.F
```

Example:

```text
v1.08.14.0
```

---

# 30. NO SILENT VERSION CHANGES

Never silently change the project's version.

Whenever a project-changing operation results in a version transition, report:

```text
Previous:
A.BC.DE.F

New:
A.BC.DE.F

Level:
Major / Sub-version / Functional / Patch

Reason:
...

Verification:
...
```

---

# 31. COMMAND EXECUTION LOOP

For EVERY user command that can affect the project, execute this internal loop:

```text
┌──────────────────────────────┐
│ RECEIVE COMMAND              │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ UNDERSTAND INTENT            │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ REVERSE-ENGINEER IMPACT      │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ CLASSIFY CHANGE              │
│ A / BC / DE / F              │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ CALCULATE TARGET VERSION     │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ CHECK RISKS / DEPENDENCIES   │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ IMPLEMENT                    │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ TEST / VERIFY                │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ UPDATE VERSION METADATA      │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ UPDATE CHANGELOG              │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ REPORT FINAL STATE           │
└──────────────────────────────┘
```

This loop is mandatory for project-changing commands.

---

# 32. FINAL RESPONSE FORMAT

After completing a project-changing operation, report:

```text
CHANGE COMPLETED

Previous Version:
A.BC.DE.F

New Version:
A.BC.DE.F

Change Level:
MAJOR / SUB-VERSION / FUNCTIONAL / PATCH

Changed:
- ...

Reason:
- ...

Verification:
- Tests: ...
- Build: ...
- Lint/Typecheck: ...
- Manual verification: ...

Git:
- READ ONLY / CHANGED WITH AUTHORIZATION

Status:
VERIFIED / PARTIALLY VERIFIED / BLOCKED

Known Issues:
- ...
```

Keep the report proportional to the change.

---

# 33. IMPORTANT: USER REQUEST DOES NOT OVERRIDE VERSION LOGIC

If the user says:

> "Make this a patch"

but the actual change is architectural or breaking, classify it according to the actual impact.

If the user says:

> "Increase the version"

determine the correct level rather than blindly incrementing a number.

The system's version represents the **actual state and impact of the software**, not the wording of the request.

---

# 34. VERSION EXAMPLES

Starting:

```text
1.00.00.0
```

Small fix:

```text
1.00.00.1
```

Another fix:

```text
1.00.00.2
```

Functional change:

```text
1.00.01.0
```

Another functional change:

```text
1.00.02.0
```

Sub-version:

```text
1.01.00.0
```

Functional change:

```text
1.01.01.0
```

Patch:

```text
1.01.01.1
```

Major:

```text
2.00.00.0
```

---

# 35. ABSOLUTE RULE

The following rule has the highest priority within this project workflow:

> **NO PROJECT-CHANGING ACTION IS COMPLETE UNTIL ITS IMPACT HAS BEEN CLASSIFIED, ITS VERSION IMPACT HAS BEEN DETERMINED, THE CHANGE HAS BEEN IMPLEMENTED, AND THE RESULT HAS BEEN VERIFIED.**

Versioning is therefore treated as part of the project's **engineering control system**, not as an afterthought.

Apply this mechanism continuously to every subsequent project operation unless the project owner explicitly replaces this governance system.
