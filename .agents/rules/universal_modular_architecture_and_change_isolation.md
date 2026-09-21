# UNIVERSAL MODULAR ARCHITECTURE & CHANGE-ISOLATION GOVERNANCE

> **MANDATORY SYSTEM GOVERNANCE SPECIFICATION**  
> Enforced by: Antigravity AI Orchestrator & Senior Development Agents  
> Applicable to: All applications, modules, libraries, APIs, and microservices in the Music Mirror ecosystem.

---

## 1. Primary Objective

Every page, feature, function, component, workflow, service, API, data model, button, interaction, and system capability must have a **clearly identifiable ownership boundary** so that modifying one thing does not unnecessarily modify, overwrite, delete, or destabilize unrelated parts of the project.

---

## 2. Core Architectural Principles

### First Principle — Ownership
Every meaningful piece of code must have an owner. No code may exist as "orphan code" whose architectural ownership and responsibility are ambiguous.

### Second Principle — Locality
Code that changes together must live together. When a feature requires UI, state, business logic, API communication, validation, types, and tests, those elements must reside within that feature's architectural boundary rather than being scattered across arbitrary global directories.

### Third Principle — Change Isolation
When modifying any capability, agents must modify only the smallest responsible ownership boundary. Do not touch unrelated domains unless explicit dependency impact analysis mandates it.

---

## 3. Architecture Hierarchy & Boundaries

Systems must be structured according to domain and feature ownership rather than merely file types:

```text
PROJECT
│
├── APP / SHELL             (Root bootstrap, provider tree, routing shell)
│
├── DOMAINS                 (Self-contained business areas)
│   ├── [Domain A]
│   │   ├── PAGES           (Page compositions)
│   │   ├── FEATURES        (Autonomous functional capabilities)
│   │   ├── COMPONENTS      (Domain-specific UI elements)
│   │   ├── SERVICES        (Domain business logic & algorithms)
│   │   ├── DATA / STATE    (Domain models & local state stores)
│   │   └── TESTS           (Unit & integration test suites)
│   │
│   └── [Domain B]
│
├── SHARED                  (Generic, multi-consumer reusable primitives)
│   ├── UI                  (Truly generic design system primitives)
│   └── UTILS               (Domain-agnostic pure utility functions)
│
├── INFRASTRUCTURE          (Network clients, persistence drivers, hardware adapters)
├── CONFIGURATION           (Environment, policy, and capability manifests)
├── TESTING                 (Global harnesses, E2E fixtures, stress suites)
└── DOCUMENTATION           (Authoritative specifications, ledgers, architecture maps)
```

---

## 4. Change Radius Classification

Before modifying any file, classify it into the five-tier change radius:

1. **DIRECT**: Files that implement the requested functionality directly.
2. **RELATED**: Files directly supporting or configuring the functionality.
3. **DEPENDENT**: Files consuming the functionality (require explicit impact analysis).
4. **SHARED**: Infrastructure used by multiple modules (requires caution & regression verification).
5. **UNRELATED**: Everything else. **MUST NOT BE TOUCHED.**

---

## 5. Change Manifest & Modification Protocol

Before executing any modification, create an internal change manifest:

```text
CHANGE MANIFEST
Requested: [Description of user request]
Direct:    [Files implementing the change]
Related:   [Directly supporting files]
Dependent: [Files consuming the change, if any]
Shared:    [Shared infrastructure impacted, if any]
Unrelated: [All other modules — strictly frozen]
Radius:    Direct + necessary Related only
```

Before touching any file, answer: *"Why does this specific file need to change?"* If no direct, traceable reason exists, **do not modify it**.

---

## 6. Component, Button & Function Ownership

- **Page Ownership**: Pages compose sections and features. Business logic must live below the page layer. Pages must not exceed single-responsibility bounds.
- **Feature Ownership**: Features bundle their own components, state, logic, validation, and tests.
- **Component Ownership**: Distinguish domain-specific components (`features/*/components`) from truly shared primitives (`shared/ui`). Never move code to `shared` without a multi-consumer contract.
- **Button Ownership**: Buttons are UI manifestations of actions. The UI trigger belongs to the page/component; the action logic belongs exclusively to the owning feature.
- **Function Ownership**: Pure utility functions belong close to their domain. Avoid bloated catch-all files (`utils/common.ts`, `helpers/everything.ts`).

---

## 7. Dependency Direction & Public Contracts

- **Dependency Flow**: `App Shell` $\to$ `Domain` $\to$ `Feature` $\to$ `Shared Infrastructure`.
- **Public vs. Private**: Every feature must expose an explicit public interface (`index.ts` / public facade). Never import another feature's internal/private state.
- **Controlled Communication**: Cross-feature communication must proceed via explicit contracts, events, or public services. Circular dependencies are strictly forbidden.

---

## 8. Data Ownership & Single Source of Truth

- Every piece of data and state has exactly one authoritative owner.
- Duplicate sources of truth are prohibited.
- Global state is strictly reserved for genuinely global concerns (e.g., active audio session).

---

## 9. Code Preservation & Anti-Regression Invariants

- **"Nothing Disappears" Rule**: No existing functionality may disappear merely because an implementation was moved, refactored, or modernized.
- **No Cascade Editing**: Do not casually "clean up" or refactor unrelated files during a local fix.
- **File Replacement Protection**: Never overwrite an entire file when a targeted edit accomplishes the task.
- **Unknown Code Protection**: Never delete unfamiliar code without proving it is dead or obsolete across dynamic imports, runtime registrations, and tests.

---

## 10. Master Development Workflow

```text
1. READ VERSION CONTROLLER & ARCHITECTURE
2. SEARCH PROJECT FOR EXISTING IMPLEMENTATION
3. IDENTIFY OWNING DOMAIN & FEATURE
4. TRACE DEPENDENCIES & CONTRACTS
5. CREATE CHANGE MANIFEST (DIRECT, RELATED, UNRELATED)
6. IMPLEMENT SMALLEST SAFE CHANGE
7. EXECUTE AUTOMATED TESTS (FRONTEND + BACKEND)
8. VERIFY NO FUNCTIONALITY DISAPPEARED
9. VERIFY CHANGE RADIUS COMPLIANCE
10. UPDATE VERSION & SYNCHRONIZE LEDGERS (VERSION_CONTROLLER.md, ARCHITECTURE.md, CHANGELOG.md, MUSIC-MIRROR.md)
```
