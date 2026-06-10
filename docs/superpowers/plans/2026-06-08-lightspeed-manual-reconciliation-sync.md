# Lightspeed Manual Reconciliation Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a preview-first manual sync that imports Lightspeed-only products into the website and archives website-only products so active website inventory can be reconciled to Lightspeed on demand.

**Architecture:** Build a dedicated reconciliation service that fetches current Lightspeed inventory, compares it against active website inventory using existing link rows first and exact SKU fallback second, then exposes preview and apply endpoints for the admin inventory page. Reuse the existing inbound Lightspeed normalization path for imports and the website archive path for website-only products.

**Tech Stack:** Next.js App Router, TypeScript, Supabase, existing Lightspeed client/services, Jest

---

## File Structure

- Modify: `src/lib/lightspeed/client.ts`
  - Ensure product list retrieval exposes enough fields for preview samples and matching.
- Modify: `src/repositories/product-repo.ts`
  - Add a focused query for active inventory reconciliation inputs if current list helpers are too UI-specific.
- Modify: `src/repositories/lightspeed-links-repo.ts`
  - Add helpers needed to resolve and attach links during SKU fallback matches.
- Create: `src/services/lightspeed-reconciliation-sync-service.ts`
  - Build preview and apply behavior for manual Lightspeed-to-website reconciliation.
- Create: `app/api/admin/lightspeed/sync/route.ts`
  - Expose preview and apply actions to the admin UI.
- Modify: `app/admin/inventory/client.tsx`
  - Add `Sync Inventory` button, preview dialog, loading state, and apply action.
- Test: `tests/unit/lightspeed-reconciliation-sync-service.test.ts`
  - Cover preview and apply classification behavior.
- Test: `tests/unit/lightspeed-sync-api.test.ts`
  - Cover preview/apply API behavior.

### Task 1: Define reconciliation inputs and preview result types

**Files:**
- Modify: `src/services/lightspeed-reconciliation-sync-service.ts`
- Test: `tests/unit/lightspeed-reconciliation-sync-service.test.ts`

- [ ] **Step 1: Write the failing service preview test**

```ts
it("classifies linked matches, imports, archives, and conflicts", async () => {
  const service = createServiceFixture();

  const result = await service.preview({ tenantId: "tenant-1" });

  expect(result.matchedCount).toBe(1);
  expect(result.importCount).toBe(1);
  expect(result.archiveCount).toBe(1);
  expect(result.conflictCount).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:jest:unit -- tests/unit/lightspeed-reconciliation-sync-service.test.ts`
Expected: FAIL because the service or preview method does not exist yet

- [ ] **Step 3: Write minimal preview types and service skeleton**

```ts
export type LightspeedReconciliationPreview = {
  matchedCount: number;
  importCount: number;
  archiveCount: number;
  conflictCount: number;
  matched: Array<{ websiteProductId: string; remoteProductId: string; reason: "link" | "sku" }>;
  imports: Array<{ remoteProductId: string; title: string; skuSample: string | null }>;
  archives: Array<{ websiteProductId: string; title: string; skuSample: string | null }>;
  conflicts: Array<{ remoteProductId: string; title: string; candidateWebsiteProductIds: string[] }>;
};

export class LightspeedReconciliationSyncService {
  async preview(_input: { tenantId: string }): Promise<LightspeedReconciliationPreview> {
    return {
      matchedCount: 0,
      importCount: 0,
      archiveCount: 0,
      conflictCount: 0,
      matched: [],
      imports: [],
      archives: [],
      conflicts: [],
    };
  }
}
```

- [ ] **Step 4: Run test to verify it now reaches assertion failure**

Run: `npm run test:jest:unit -- tests/unit/lightspeed-reconciliation-sync-service.test.ts`
Expected: FAIL on numeric expectations rather than missing symbol errors

- [ ] **Step 5: Commit**

```bash
git add src/services/lightspeed-reconciliation-sync-service.ts tests/unit/lightspeed-reconciliation-sync-service.test.ts
git commit -m "test: scaffold lightspeed reconciliation preview service"
```

### Task 2: Implement preview classification logic

**Files:**
- Modify: `src/services/lightspeed-reconciliation-sync-service.ts`
- Modify: `src/repositories/product-repo.ts`
- Modify: `src/repositories/lightspeed-links-repo.ts`
- Test: `tests/unit/lightspeed-reconciliation-sync-service.test.ts`

- [ ] **Step 1: Expand tests for link match and SKU fallback semantics**

```ts
it("prefers existing links over SKU fallback", async () => {
  const service = createServiceFixture();

  const result = await service.preview({ tenantId: "tenant-1" });

  expect(result.matched).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ reason: "link", websiteProductId: "website-linked" }),
    ]),
  );
});

it("marks ambiguous SKU fallback as conflict", async () => {
  const service = createServiceFixture();

  const result = await service.preview({ tenantId: "tenant-1" });

  expect(result.conflicts[0]?.candidateWebsiteProductIds).toEqual(["website-a", "website-b"]);
});
```

- [ ] **Step 2: Run test to verify preview logic still fails**

Run: `npm run test:jest:unit -- tests/unit/lightspeed-reconciliation-sync-service.test.ts`
Expected: FAIL because preview still returns empty buckets

- [ ] **Step 3: Implement preview classification**

```ts
const linkedWebsiteProductIds = new Set<string>();
const matchedRemoteIds = new Set<string>();

for (const remote of remoteProducts) {
  const linked = linkIndex.get(remote.id);
  if (linked) {
    linkedWebsiteProductIds.add(linked.websiteProductId);
    matchedRemoteIds.add(remote.id);
    matched.push({
      websiteProductId: linked.websiteProductId,
      remoteProductId: remote.id,
      reason: "link",
    });
    continue;
  }

  const skuCandidates = collectExactSkuCandidates(remote, websiteSkuIndex);
  if (skuCandidates.length === 1) {
    const websiteProductId = skuCandidates[0];
    linkedWebsiteProductIds.add(websiteProductId);
    matchedRemoteIds.add(remote.id);
    matched.push({ websiteProductId, remoteProductId: remote.id, reason: "sku" });
    continue;
  }

  if (skuCandidates.length > 1) {
    conflicts.push({
      remoteProductId: remote.id,
      title: remote.name,
      candidateWebsiteProductIds: skuCandidates,
    });
    continue;
  }

  imports.push({
    remoteProductId: remote.id,
    title: remote.name,
    skuSample: firstRemoteSku(remote),
  });
}

for (const websiteProduct of activeWebsiteProducts) {
  if (linkedWebsiteProductIds.has(websiteProduct.id)) {
    continue;
  }
  archives.push({
    websiteProductId: websiteProduct.id,
    title: websiteProduct.name,
    skuSample: websiteProduct.variants[0]?.sku ?? null,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:jest:unit -- tests/unit/lightspeed-reconciliation-sync-service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/lightspeed-reconciliation-sync-service.ts src/repositories/product-repo.ts src/repositories/lightspeed-links-repo.ts tests/unit/lightspeed-reconciliation-sync-service.test.ts
git commit -m "feat: classify lightspeed reconciliation preview results"
```

### Task 3: Implement apply behavior for imports, archive, and link attachment

**Files:**
- Modify: `src/services/lightspeed-reconciliation-sync-service.ts`
- Test: `tests/unit/lightspeed-reconciliation-sync-service.test.ts`

- [ ] **Step 1: Write the failing apply test**

```ts
it("imports missing lightspeed products and archives website-only products", async () => {
  const service = createServiceFixture();

  const result = await service.apply({ tenantId: "tenant-1" });

  expect(result.importedCount).toBe(1);
  expect(result.archivedCount).toBe(1);
  expect(result.conflictCount).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:jest:unit -- tests/unit/lightspeed-reconciliation-sync-service.test.ts`
Expected: FAIL because `apply()` does not exist yet

- [ ] **Step 3: Implement apply using existing inbound and archive services**

```ts
async apply(input: { tenantId: string }) {
  const preview = await this.preview(input);

  let importedCount = 0;
  let archivedCount = 0;
  let failedCount = 0;

  for (const item of preview.imports) {
    try {
      const remote = await this.client.getProduct(item.remoteProductId);
      if (!remote) {
        failedCount += 1;
        continue;
      }
      const result = await this.inboundSyncService.applyProductPayload({
        tenantId: input.tenantId,
        payload: remote,
        topic: "product.update",
        remoteModifiedAt: remote.updated_at ?? new Date().toISOString(),
      });
      if (result.status === "applied") {
        importedCount += 1;
      }
    } catch {
      failedCount += 1;
    }
  }

  for (const item of preview.archives) {
    try {
      await this.productService.archiveProduct({ productId: item.websiteProductId });
      archivedCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  await this.attachSkuFallbackLinks(preview.matched.filter((item) => item.reason === "sku"));

  return {
    matchedCount: preview.matchedCount,
    importedCount,
    archivedCount,
    conflictCount: preview.conflictCount,
    failedCount,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:jest:unit -- tests/unit/lightspeed-reconciliation-sync-service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/lightspeed-reconciliation-sync-service.ts tests/unit/lightspeed-reconciliation-sync-service.test.ts
git commit -m "feat: apply lightspeed reconciliation sync changes"
```

### Task 4: Expose preview and apply through admin API

**Files:**
- Create: `app/api/admin/lightspeed/sync/route.ts`
- Test: `tests/unit/lightspeed-sync-api.test.ts`

- [ ] **Step 1: Write the failing API tests**

```ts
it("returns a preview summary for manual sync", async () => {
  const response = await GET(new Request("http://localhost/api/admin/lightspeed/sync"));
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.preview).toEqual(
    expect.objectContaining({
      matchedCount: expect.any(Number),
      importCount: expect.any(Number),
      archiveCount: expect.any(Number),
      conflictCount: expect.any(Number),
    }),
  );
});

it("applies manual sync when requested", async () => {
  const response = await POST(
    new Request("http://localhost/api/admin/lightspeed/sync", {
      method: "POST",
      body: JSON.stringify({ action: "apply" }),
    }),
  );

  expect(response.status).toBe(200);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:jest:unit -- tests/unit/lightspeed-sync-api.test.ts`
Expected: FAIL because the route does not exist yet

- [ ] **Step 3: Implement the route**

```ts
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const tenantId = await requireAdminTenantId(supabase);
  const service = new LightspeedReconciliationSyncService(supabase);
  const preview = await service.preview({ tenantId });
  return NextResponse.json({ preview });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { action?: string };
  if (body.action !== "apply") {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const tenantId = await requireAdminTenantId(supabase);
  const service = new LightspeedReconciliationSyncService(supabase);
  const result = await service.apply({ tenantId });
  return NextResponse.json(result);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:jest:unit -- tests/unit/lightspeed-sync-api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/lightspeed/sync/route.ts tests/unit/lightspeed-sync-api.test.ts
git commit -m "feat: add lightspeed reconciliation sync api"
```

### Task 5: Add admin inventory preview/apply UI

**Files:**
- Modify: `app/admin/inventory/client.tsx`

- [ ] **Step 1: Add the UI state and preview request helper**

```ts
const [syncPreview, setSyncPreview] = useState<ReconciliationPreview | null>(null);
const [syncLoading, setSyncLoading] = useState(false);
const [syncDialogOpen, setSyncDialogOpen] = useState(false);

const loadSyncPreview = async () => {
  setSyncLoading(true);
  try {
    const response = await fetch("/api/admin/lightspeed/sync");
    const payload = await response.json();
    if (!response.ok) {
      showToast(payload?.error || "Failed to preview sync.", "error");
      return;
    }
    setSyncPreview(payload.preview);
    setSyncDialogOpen(true);
  } finally {
    setSyncLoading(false);
  }
};
```

- [ ] **Step 2: Add the `Sync Inventory` button beside `Export Inventory`**

```tsx
<button
  type="button"
  onClick={() => {
    void loadSyncPreview();
  }}
  className="inline-flex items-center gap-2 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
>
  <RotateCcw className="h-4 w-4" />
  Sync Inventory
</button>
```

- [ ] **Step 3: Add the preview/apply dialog**

```tsx
<ConfirmDialog
  isOpen={syncDialogOpen}
  title="Sync website inventory to Lightspeed?"
  description={
    syncPreview
      ? `Imports: ${syncPreview.importCount}, Archives: ${syncPreview.archiveCount}, Conflicts: ${syncPreview.conflictCount}.`
      : "Loading preview..."
  }
  confirmLabel="Apply Sync"
  onConfirm={() => {
    void applySync();
  }}
  onCancel={() => setSyncDialogOpen(false)}
/>;
```

- [ ] **Step 4: Implement apply action and refresh**

```ts
const applySync = async () => {
  setSyncLoading(true);
  try {
    const response = await fetch("/api/admin/lightspeed/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "apply" }),
    });
    const payload = await response.json();
    if (!response.ok) {
      showToast(payload?.error || "Failed to apply sync.", "error");
      return;
    }
    showToast(
      `Sync complete. Imported ${payload.importedCount}, archived ${payload.archivedCount}, conflicts ${payload.conflictCount}.`,
      "success",
    );
    setSyncDialogOpen(false);
    setSyncPreview(null);
    await loadProducts(filtersRef.current);
  } finally {
    setSyncLoading(false);
  }
};
```

- [ ] **Step 5: Run verification**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/admin/inventory/client.tsx
git commit -m "feat: add admin lightspeed reconciliation sync ui"
```

### Task 6: Final verification

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

Run this flow in admin inventory:

```text
1. Click Sync Inventory
2. Confirm preview shows imports/archives/conflicts
3. Click Apply Sync
4. Verify imported products appear in active inventory
5. Verify website-only products moved to Archived
6. Verify Lightspeed data was not modified
```

- [ ] **Step 4: Commit**

```bash
git add app/admin/inventory/client.tsx app/api/admin/lightspeed/sync/route.ts src/services/lightspeed-reconciliation-sync-service.ts tests/unit/lightspeed-reconciliation-sync-service.test.ts tests/unit/lightspeed-sync-api.test.ts
git commit -m "feat: add manual lightspeed reconciliation sync"
```
