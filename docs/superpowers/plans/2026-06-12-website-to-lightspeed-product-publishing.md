# Website To Lightspeed Product Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow website products to be saved without images while making used-product outbound Lightspeed sync retry once with `Product Name - SKU` when Lightspeed rejects the clean product name as a duplicate.

**Architecture:** Keep the current route-level create, update, and delete sync wiring unchanged. Make the schema and form accept empty image arrays, then localize the Lightspeed naming change inside `LightspeedProductSyncService` by adding duplicate-name classification plus a used-only retry path for create and update.

**Tech Stack:** Next.js App Router, TypeScript, Zod, Jest

---

## File Structure

- Modify `src/lib/validation/product.ts`
  - Relax `images` validation from minimum-one to zero-or-more for the shared create/update payload schema.
- Modify `src/components/inventory/ProductForm.tsx`
  - Remove the submit-time no-image guard and update the helper copy so images are optional.
- Modify `src/services/lightspeed-product-sync-service.ts`
  - Add duplicate-name detection and used-only retry logic around outbound Lightspeed create/update calls.
- Modify `tests/unit/lightspeed-product-sync-service.test.ts`
  - Add retry-path coverage for used products and assert no retry for new products.
- Create `tests/unit/product-validation.test.ts`
  - Add direct schema coverage for empty-image acceptance.

### Task 1: Make Images Optional In Website Product Validation

**Files:**
- Modify: `src/lib/validation/product.ts`
- Create: `tests/unit/product-validation.test.ts`

- [ ] **Step 1: Write the failing validation test**

```ts
import { productCreateSchema } from "@/lib/validation/product";

describe("productCreateSchema", () => {
  it("accepts a product payload with no images", () => {
    const result = productCreateSchema.safeParse({
      name: "Jordan 3 Retro",
      category: "sneakers",
      condition: "used",
      size_type: "shoe",
      description: "No photos yet",
      shipping_price_cents: 1500,
      variants: [
        {
          sku: "123456",
          size_label: "10M / 11.5W",
          sale_price_cents: 25000,
          stock: 1,
          unit_cost_cents: 12000,
        },
      ],
      images: [],
      tags: [],
      excluded_auto_tag_keys: [],
    });

    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/product-validation.test.ts`

Expected: FAIL because `images` currently uses `.min(1)`.

- [ ] **Step 3: Make the schema accept zero images**

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
    images: z.array(imageSchema),
    go_live_at: z.string().datetime({ offset: true }).optional(),
    tags: z.array(tagSchema).optional(),
    excluded_auto_tag_keys: z.array(z.string()).optional(),
  })
  .strict();
```

- [ ] **Step 4: Run the validation test to verify it passes**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/product-validation.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the validation change**

```bash
git add src/lib/validation/product.ts tests/unit/product-validation.test.ts
git commit -m "test: allow products without images"
```

### Task 2: Remove The Product Form No-Image Submit Block

**Files:**
- Modify: `src/components/inventory/ProductForm.tsx`

- [ ] **Step 1: Identify the current failing guard and helper copy**

Look for both of these exact fragments in `src/components/inventory/ProductForm.tsx`:

```ts
throw new Error("Please add at least one product image.");
```

```tsx
Add at least one image. Tap any thumbnail to set as primary.
```

- [ ] **Step 2: Remove the no-image submit guard**

Delete the throw so submission no longer fails when `images.length === 0`.

Expected resulting area:

```ts
const payload: ProductCreateInput = {
  name: parseResult?.name?.trim() || titleRaw.trim(),
  brand_override_id: brandOverrideId,
  model_override_id: modelOverrideId,
  category,
  condition,
  size_type: sizeType,
  description: description.trim() || undefined,
  shipping_price_cents: resolvedShippingPriceCents,
  variants: normalizedVariants,
  images: normalizeImages(images),
  go_live_at: resolvedGoLiveAt,
  tags: allTags.map((tag) => ({
    label: tag.label,
    group_key: tag.group_key,
  })),
  excluded_auto_tag_keys: excludedAutoTagKeys,
};
```

- [ ] **Step 3: Update the helper copy to match the new rule**

Replace the current text with:

```tsx
Images are optional. Tap any thumbnail to set as primary.
```

- [ ] **Step 4: Run targeted unit coverage to verify the schema-backed form payload still passes**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/product-validation.test.ts tests/unit/product-service.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the form change**

```bash
git add src/components/inventory/ProductForm.tsx
git commit -m "feat: allow product form submission without images"
```

### Task 3: Add Used-Only Duplicate-Name Retry To Lightspeed Product Sync

**Files:**
- Modify: `src/services/lightspeed-product-sync-service.ts`
- Modify: `tests/unit/lightspeed-product-sync-service.test.ts`

- [ ] **Step 1: Write the failing used-product create retry test**

Add this test to `tests/unit/lightspeed-product-sync-service.test.ts`:

```ts
it("retries a used-product create with sku in the name after a duplicate-name error", async () => {
  getConnectionByTenantMock.mockResolvedValue({
    syncEnabled: true,
    domainPrefix: "demo-store",
    accessToken: "token",
  });

  getByIdMock.mockResolvedValue({
    id: "product-1",
    name: "Air Jordan 3",
    condition: "used",
    brand: "Jordan",
    model: "Jordan 3",
    description: "desc",
    is_active: true,
    variants: [
      {
        id: "variant-1",
        sku: "123456",
        size_label: "10M / 11.5W",
        sale_price_cents: 20000,
      },
    ],
  });

  getByVariantIdMock.mockResolvedValue(null);
  getByExternalSkuMock.mockResolvedValue(null);
  createProductMock
    .mockRejectedValueOnce(new Error("Product with this name already exists"))
    .mockResolvedValueOnce({ data: { id: "ls-family-1" } });

  const service = new LightspeedProductSyncService({} as never);

  await service.syncWebsiteProduct("product-1", {
    tenantId: "tenant-1",
    source: "create",
  });

  expect(createProductMock).toHaveBeenCalledTimes(2);
  expect(createProductMock).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({ name: "Air Jordan 3" }),
  );
  expect(createProductMock).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({ name: expect.stringMatching(/^Air Jordan 3 - /) }),
  );
});
```

- [ ] **Step 2: Write the failing new-product no-retry test**

Add this test to the same file:

```ts
it("does not retry a new-product create when Lightspeed rejects a duplicate name", async () => {
  getConnectionByTenantMock.mockResolvedValue({
    syncEnabled: true,
    domainPrefix: "demo-store",
    accessToken: "token",
  });

  getByIdMock.mockResolvedValue({
    id: "product-1",
    name: "Air Jordan 3",
    condition: "new",
    brand: "Jordan",
    model: "Jordan 3",
    description: "desc",
    is_active: true,
    variants: [
      {
        id: "variant-1",
        sku: "123456",
        size_label: "10M / 11.5W",
        sale_price_cents: 20000,
      },
    ],
  });

  getByVariantIdMock.mockResolvedValue(null);
  getByExternalSkuMock.mockResolvedValue(null);
  createProductMock.mockRejectedValueOnce(
    new Error("Product with this name already exists"),
  );

  const service = new LightspeedProductSyncService({} as never);

  await expect(
    service.syncWebsiteProduct("product-1", {
      tenantId: "tenant-1",
      source: "create",
    }),
  ).rejects.toThrow("Product with this name already exists");

  expect(createProductMock).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 3: Write the failing used-product update retry test**

Add this test to the same file:

```ts
it("retries a used-product update with sku in the name after a duplicate-name error", async () => {
  getConnectionByTenantMock.mockResolvedValue({
    syncEnabled: true,
    domainPrefix: "demo-store",
    accessToken: "token",
  });

  getByIdMock.mockResolvedValue({
    id: "product-1",
    name: "Air Jordan 3",
    condition: "used",
    brand: "Jordan",
    model: "Jordan 3",
    description: "desc",
    is_active: true,
    variants: [
      {
        id: "variant-1",
        sku: "123456",
        size_label: "10M / 11.5W",
        sale_price_cents: 20000,
      },
    ],
  });

  getByVariantIdMock.mockResolvedValue({
    id: "link-1",
    variant_id: "variant-1",
    lightspeed_family_id: "ls-family-1",
    lightspeed_product_id: "ls-family-1",
    lightspeed_variant_id: null,
    external_sku: "N-JDN-J03-BH-01",
  });
  getByExternalSkuMock.mockResolvedValue(null);
  updateProductMock
    .mockRejectedValueOnce(new Error("Product with this name already exists"))
    .mockResolvedValueOnce({});

  const service = new LightspeedProductSyncService({} as never);

  await service.syncWebsiteProduct("product-1", {
    tenantId: "tenant-1",
    source: "update",
  });

  expect(updateProductMock).toHaveBeenCalledTimes(2);
  expect(updateProductMock).toHaveBeenNthCalledWith(
    1,
    "ls-family-1",
    expect.objectContaining({
      common: expect.objectContaining({ name: "Air Jordan 3" }),
    }),
  );
  expect(updateProductMock).toHaveBeenNthCalledWith(
    2,
    "ls-family-1",
    expect.objectContaining({
      common: expect.objectContaining({
        name: expect.stringMatching(/^Air Jordan 3 - /),
      }),
    }),
  );
});
```

- [ ] **Step 4: Run the sync tests to verify they fail before implementation**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/lightspeed-product-sync-service.test.ts`

Expected: FAIL because the service currently writes only once with the clean name.

- [ ] **Step 5: Add duplicate-name classification and retry helpers**

Extend `src/services/lightspeed-product-sync-service.ts` with focused helpers like:

```ts
private isDuplicateNameError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error);

  const normalized = message.toLowerCase();
  return normalized.includes("name already exists");
}

private buildFallbackLightspeedName(productName: string, sku: string | null) {
  const cleanName = productName.trim();
  const cleanSku = sku?.trim() || null;
  if (!cleanSku) {
    return null;
  }
  return `${cleanName} - ${cleanSku}`;
}
```

- [ ] **Step 6: Route create through a single retryable write path**

Refactor the create branch so it first builds the clean payload, then retries once for used products if the error is duplicate-name related.

Target shape:

```ts
const payload = this.buildCreatePayload(product, resolvedVariants, sizeAttributeId);

const response = await this.createProductWithDuplicateNameRetry({
  client,
  product,
  resolvedVariants,
  sizeAttributeId,
  payload,
});
```

With a helper shaped like:

```ts
private async createProductWithDuplicateNameRetry(input: {
  client: LightspeedClient;
  product: Exclude<Awaited<ReturnType<ProductRepository["getById"]>>, null>;
  resolvedVariants: Array<{
    externalSku: string;
    variant: { size_label: string; sale_price_cents: number };
  }>;
  sizeAttributeId: string | null;
  payload: LightspeedCreateProductPayload;
}) {
  try {
    return await input.client.createProduct(input.payload);
  } catch (error) {
    const fallbackSku = input.resolvedVariants[0]?.externalSku ?? null;
    const fallbackName =
      input.product.condition === "used"
        ? this.buildFallbackLightspeedName(input.product.name, fallbackSku)
        : null;

    if (!fallbackName || !this.isDuplicateNameError(error)) {
      throw error;
    }

    return input.client.createProduct(
      this.buildCreatePayload(
        input.product,
        input.resolvedVariants,
        input.sizeAttributeId,
        fallbackName,
      ),
    );
  }
}
```

- [ ] **Step 7: Route update through a matching retryable write path**

Adjust `buildUpdatePayload` to accept an optional override name and wrap the update call in a used-only retry helper.

Target shape:

```ts
private buildUpdatePayload(
  product: Exclude<Awaited<ReturnType<ProductRepository["getById"]>>, null>,
  sku: string | null,
  nameOverride?: string | null,
): LightspeedUpdateProductPayload {
  const titleDisplay = nameOverride?.trim() || product.name.trim();

  return {
    common: {
      name: titleDisplay,
      description: product.description ?? undefined,
      is_active: product.is_active,
    },
    details: sku
      ? {
          sku,
          product_codes: [{ code: sku, type: "CUSTOM" }],
        }
      : undefined,
  };
}
```

And use it through:

```ts
await this.updateProductWithDuplicateNameRetry({
  client,
  product,
  lightspeedFamilyId,
  sku: resolvedVariants[0]?.externalSku ?? null,
});
```

- [ ] **Step 8: Allow create payloads to accept an optional outbound name override**

Adjust `buildCreatePayload` so it can use a passed `nameOverride` while preserving the current clean-name behavior by default.

Target shape:

```ts
private buildCreatePayload(
  product: Exclude<Awaited<ReturnType<ProductRepository["getById"]>>, null>,
  resolvedVariants: Array<{
    externalSku: string;
    variant: { size_label: string; sale_price_cents: number };
  }>,
  sizeAttributeId: string | null,
  nameOverride?: string | null,
): LightspeedCreateProductPayload {
  const titleDisplay = nameOverride?.trim() || product.name.trim();

  if (resolvedVariants.length === 1) {
    return {
      name: titleDisplay,
      description: product.description ?? undefined,
      is_active: product.is_active,
      sku: resolvedVariants[0].externalSku,
      product_codes: [{ code: resolvedVariants[0].externalSku, type: "CUSTOM" }],
      price_including_tax: resolvedVariants[0].variant.sale_price_cents / 100,
    };
  }

  return {
    name: titleDisplay,
    description: product.description ?? undefined,
    is_active: product.is_active,
    variants: resolvedVariants.map((entry) => ({
      name: titleDisplay,
      sku: entry.externalSku,
      product_codes: [{ code: entry.externalSku, type: "CUSTOM" }],
      price_including_tax: entry.variant.sale_price_cents / 100,
      is_active: product.is_active,
      variant_definitions: this.mappingService.buildVariantDefinitions([
        {
          attributeId: sizeAttributeId ?? "size",
          name: "Size",
          value: entry.variant.size_label,
        },
      ]),
    })),
  };
}
```

- [ ] **Step 9: Run the targeted sync tests to verify the retry behavior passes**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/lightspeed-product-sync-service.test.ts`

Expected: PASS

- [ ] **Step 10: Run the full targeted suite for touched behavior**

Run: `npm run test:jest:unit -- --runTestsByPath tests/unit/product-validation.test.ts tests/unit/lightspeed-product-sync-service.test.ts tests/unit/product-service.test.ts tests/unit/lightspeed-mapping-service.test.ts`

Expected: PASS

- [ ] **Step 11: Run lint on the touched files**

Run: `npx eslint src/lib/validation/product.ts src/components/inventory/ProductForm.tsx src/services/lightspeed-product-sync-service.ts tests/unit/product-validation.test.ts tests/unit/lightspeed-product-sync-service.test.ts`

Expected: no lint errors

- [ ] **Step 12: Commit the sync retry work**

```bash
git add src/services/lightspeed-product-sync-service.ts tests/unit/lightspeed-product-sync-service.test.ts src/components/inventory/ProductForm.tsx src/lib/validation/product.ts tests/unit/product-validation.test.ts
git commit -m "feat: handle used product lightspeed name conflicts"
```
