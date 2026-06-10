# Lightspeed Reconciliation Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add approximate visible progress to manual Lightspeed reconciliation sync so large imports and archives show ongoing work instead of appearing stalled.

**Architecture:** Reuse the existing preview counts as the total workload, then switch apply from one opaque request into chunked import and archive requests that update modal progress between batches. Keep archived website products excluded at the preview, apply, and progress-count levels.

**Tech Stack:** Next.js App Router, TypeScript, React, Supabase, Jest

---

## File Structure

- Modify: `src/services/lightspeed-reconciliation-sync-service.ts`
  - Add chunk-oriented import/apply helpers without changing reconciliation semantics.
- Modify: `app/api/admin/lightspeed/sync/route.ts`
  - Support batch apply actions for import and archive chunks.
- Modify: `app/admin/inventory/client.tsx`
  - Replace opaque apply with progress-driven chunk execution and modal state.
- Test: `tests/unit/lightspeed-reconciliation-sync-service.test.ts`
  - Cover chunk apply helpers and archive exclusion.
- Test: `tests/unit/lightspeed-sync-api.test.ts`
  - Cover new batch action contract.

### Task 1: Add chunk apply helpers to the reconciliation service

**Files:**
- Modify: `src/services/lightspeed-reconciliation-sync-service.ts`
- Test: `tests/unit/lightspeed-reconciliation-sync-service.test.ts`

- [ ] **Step 1: Write failing tests for import and archive chunks**

```ts
it("imports a specific chunk of remote products", async () => {
  const service = new LightspeedReconciliationSyncService({} as never);

  const result = await service.applyImportChunk({
    tenantId: "tenant-1",
    remoteProductIds: ["ls-import-1", "ls-import-2"],
  });

  expect(result.importedCount).toBe(2);
});

it("archives a specific chunk of website products", async () => {
  const service = new LightspeedReconciliationSyncService({} as never);

  const result = await service.applyArchiveChunk({
    tenantId: "tenant-1",
    websiteProductIds: ["website-1", "website-2"],
  });

  expect(result.archivedCount).toBe(2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:jest:unit -- tests/unit/lightspeed-reconciliation-sync-service.test.ts`
Expected: FAIL because chunk methods do not exist yet

- [ ] **Step 3: Implement chunk helpers**

```ts
async applyImportChunk(input: { tenantId: string; remoteProductIds: string[] }) {
  const client = await this.getClient(input.tenantId);
  let importedCount = 0;
  let failedCount = 0;

  for (const remoteProductId of input.remoteProductIds) {
    try {
      const remoteProduct = await client.getProduct(remoteProductId);
      if (!remoteProduct) {
        failedCount += 1;
        continue;
      }
      const result = await this.inboundSyncService.applyProductPayload({
        tenantId: input.tenantId,
        payload: remoteProduct,
        topic: "product.update",
        remoteModifiedAt: remoteProduct.updated_at ?? new Date().toISOString(),
      });
      if (result.status === "applied") {
        importedCount += 1;
      }
    } catch {
      failedCount += 1;
    }
  }

  return { importedCount, failedCount };
}

async applyArchiveChunk(input: { tenantId: string; websiteProductIds: string[] }) {
  let archivedCount = 0;
  let failedCount = 0;

  for (const productId of input.websiteProductIds) {
    try {
      const result = await this.productService.archiveProduct(productId, input.tenantId);
      if (result.archived) {
        archivedCount += 1;
      }
    } catch {
      failedCount += 1;
    }
  }

  return { archivedCount, failedCount };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:jest:unit -- tests/unit/lightspeed-reconciliation-sync-service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/lightspeed-reconciliation-sync-service.ts tests/unit/lightspeed-reconciliation-sync-service.test.ts
git commit -m "feat: add chunk helpers for lightspeed reconciliation progress"
```

### Task 2: Add batch API actions for chunk processing

**Files:**
- Modify: `app/api/admin/lightspeed/sync/route.ts`
- Test: `tests/unit/lightspeed-sync-api.test.ts`

- [ ] **Step 1: Write failing API tests for chunk actions**

```ts
it("applies an import chunk", async () => {
  const response = await POST(
    new Request("http://localhost/api/admin/lightspeed/sync", {
      method: "POST",
      body: JSON.stringify({
        action: "apply_import_chunk",
        remoteProductIds: ["ls-1"],
      }),
    }),
  );

  expect(response.status).toBe(200);
});

it("applies an archive chunk", async () => {
  const response = await POST(
    new Request("http://localhost/api/admin/lightspeed/sync", {
      method: "POST",
      body: JSON.stringify({
        action: "apply_archive_chunk",
        websiteProductIds: ["website-1"],
      }),
    }),
  );

  expect(response.status).toBe(200);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:jest:unit -- tests/unit/lightspeed-sync-api.test.ts`
Expected: FAIL because the route only accepts `apply`

- [ ] **Step 3: Expand request parsing and dispatch**

```ts
const syncBodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("apply") }).strict(),
  z.object({
    action: z.literal("apply_import_chunk"),
    remoteProductIds: z.array(z.string()).min(1),
  }).strict(),
  z.object({
    action: z.literal("apply_archive_chunk"),
    websiteProductIds: z.array(z.string().uuid()).min(1),
  }).strict(),
]);

if (parsed.data.action === "apply_import_chunk") {
  const result = await service.applyImportChunk({
    tenantId,
    remoteProductIds: parsed.data.remoteProductIds,
  });
  return NextResponse.json({ result, requestId });
}

if (parsed.data.action === "apply_archive_chunk") {
  const result = await service.applyArchiveChunk({
    tenantId,
    websiteProductIds: parsed.data.websiteProductIds,
  });
  return NextResponse.json({ result, requestId });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:jest:unit -- tests/unit/lightspeed-sync-api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/lightspeed/sync/route.ts tests/unit/lightspeed-sync-api.test.ts
git commit -m "feat: add chunked lightspeed sync api actions"
```

### Task 3: Add approximate progress state to the inventory modal

**Files:**
- Modify: `app/admin/inventory/client.tsx`

- [ ] **Step 1: Add progress state shape**

```ts
type SyncProgressState = {
  phase: "preparing" | "importing" | "archiving" | "finishing" | "complete" | "error";
  completedUnits: number;
  totalUnits: number;
  currentLabel: string;
  importedCount: number;
  archivedCount: number;
  failedCount: number;
};
```

- [ ] **Step 2: Initialize progress from preview**

```ts
const totalUnits = (syncPreview?.importCount ?? 0) + (syncPreview?.archiveCount ?? 0);
setSyncProgress({
  phase: "preparing",
  completedUnits: 0,
  totalUnits,
  currentLabel: totalUnits === 0 ? "Nothing to sync" : "Preparing sync",
  importedCount: 0,
  archivedCount: 0,
  failedCount: 0,
});
```

- [ ] **Step 3: Replace one-shot apply with chunked apply**

```ts
const importChunks = chunkArray(syncPreview.imports.map((item) => item.remoteProductId), 10);
const archiveChunks = chunkArray(syncPreview.archives.map((item) => item.websiteProductId), 25);

for (let index = 0; index < importChunks.length; index += 1) {
  setSyncProgress((prev) => ({
    ...prev,
    phase: "importing",
    currentLabel: `Importing ${index * 10 + 1}-${index * 10 + importChunks[index].length} of ${syncPreview.importCount}`,
  }));

  const response = await fetch("/api/admin/lightspeed/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "apply_import_chunk",
      remoteProductIds: importChunks[index],
    }),
  });
  const payload = await response.json();

  setSyncProgress((prev) => ({
    ...prev,
    completedUnits: prev.completedUnits + importChunks[index].length,
    importedCount: prev.importedCount + (payload.result?.importedCount ?? 0),
    failedCount: prev.failedCount + (payload.result?.failedCount ?? 0),
  }));
}
```

- [ ] **Step 4: Render progress bar and status**

```tsx
const percent =
  syncProgress.totalUnits > 0
    ? Math.min(100, Math.round((syncProgress.completedUnits / syncProgress.totalUnits) * 100))
    : 100;

<div className="space-y-3">
  <div className="h-2 overflow-hidden rounded bg-zinc-800">
    <div
      className="h-full bg-red-600 transition-all"
      style={{ width: `${percent}%` }}
    />
  </div>
  <div className="flex items-center justify-between text-sm text-zinc-300">
    <span>{syncProgress.currentLabel}</span>
    <span>
      {syncProgress.completedUnits} / {syncProgress.totalUnits}
    </span>
  </div>
</div>
```

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/admin/inventory/client.tsx
git commit -m "feat: add approximate progress for lightspeed reconciliation sync"
```

### Task 4: Final verification

**Files:**
- Modify: `src/services/lightspeed-reconciliation-sync-service.ts`
- Modify: `app/api/admin/lightspeed/sync/route.ts`
- Modify: `app/admin/inventory/client.tsx`
- Test: `tests/unit/lightspeed-reconciliation-sync-service.test.ts`
- Test: `tests/unit/lightspeed-sync-api.test.ts`

- [ ] **Step 1: Run targeted unit tests**

Run: `npm run test:jest:unit -- tests/unit/lightspeed-reconciliation-sync-service.test.ts tests/unit/lightspeed-sync-api.test.ts`
Expected: PASS

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Manual smoke test**

```text
1. Open inventory and run Sync Inventory preview
2. Click Apply Sync
3. Confirm progress bar advances during imports
4. Confirm progress bar advances during archives
5. Confirm archived products were never part of the sync totals
6. Confirm completion summary is shown before closing
```

- [ ] **Step 4: Commit**

```bash
git add src/services/lightspeed-reconciliation-sync-service.ts app/api/admin/lightspeed/sync/route.ts app/admin/inventory/client.tsx tests/unit/lightspeed-reconciliation-sync-service.test.ts tests/unit/lightspeed-sync-api.test.ts
git commit -m "feat: add progress tracking to lightspeed reconciliation sync"
```
