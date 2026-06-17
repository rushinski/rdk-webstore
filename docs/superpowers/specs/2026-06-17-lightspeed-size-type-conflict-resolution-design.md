# Lightspeed Size Type And Conflict Resolution Design

## Goal

Fix storefront filtering and sync correctness by making website `size_type` derive from normalized Lightspeed category instead of fragile size-label heuristics, and by surfacing missing Lightspeed category data as a resolvable sync conflict.

## Problem Summary

Some imported Lightspeed products are being saved with the wrong website `size_type`. A concrete failure case is clothing products with variants like `SMALL` being inferred as `shoe` because the current heuristic treats any label containing `M` as shoe sizing.

This creates two downstream problems:

1. Storefront filters fail.
   - Storefront clothing-size filters query `product_variants.size_label` and require `products.size_type = "clothing"`.
   - Misclassified products remain searchable by text but disappear when clothing-size filters are applied.

2. Sync behavior is opaque or unsafe when upstream category data is incomplete.
   - If Lightspeed omits category, the system currently has to guess.
   - Guessing here creates silent bad imports and future reconciliation noise.

## Requirements

### Functional

1. Website `size_type` must derive from normalized Lightspeed category first.
2. Missing or unknown Lightspeed category must appear in sync preview as a conflict instead of being auto-guessed.
3. The sync UI must allow an admin to resolve missing-category conflicts for the current sync run only.
4. Manual sync apply must use that one-run resolution to import or update the affected product.
5. The one-run resolution must not persist beyond that sync session.
6. Existing misclassified products should be repairable by running manual sync again after the category-first fix is deployed.

### Non-Functional

1. No long-lived override or mapping table is introduced.
2. Existing sync flows for valid Lightspeed data should continue to work without extra admin input.
3. Conflict handling should remain explicit and auditable in the sync result UI.

## Current Relevant Behavior

### Size Type Inference

Current inference exists in:

- `src/services/lightspeed-inbound-sync-service.ts`
- `src/services/lightspeed-reconciliation-sync-service.ts`

Today, both use size-label heuristics that classify as `shoe` when a label:

- starts with a digit
- contains `M`
- ends with `W`

That is what incorrectly classifies `SMALL` as `shoe`.

### Storefront Filter Behavior

Storefront size filtering is implemented in `src/repositories/product-repo.ts` via `listProductIdsForSizes()`.

It does not inspect tags. It filters by:

- `products.size_type`
- exact `product_variants.size_label`
- `stock > 0`

So the wrong `size_type` is sufficient to hide an otherwise valid product from the clothing-size storefront filter.

## Proposed Design

## 1. Category-First Size Type Resolution

Introduce a single category-driven resolution rule used by both inbound apply and reconciliation preview.

### Resolution Rules

- normalized category `clothing` => website `size_type = "clothing"`
- normalized category `sneakers` => website `size_type = "shoe"`
- normalized category `accessories` => website `size_type = "custom"`
- normalized category `electronics` => website `size_type = "custom"`

### Fallback Rules

If the normalized Lightspeed category is missing or unknown:

- do not auto-guess during reconciliation preview
- classify the remote product as a conflict with reason `missing_category`

For the actual inbound apply path, category-less imports should only proceed if an explicit sync-run override is provided by the admin.

### Scope

This category-first rule must be used consistently in:

- preview classification
- comparable remote product construction
- inbound apply when creating a new website product
- inbound apply when updating an existing website product

The existing size-label heuristic should be removed from these sync paths as the primary source of truth.

## 2. Missing Category As Preview Conflict

Reconciliation preview should classify a remote product as a conflict when:

- normalized category is missing, empty, or not mappable to a website category

### Conflict Shape

Conflict payload should include:

- `conflictReason: "missing_category"`
- `remoteProductId`
- product title
- SKU sample
- current normalized remote snapshot
- resolution options available for this sync run

### Resolution Options

For this conflict type, allow:

- website category selection:
  - `sneakers`
  - `clothing`
  - `accessories`
  - `electronics`
- derived website `size_type` preview based on selected category:
  - `sneakers` => `shoe`
  - `clothing` => `clothing`
  - `accessories` / `electronics` => `custom`

The admin is not selecting `size_type` independently. It is derived from the chosen category to keep the state coherent.

## 3. One-Run Conflict Resolution In The Sync Modal

The sync preview modal should support conflict resolution for `missing_category` items.

### UI Behavior

For each missing-category conflict:

- show the product title and SKU
- show that Lightspeed category is missing
- show a category selector
- show the resolved website size type as read-only derived output

### State Model

Client state should track resolutions keyed by `remoteProductId`.

Example shape:

```ts
type SyncConflictResolution = {
  remoteProductId: string;
  category: "sneakers" | "clothing" | "accessories" | "electronics";
};
```

This state is:

- created during the preview session
- used during apply
- cleared when preview is rebuilt or sync modal is closed

### Validation

Apply sync should remain blocked for unresolved `missing_category` conflicts.

Once all such conflicts have a selected category, apply can proceed.

## 4. Apply Sync Override Flow

When apply is triggered, affected remote products with missing-category conflicts should be sent with their one-run resolution.

### Server Contract

Chunk/apply requests should accept optional per-product resolution overrides.

Minimal server-side shape:

```ts
type SyncRunCategoryOverride = {
  remoteProductId: string;
  category: "sneakers" | "clothing" | "accessories" | "electronics";
};
```

### Usage

For any remote product being applied under a resolved missing-category conflict:

- inbound sync uses the override category
- inbound sync derives `size_type` from that override category
- product create/update proceeds normally

No database persistence of the override occurs.

## 5. Reconciliation Outcome For Existing Bad Rows

After the category-first fix is deployed:

- existing products currently misclassified as `shoe` but belonging to Lightspeed `clothing` should preview as edits
- applying sync should rewrite them to:
  - `category = clothing`
  - `size_type = clothing`

That means manual sync becomes the repair mechanism for existing products still present in Lightspeed.

No standalone repair script is required for that supported path.

## 6. Error Handling

### Preview

If a conflict cannot be resolved because the user has not selected a category:

- keep the item in conflicts
- keep apply blocked or reject the apply request with a clear validation error

### Apply

If an override is supplied for a remote product that no longer exists:

- return a normal itemized failure for that work item

If an override is malformed:

- reject the request with a validation error before partial apply

## 7. Testing Strategy

## Unit Tests

### Inbound Sync

Add tests proving:

1. Lightspeed `clothing` category with size `SMALL` saves `size_type = "clothing"`
2. Lightspeed `sneakers` category with EU size saves `size_type = "shoe"`
3. Missing category without override does not silently guess in the sync flow that uses conflict resolution
4. Missing category with override `clothing` saves `size_type = "clothing"`

### Reconciliation Preview

Add tests proving:

1. Missing category classifies as conflict with reason `missing_category`
2. Misclassified existing website product appears as edit when Lightspeed category is known and different
3. Clothing products with `SMALL` no longer infer `shoe`

### Client/UI

Add tests proving:

1. missing-category conflicts render resolution controls
2. unresolved conflicts prevent apply
3. resolved conflicts send one-run overrides
4. closing the modal clears overrides

## Manual Verification

Verify against a real misclassified product like:

- `ABOMINABLE CARPENTER PANTS “ Green “`

Expected outcome:

1. Before sync fix:
   - current row may be `category = clothing`, `size_type = shoe`
2. After preview:
   - if Lightspeed category is present and normalized to `clothing`, product appears as edit
3. After apply:
   - website row becomes `size_type = clothing`
4. Storefront:
   - product appears under `category = clothing` + `size = SMALL`

## Implementation Notes

1. Prefer extracting shared category-to-size-type logic into a single helper rather than maintaining duplicated logic in inbound sync and reconciliation.
2. Keep conflict resolution type-specific. This design only covers `missing_category`.
3. Do not add persistent override storage unless a later requirement explicitly asks for it.

## Out Of Scope

1. Persistent category override mappings
2. Bulk conflict resolution rules across future sync runs
3. General-purpose conflict editing for every conflict type
4. Changes to storefront filter semantics beyond fixing the underlying `size_type` source data
