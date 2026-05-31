# Lightspeed Preview Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Lightspeed sync preview into a paged, trustworthy review workflow with full totals, grouped `new` products, single-SKU `preowned` products, parser-derived metadata, shipping normalization, and image-complete side-by-side cards.

**Architecture:** Extend the existing Lightspeed preview flow in three layers: a richer `LightspeedClient` snapshot/count API, a website-shaped normalization pipeline inside `LightspeedMappingService` and `LightspeedSyncPreviewService`, and a cleaner `LightspeedSyncPanel` modal that renders totals, top/bottom paging, and grouped comparison cards. Reuse the existing `ProductTitleParserService`, `ShippingDefaultsService`, and tag-building logic so preview reflects real website behavior instead of a sync-only approximation.

**Tech Stack:** Next.js App Router, TypeScript, Supabase repositories/services, existing catalog parser services, Jest, ESLint, Prettier.

---

## File Structure

- Modify: `src/lib/lightspeed/types.ts`
- Modify: `src/lib/lightspeed/client.ts`
- Modify: `src/lib/validation/admin.ts`
- Modify: `src/repositories/lightspeed-sync-runs-repo.ts`
- Modify: `app/api/admin/lightspeed/sync/preview/route.ts`
- Modify: `src/services/lightspeed-mapping-service.ts`
- Modify: `src/services/lightspeed-sync-preview-service.ts`
- Modify: `src/components/admin/inventory/LightspeedSyncPanel.tsx`
- Modify: `tests/unit/lightspeed-mapping-service.test.ts`
- Modify: `tests/unit/lightspeed-sync-preview-service.test.ts`
- Modify: `tests/unit/lightspeed-sync-preview-api.test.ts`

### Task 1: Add Count-Aware Lightspeed Snapshot Types And API Pagination

**Files:**
- Modify: `src/lib/lightspeed/types.ts`
- Modify: `src/lib/lightspeed/client.ts`
- Modify: `src/lib/validation/admin.ts`
- Modify: `app/api/admin/lightspeed/sync/preview/route.ts`
- Modify: `tests/unit/lightspeed-sync-preview-api.test.ts`

- [ ] **Step 1: Write the failing API contract test for pagination and totals-ready preview input**

```ts
it("passes override mode and paging to previewSync", async () => {
  mockPreviewSync.mockResolvedValue({
    syncRunId: "run-1",
    pagination: {
      page: 2,
      pageSize: 50,
      hasNextPage: true,
      hasPreviousPage: true,
      totalProducts: 2000,
      totalPages: 40,
      totalGroupedItems: 1600,
      totalChanges: 812,
    },
    summary: {
      added: 12,
      modified: 8,
      archived: 1,
      conflicts: 2,
      skipped: 0,
    },
    groups: {
      added: [],
      modified: [],
      archived: [],
      conflicts: [],
      skipped: [],
    },
  });

  await POST(
    new Request("http://localhost/api/admin/lightspeed/sync/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sourceOfTruth: "lightspeed_full_override",
        page: 2,
        pageSize: 50,
      }),
    }) as NextRequest,
  );

  expect(mockPreviewSync).toHaveBeenCalledWith({
    tenantId: "tenant-1",
    startedBy: "user-1",
    sourceOfTruth: "lightspeed_full_override",
    page: 2,
    pageSize: 50,
  });
});
```

- [ ] **Step 2: Run the API test to verify the current route contract is incomplete**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/lightspeed-sync-preview-api.test.ts`
Expected: FAIL because the preview payload does not yet include total-count pagination fields.

- [ ] **Step 3: Expand the Lightspeed list response types to support count-driven pagination**

```ts
export type LightspeedListResponse<T> = {
  data?: T[] | T | null;
  count?: number | null;
  pagination?: {
    page?: number | null;
    page_size?: number | null;
    next?: string | null;
    next_page?: number | null;
    previous?: string | null;
    previous_page?: number | null;
    total?: number | null;
    total_pages?: number | null;
  } | null;
  version?: {
    min?: number | null;
    max?: number | null;
  } | null;
};
```

- [ ] **Step 4: Update the client to return a count-aware page snapshot**

```ts
async listProducts(page = 1, pageSize = 50) {
  const response = await this.request(
    `/products?page=${page}&page_size=${pageSize}`,
  );
  const payload =
    (await response.json()) as LightspeedListResponse<LightspeedRemoteProduct>;

  const products = Array.isArray(payload.data)
    ? payload.data
    : payload.data
      ? [payload.data]
      : [];

  const totalProducts =
    payload.pagination?.total ??
    payload.count ??
    (typeof payload.data === "object" && products.length < pageSize
      ? (page - 1) * pageSize + products.length
      : null);

  const totalPages =
    payload.pagination?.total_pages ??
    (totalProducts ? Math.max(1, Math.ceil(totalProducts / pageSize)) : null);

  return {
    products,
    page,
    pageSize,
    hasNextPage:
      typeof totalPages === "number" ? page < totalPages : products.length === pageSize,
    hasPreviousPage: page > 1,
    totalProducts,
    totalPages,
  };
}
```

- [ ] **Step 5: Expand preview input validation and route forwarding**

```ts
export const lightspeedSyncPreviewSchema = z
  .object({
    sourceOfTruth: z.enum([
      "lightspeed_inventory",
      "website_inventory",
      "lightspeed_full_override",
      "website_full_override",
    ]),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();
```

```ts
const preview = await previewService.previewSync({
  tenantId,
  startedBy: session.user.id,
  sourceOfTruth: parsed.data.sourceOfTruth,
  page: parsed.data.page,
  pageSize: parsed.data.pageSize,
});
```

- [ ] **Step 6: Run the API test again**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/lightspeed-sync-preview-api.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/lightspeed/types.ts src/lib/lightspeed/client.ts src/lib/validation/admin.ts app/api/admin/lightspeed/sync/preview/route.ts tests/unit/lightspeed-sync-preview-api.test.ts
git commit -m "feat: add count-aware lightspeed preview paging"
```

### Task 2: Build Website-Shaped Lightspeed Normalization With Parser, Tags, Shipping, Price, Cost, And Images

**Files:**
- Modify: `src/services/lightspeed-mapping-service.ts`
- Modify: `src/lib/lightspeed/types.ts`
- Modify: `tests/unit/lightspeed-mapping-service.test.ts`

- [ ] **Step 1: Write the failing normalization test for parser-shaped preview fields**

```ts
it("normalizes remote products into website preview fields", () => {
  const normalized = service.normalizeRemoteProducts([
    {
      id: "ls-1",
      name: "A MA MANIERE JORDAN 5 - P-JDN-J05-9H-27",
      description: "<p>OG BOX</p>",
      sku: "P-JDN-J05-9H-27",
      brand_name: "Jordan",
      product_category: "Sneakers",
      variant_option_one_name: "Condition",
      variant_option_one_value: "preowned",
      variant_option_two_name: "Size",
      variant_option_two_value: "9.5M / 11W",
      inventory_Main_Outlet: 1,
      supply_price: 120,
      price_including_tax: 160,
      images: [{ url: "https://example.com/j5.jpg" }],
    } as never,
  ]);

  expect(normalized[0]).toEqual(
    expect.objectContaining({
      cleanName: "A MA MANIERE JORDAN 5",
      condition: "used",
      sizeLabel: "9.5M / 11W",
      priceCents: 16000,
      costCents: 12000,
      imageUrls: ["https://example.com/j5.jpg"],
    }),
  );
});
```

- [ ] **Step 2: Run the mapping test to verify missing fields**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/lightspeed-mapping-service.test.ts`
Expected: FAIL because normalized products do not yet include price/cost-aware website snapshot fields.

- [ ] **Step 3: Extend remote and normalized types with preview-critical fields**

```ts
export type LightspeedRemoteProduct = {
  id: string;
  name?: string | null;
  description?: string | null;
  sku?: string | null;
  brand_name?: string | null;
  product_category?: string | null;
  product_category_name?: string | null;
  supply_price?: number | string | null;
  price_including_tax?: number | string | null;
  retail_price?: number | string | null;
  inventory?: LightspeedRemoteInventoryLevel[] | null;
  images?: LightspeedRemoteImage[] | null;
  // existing fields omitted for brevity
};

export type NormalizedLightspeedProduct = {
  lightspeedProductId: string;
  externalSku: string;
  rawName: string;
  cleanName: string;
  description: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  condition: "new" | "used";
  sizeLabel: string;
  priceCents: number | null;
  costCents: number | null;
  stock: number;
  isActive: boolean;
  isDeleted: boolean;
  imageUrls: string[];
};
```

- [ ] **Step 4: Add extraction helpers for size, price, cost, and cleaner empty description handling**

```ts
private extractMoneyCents(value: number | string | null | undefined) {
  const amount = this.toNumber(value);
  return amount === null ? null : Math.round(amount * 100);
}

private extractPriceCents(record: LightspeedRemoteProduct, parent?: LightspeedRemoteProduct) {
  return (
    this.extractMoneyCents(record.price_including_tax) ??
    this.extractMoneyCents(record.retail_price) ??
    this.extractMoneyCents(parent?.price_including_tax) ??
    this.extractMoneyCents(parent?.retail_price)
  );
}

private extractCostCents(record: LightspeedRemoteProduct, parent?: LightspeedRemoteProduct) {
  return (
    this.extractMoneyCents(record.supply_price) ??
    this.extractMoneyCents(parent?.supply_price)
  );
}
```

- [ ] **Step 5: Return a richer normalized object from `normalizeRemoteProduct`**

```ts
return {
  lightspeedProductId: record.id,
  externalSku,
  rawName,
  cleanName: this.cleanWebsiteName(rawName),
  description: record.description?.trim() || parent?.description?.trim() || null,
  brand: record.brand_name?.trim() || parent?.brand_name?.trim() || null,
  model: null,
  category,
  condition,
  sizeLabel: this.extractSizeLabel(record, parent),
  priceCents: this.extractPriceCents(record, parent),
  costCents: this.extractCostCents(record, parent),
  stock: this.extractStock(record, parent),
  isActive: this.toBoolean(record.is_active ?? record.active ?? parent?.is_active ?? parent?.active),
  isDeleted: Boolean(record.deleted_at ?? parent?.deleted_at),
  imageUrls: this.extractImages(record, parent),
};
```

- [ ] **Step 6: Add tests for object categories, price/cost extraction, and image preservation**

```ts
expect(normalized[0]?.category).toBe("clothing");
expect(normalized[0]?.priceCents).toBe(16000);
expect(normalized[0]?.costCents).toBe(12000);
expect(normalized[0]?.imageUrls).toEqual(["https://example.com/j5.jpg"]);
```

- [ ] **Step 7: Run the mapping tests**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/lightspeed-mapping-service.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/services/lightspeed-mapping-service.ts src/lib/lightspeed/types.ts tests/unit/lightspeed-mapping-service.test.ts
git commit -m "feat: enrich lightspeed normalization fields"
```

### Task 3: Add Grouped Preview Records, Parser Confidence Conflicts, Shipping Defaults, And Global Totals

**Files:**
- Modify: `src/services/lightspeed-sync-preview-service.ts`
- Modify: `src/repositories/lightspeed-sync-runs-repo.ts`
- Modify: `tests/unit/lightspeed-sync-preview-service.test.ts`

- [ ] **Step 1: Write the failing preview service test for grouped new products and totals**

```ts
expect(preview.pagination).toEqual({
  page: 1,
  pageSize: 50,
  hasNextPage: true,
  hasPreviousPage: false,
  totalProducts: 2000,
  totalPages: 40,
  totalGroupedItems: 1600,
  totalChanges: 812,
});

expect(preview.groups.added).toEqual(
  expect.arrayContaining([
    expect.objectContaining({
      action: "create_website_product",
      payload: expect.objectContaining({
        preview: expect.objectContaining({
          proposed: expect.objectContaining({
            title: "A MA MANIERE JORDAN 3",
            variants: expect.arrayContaining([
              expect.objectContaining({
                sizeLabel: "11.5M / 13W",
                priceCents: 22000,
                costCents: 16000,
                stock: 1,
              }),
            ]),
          }),
        }),
      }),
    }),
  ]),
);
```

- [ ] **Step 2: Run the preview service test to verify grouped totals are missing**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/lightspeed-sync-preview-service.test.ts`
Expected: FAIL because the service still returns flat item snapshots without grouped totals and parser/shipping enrichment.

- [ ] **Step 3: Expand preview snapshot types to support grouped cards**

```ts
type PreviewVariantSnapshot = {
  sizeLabel: string;
  priceCents: number | null;
  costCents: number | null;
  stock: number;
  sku: string;
};

type PreviewProductSnapshot = {
  title: string;
  imageUrl: string | null;
  condition: string;
  stock: number;
  priceCents: number | null;
  costCents: number | null;
  sku: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  description: string | null;
  shippingCostCents: number | null;
  tags: Array<{ label: string; groupKey: string }>;
  variants: PreviewVariantSnapshot[];
  status: "active" | "archived";
};
```

- [ ] **Step 4: Add parser/shipping/tag enrichment helpers to the preview service**

```ts
private async resolveWebsiteProjection(remote: NormalizedLightspeedProduct) {
  const parsed = await this.parser.parseTitle({
    titleRaw: remote.cleanName,
    category: this.toWebsiteCategory(remote.category),
    tenantId: this.tenantId,
  });

  const shippingDefaults = await this.shippingDefaultsService.list(this.tenantId);
  const shippingCostCents =
    shippingDefaults.find((entry) => entry.category === parsed.nameCategory)?.shipping_cost_cents ??
    null;

  return {
    parsed,
    shippingCostCents,
    tags: buildSizeTags([
      {
        size_type: this.inferSizeType(remote.sizeLabel),
        size_label: remote.sizeLabel,
        stock: remote.stock,
      },
    ]),
  };
}
```

- [ ] **Step 5: Group normalized remote products by website-style identity**

```ts
private buildGroupingKey(remote: NormalizedLightspeedProduct, parsed: TitleParseResult) {
  if (remote.condition === "used") {
    return `sku:${remote.externalSku}`;
  }

  return [
    "family",
    parsed.brand.label,
    parsed.model.label ?? parsed.name,
    remote.category ?? "unknown",
    remote.condition,
  ].join(":");
}
```

- [ ] **Step 6: Route low-confidence parser results to conflicts**

```ts
if (
  parsed.brand.confidence < 0.85 ||
  (remote.category === "sneakers" && parsed.model.confidence < 0.85)
) {
  groups.conflicts.push({
    changeType: "conflicts",
    action: "review_parser_resolution",
    entityType: "product",
    entityKey: remote.externalSku,
    payload: {
      externalSku: remote.externalSku,
      rawName: remote.rawName,
      cleanName: remote.cleanName,
      brandCandidate: parsed.brand,
      modelCandidate: parsed.model,
    },
  });
  continue;
}
```

- [ ] **Step 7: Return page totals and full-sync totals in the preview response**

```ts
return {
  syncRunId: run.id,
  summary,
  groups,
  pagination: {
    page: remoteResult.page,
    pageSize: remoteResult.pageSize,
    hasNextPage: remoteResult.hasNextPage,
    hasPreviousPage: remoteResult.hasPreviousPage,
    totalProducts: remoteResult.totalProducts ?? normalizedRemote.length,
    totalPages:
      remoteResult.totalPages ??
      Math.max(1, Math.ceil((remoteResult.totalProducts ?? normalizedRemote.length) / remoteResult.pageSize)),
    totalGroupedItems,
    totalChanges: summary.added + summary.modified + summary.archived + summary.conflicts,
  },
};
```

- [ ] **Step 8: Run the preview service tests**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/lightspeed-sync-preview-service.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/services/lightspeed-sync-preview-service.ts src/repositories/lightspeed-sync-runs-repo.ts tests/unit/lightspeed-sync-preview-service.test.ts
git commit -m "feat: add grouped preview normalization and totals"
```

### Task 4: Polish The Modal UI With Totals, Top/Bottom Pagination, Spacing, And No JSON

**Files:**
- Modify: `src/components/admin/inventory/LightspeedSyncPanel.tsx`

- [ ] **Step 1: Write the failing UI expectation as a checklist in code comments before editing**

```tsx
// UI requirements for this task:
// 1. Remove raw JSON preview blocks
// 2. Add total products / total changes / total pages text
// 3. Add bottom pagination controls
// 4. Increase padding around header, controls, and cards
// 5. Render brand, model, cost, shipping, tags, and grouped variant matrix
```

- [ ] **Step 2: Add total-aware preview response typing and mode labels**

```ts
type PreviewResponse = {
  syncRunId: string;
  pagination: {
    page: number;
    pageSize: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    totalProducts: number | null;
    totalPages: number | null;
    totalGroupedItems: number | null;
    totalChanges: number | null;
  };
  summary: {
    added: number;
    modified: number;
    archived: number;
    conflicts: number;
    skipped: number;
  };
  groups: PreviewGroups;
};
```

- [ ] **Step 3: Replace the tight header block with a more padded totals workspace**

```tsx
<div className="space-y-4 border-b border-zinc-800 px-6 py-6">
  <div className="space-y-2">
    <h2 className="text-xl font-bold text-white">Lightspeed Sync Preview</h2>
    <p className="max-w-4xl text-sm leading-7 text-zinc-400">
      Build a dry-run reconciliation grouped by change type before applying any inventory sync changes.
    </p>
  </div>

  {preview ? (
    <div className="grid gap-3 md:grid-cols-4">
      <div className="rounded border border-zinc-800/70 bg-zinc-900/40 p-4">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Total Lightspeed Products</p>
        <p className="mt-2 text-2xl font-semibold text-white">{preview.pagination.totalProducts ?? "—"}</p>
      </div>
      <div className="rounded border border-zinc-800/70 bg-zinc-900/40 p-4">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Total Proposed Changes</p>
        <p className="mt-2 text-2xl font-semibold text-white">{preview.pagination.totalChanges ?? "—"}</p>
      </div>
      <div className="rounded border border-zinc-800/70 bg-zinc-900/40 p-4">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Current Page</p>
        <p className="mt-2 text-2xl font-semibold text-white">{preview.pagination.page}</p>
      </div>
      <div className="rounded border border-zinc-800/70 bg-zinc-900/40 p-4">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Total Pages</p>
        <p className="mt-2 text-2xl font-semibold text-white">{preview.pagination.totalPages ?? "—"}</p>
      </div>
    </div>
  ) : null}
</div>
```

- [ ] **Step 4: Add bottom pagination and remove the raw JSON block**

```tsx
function PreviewPagination({
  preview,
  isLoading,
  onPrevious,
  onNext,
}: {
  preview: PreviewResponse;
  isLoading: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded border border-zinc-800/70 bg-zinc-900/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-zinc-300">
        Page {preview.pagination.page} of {preview.pagination.totalPages ?? "—"} ·
        Showing {preview.pagination.pageSize} remote products per page
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={onPrevious} disabled={isLoading || !preview.pagination.hasPreviousPage}>
          Previous Page
        </button>
        <button type="button" onClick={onNext} disabled={isLoading || !preview.pagination.hasNextPage}>
          Next Page
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Render grouped variant matrix and richer fields on the cards**

```tsx
{product.model ? (
  <p className="text-xs text-zinc-400">Model: {product.model}</p>
) : null}

<dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-zinc-300">
  <div>
    <dt className="text-zinc-500">Price</dt>
    <dd className="mt-0.5 font-semibold text-white">{formatPreviewPrice(product.priceCents)}</dd>
  </div>
  <div>
    <dt className="text-zinc-500">Cost</dt>
    <dd className="mt-0.5 font-semibold text-white">{formatPreviewPrice(product.costCents)}</dd>
  </div>
  <div>
    <dt className="text-zinc-500">Stock</dt>
    <dd className="mt-0.5 font-semibold text-white">{product.stock}</dd>
  </div>
  <div>
    <dt className="text-zinc-500">Shipping</dt>
    <dd className="mt-0.5 font-semibold text-white">{formatPreviewPrice(product.shippingCostCents)}</dd>
  </div>
</dl>

{product.variants.length > 1 ? (
  <div className="rounded border border-zinc-800/70 bg-zinc-950/60 p-3">
    {product.variants.map((variant) => (
      <div key={variant.sku} className="grid grid-cols-4 gap-2 text-xs text-zinc-300">
        <span>{variant.sizeLabel}</span>
        <span>{formatPreviewPrice(variant.priceCents)}</span>
        <span>{formatPreviewPrice(variant.costCents)}</span>
        <span>{variant.stock}</span>
      </div>
    ))}
  </div>
) : null}
```

- [ ] **Step 6: Run targeted checks**

Run: `npm run typecheck`
Expected: PASS

Run: `npx eslint src/components/admin/inventory/LightspeedSyncPanel.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/inventory/LightspeedSyncPanel.tsx
git commit -m "feat: polish lightspeed preview workspace"
```

### Task 5: Final Verification Pass For Preview-Only Upgrade

**Files:**
- Modify: `tests/unit/lightspeed-mapping-service.test.ts`
- Modify: `tests/unit/lightspeed-sync-preview-service.test.ts`
- Modify: `tests/unit/lightspeed-sync-preview-api.test.ts`

- [ ] **Step 1: Add explicit regression coverage for the agreed rules**

```ts
it("routes low-confidence parser results to conflicts", async () => {
  expect(preview.groups.conflicts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        action: "review_parser_resolution",
      }),
    ]),
  );
});

it("keeps preowned as a single-SKU card and groups new products by family", async () => {
  expect(preview.groups.added[0]?.payload).toEqual(
    expect.objectContaining({
      preview: expect.objectContaining({
        proposed: expect.objectContaining({
          condition: "new",
          variants: expect.any(Array),
        }),
      }),
    }),
  );
});
```

- [ ] **Step 2: Run the focused unit suite**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/lightspeed-mapping-service.test.ts tests/unit/lightspeed-sync-preview-service.test.ts tests/unit/lightspeed-sync-preview-api.test.ts`
Expected: PASS

- [ ] **Step 3: Run the final static checks**

Run: `npm run typecheck`
Expected: PASS

Run: `npx eslint src/lib/lightspeed/client.ts src/lib/lightspeed/types.ts src/lib/validation/admin.ts src/repositories/lightspeed-sync-runs-repo.ts app/api/admin/lightspeed/sync/preview/route.ts src/services/lightspeed-mapping-service.ts src/services/lightspeed-sync-preview-service.ts src/components/admin/inventory/LightspeedSyncPanel.tsx tests/unit/lightspeed-mapping-service.test.ts tests/unit/lightspeed-sync-preview-service.test.ts tests/unit/lightspeed-sync-preview-api.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/lightspeed/client.ts src/lib/lightspeed/types.ts src/lib/validation/admin.ts src/repositories/lightspeed-sync-runs-repo.ts app/api/admin/lightspeed/sync/preview/route.ts src/services/lightspeed-mapping-service.ts src/services/lightspeed-sync-preview-service.ts src/components/admin/inventory/LightspeedSyncPanel.tsx tests/unit/lightspeed-mapping-service.test.ts tests/unit/lightspeed-sync-preview-service.test.ts tests/unit/lightspeed-sync-preview-api.test.ts
git commit -m "test: verify lightspeed preview normalization workflow"
```

## Self-Review

### Spec coverage

- totals and total pages: covered in Task 1 and Task 3
- more padding and UI cleanup: covered in Task 4
- bottom pagination: covered in Task 4
- remove JSON: covered in Task 4
- title/brand/model/category/condition/description/size/price/cost/stock/images: covered in Task 2 through Task 4
- default shipping normalization: covered in Task 3 and Task 4
- parser/autotagging: covered in Task 3
- `new` grouping vs `preowned` single-SKU: covered in Task 3 and Task 5
- image-complete preview: covered in Task 2 and Task 4

### Placeholder scan

- No `TBD`/`TODO`
- Each task includes concrete files, code targets, and commands
- Verification commands are explicit

### Type consistency

- Preview modes use the same four-value union throughout
- Pagination fields are named consistently as `totalProducts`, `totalPages`, `totalGroupedItems`, `totalChanges`
- Grouped card snapshots use `priceCents`, `costCents`, `stock`, `variants`

