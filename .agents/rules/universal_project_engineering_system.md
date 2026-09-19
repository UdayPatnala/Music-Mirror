# UNIVERSAL PRODUCT REVERSE-ENGINEERING + ENGINEERING SYSTEM — WORKSPACE RULE

## 1. CORE OPERATING HIERARCHY
CONVERSATIONS / DISCUSSIONS
        ↓
MOTIVE
        ↓
VISION
        ↓
PURPOSE
        ↓
PRODUCT IDENTITY
        ↓
INTENDED USER EXPERIENCE
        ↓
AGREED FEATURES + BEHAVIOR
        ↓
CONSTRAINTS + "DO NOT" DECISIONS
        ↓
CURRENT IMPLEMENTATION
        ↓
GIT / VERSION HISTORY
        ↓
RESEARCH
        ↓
ENGINEERING DECISIONS
        ↓
IMPLEMENTATION
        ↓
VERIFICATION
        ↓
UPDATED PRODUCT

## 2. THE THREE REALITIES TO RECONCILE
1. WHAT WE INTENDED (motive / vision / conversations / decisions)
2. WHAT WE ACTUALLY BUILT (reverse engineering / code / files / runtime / deployment / git)
3. WHAT WE SHOULD DO NEXT (gap analysis / correction / simplification / implementation)

GOLDEN INVARIANT:
Never let the current codebase overwrite the project's historical product intent. Reconcile the code with the intent.

## 3. ABSOLUTE ORDER OF OPERATIONS
NEVER START BY CODING.

The mandatory order is:
A. RECOVER PRODUCT INTENT
B. REVERSE ENGINEER CURRENT PRODUCT
C. RECONCILE INTENT VS IMPLEMENTATION
D. IDENTIFY GAPS / EXCESS / RISKS / DRIFT
E. RESEARCH
F. MAKE DECISIONS
G. PLAN
H. PRESERVE SAFE VERSION
I. IMPLEMENT
J. VERIFY
K. AUDIT
L. UPDATE HISTORY
M. PRESERVE NEW KNOWN-GOOD VERSION

## 4. MUSIC MIRROR SPECIFIC APPLICATION
- **Product Intent Recovery**: Emotion-first AI music companion delivering personalized playback with minimal friction. Web Audio API, WebGL client biometrics (zero-PII), dark neutral aesthetic (#090909), album-derived accents, cinematic studio theme.
- **Reverse Engineering**: YouTube discovery & fallback engine (sub-3s failover), HTML5 audio adapter, local catalog fallback.
- **Persistent Memory**: `docs/VERSION_HISTORY.md`, `docs/EXECUTION_HISTORY.md`, `PROJECT_STATE.md`, `docs/architecture.md`.
