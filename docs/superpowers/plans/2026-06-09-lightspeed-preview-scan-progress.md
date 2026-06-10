# Lightspeed Preview Scan Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open the sync modal immediately and add chunked preview scanning with running counts, remaining items, and estimated time before the apply phase begins.

**Architecture:** Split preview into chunked scan actions driven by the frontend modal. The reconciliation service will expose preview page processing while the inventory client orchestrates repeated preview requests, computes ETA, and then transitions into the existing preview-summary and apply-progress states.

**Tech Stack:** Next.js App Router, TypeScript, React, Supabase, Jest

---

## File Structure

- Modify: `src/services/lightspeed-reconciliation-sync-service.ts`
  - Add preview chunk scanning helpers and cumulative preview state.
- Modify: `app/api/admin/lightspeed/sync/route.ts`
  - Add preview chunk actions.
- Modify: `app/admin/inventory/client.tsx`
  - Open modal immediately, drive preview scanning state, compute ETA, and transition into summary/apply states.
- Test: `tests/unit/lightspeed-reconciliation-sync-service.test.ts`
  - Cover preview chunk behavior.
- Test: `tests/unit/lightspeed-sync-api.test.ts`
  - Cover preview chunk API behavior.

### Task 1: Add preview chunk scanning to the reconciliation service

**Files:**
- Modify: `src/services/lightspeed-reconciliation-sync-service.ts`
- Test: `tests/unit/lightspeed-reconciliation-sync-service.test.ts`

- [ ] **Step 1: Write failing tests for preview chunk scanning**

```ts
it("returns a preview scan chunk with cumulative counts", async () => {
  const service = new LightspeedReconciliationSyncService({} as never);

  const result = await service.scanPreviewChunk({
    tenantId: "tenant-1",
    page: 1,
    pageSize: 2,
  });

  expect(result.processedCount).toBe(2);
  expect(result.hasNextPage).toBe(true);
  expect(result.preview.importCount).toBeGreaterThanOrEqual(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:jest:unit -- tests/unit/lightspeed-reconciliation-sync-service.test.ts`
Expected: FAIL because `scanPreviewChunk()` does not exist yet

- [ ] **Step 3: Implement preview chunk method**

```ts
async scanPreviewChunk(input: { tenantId: string; page: number; pageSize: number }) {
  const client = await this.getClient(input.tenantId);
  const [pageResult, websiteProducts, links] = await Promise.all([
    client.listProducts(input.page, input.pageSize),
    this.productRepo.listForReconciliation(input.tenantId),
    this.linksRepo.listByTenant(input.tenantId),
  ]);

  const preview = this.classifyRemoteProducts({
    remoteProducts: pageResult.products,
    websiteProducts,
    links,
  });

  return {
    page: input.page,
    pageSize: input.pageSize,
    processedCount: pageResult.products.length,
    totalRemoteProducts: pageResult.totalProducts ?? null,
    hasNextPage: pageResult.hasNextPage,
    nextPage: pageResult.hasNextPage ? input.page + 1 : null,
    preview,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:jest:unit -- tests/unit/lightspeed-reconciliation-sync-service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/lightspeed-reconciliation-sync-service.ts tests/unit/lightspeed-reconciliation-sync-service.test.ts
git commit -m "feat: add preview chunk scanning for lightspeed sync"
```

### Task 2: Add preview scan actions to the sync API

**Files:**
- Modify: `app/api/admin/lightspeed/sync/route.ts`
- Test: `tests/unit/lightspeed-sync-api.test.ts`

- [ ] **Step 1: Write failing API test for preview scan**

```ts
it("returns a preview scan chunk", async () => {
  const response = await POST(
    new Request("http://localhost/api/admin/lightspeed/sync", {
      method: "POST",
      body: JSON.stringify({
        action: "scan_preview_chunk",
        page: 1,
        pageSize: 25,
      }),
    }),
  );

  expect(response.status).toBe(200);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:jest:unit -- tests/unit/lightspeed-sync-api.test.ts`
Expected: FAIL because the API does not yet accept preview scan actions

- [ ] **Step 3: Implement the API dispatch**

```ts
const syncBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("scan_preview_chunk"),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(100),
  }).strict(),
  // existing apply / chunk actions...
]);

if (parsed.data.action === "scan_preview_chunk") {
  const result = await service.scanPreviewChunk({
    tenantId,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
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
git commit -m "feat: add preview scan actions to lightspeed sync api"
```

### Task 3: Add immediate modal open and preview scan progress UI

**Files:**
- Modify: `app/admin/inventory/client.tsx`

- [ ] **Step 1: Add modal state machine and preview progress state**

```ts
type SyncModalStage = "preview_scanning" | "preview_summary" | "applying";

type PreviewScanState = {
  processedCount: number;
  totalCount: number | null;
  currentPage: number;
  hasNextPage: boolean;
  matchedCount: number;
  importCount: number;
  archiveCount: number;
  conflictCount: number;
  estimatedSecondsRemaining: number | null;
  startedAtMs: number;
};
```

- [ ] **Step 2: Open modal immediately and start preview scanning**

```ts
const startSyncPreview = async () => {
  setSyncDialogOpen(true);
  setSyncModalStage("preview_scanning");
  setSyncPreview(null);
  setPreviewScanState({
    processedCount: 0,
    totalCount: null,
    currentPage: 0,
    hasNextPage: true,
    matchedCount: 0,
    importCount: 0,
    archiveCount: 0,
    conflictCount: 0,
    estimatedSecondsRemaining: null,
    startedAtMs: Date.now(),
  });
};
```

- [ ] **Step 3: Drive sequential preview chunk requests**

```ts
let page = 1;
let done = false;
let latestPreview: ReconciliationPreview | null = null;

while (!done) {
  const response = await fetch("/api/admin/lightspeed/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "scan_preview_chunk",
      page,
      pageSize: 25,
    }),
  });
  const payload = await response.json();
  const result = payload.result;
  latestPreview = result.preview;

  setPreviewScanState((prev) => {
    const nextProcessed = prev.processedCount + result.processedCount;
    const elapsedSeconds = Math.max(1, (Date.now() - prev.startedAtMs) / 1000);
    const totalCount = result.totalRemoteProducts ?? prev.totalCount;
    const remaining =
      typeof totalCount === "number" ? Math.max(0, totalCount - nextProcessed) : null;
    const rate = nextProcessed / elapsedSeconds;
    const estimatedSecondsRemaining =
      remaining !== null && rate > 0 ? Math.round(remaining / rate) : null;

    return {
      ...prev,
      processedCount: nextProcessed,
      totalCount,
      currentPage: result.page,
      hasNextPage: result.hasNextPage,
      matchedCount: result.preview.matchedCount,
      importCount: result.preview.importCount,
      archiveCount: result.preview.archiveCount,
      conflictCount: result.preview.conflictCount,
      estimatedSecondsRemaining,
    };
  });

  done = !result.hasNextPage;
  page = result.nextPage ?? page + 1;
}

setSyncPreview(latestPreview);
setSyncModalStage("preview_summary");
```

- [ ] **Step 4: Render preview scanning UI**

```tsx
{syncModalStage === "preview_scanning" && previewScanState && (
  <div className="space-y-4">
    <div className="text-sm text-zinc-300">Scanning Lightspeed inventory...</div>
    <div className="h-2 overflow-hidden rounded bg-zinc-800">
      <div
        className="h-full bg-red-600 transition-all"
        style={{
          width:
            previewScanState.totalCount && previewScanState.totalCount > 0
              ? `${Math.round((previewScanState.processedCount / previewScanState.totalCount) * 100)}%`
              : "12%",
        }}
      />
    </div>
    <div className="flex justify-between text-sm text-zinc-400">
      <span>
        {previewScanState.totalCount
          ? `Scanning ${previewScanState.processedCount} of ${previewScanState.totalCount}`
          : `Scanned ${previewScanState.processedCount} items`}
      </span>
      <span>
        {previewScanState.estimatedSecondsRemaining === null
          ? "Estimating..."
          : `~${previewScanState.estimatedSecondsRemaining}s remaining`}
      </span>
    </div>
  </div>
)}
```

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/admin/inventory/client.tsx
git commit -m "feat: show immediate preview scan progress for lightspeed sync"
```

### Task 4: Final verification

**Files:**
- Modify: `src/services/lightspeed-reconciliation-sync-service.ts`
- Modify: `app/api/admin/lightspeed/sync/route.ts`
- Modify: `app/admin/inventory/client.tsx`
- Test: `tests/unit/lightspeed-reconciliation-sync-service.test.ts`
- Test: `tests/unit/lightspeed-sync-api.test.ts`

- [ ] **Step 1: Run targeted tests**

Run: `npm run test:jest:unit -- tests/unit/lightspeed-reconciliation-sync-service.test.ts tests/unit/lightspeed-sync-api.test.ts`
Expected: PASS

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Manual smoke test**

```text
1. Click Sync Inventory
2. Confirm modal opens immediately
3. Confirm preview scan counts and ETA update while GET is no longer the blocking flow
4. Confirm modal transitions to preview summary
5. Confirm Apply Sync still runs chunked progress
6. Confirm archived website products are not counted in preview or apply totals
```

- [ ] **Step 4: Commit**

```bash
git add src/services/lightspeed-reconciliation-sync-service.ts app/api/admin/lightspeed/sync/route.ts app/admin/inventory/client.tsx tests/unit/lightspeed-reconciliation-sync-service.test.ts tests/unit/lightspeed-sync-api.test.ts
git commit -m "feat: add preview scan progress to lightspeed reconciliation sync"
```
