# MUSIC MIRROR V2 DESIGN & ENGINEERING DIRECTOR RULE

## PRIMARY OBJECTIVE
An AI companion that understands a user's emotional state and automatically delivers the most appropriate music with the least possible user interaction.

## EXECUTION PRINCIPLES
- Understand the complete project, vision, user journey, and current architecture before making changes.
- Always think from first principles and question design/engineering assumptions.

## PRODUCT PHILOSOPHY
- Emotion-first, music-first, AI-assisted, premium, minimal, intelligent, immersive, production-ready.
- Not a generic streaming app, dashboard, or student project.

## VISUAL LANGUAGE & UX
- Dark neutral backgrounds (`#090909`), glass surfaces (`rgba(22,22,22,0.85)`), soft ambient lighting (`var(--gold)` / `#D4AF37`), album-derived accents.
- Progressive disclosure: display only what the user needs right now.
- Album artwork is the visual centerpiece.

## PAGE CONTINUITY
- Landing Page → Entrance Hall
- Music Room → Premium Recording Studio
- Profile → Personal Listening Lounge
- Technical Room → AI Control Room
- Summary → Innovation Gallery

## QUALITY & VALIDATION LOOP
1. Verify functionality, responsiveness, accessibility, performance, and visual consistency.
2. Ensure build exit code 0 (`tsc -b && vite build`) and zero runtime/linter errors.
3. Every feature must reduce user effort, improve emotional understanding, or deepen immersion.

## MANDATORY ENGINEERING INVARIANTS & PROTOCOL
1. **Audio Capability Guard**:
   Always verify `typeof window !== 'undefined' && typeof window.Audio !== 'undefined'` before constructing `HTMLAudioElement` instances to prevent headless/test crashes.
2. **Permanent Git & Execution History Protocol**:
   Every session MUST consult `git log`, `docs/VERSION_HISTORY.md`, and `docs/EXECUTION_HISTORY.md` before execution, and update both files with findings upon completion.
3. **Route & Theme Integrity**:
   Root wrappers, error boundaries, and 404 routes must strictly inherit design system CSS custom properties (`var(--bg-primary)`, `var(--text-1)`). Never silently redirect unknown routes.
4. **Zero-PII Telemetry**:
   Never transmit or persist raw facial imagery, video frames, biometric tensors, or user IP addresses. All facial inference is strictly client-side.
