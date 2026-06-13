# Website To Lightspeed Family Sync Design

## Goal

Correct outbound website-to-Lightspeed product sync so that website-created products produce complete, faithful Lightspeed product families and website deletes can safely persist recovery snapshots before deleting remote inventory.

## Current State

Website product create, update, and delete already call outbound Lightspeed sync, but the create/update payload shape is incomplete for the current business rules.

Current outbound issues:

- Website SKUs are rewritten into derived Lightspeed SKUs when a link does not already exist.
- Single-variant website products are created as standard products instead of variant families.
- Outbound create payloads do not currently include the full product metadata needed in Lightspeed.
- Variant-level inventory is only updated later through the inventory sync path rather than being fully seeded on create.
- Delete recovery inserts into `deleted_product_recovery` can fail due to Supabase row-level security, which blocks the delete path before remote cleanup.

## Required Rules

- Website SKU must remain 1:1 in Lightspeed.
- Every website-originated product must be created in Lightspeed as a variant-family product, even if the website product has only one variant.
- Every Lightspeed child variant must have both `Condition` and `Size` options.
- Condition values in Lightspeed must be `New` and `Preowned`.
- Outbound sync should populate:
  - brand
  - category
  - description when present
  - unit cost per variant
  - retail price per variant
  - inventory per variant
- Delete recovery must keep fail-closed behavior:
  - if the recovery snapshot cannot be recorded, the remote Lightspeed delete must not proceed

## Approach Options

### Option 1: Dedicated Website-Outbound Family Payload

Create a website-specific outbound Lightspeed payload builder that always emits a family-style product payload with exact website SKUs and the full required metadata.

Pros:

- Directly matches the website-originated business rules.
- Avoids mixing outbound website concerns with inbound/reconciliation normalization.
- Reduces the chance of breaking existing import and reconciliation logic.

Cons:

- Introduces a more explicit branch in the product sync service.

### Option 2: Expand The Existing Generic Payload Builder

Keep one generic payload builder and extend it to support family creation, exact SKU preservation, and the extra fields.

Pros:

- Fewer top-level helpers.

Cons:

- The current builder already mixes assumptions from older sync behavior.
- Harder to reason about because create behavior would continue serving multiple incompatible goals.

### Option 3: Client-Side Translation Layer

Keep the service building a generic internal product representation and translate it into exact Lightspeed family payloads in the client layer.

Pros:

- Strong separation between domain intent and provider payload shape.

Cons:

- More abstraction than the current codebase needs.
- Adds indirection without materially reducing risk for this change.

## Recommended Approach

Implement Option 1.

This keeps the website-originated outbound contract explicit and minimizes unintended coupling with inbound sync and reconciliation behavior.

## Design

### 1. Website-Originated Create Always Builds A Lightspeed Family

Website product create should always emit a family payload to Lightspeed, even when there is only one website variant.

The outbound family model should be:

- Parent/family record
  - product name
  - description if present
  - active flag
  - brand
  - category
- Child variant records
  - exact website SKU
  - custom product code matching the exact website SKU
  - `Condition` variant definition
  - `Size` variant definition
  - retail price
  - unit cost
  - active flag
  - opening inventory

This removes the current behavior where single-variant website products are flattened into standard products.

### 2. Preserve Website SKU 1:1

For website-originated create and update, if a website variant already has a SKU, that exact SKU should be used as the outbound Lightspeed SKU and external product code.

The derived SKU fallback logic should no longer rewrite website SKUs on outbound website-originated product creation.

Derived SKU generation may still remain available for other flows if needed, but it should not be used for the website outbound family path when the website SKU is present.

### 3. Variant Definitions Always Include Condition And Size

Every outbound child variant should include:

- `Condition`
  - `New` when website condition is `new`
  - `Preowned` when website condition is `used`
- `Size`
  - the website variant `size_label`

This applies even when the website product has only one variant. The result in Lightspeed should still be a family with one child.

### 4. Populate Full Product Metadata

Outbound create should include the fields expected by the store owner and reconciliation logic:

- Family/shared:
  - name
  - description when present
  - brand
  - category
  - active flag
- Variant-level:
  - exact SKU
  - product code
  - retail price
  - unit cost
  - inventory
  - active flag
  - `Condition`
  - `Size`

Description remains optional. If the website product has no description, the Lightspeed payload should omit it rather than send an empty string.

### 5. Keep Inventory Tracked Per Variant

The create payload should seed inventory at the variant level so newly created Lightspeed products begin with the correct stock immediately.

The existing `syncVariantInventory(...)` path should remain in place for later website-driven stock updates. This change only fixes the missing initial inventory and ensures those later updates target proper child variants.

### 6. Update Path Preserves The Family Model

Website-originated updates should preserve the same family model created at write time.

Expected behavior:

- Shared fields update on the family record.
- Variant fields update on the linked Lightspeed child records.
- Inventory updates continue using linked child IDs.
- Exact website SKUs remain unchanged.

This prevents create and update from diverging into different remote product shapes.

### 7. Link Persistence Continues Using Family And Child IDs

The existing Lightspeed link table should continue storing:

- family id
- product id
- child variant id
- external SKU

The difference is that outbound website create will now reliably produce a real family plus child IDs even for one-variant website products, so the persisted link state becomes structurally correct for future updates and inventory writes.

### 8. Fix Delete Recovery RLS

The `deleted_product_recovery` insert path currently fails under Supabase row-level security during admin deletes.

This must be fixed by aligning the table policy with the server-authenticated admin delete path.

Requirements:

- server-side admin deletes can insert recovery rows
- the existing recovery data captured before delete remains unchanged in scope
- delete remains fail-closed if recovery storage fails

The preferred fix is to correct the policy or server-side insert permissions rather than weakening application behavior.

### 9. Error Handling

- If Lightspeed family creation fails, local create should continue to roll back as it does today.
- If Lightspeed family update fails, local update should continue to roll back as it does today.
- If delete recovery row insertion fails, the Lightspeed delete must not happen.
- Duplicate-name retry for used products remains in force on top of the richer family payload behavior.

## Data Flow

### Create

1. Website creates a product.
2. Local product is stored.
3. Outbound sync builds a Lightspeed family payload.
4. Parent fields and child variants are created in Lightspeed.
5. Family and child IDs are persisted into the Lightspeed link table.
6. If the outbound write fails, the local create is rolled back.

### Update

1. Website updates a product.
2. Local product is updated.
3. Outbound sync updates the linked Lightspeed family and/or child records.
4. If the outbound write fails, the local update is rolled back.

### Delete

1. Website delete begins.
2. Local and remote snapshots are gathered.
3. Recovery row is inserted successfully.
4. Remote Lightspeed product family is deleted.
5. Link rows are tombstoned.
6. Local delete completes.

If step 3 fails, the flow stops before step 4.

## Testing

Add or update tests to cover:

- website-originated create uses the exact website SKU with no derived suffix
- single-variant website product still creates a Lightspeed family payload
- child variants include `Condition` and `Size` definitions
- `Condition` values map to `New` and `Preowned`
- create payload includes brand, category, description when present, retail price, unit cost, and inventory
- update path preserves exact SKU behavior
- delete recovery succeeds under the intended auth/RLS model
- delete still aborts if recovery persistence fails

## Files Expected To Change

- `src/services/lightspeed-product-sync-service.ts`
- `src/lib/lightspeed/types.ts`
- `src/services/lightspeed-mapping-service.ts` if shared condition/category helpers are needed
- `src/repositories/deleted-product-recovery-repo.ts` only if insert mechanics need adjustment
- `supabase/migrations/...` for the RLS policy fix
- `tests/unit/lightspeed-product-sync-service.test.ts`
- `tests/unit/...` for RLS/repository coverage if the repo already has that pattern

## Out Of Scope

- Reworking inbound Lightspeed normalization rules
- Changing reconciliation preview logic
- Changing archive/restore outbound behavior
- Adding new recovery UI

## Success Criteria

- Website SKU remains identical in Lightspeed.
- Every website-created product appears in Lightspeed as a family with child variants.
- Each child variant includes `Condition` and `Size`.
- Brand, category, description when present, unit cost, retail price, and inventory all populate correctly in Lightspeed.
- Admin delete no longer fails on `deleted_product_recovery` RLS when the acting session is authorized.
- Delete still refuses to proceed if recovery capture cannot be stored.
