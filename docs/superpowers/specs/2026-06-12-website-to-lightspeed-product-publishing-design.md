# Website To Lightspeed Product Publishing Design

## Goal

Tighten outbound website-to-Lightspeed product publishing so that:

1. Website products can be created and updated without images.
2. Used products can still sync to Lightspeed when the clean product name collides with an existing Lightspeed product name.
3. Existing website-driven create, update, and delete sync behavior remains intact.

## Current State

The current product routes already push website changes to Lightspeed for the three main CRUD paths:

- `POST /api/admin/products` creates the local product, then calls `LightspeedProductSyncService.syncWebsiteProduct(..., { source: "create" })`.
- `PATCH /api/admin/products/[id]` updates the local product, then calls `syncWebsiteProduct(..., { source: "update" })`.
- `DELETE /api/admin/products/[id]` and bulk delete both call `LightspeedProductSyncService.deleteWebsiteProduct(...)` before removing the local row.

Those flows already include rollback behavior when outbound Lightspeed sync fails.

The current gaps are:

- Product creation validation requires at least one image at the API layer.
- The admin product form also blocks submission when no image is present.
- Outbound Lightspeed create/update currently sends the clean website product name and does not retry when Lightspeed rejects that name as a duplicate.

## Constraints

- The clean product name should remain the default website name for all products.
- The fallback `Product Name - SKU` naming should only apply to used products.
- New products should continue to use the clean name and should not silently rename themselves on Lightspeed.
- The change should only alter outbound Lightspeed payload naming when required by a real Lightspeed duplicate-name rejection.
- Archive and restore behavior are out of scope for this change.

## Approach Options

### Option 1: Retry On Conflict For Used Products Only

Attempt Lightspeed create/update with the clean title first. If Lightspeed rejects the request with duplicate-name semantics and the product condition is `used`, retry once with `Product Name - SKU`.

Pros:

- Matches the requested rule exactly.
- Keeps Lightspeed names clean unless a real collision exists.
- Avoids extra Lightspeed lookup calls.

Cons:

- Requires reliable detection of duplicate-name API failures.
- Adds a small amount of branching to create/update sync.

### Option 2: Always Suffix Used Product Names

Always send `Product Name - SKU` for used products.

Pros:

- Very simple implementation.
- Eliminates duplicate-name retries.

Cons:

- Makes all used product names noisier in Lightspeed, even when not needed.
- Does not preserve the clean-name-first behavior requested.

### Option 3: Search Lightspeed Before Create Or Update

Look up potential conflicting names first, then decide whether to send the clean name or the SKU-suffixed fallback.

Pros:

- Makes the decision explicit before write attempts.

Cons:

- Adds extra API round-trips.
- Can still race if the name becomes conflicting between lookup and write.
- More complexity for less reliability than handling the actual rejection.

## Recommended Approach

Implement Option 1.

This is the most direct fit for the requested behavior: keep the clean website name by default, but rescue used-product publishing when Lightspeed rejects the name because it already exists.

## Design

### 1. Allow Image-Less Website Products

Change product validation and the admin form so `images` may be an empty array.

Implications:

- The backend schema will accept product create and update payloads with zero images.
- The product form will no longer throw when no image is present.
- The form copy will be updated to reflect that images are optional.
- Existing image normalization logic will remain unchanged when images do exist.

No additional database changes are required because the product model already supports products that have no image rows.

### 2. Preserve Existing Create, Update, And Delete Sync Flow

No route-level sync wiring changes are needed for this task.

Confirmed behavior:

- Create syncs outbound to Lightspeed after local creation.
- Update syncs outbound to Lightspeed after local update.
- Delete syncs outbound to Lightspeed before local deletion and records recovery snapshots before deleting the remote product.

This task will only adjust validation and outbound Lightspeed naming behavior inside the existing flow.

### 3. Add Used-Only Duplicate-Name Retry For Lightspeed Writes

Outbound Lightspeed writes will continue using the clean website product name on the first attempt.

If Lightspeed rejects the create or update request because the product name already exists:

- If `product.condition === "used"` and an outbound SKU is available, retry once with `Product Name - SKU`.
- If the product is `new`, rethrow the original error.
- If the product is `used` but there is no usable SKU, rethrow the original error.

This retry logic will apply to:

- single-product creates
- multi-variant family creates
- product updates

The fallback name only affects the outbound Lightspeed payload. It does not rename the local website product.

### 4. Duplicate-Name Error Detection

The sync service will add a small error classifier that inspects Lightspeed client errors for duplicate-name semantics.

The classifier should be tolerant of the current client error shape and match on stable message fragments rather than exact full strings. This keeps the logic resilient if Lightspeed changes surrounding wording but preserves the core conflict signal.

If the rejection is not clearly a duplicate-name error, the service should not retry.

### 5. Testing

Add or update tests to cover:

- product validation accepts empty `images`
- form submission no longer blocks on empty `images`
- used-product create retries with `Product Name - SKU` after duplicate-name rejection
- used-product update retries with `Product Name - SKU` after duplicate-name rejection
- new-product create/update do not retry with suffixed names
- successful first-attempt writes still use the clean name

## Data Flow

### Create

1. Admin submits product with or without images.
2. Local create succeeds.
3. Outbound Lightspeed create uses clean product name.
4. If Lightspeed succeeds, links are written as they are today.
5. If Lightspeed rejects with duplicate-name semantics and product is used, retry once with `Product Name - SKU`.
6. If retry succeeds, continue normal link persistence.
7. If write still fails, current local rollback behavior remains in place.

### Update

1. Admin updates product with or without images.
2. Local update succeeds.
3. Outbound Lightspeed update uses clean product name.
4. If Lightspeed rejects with duplicate-name semantics and product is used, retry once with `Product Name - SKU`.
5. If write still fails, current local rollback behavior remains in place.

## Error Handling

- Duplicate-name retry only happens for confirmed duplicate-name failures.
- Retry happens once only.
- Non-duplicate Lightspeed failures keep their current behavior.
- New-product duplicate-name failures stay visible to the user instead of being silently renamed.
- If a used product lacks a usable SKU for the fallback name, the original Lightspeed error is surfaced.

## Files Expected To Change

- `src/lib/validation/product.ts`
- `src/components/inventory/ProductForm.tsx`
- `src/services/lightspeed-product-sync-service.ts`
- `tests/unit/lightspeed-product-sync-service.test.ts`
- `tests/unit/...` for validation or form coverage as needed by the existing test layout

## Out Of Scope

- Changing archive or restore to sync outbound to Lightspeed
- Renaming local website products
- Precomputing or reserving unique Lightspeed names
- Any further reconciliation/manual-sync fixes beyond the outbound publishing path

## Success Criteria

- Admin can create and update a product with zero images.
- Website create, update, and delete continue syncing to Lightspeed as before.
- Used products recover from Lightspeed duplicate-name conflicts by retrying once with `Product Name - SKU`.
- New products keep the clean name and surface duplicate-name failures without automatic renaming.
