# Lightspeed Sync Results Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return full per-item Lightspeed sync outcomes from the backend and render them in the inventory sync modal so admins can see exactly which products succeeded or failed and why.

**Architecture:** Extend reconciliation apply/chunk results with explicit `resultItems` entries for both success and failure outcomes. Thread those through the sync API and inventory client state, then render a scrollable itemized results section in the existing sync modal with simple status filtering.

**Tech Stack:** Next.js App Router, TypeScript, Jest, React client components

---

### Task 1: Backend Result Item Contract

**Files:**
- Modify: `src/services/lightspeed-reconciliation-sync-service.ts`
- Test: `tests/unit/lightspeed-reconciliation-sync-service.test.ts`

- [ ] Add a failing test that expects `apply()` and chunk helpers to return per-item success/failure result entries with operation, identifiers, title, SKU sample, status, and message.
- [ ] Run the targeted reconciliation unit test and confirm the new expectation fails for missing `resultItems`.
- [ ] Implement the minimal result item types and success/failure item collection in the reconciliation service.
- [ ] Run the targeted reconciliation unit test and confirm it passes.

### Task 2: Sync API Payload Coverage

**Files:**
- Modify: `app/api/admin/lightspeed/sync/route.ts`
- Test: `tests/unit/lightspeed-sync-api.test.ts`

- [ ] Add a failing API test that expects `resultItems` to be returned unchanged for `apply` and chunk responses.
- [ ] Run the sync API unit test and confirm it fails for missing `resultItems`.
- [ ] Implement the minimal API response changes needed to expose `resultItems`.
- [ ] Run the sync API unit test and confirm it passes.

### Task 3: Inventory Modal Results UI

**Files:**
- Modify: `app/admin/inventory/client.tsx`

- [ ] Add client-side result item types/state that aggregate per-chunk `resultItems` during sync apply.
- [ ] Replace the end-of-sync failure-summary-only behavior with modal-visible itemized results for successes and failures.
- [ ] Add a compact filter control for `All`, `Failures`, and `Successes`.
- [ ] Render a scrollable itemized results list in the existing apply-state modal using the returned operation, title, SKU sample, IDs, and message.

### Task 4: Verification

**Files:**
- Modify: `src/services/lightspeed-reconciliation-sync-service.ts`
- Modify: `app/api/admin/lightspeed/sync/route.ts`
- Modify: `app/admin/inventory/client.tsx`
- Modify: `tests/unit/lightspeed-reconciliation-sync-service.test.ts`
- Modify: `tests/unit/lightspeed-sync-api.test.ts`

- [ ] Run `npm run test:jest:unit -- --runTestsByPath tests/unit/lightspeed-reconciliation-sync-service.test.ts tests/unit/lightspeed-sync-api.test.ts`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npx eslint src/services/lightspeed-reconciliation-sync-service.ts app/api/admin/lightspeed/sync/route.ts app/admin/inventory/client.tsx tests/unit/lightspeed-reconciliation-sync-service.test.ts tests/unit/lightspeed-sync-api.test.ts`.
