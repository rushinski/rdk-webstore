# Lightspeed Sync Stock And Modal Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Lightspeed reconciliation stock inaccuracies, align lifecycle timestamp handling, and make the sync details modal behavior and sizing consistent with the preview modal.

**Architecture:** Reuse the existing Lightspeed normalization pipeline so one stock-source change in the mapping service fixes both preview and apply flows. Keep timestamp semantics split between SQL row creation and product lifecycle fields, and update the sync details modal to consume the reconciliation product shape directly instead of a stale UI-only subset.

**Tech Stack:** Next.js, React, TypeScript, Jest, Supabase

---

### Task 1: Lock inbound stock to Lightspeed Main Outlet

**Files:**
- Modify: `src/services/lightspeed-mapping-service.ts`
- Test: `tests/unit/lightspeed-reconciliation-sync-service.test.ts`

- [ ] **Step 1: Write the failing test**

Add a reconciliation test case where a remote variant has `inventory_Main_Outlet: 3` and an `inventory` array that would previously resolve to `0`, then assert the preview diff uses stock `3`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/lightspeed-reconciliation-sync-service.test.ts --runInBand`
Expected: FAIL on stock assertion.

- [ ] **Step 3: Write minimal implementation**

Update `extractStock()` so `inventory_Main_Outlet` is preferred before inventory-array aggregation, with the old aggregation preserved as fallback.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/lightspeed-reconciliation-sync-service.test.ts --runInBand`
Expected: PASS.

### Task 2: Align sync details modal with lifecycle timestamp model

**Files:**
- Modify: `src/components/admin/inventory/SyncProductPreviewModal.tsx`
- Modify: `app/admin/inventory/client.tsx`

- [ ] **Step 1: Update modal types to match reconciliation product shape**

Replace the stale `createdAt` field in the modal-local `ComparableProduct` type with `rowCreatedAt`, `productCreatedAt`, and `productUpdatedAt`.

- [ ] **Step 2: Update rendered fields**

Show lifecycle timestamps only if needed by the existing diff UI, and ensure any shown lifecycle field highlights blue when the diff includes it.

- [ ] **Step 3: Update close control behavior**

Replace the top-right `X` with a back arrow icon and keep it wired to `onClose()` so it reads as returning to the preview popup.

### Task 3: Make sync details modal sizing consistent with preview modal

**Files:**
- Modify: `src/components/admin/inventory/SyncProductPreviewModal.tsx`

- [ ] **Step 1: Match outer modal proportions**

Adjust the sync details dialog container so its max width and height align with the completed preview sync popup proportions instead of jumping to a larger layout.

- [ ] **Step 2: Preserve edit-mode usability**

Keep side-by-side edit content scrollable within the matched shell so the visual sizing is consistent without clipping content.

### Task 4: Regression verification

**Files:**
- Test: `tests/unit/lightspeed-reconciliation-sync-service.test.ts`

- [ ] **Step 1: Run targeted reconciliation tests**

Run: `npm test -- tests/unit/lightspeed-reconciliation-sync-service.test.ts --runInBand`
Expected: PASS.

- [ ] **Step 2: Run any additional impacted unit tests if needed**

Run: `npm test -- --runInBand`
Expected: PASS, or document unrelated failures if present.
