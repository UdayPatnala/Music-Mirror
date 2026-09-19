# VERSION_GOVERNANCE.md — Music Mirror Authoritative Change Control

> **CRITICAL WORKSPACE INSTRUCTION**: This project operates under the **Universal Version Control & Change Governance System**.
> See authoritative rule definition: [`.agents/rules/universal_version_control_and_change_governance.md`](.agents/rules/universal_version_control_and_change_governance.md)

## 1. Authoritative Version Format: `A.BC.DE.F`
- **`A`**: Major Version ($0$–$\infty$) — Architectural replacement, breaking contracts, fundamental restructuring.
- **`BC`**: Sub-Version / Milestone ($01$–$99$, $00$ reset) — Substantial milestones, coordinated multi-feature phase completions.
- **`DE`**: Functional Change ($01$–$99$, $00$ reset) — Features, modules, workflows, new API endpoints, algorithmic enhancements.
- **`F`**: Minor / Bug / Patch ($0$–$9$) — Small bug fixes, validation corrections, typo/docs/styling corrections.

---

## 2. Master Command Execution Loop
Before and after every project-changing command, the following 12-step engineering loop is strictly executed:

```text
Receive Command 
  ↓ Understand Intent 
  ↓ Reverse-Engineer Impact 
  ↓ Classify Change (A / BC / DE / F) 
  ↓ Calculate Target Version 
  ↓ Check Risks & Dependencies 
  ↓ Implement 
  ↓ Test / Verify 
  ↓ Update Version Metadata 
  ↓ Update Changelog 
  ↓ Report Final State (Format Section 32)
```

---

## 3. Current Project State

| Attribute | Value |
| :--- | :--- |
| **Current Authoritative Version** | `2.04.01.0` |
| **Release Line / Sub-Version** | `04` (Dedicated UI/UX Engineering — Acoustic Reflection) |
| **Functional Revision** | `01` (Dynamic Soundwave DSP Canvas & Emotion Circumplex Radar) |
| **Patch / Audit Revision** | `0` (Reset on Functional Increment) |
| **Status** | `VERIFIED` |
| **Test Matrix** | 143/143 Backend (pytest) + 144/144 Frontend (Vitest) = 287/287 PASS |
| **Static Analysis** | 0 warnings, 0 errors (`oxlint`) |
| **Build Status** | EXIT 0 (`tsc -b && vite build`) |
| **UI/UX Status** | `ACTIVE` (Phase 19 Dynamic Soundwave & Circumplex Radar implemented) |
