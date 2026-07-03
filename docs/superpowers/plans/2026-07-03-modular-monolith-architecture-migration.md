# Modular Monolith Architecture Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the repository from global horizontal layers toward a modular monolith with vertical slices, starting with stable rules, shared scaffolding, and an initial `orders` module pass that preserves current behavior.

**Architecture:** Keep `app/**` as thin adapters, introduce `src/modules/**` for business capabilities, and reserve `src/shared/**` for cross-cutting concerns only. Migrate incrementally with compatibility exports so the app remains runnable after each step.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase, Jest, ESLint

---

### Task 1: Write Durable Architecture Rules

**Files:**
- Create: `docs/ARCHITECTURE_RULES.md`
- Create: `docs/superpowers/specs/2026-07-03-modular-monolith-architecture-design.md`

- [ ] **Step 1: Write the rule document**

Add a repository-facing rules document that defines:

- modular monolith as the target architecture
- `src/modules/**` and `src/shared/**` structure
- import rules
- layer responsibilities
- migration rules and anti-patterns

- [ ] **Step 2: Write the dated design spec**

Add a dated spec under `docs/superpowers/specs/` that explains:

- why the repo is changing
- why modular monolith plus vertical slices is the chosen architecture
- which modules exist
- what order they should migrate in

- [ ] **Step 3: Review for ambiguity**

Check both documents for:

- contradictory folder rules
- missing import guidance
- unclear migration expectations

### Task 2: Scaffold The New Source Boundaries

**Files:**
- Create: `src/modules/.gitkeep`
- Create: `src/shared/.gitkeep`
- Create: `src/modules/README.md`
- Create: `src/shared/README.md`

- [ ] **Step 1: Create module and shared roots**

Create `src/modules/` and `src/shared/` as the new top-level architecture roots.

- [ ] **Step 2: Add boundary documentation**

Document what belongs in each root and what does not, so future migrations and feature work do not drift immediately.

- [ ] **Step 3: Verify the roots exist**

Run: `Get-ChildItem src`

Expected: output includes `modules` and `shared`

### Task 3: Create The Initial Orders Module Skeleton

**Files:**
- Create: `src/modules/orders/index.ts`
- Create: `src/modules/orders/domain/.gitkeep`
- Create: `src/modules/orders/application/.gitkeep`
- Create: `src/modules/orders/infrastructure/.gitkeep`
- Create: `src/modules/orders/presentation/.gitkeep`

- [ ] **Step 1: Create the orders module folders**

Create the first business module under `src/modules/orders/`.

- [ ] **Step 2: Add a public entrypoint**

Create `src/modules/orders/index.ts` to publish the migration-safe entrypoints for the orders slice.

- [ ] **Step 3: Verify the new module tree**

Run: `Get-ChildItem src/modules/orders -Recurse`

Expected: output shows `domain`, `application`, `infrastructure`, `presentation`, and `index.ts`

### Task 4: Move Existing Orders Building Blocks Behind Module Exports

**Files:**
- Create: `src/modules/orders/application/orders-service.ts`
- Create: `src/modules/orders/application/order-status-helpers.ts`
- Create: `src/modules/orders/infrastructure/orders-repo.ts`
- Create: `src/modules/orders/infrastructure/orders-repo-helpers.ts`
- Modify: `src/services/orders-service.ts`
- Modify: `src/services/order-status-helpers.ts`
- Modify: `src/repositories/orders-repo.ts`
- Modify: `src/repositories/orders-repo-helpers.ts`

- [ ] **Step 1: Copy or move the orders service into the module application layer**

Make `src/modules/orders/application/orders-service.ts` the new source of truth.

- [ ] **Step 2: Copy or move the orders repository into the module infrastructure layer**

Make `src/modules/orders/infrastructure/orders-repo.ts` and helper files the new source of truth.

- [ ] **Step 3: Turn legacy shared paths into compatibility re-exports**

Keep `src/services/orders-service.ts`, `src/services/order-status-helpers.ts`, `src/repositories/orders-repo.ts`, and `src/repositories/orders-repo-helpers.ts` as thin re-export files so current imports do not break during migration.

- [ ] **Step 4: Export the new module surface**

Update `src/modules/orders/index.ts` to export the public orders application and infrastructure symbols that current routes and screens use.

- [ ] **Step 5: Run targeted verification**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/orders-service-structure.test.ts tests/unit/orders-repo-structure.test.ts`

Expected: PASS

### Task 5: Start The Orders Presentation Boundary

**Files:**
- Create: `src/modules/orders/presentation/admin/index.ts`
- Create: `src/modules/orders/presentation/admin/order-item-details/`
- Modify: `src/components/admin/orders/OrderItemDetailsModal.tsx`
- Modify: `src/components/admin/orders/useOrderItemDetailsModalState.ts`

- [ ] **Step 1: Identify the first admin orders presentation surface**

Use the existing order item details modal and state files as the first presentation boundary candidate.

- [ ] **Step 2: Extract or mirror them into the module presentation layer**

Move the screen-specific state and view helpers into `src/modules/orders/presentation/admin/...` while keeping compatibility imports if necessary.

- [ ] **Step 3: Update legacy component paths to re-export or consume module code**

Do not break route imports during the first pass.

- [ ] **Step 4: Run targeted verification**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/order-item-details-modal-structure.test.ts`

Expected: PASS

### Task 6: Update Core Docs To Point At The New Architecture

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/PROJECT_OVERVIEW.md`

- [ ] **Step 1: Add references to `docs/ARCHITECTURE_RULES.md`**

Make the main architecture docs point at the new rules file.

- [ ] **Step 2: Update top-level structure descriptions**

Document that the repo is migrating from global shared layers toward `src/modules/**` and `src/shared/**`.

### Task 7: Verify The First Migration Pass

**Files:**
- Test: `tests/unit/orders-service-structure.test.ts`
- Test: `tests/unit/orders-repo-structure.test.ts`
- Test: `tests/unit/order-item-details-modal-structure.test.ts`

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 2: Run targeted unit tests**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/orders-service-structure.test.ts tests/unit/orders-repo-structure.test.ts tests/unit/order-item-details-modal-structure.test.ts`

Expected: PASS

- [ ] **Step 3: Review for accidental boundary violations**

Check that:

- module code imports from `src/shared/**` or itself
- legacy files are thin shims
- no new business logic was added to `app/**`
