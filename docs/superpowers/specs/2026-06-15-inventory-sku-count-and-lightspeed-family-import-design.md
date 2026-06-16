# Inventory SKU Count And Lightspeed Family Import Design

## Scope

This change covers three related behaviors:

1. The admin inventory header count should reflect the number of unique SKUs shown by the current inventory view, not the number of product records.
2. The admin inventory view should no longer expose a separate `Out of Stock` tab. The main non-archived inventory tab should continue to show all non-archived products, including zero-stock variants.
3. Manual Lightspeed imports must reliably import full variant families instead of occasionally collapsing a multi-variant family into a single website variant.

This spec does not change archived product behavior, storefront filtering behavior, or reconciliation preview/apply behavior outside of what is needed to support correct import semantics.

## Current Behavior

### Inventory count

The admin inventory page currently uses the `total` value returned by `ProductRepository.list()`. That total is computed from `products.id`, so it represents product rows, not SKUs or variant rows.

As a result:

- a product with 1 variant contributes `1`
- a product with 9 variants also contributes `1`

This does not match the operational meaning of inventory for the admin workflow, where each variant SKU is treated as a separate inventory unit.

### Inventory tabs

The admin inventory UI currently exposes:

- `In Stock`
- `Out of Stock`
- `Archived`

The user requirement is to remove the separate `Out of Stock` view and keep:

- one non-archived inventory view
- one archived view

Zero-stock variants must still count toward inventory and still be visible in the non-archived inventory view.

### Lightspeed manual import

The manual import path iterates top-level Lightspeed products, calls `client.getProduct(product.id)`, and passes that payload into inbound normalization and apply logic.

The known failure mode is:

- the top-level product exists in Lightspeed as a variant family
- the website import ends up with only one variant instead of the full child set

The earlier webhook fix prevented child-only updates from deleting sibling variants, but that did not guarantee that manual import always receives the full family payload. If the fetched payload is incomplete, normalization still produces an incomplete variant set and import remains wrong.

## Requirements

### Inventory

- The top-left inventory count must represent the number of unique SKUs shown by the active inventory filter.
- Zero-stock SKUs still count as unique SKUs.
- The default non-archived inventory view remains the main admin view.
- Archived products remain accessible in a separate archived view.
- No dedicated `Out of Stock` tab should remain in the admin inventory UI.

### Lightspeed import

- Manual import must create or update all variants for a Lightspeed family when those variants exist remotely.
- Import must not depend on a single endpoint returning a complete family payload when that assumption is not guaranteed.
- Existing child-only inbound update behavior must remain safe and must not delete sibling website variants.

## Proposed Design

## 1. Inventory count becomes SKU-based

The inventory page should report a SKU total rather than a product total.

The backend list response should return:

- `products`: paginated product rows, unchanged for rendering
- `total`: total count of unique SKUs that match the active inventory filter

This is intentionally different from the number of visible product cards/rows. The UI can continue to render grouped products while displaying a SKU-based aggregate count.

### Counting rule

For the current inventory filters, count distinct `product_variants.sku` values associated with products that match:

- tenant scope
- active vs archived scope
- text/category/condition filters
- current non-archived inventory view semantics

Because the `Out of Stock` view is being removed, the main inventory tab must include both:

- positive-stock variants
- zero-stock variants

The only variants excluded from the main count are variants belonging to archived products.

## 2. Inventory tabs collapse to non-archived + archived

The admin inventory filter model currently uses `stockStatus` as:

- `in_stock`
- `out_of_stock`
- `archived`

After the change:

- `in_stock` remains the default query value for backward compatibility in URLs and code paths
- semantically, `in_stock` means “non-archived inventory”
- `out_of_stock` is removed from the UI and no longer emitted by the inventory page
- `archived` remains unchanged

This avoids a larger routing and API rename while still matching the required behavior.

Backend query behavior for the default inventory tab must stop excluding `is_out_of_stock = true` products.

## 3. Manual import must expand full Lightspeed families before apply

The import bug is treated as a data completeness problem, not a normalization bug.

### Root cause hypothesis

Manual import currently trusts `client.getProduct(product.id)` to return a complete family payload for any top-level variant family. For some Lightspeed products, that assumption appears false in practice. When the fetched payload lacks some children, normalization emits too few variants, and import creates or updates too few website variants.

### Design change

Before calling `LightspeedInboundSyncService.applyProductPayload`, manual import must guarantee that the payload represents the full family:

- if the remote product is standard, import it directly
- if the remote product is a variant family, import a payload that includes all child variants

Implementation may use one of these concrete strategies:

1. augment `LightspeedClient` with a family-resolution method that explicitly assembles a full family payload
2. use an existing endpoint plus follow-up calls to populate missing children when `variants` is incomplete

The chosen implementation must not rely on a best-effort assumption that the first fetched payload is complete.

### Safety requirement

This change is scoped to manual import/family expansion only. It must not reintroduce sibling deletion from child-only inbound updates.

## Error Handling

### Inventory count

If SKU counting fails, the list request should fail rather than silently falling back to product count. Silent fallback would make the admin count untrustworthy.

### Manual import

If a family cannot be resolved into a complete payload, the import operation should fail that product explicitly rather than partially applying a one-variant representation of a multi-variant family.

## Testing

The implementation must include:

1. A regression test proving the inventory count reflects matching SKUs rather than matching product rows.
2. A regression test proving the admin inventory main tab includes zero-stock non-archived products after the `Out of Stock` tab removal.
3. A regression test proving manual import preserves a full remote family when a top-level family would otherwise be imported incompletely.
4. Verification that the earlier child-update safeguard still passes.

## Risks

### Count semantics mismatch

The page list remains product-grouped while the summary count becomes SKU-based. This is intentional, but the implementation must keep labels explicit enough that admins do not assume the number is product rows.

### Lightspeed API ambiguity

If Lightspeed’s product payload shape differs across endpoints or store data, the implementation must prefer an explicit family-expansion strategy over heuristic guessing. A heuristic fix would likely recreate this bug later.

## Out Of Scope

- changing storefront counts
- changing archival semantics
- changing website product grouping from product-based rows to variant-based rows
- redesigning reconciliation preview/apply behavior beyond any shared helper needed for reliable family resolution
