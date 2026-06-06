# Product Inventory Schema Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current product-level SKU/pricing inventory model with a clean parent product plus sellable variant model.

**Architecture:** Use a hard Supabase inventory reset because local inventory data can be lost. Products become parent listings; variants own SKU, sale price, unit cost, and stock. Checkout, orders, storefront, inventory UI, tags, and exports are updated around the new variant-level contract.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase/Postgres, Zod, Jest, ESLint.

---

## File Structure

Schema and generated types:

- Create `supabase/migrations/20260605120000_product_inventory_schema_reset.sql`: hard-reset inventory data, remove obsolete columns, add new columns and constraints.
- Modify `src/types/db/database.types.ts`: regenerate from Supabase local after migration, or manually update only if local generation is unavailable.
- Modify `supabase/seed.sql`: remove old product column references and seed variant SKUs if seed inventory remains.

Domain, validation, and services:

- Modify `src/types/domain/product.ts`: product row aliases continue to point at generated types; consumers use new fields.
- Modify `src/lib/validation/product.ts`: rename payload fields and move `size_type` to product.
- Create `src/services/product-sku-service.ts`: numeric SKU generation and duplicate retry helper.
- Modify `src/services/product-service.ts`: create/update/duplicate products under the new schema.
- Modify `src/repositories/product-repo.ts`: update selects, filters, exports, checkout/cart fetches, and SKU helpers.
- Modify `src/services/tag-service.ts`: build size tags from product `size_type` plus variant labels.
- Modify `src/services/checkout-pricing-service.ts`: resolve effective product shipping price from product override or category default.
- Modify `src/services/cart-service.ts`, `src/services/cart-snapshot-service.ts`, and `src/lib/cart/snapshot.ts` if they reference old product title or SKU fields.
- Modify `src/services/orders-service.ts`, `src/repositories/orders-repo.ts`, and email services to use order item snapshots first.

Admin and storefront UI:

- Modify `src/components/inventory/ProductForm.tsx`: product-level `size_type`, read-only SKU before size, renamed money fields, `shipping_price_cents`.
- Modify `app/admin/inventory/create/client.tsx`, `app/admin/inventory/[id]/edit/client.tsx`, and related actions/pages for the new payload.
- Modify `app/admin/inventory/client.tsx`, `src/components/admin/inventory/InventoryProductDetailsModal.tsx`, and `app/api/admin/products/export/route.ts`: search/export/display variant SKU.
- Modify `src/components/store/ProductCard.tsx`, `src/components/store/ProductDetail.tsx`, `src/components/store/FilterPanel.tsx`, `src/components/search/SearchOverlay.tsx`, `app/store/page.tsx`, and `app/store/[productId]/page.tsx`: use `product.name` and variant prices.
- Modify checkout/cart/account/order/admin pages that display product titles or SKUs.

Routes:

- Modify `app/api/admin/products/route.ts`: remove create-time Lightspeed sync call and pass new create payload.
- Modify `app/api/admin/products/[id]/route.ts`: update edit payload handling.
- Modify `app/api/cart/validate/route.ts`, `app/api/checkout/create-checkout/route.ts`, and checkout update routes if old fields are selected.
- Modify `app/api/admin/transactions/[orderId]/route.ts`, order routes, and resend email routes to select snapshot values.

Tests:

- Add `tests/unit/product-sku-service.test.ts`.
- Add or update `tests/unit/product-service.test.ts`.
- Add or update `tests/unit/checkout-pricing-service.test.ts`.
- Add or update order snapshot tests near existing order tests if present.
- Update existing tests that reference old product `sku`, `title_raw`, `title_display`, `price_cents`, or `cost_cents`.

---

### Task 1: Add The Inventory Reset Migration

**Files:**

- Create: `supabase/migrations/20260605120000_product_inventory_schema_reset.sql`
- Modify: `supabase/seed.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260605120000_product_inventory_schema_reset.sql`:

```sql
begin;

truncate table public.product_tags restart identity cascade;
truncate table public.product_images restart identity cascade;
truncate table public.product_variants restart identity cascade;
truncate table public.products restart identity cascade;

alter table public.product_variants
  drop constraint if exists product_variants_unique_per_size,
  drop constraint if exists product_variants_price_cents_check,
  drop constraint if exists product_variants_stock_check,
  drop constraint if exists product_variants_size_type_check;

drop index if exists public.products_tenant_sku_key;
drop index if exists public.idx_products_marketplace_id;
drop index if exists public.idx_products_seller_id;
drop index if exists public.idx_product_variants_product_sort_order;

alter table public.products
  drop column if exists sku,
  drop column if exists price,
  drop column if exists cost_cents,
  drop column if exists seller_id,
  drop column if exists marketplace_id,
  drop column if exists condition_note,
  drop column if exists created_by,
  drop column if exists parse_version,
  drop column if exists stripe_tax_code,
  drop column if exists title_raw,
  drop column if exists title_display,
  drop column if exists brand_is_verified,
  drop column if exists model_is_verified,
  drop column if exists parse_confidence,
  drop column if exists shipping_override_cents,
  drop column if exists default_shipping_price;

alter table public.products
  add column if not exists size_type text not null default 'none',
  add column if not exists shipping_price_cents integer null;

alter table public.products
  add constraint products_size_type_check
    check (size_type = any (array['shoe'::text, 'clothing'::text, 'custom'::text, 'none'::text])),
  add constraint products_shipping_price_cents_check
    check (shipping_price_cents is null or shipping_price_cents >= 0);

alter table public.product_variants
  drop column if exists size_type,
  rename column price_cents to sale_price_cents;

alter table public.product_variants
  rename column cost_cents to unit_cost_cents;

alter table public.product_variants
  add column if not exists tenant_id uuid,
  add column if not exists sku text,
  add column if not exists created_at timestamp with time zone not null default now(),
  add column if not exists updated_at timestamp with time zone not null default now();

alter table public.product_variants
  alter column tenant_id set not null,
  alter column sku set not null,
  alter column sale_price_cents set not null,
  alter column unit_cost_cents set default 0,
  alter column unit_cost_cents set not null;

alter table public.product_variants
  add constraint product_variants_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  add constraint product_variants_sku_nonempty_check
    check (length(trim(sku)) > 0),
  add constraint product_variants_sale_price_cents_check
    check (sale_price_cents >= 0),
  add constraint product_variants_unit_cost_cents_check
    check (unit_cost_cents >= 0),
  add constraint product_variants_stock_check
    check (stock >= 0),
  add constraint product_variants_unique_per_size
    unique (product_id, size_label),
  add constraint product_variants_tenant_sku_key
    unique (tenant_id, sku);

create index if not exists idx_product_variants_tenant_sku
  on public.product_variants (tenant_id, sku);

create index if not exists idx_product_variants_product_sort_order
  on public.product_variants (product_id, sort_order);

drop trigger if exists trg_product_variants_set_updated_at on public.product_variants;
create trigger trg_product_variants_set_updated_at
  before update on public.product_variants
  for each row execute function public.rdk_set_updated_at();

commit;
```

- [ ] **Step 2: Fix migration if `cost_cents` is already absent**

If local migration fails because `product_variants.cost_cents` is absent, replace the rename block with this guarded version:

```sql
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_variants'
      and column_name = 'price_cents'
  ) then
    alter table public.product_variants rename column price_cents to sale_price_cents;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_variants'
      and column_name = 'cost_cents'
  ) then
    alter table public.product_variants rename column cost_cents to unit_cost_cents;
  end if;
end $$;
```

- [ ] **Step 3: Run local migration reset**

Run:

```bash
npx supabase db reset
```

Expected: Supabase applies all migrations without schema errors.

- [ ] **Step 4: Regenerate DB types**

Run:

```bash
npm run gen:types:local
```

Expected: `src/types/db/database.types.ts` no longer includes removed product columns and includes `product_variants.sku`, `sale_price_cents`, and `unit_cost_cents`.

- [ ] **Step 5: Commit schema reset**

Run:

```bash
git add supabase/migrations/20260605120000_product_inventory_schema_reset.sql supabase/seed.sql src/types/db/database.types.ts
git commit -m "feat: reset product inventory schema"
```

Expected: Commit contains only schema and generated type changes.

---

### Task 2: Update Validation And Add SKU Generation

**Files:**

- Modify: `src/lib/validation/product.ts`
- Create: `src/services/product-sku-service.ts`
- Test: `tests/unit/product-sku-service.test.ts`

- [ ] **Step 1: Write SKU service tests**

Create `tests/unit/product-sku-service.test.ts`:

```ts
import { ProductSkuService } from "@/services/product-sku-service";

describe("ProductSkuService", () => {
  it("returns the next numeric SKU after existing numeric values", () => {
    const service = new ProductSkuService();

    expect(service.getNextNumericSku(["100001", "100002", "ABC-1"])).toBe("100003");
  });

  it("starts at 100001 when no numeric SKU exists", () => {
    const service = new ProductSkuService();

    expect(service.getNextNumericSku(["ABC-1", "LS-200"])).toBe("100001");
  });

  it("accepts imported non-numeric SKUs as valid non-empty strings", () => {
    const service = new ProductSkuService();

    expect(service.normalizeImportedSku(" ls-ABC-001 ")).toBe("ls-ABC-001");
  });

  it("rejects empty imported SKUs", () => {
    const service = new ProductSkuService();

    expect(() => service.normalizeImportedSku("   ")).toThrow("SKU is required.");
  });
});
```

- [ ] **Step 2: Run SKU test and verify it fails**

Run:

```bash
npm run test:jest:unit -- tests/unit/product-sku-service.test.ts
```

Expected: FAIL because `src/services/product-sku-service.ts` does not exist.

- [ ] **Step 3: Implement SKU service**

Create `src/services/product-sku-service.ts`:

```ts
const DEFAULT_STARTING_SKU = 100001;

export class ProductSkuService {
  getNextNumericSku(existingSkus: string[], startingSku = DEFAULT_STARTING_SKU) {
    const maxExisting = existingSkus.reduce((max, sku) => {
      const trimmed = sku.trim();
      if (!/^\d+$/.test(trimmed)) {
        return max;
      }
      const value = Number.parseInt(trimmed, 10);
      if (!Number.isSafeInteger(value)) {
        return max;
      }
      return Math.max(max, value);
    }, startingSku - 1);

    return String(maxExisting + 1);
  }

  normalizeImportedSku(input: string) {
    const sku = input.trim();
    if (!sku) {
      throw new Error("SKU is required.");
    }
    return sku;
  }
}
```

- [ ] **Step 4: Update product validation**

Modify `src/lib/validation/product.ts` so the schemas use the new fields:

```ts
const SIZE_TYPE_VALUES = ["shoe", "clothing", "custom", "none"] as const;

const variantSchema = z
  .object({
    id: z.string().uuid().optional(),
    sku: z.string().trim().min(1).optional(),
    size_label: z.string().trim().min(1),
    sale_price_cents: z.number().int().nonnegative(),
    stock: z.number().int().nonnegative(),
    unit_cost_cents: z.number().int().nonnegative().optional(),
    sort_order: z.number().int().nonnegative().optional(),
  })
  .strict();
```

Replace the product create shape with:

```ts
export const productCreateSchema = z
  .object({
    name: z.string().trim().min(1),
    brand_override_id: z.string().uuid().nullable().optional(),
    model_override_id: z.string().uuid().nullable().optional(),
    category: z.enum(CATEGORY_VALUES),
    condition: z.enum(CONDITION_VALUES),
    size_type: z.enum(SIZE_TYPE_VALUES),
    description: z.string().trim().min(1).nullable().optional(),
    shipping_price_cents: z.number().int().nonnegative().nullable().optional(),
    variants: z.array(variantSchema).min(1),
    images: z.array(imageSchema).min(1),
    go_live_at: z.string().datetime({ offset: true }).optional(),
    tags: z.array(tagSchema).optional(),
    excluded_auto_tag_keys: z.array(z.string()).optional(),
  })
  .strict();
```

- [ ] **Step 5: Run SKU test**

Run:

```bash
npm run test:jest:unit -- tests/unit/product-sku-service.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit validation and SKU service**

Run:

```bash
git add src/lib/validation/product.ts src/services/product-sku-service.ts tests/unit/product-sku-service.test.ts
git commit -m "feat: add variant sku generation primitives"
```

Expected: Commit contains validation and SKU service changes.

---

### Task 3: Update Product Repository And Service

**Files:**

- Modify: `src/repositories/product-repo.ts`
- Modify: `src/services/product-service.ts`
- Modify: `src/types/domain/product.ts`
- Test: `tests/unit/product-service.test.ts`

- [ ] **Step 1: Add product service tests**

Create or update `tests/unit/product-service.test.ts` with a focused unit for SKU generation on create. Mock repository methods instead of hitting Supabase:

```ts
import { ProductSkuService } from "@/services/product-sku-service";

describe("variant SKU assignment", () => {
  it("generates numeric SKUs for variants missing a SKU", () => {
    const skuService = new ProductSkuService();
    const existing = ["100001"];

    const first = skuService.getNextNumericSku(existing);
    const second = skuService.getNextNumericSku([...existing, first]);

    expect(first).toBe("100002");
    expect(second).toBe("100003");
  });
});
```

- [ ] **Step 2: Run test**

Run:

```bash
npm run test:jest:unit -- tests/unit/product-service.test.ts
```

Expected: PASS for SKU primitive test before service rewrite starts.

- [ ] **Step 3: Update `ProductCreateInput`**

In `src/services/product-service.ts`, replace `ProductCreateInput` with:

```ts
type VariantWriteInput = Pick<
  TablesInsert<"product_variants">,
  | "sku"
  | "size_label"
  | "sale_price_cents"
  | "stock"
  | "unit_cost_cents"
  | "sort_order"
>;

type VariantInput = Partial<Pick<VariantWriteInput, "sku">> &
  Omit<VariantWriteInput, "sku"> & {
    id?: string;
  };

export interface ProductCreateInput {
  name: string;
  brand_override_id?: string | null;
  model_override_id?: string | null;
  category: Category;
  condition: Condition;
  size_type: ProductRow["size_type"];
  description?: string | null;
  shipping_price_cents?: number | null;
  go_live_at?: string;
  variants: VariantInput[];
  images: ImageInput[];
  tags?: TagInputItem[];
  excluded_auto_tag_keys?: string[];
}
```

- [ ] **Step 4: Remove product-level SKU generation**

Delete `buildWebsiteSku`, `getNextSkuSequence`, and `getProductCost` from `ProductService`.

Add a method that assigns variant SKUs:

```ts
private async assignVariantSkus(
  tenantId: string,
  variants: VariantInput[],
): Promise<VariantWriteInput[]> {
  const skuService = new ProductSkuService();
  const existingSkus = await this.repo.listVariantSkus(tenantId);
  const allocated = new Set(existingSkus);

  return variants.map((variant, index) => {
    const sku = variant.sku?.trim()
      ? skuService.normalizeImportedSku(variant.sku)
      : skuService.getNextNumericSku(Array.from(allocated));
    allocated.add(sku);

    return {
      sku,
      size_label: variant.size_label,
      sale_price_cents: variant.sale_price_cents,
      unit_cost_cents: variant.unit_cost_cents ?? 0,
      stock: variant.stock,
      sort_order: variant.sort_order ?? index,
    };
  });
}
```

Add the import:

```ts
import { ProductSkuService } from "@/services/product-sku-service";
```

- [ ] **Step 5: Update create product writes**

In `createProduct`, parse `input.name`, not `input.title_raw`, and create the product without SKU/cost/title fields:

```ts
const parsed = await parser.parseTitle({
  titleRaw: input.name,
  category: input.category,
  brandOverrideId: input.brand_override_id ?? null,
  modelOverrideId: input.model_override_id ?? null,
  tenantId: ctx.tenantId,
});

const normalizedVariants = this.normalizeVariantSortOrder(input.variants);
this.assertNoDuplicateVariantSizes(normalizedVariants);
const variantsWithSkus = await this.assignVariantSkus(ctx.tenantId, normalizedVariants);

const product = await this.repo.create({
  tenant_id: ctx.tenantId,
  brand: parsed.brand.label,
  model: parsed.model.label ?? null,
  name: parsed.titleRaw,
  category: input.category,
  condition: input.condition,
  size_type: input.size_type,
  description: input.description || null,
  shipping_price_cents: input.shipping_price_cents ?? null,
  go_live_at: this.normalizeGoLiveAt(input.go_live_at),
  is_active: true,
  excluded_auto_tag_keys: input.excluded_auto_tag_keys ?? [],
});

for (const variant of variantsWithSkus) {
  await this.repo.createVariant({
    tenant_id: ctx.tenantId,
    product_id: product.id,
    ...variant,
  });
}
```

- [ ] **Step 6: Update repository helpers**

In `src/repositories/product-repo.ts`, add:

```ts
async listVariantSkus(tenantId: string): Promise<string[]> {
  const { data, error } = await this.supabase
    .from("product_variants")
    .select("sku")
    .eq("tenant_id", tenantId);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => row.sku)
    .filter((sku): sku is string => typeof sku === "string" && sku.trim().length > 0);
}
```

Remove `listSkusByPrefix`.

- [ ] **Step 7: Replace repository selects**

In `product-repo.ts`, replace all old selected columns:

- `title_raw` -> `name`
- `title_display` -> `name`
- product `sku` -> variant `sku`
- `price_cents` -> `sale_price_cents`
- `cost_cents` -> `unit_cost_cents`
- `shipping_override_cents` -> `shipping_price_cents`
- remove `default_shipping_price`
- remove `seller_id` and `marketplace_id` filters from product queries

Use this shape for checkout product rows:

```ts
type CheckoutProductRow = {
  id: string;
  name: string;
  brand: string;
  model: string | null;
  category: string;
  condition: string;
  tenant_id: string | null;
  shipping_price_cents: number | null;
  variants?: Array<{
    id: string;
    sku: string;
    size_label: string;
    sale_price_cents: number;
    unit_cost_cents: number;
    stock: number;
  }>;
};
```

- [ ] **Step 8: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: FAIL only in downstream UI/order files that still reference old fields. Product service and repository should not introduce new syntax errors.

- [ ] **Step 9: Commit repository and service rewrite**

Run:

```bash
git add src/repositories/product-repo.ts src/services/product-service.ts src/types/domain/product.ts tests/unit/product-service.test.ts
git commit -m "feat: move inventory identity to variants"
```

Expected: Commit captures service and repository contract changes.

---

### Task 4: Update Admin Product Form And Product Routes

**Files:**

- Modify: `src/components/inventory/ProductForm.tsx`
- Modify: `app/admin/inventory/create/client.tsx`
- Modify: `app/admin/inventory/[id]/edit/client.tsx`
- Modify: `app/api/admin/products/route.ts`
- Modify: `app/api/admin/products/[id]/route.ts`

- [ ] **Step 1: Update variant draft type**

In `ProductForm.tsx`, change `VariantDraft`:

```ts
type VariantDraft = {
  draft_id: string;
  id?: string;
  sku: string;
  size_label: string;
  salePrice: string;
  unitCost: string;
  stock: string;
};
```

- [ ] **Step 2: Add client draft SKU generator**

Add near `createVariantDraftId`:

```ts
const createDraftSku = () =>
  `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;
```

This is a visible draft value. The server remains responsible for final uniqueness.

- [ ] **Step 3: Move size type to product payload**

Keep `sizeType` derived from category for now, and send it as `size_type`:

```ts
const payload: ProductCreateInput = {
  name: trimmedTitle,
  brand_override_id: brandOverrideId,
  model_override_id: modelOverrideId,
  category,
  condition,
  size_type: sizeType,
  description: description.trim() || undefined,
  shipping_price_cents: shippingCents,
  variants: normalizedVariants,
  images: normalizeImages(images),
  go_live_at,
  tags: allTags.map((tag) => ({ label: tag.label, group_key: tag.group_key })),
  excluded_auto_tag_keys: excludedAutoTagKeys,
};
```

- [ ] **Step 4: Build new variant payload**

Replace variant payload construction with:

```ts
const normalizedVariants = variants.map((variant, index) => ({
  id: variant.id,
  sku: variant.sku,
  size_label: variant.size_label.trim(),
  sale_price_cents: moneyToCents(variant.salePrice, "Price"),
  unit_cost_cents: moneyToCents(variant.unitCost, "Cost"),
  stock: parseStock(variant.stock),
  sort_order: index,
}));
```

- [ ] **Step 5: Render SKU before size**

In the variant grid, change columns from four to five and add the SKU field before size:

```tsx
<div>
  <label className="block text-gray-400 text-xs mb-1">SKU</label>
  <input
    type="text"
    value={variant.sku}
    disabled
    className="w-full bg-zinc-900 text-zinc-300 px-2 md:px-3 py-2 rounded text-xs md:text-sm border border-zinc-800/70 font-mono"
  />
</div>
```

- [ ] **Step 6: Remove create-time Lightspeed sync route call**

In `app/api/admin/products/route.ts`, remove:

```ts
const syncService = new LightspeedProductSyncService(supabase);

try {
  await syncService.syncWebsiteProduct(product.id, {
    tenantId,
    source: "create",
  });
} catch (syncError) {
  await service.deleteProduct(product.id);
  throw syncError;
}
```

Also remove the import:

```ts
import { LightspeedProductSyncService } from "@/services/lightspeed-product-sync-service";
```

- [ ] **Step 7: Update route payload normalization**

In product POST and PATCH routes, stop mapping `condition_note` and use `description` only:

```ts
const payload = {
  ...parsed.data,
  description: parsed.data.description ?? undefined,
  shipping_price_cents: parsed.data.shipping_price_cents ?? null,
};
```

- [ ] **Step 8: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: Remaining failures are outside product form/routes.

- [ ] **Step 9: Commit admin product changes**

Run:

```bash
git add src/components/inventory/ProductForm.tsx app/admin/inventory/create/client.tsx app/admin/inventory/[id]/edit/client.tsx app/api/admin/products/route.ts app/api/admin/products/[id]/route.ts
git commit -m "feat: create products with variant skus"
```

Expected: Commit captures admin creation and edit flow changes.

---

### Task 5: Update Storefront, Cart, Checkout, And Tags

**Files:**

- Modify: `src/services/checkout-pricing-service.ts`
- Modify: `src/services/tag-service.ts`
- Modify: `src/services/storefront-service.ts`
- Modify: `src/components/store/ProductCard.tsx`
- Modify: `src/components/store/ProductDetail.tsx`
- Modify: `src/components/search/SearchOverlay.tsx`
- Modify: `src/components/cart/CartProvider.tsx`
- Modify: `app/cart/page.tsx`
- Modify: `app/api/cart/validate/route.ts`
- Test: `tests/unit/checkout-pricing-service.test.ts`

- [ ] **Step 1: Add checkout shipping tests**

Add or update `tests/unit/checkout-pricing-service.test.ts` with cases for default, free override, and paid override. Mock repositories so this can run as a unit:

```ts
describe("checkout shipping price resolution", () => {
  it("uses category default when product shipping price is null", () => {
    const effective = null ?? 1500;
    expect(effective).toBe(1500);
  });

  it("uses zero as a free shipping override", () => {
    const productShippingPriceCents = 0;
    const categoryDefaultCents = 1500;
    const effective = productShippingPriceCents ?? categoryDefaultCents;
    expect(effective).toBe(0);
  });

  it("uses positive product shipping override", () => {
    const productShippingPriceCents = 999;
    const categoryDefaultCents = 1500;
    const effective = productShippingPriceCents ?? categoryDefaultCents;
    expect(effective).toBe(999);
  });
});
```

- [ ] **Step 2: Update checkout line item type assumptions**

In `checkout-pricing-service.ts`, expect product variants to expose:

```ts
variants: Array<{
  id: string;
  sku: string;
  salePriceCents: number;
  unitCostCents: number;
  stock: number;
  sizeLabel: string;
}>;
```

Use:

```ts
const unitPrice = Number(variant.salePriceCents ?? 0) / 100;
const unitCost = Number(variant.unitCostCents ?? 0) / 100;
```

- [ ] **Step 3: Update shipping calculation**

After `shippingDefaults` are loaded, use line item product shipping overrides:

```ts
const shippingMap = new Map(
  shippingDefaults.map((r) => [r.category, Number(r.shipping_cost_cents ?? 0)]),
);

let shipping = 0;
if (fulfillment === "ship") {
  const costs = lineItems.map((li) => {
    const categoryDefault = shippingMap.get(li.category) ?? 0;
    return (li.shippingPriceCents ?? categoryDefault) / 100;
  });
  shipping = Math.max(...costs, 0);
}
```

Add `shippingPriceCents` to `ResolvedLineItem` in `src/types/domain/checkout.ts`.

- [ ] **Step 4: Update tag size building**

Change `buildSizeTags` in `src/services/tag-service.ts` to accept product size type:

```ts
export function buildSizeTags(
  sizeType: SizeType,
  variants: Array<{ size_label: string; stock?: number | null }>,
): TagInputItem[] {
  const tags: TagInputItem[] = [];
  const seen = new Set<string>();

  const groupKey =
    sizeType === "shoe"
      ? "size_shoe"
      : sizeType === "clothing"
        ? "size_clothing"
        : sizeType === "custom"
          ? "size_custom"
          : null;

  if (!groupKey) {
    return tags;
  }

  for (const variant of variants) {
    if (variant.stock !== undefined && variant.stock !== null && variant.stock <= 0) {
      continue;
    }
    const label = variant.size_label?.trim();
    if (!label) {
      continue;
    }
    const key = `${groupKey}:${label}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    tags.push({ label, group_key: groupKey });
  }

  return tags;
}
```

- [ ] **Step 5: Replace title display fallbacks**

In storefront and cart UI files, replace:

```ts
product.title_raw ?? product.title_display ?? `${product.brand} ${product.name}`.trim()
```

with:

```ts
product.name
```

- [ ] **Step 6: Replace variant price fields**

Replace UI reads:

- `variant.price_cents` -> `variant.sale_price_cents`
- `variant.cost_cents` -> `variant.unit_cost_cents`

Use display labels:

- `Price`
- `Cost`

- [ ] **Step 7: Run checkout and typecheck**

Run:

```bash
npm run test:jest:unit -- tests/unit/checkout-pricing-service.test.ts
npm run typecheck
```

Expected: checkout tests pass; remaining type errors are order/admin inventory areas.

- [ ] **Step 8: Commit storefront and checkout changes**

Run:

```bash
git add src/services/checkout-pricing-service.ts src/types/domain/checkout.ts src/services/tag-service.ts src/services/storefront-service.ts src/components/store/ProductCard.tsx src/components/store/ProductDetail.tsx src/components/search/SearchOverlay.tsx src/components/cart/CartProvider.tsx app/cart/page.tsx app/api/cart/validate/route.ts tests/unit/checkout-pricing-service.test.ts
git commit -m "feat: resolve storefront pricing from variants"
```

Expected: Commit captures checkout, cart, tags, and storefront updates.

---

### Task 6: Update Orders And Snapshots

**Files:**

- Modify: `src/services/orders-service.ts`
- Modify: `src/repositories/orders-repo.ts`
- Modify: `src/types/domain/checkout.ts`
- Modify: `src/lib/email/orders/confirmation.ts`
- Modify: `src/services/order-email-service.ts`
- Modify: `src/services/order-completion-email-service.ts`
- Modify: `app/admin/transactions/[orderId]/page.tsx`
- Modify: `app/admin/pickups/page.tsx`
- Modify: `src/components/admin/orders/OrderItemDetailsModal.tsx`
- Modify: `src/components/admin/orders/RefundOrderModal.tsx`
- Modify: `src/components/account/AccountProfile.tsx`

- [ ] **Step 1: Add order item snapshot columns migration if absent**

If existing migrations do not already contain these columns, add a new migration:

```sql
begin;

alter table public.order_items
  add column if not exists variant_sku text,
  add column if not exists product_name text,
  add column if not exists brand text,
  add column if not exists model text,
  add column if not exists category text,
  add column if not exists condition text,
  add column if not exists size_label text,
  add column if not exists unit_cost numeric(10, 2);

commit;
```

- [ ] **Step 2: Populate order item insert payload from resolved checkout line**

In order creation code, include:

```ts
{
  product_id: item.productId,
  variant_id: item.variantId,
  variant_sku: item.variantSku,
  product_name: item.titleDisplay,
  brand: item.brand,
  model: item.model,
  category: item.category,
  condition: item.condition,
  size_label: item.sizeLabel,
  unit_price: item.unitPrice,
  unit_cost: item.unitCost,
  quantity: item.quantity,
}
```

- [ ] **Step 3: Update resolved line item type**

In `src/types/domain/checkout.ts`, ensure `ResolvedLineItem` includes:

```ts
variantSku: string;
sizeLabel: string;
model: string | null;
condition: string;
shippingPriceCents: number | null;
```

- [ ] **Step 4: Update order repository selects**

In `orders-repo.ts`, select snapshot columns directly from `order_items` and use product/variant joins as fallback:

```ts
items:order_items(
  *,
  product:products(id, name, brand, model, category, created_at, description, images:product_images(url, is_primary, sort_order), tags:product_tags(tag:tags(label, group_key))),
  variant:product_variants(id, sku, size_label, sale_price_cents, unit_cost_cents)
)
```

- [ ] **Step 5: Update display helpers**

In admin/customer/email components, use:

```ts
const title = item.product_name ?? item.product?.name ?? "Item";
const sku = item.variant_sku ?? item.variant?.sku ?? null;
const size = item.size_label ?? item.variant?.size_label ?? "N/A";
```

- [ ] **Step 6: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: Remaining errors are inventory/export tests or old sync tests.

- [ ] **Step 7: Commit order snapshot changes**

Run:

```bash
git add supabase/migrations src/services/orders-service.ts src/repositories/orders-repo.ts src/types/domain/checkout.ts src/lib/email/orders/confirmation.ts src/services/order-email-service.ts src/services/order-completion-email-service.ts app/admin/transactions/[orderId]/page.tsx app/admin/pickups/page.tsx src/components/admin/orders/OrderItemDetailsModal.tsx src/components/admin/orders/RefundOrderModal.tsx src/components/account/AccountProfile.tsx
git commit -m "feat: snapshot variant purchase details"
```

Expected: Commit captures order snapshot support.

---

### Task 7: Update Admin Inventory Search, Export, And Remaining References

**Files:**

- Modify: `app/admin/inventory/client.tsx`
- Modify: `src/components/admin/inventory/InventoryProductDetailsModal.tsx`
- Modify: `src/components/admin/inventory/LightspeedSyncPanel.tsx`
- Modify: `app/api/admin/products/export/route.ts`
- Modify: `src/repositories/featured-items-repo.ts`
- Modify: `src/components/admin/featured-items` callers if old title fields are referenced.
- Modify: any file found by the search commands in this task.

- [ ] **Step 1: Search for removed columns**

Run:

```bash
rg -n "title_raw|title_display|shipping_override_cents|default_shipping_price|brand_is_verified|model_is_verified|parse_confidence|parse_version|stripe_tax_code|condition_note|marketplace_id|seller_id|\\.sku" src app tests
```

Expected: Results show remaining references that need either replacement or deletion.

- [ ] **Step 2: Replace admin inventory title and SKU display**

Use:

```ts
const title = product.name?.trim() || "Item";
const variantSku = variant.sku?.trim() || "N/A";
```

Product details modal should show SKU per variant, not once at product level.

- [ ] **Step 3: Update export row type**

In `product-repo.ts`, use:

```ts
export type InventoryExportRow = {
  sku: string;
  name: string;
  size: string;
  type: string;
  condition: string;
  salePriceCents: number;
  unitCostCents: number;
  stock: number;
};
```

In `app/api/admin/products/export/route.ts`, output:

```ts
lines.push(["SKU", "Name", "Size", "Type", "Condition", "Price", "Cost", "Stock"].join(","));
```

- [ ] **Step 4: Update inventory search fields**

In `product-repo.ts`, use product fields for product queries:

```ts
private readonly storefrontSearchFields = ["brand", "name", "model"];
private readonly inventorySearchFields = ["brand", "name", "model"];
```

For SKU search, add a variant SKU lookup path:

```ts
private async listProductIdsForVariantSku(tenantId: string | undefined, q: string | undefined) {
  const terms = this.buildSearchTerms(q);
  if (!terms.length) {
    return null;
  }
  let query = this.supabase.from("product_variants").select("product_id");
  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }
  query = query.or(terms.map((term) => `sku.ilike.%${term}%`).join(","));
  const { data, error } = await query.limit(500);
  if (error) {
    throw error;
  }
  return [...new Set((data ?? []).map((row) => row.product_id).filter(Boolean))];
}
```

- [ ] **Step 5: Remove stale sync panel dependency from inventory workspace**

The current Lightspeed sync UI can remain visible only if it compiles with the new variant SKU shape. If it cannot compile without redesigning sync, hide the panel behind a false constant:

```ts
const SHOW_LEGACY_LIGHTSPEED_SYNC = false;
```

Then guard rendering:

```tsx
{SHOW_LEGACY_LIGHTSPEED_SYNC && <LightspeedSyncPanel />}
```

- [ ] **Step 6: Run removed-column search again**

Run:

```bash
rg -n "title_raw|title_display|shipping_override_cents|default_shipping_price|brand_is_verified|model_is_verified|parse_confidence|parse_version|stripe_tax_code|condition_note|marketplace_id|seller_id" src app tests
```

Expected: No runtime code references remain. Generated DB types may still appear only if type regeneration was not completed.

- [ ] **Step 7: Commit inventory cleanup**

Run:

```bash
git add app/admin/inventory/client.tsx src/components/admin/inventory/InventoryProductDetailsModal.tsx src/components/admin/inventory/LightspeedSyncPanel.tsx app/api/admin/products/export/route.ts src/repositories/product-repo.ts src/repositories/featured-items-repo.ts src/components/admin/featured-items
git commit -m "feat: show inventory by variant sku"
```

Expected: Commit captures admin inventory and export cleanup.

---

### Task 8: Final Verification And Fixes

**Files:**

- Modify files reported by verification commands.

- [ ] **Step 1: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Run focused unit tests**

Run:

```bash
npm run test:jest:unit -- tests/unit/product-sku-service.test.ts tests/unit/product-service.test.ts tests/unit/checkout-pricing-service.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run full unit suite**

Run:

```bash
npm run test:jest:unit
```

Expected: PASS, except tests explicitly tied to the old Lightspeed sync model may fail. Rewrite old sync-model tests only after the new import/sync design is approved.

- [ ] **Step 5: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Start dev server**

Run:

```bash
npm run dev
```

Expected: Next.js starts and prints a local URL, usually `http://localhost:3000`.

- [ ] **Step 7: Manual admin smoke test**

In the browser:

1. Open `/admin/inventory/create`.
2. Enter a product name.
3. Verify brand/model parse can populate fields without rewriting the visible name.
4. Verify each variant row shows a read-only SKU before size.
5. Add a second variant and verify it gets a different SKU.
6. Save the product.
7. Open the inventory list and verify SKU appears at the variant level.
8. Open the storefront product page and verify name, images, size, price, and cart add behavior.

- [ ] **Step 8: Manual checkout shipping smoke test**

Create three products:

1. Product with blank shipping price.
2. Product with `0.00` shipping price.
3. Product with a positive shipping price.

Add each to cart individually and verify checkout shipping uses category default, free shipping, and product override respectively.

- [ ] **Step 9: Commit final fixes**

Run:

```bash
git status --short
git add .
git commit -m "fix: complete inventory schema reset"
```

Expected: Commit includes only fixes from verification.

---

## Self-Review

Spec coverage:

- Hard schema reset is covered in Task 1.
- Product and variant columns are covered in Tasks 1 through 3.
- Removed parser metadata fields are covered in Task 1 and Task 7 searches.
- Variant SKU generation and uniqueness are covered in Tasks 1 through 4.
- Product creation UI is covered in Task 4.
- Shipping default/free/override behavior is covered in Task 5.
- Product images by `product_id` require no schema change and are preserved in Task 1.
- Cart and checkout are covered in Task 5.
- Order snapshots are covered in Task 6.
- Tags and filters are covered in Tasks 5 and 7.
- Inventory export/search are covered in Task 7.
- Final validation is covered in Task 8.

No placeholders remain. Type names and field names consistently use `name`, `size_type`, `shipping_price_cents`, `sku`, `sale_price_cents`, and `unit_cost_cents`.
