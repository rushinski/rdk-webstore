# Product Inventory Schema Reset Design

Date: 2026-06-05

## Context

The inventory schema needs a hard reset before rebuilding local inventory from the trusted Lightspeed inventory source. Existing local inventory data is not mission critical, so this design intentionally favors a clean schema break over compatibility migrations.

The existing model puts SKU and some pricing concepts on the parent `products` row, even though the parent product is not purchasable. A customer purchases a variant, so SKU, sale price, reseller cost, and stock must live on `product_variants`.

Existing Lightspeed sync code is not a design constraint for this reset. The goal is to normalize product and variant data first, then rebuild import/sync behavior on top of the healthier model.

## Chosen Approach

Use a hard schema reset for inventory tables.

This means the migration may delete current inventory data, remove obsolete columns, add the new columns and constraints, and update the application to the new contract. This avoids temporary dual-write behavior and stale compatibility columns.

## Product Model

`products` represents a parent listing only. It stores the information shared by all purchasable variants.

Keep or add:

- `id`
- `tenant_id`
- `name`
- `brand`
- `model`
- `category`
- `condition`
- `description`
- `size_type`
- `shipping_price_cents`
- `is_active`
- `is_out_of_stock`
- `go_live_at`
- `excluded_auto_tag_keys`
- `created_at`
- `updated_at`

Remove:

- `sku`
- `price`
- `cost_cents`
- `seller_id`
- `marketplace_id`
- `condition_note`
- `created_by`
- `parse_version`
- `stripe_tax_code`
- `title_raw`
- `title_display`
- `brand_is_verified`
- `model_is_verified`
- `parse_confidence`
- `shipping_override_cents`
- `default_shipping_price`

`name` stores the raw product title exactly as entered or imported. The title parser may extract `brand` and `model`, but it must not rewrite `name`.

Parser verification fields are removed from products because they are not used for tag adoption or meaningful behavior. Catalog verification state belongs in catalog tables, not product rows.

## Variant Model

`product_variants` represents the sellable inventory unit.

Keep or add:

- `id`
- `product_id`
- `tenant_id`
- `sku`
- `size_label`
- `sale_price_cents`
- `unit_cost_cents`
- `stock`
- `sort_order`
- `created_at`
- `updated_at`

Remove:

- `size_type`
- `price_cents`
- `cost_cents`

`size_type` moves to `products` because a product has one size system. Variants only store their label inside that system.

Money stays stored as integer cents. The UI displays dollars. This keeps checkout, tax, payment totals, and reporting free from decimal rounding problems.

## Constraints

Inventory constraints:

- `product_variants.sku` is required and non-empty.
- `product_variants` has unique `(tenant_id, sku)`.
- `product_variants` has unique `(product_id, size_label)`.
- `sale_price_cents >= 0`.
- `unit_cost_cents >= 0`.
- `stock >= 0`.
- `products.shipping_price_cents` is nullable and non-negative when present.

`tenant_id` is stored directly on variants even though it is derivable through products. This makes SKU uniqueness enforceable with a straightforward DB constraint and keeps variant SKU lookups fast.

## SKU Behavior

Variant SKU is the primary SKU. Parent products do not have a SKU.

Generated website SKUs use simple numeric strings such as `100001`, `100002`, and so on. The database must not enforce a numeric-only format because imported Lightspeed SKUs may use a different format and should be preserved as-is.

SKU collision handling:

- The service asks for the next numeric SKU for website-created variants.
- The UI displays the generated SKU as read-only.
- The final insert/update relies on unique `(tenant_id, sku)` as the source of truth.
- If a collision happens, the service retries with the next number a small number of times.
- If retries fail, the API returns a clear duplicate SKU error.

Editing behavior:

- Existing variant SKUs stay stable.
- The normal product edit form does not allow editing existing SKUs.
- New variants added during edit receive new generated SKUs.
- Duplicating a product generates new variant SKUs.
- Imported variants preserve imported SKUs unless the source has no SKU, in which case the service generates one.

## Product Creation And Editing

The admin product form creates one parent product and one or more variants.

Product fields:

- raw title stored as `name`
- parsed `brand`
- parsed `model`
- `category`
- `condition`
- `description`
- `size_type`
- optional `shipping_price_cents`

Variant fields:

- read-only `sku`, displayed before size
- `size_label`
- `sale_price`
- `unit_cost`
- `stock`

Adding a variant immediately generates and displays a SKU in the draft state. Existing SKU values do not regenerate when other product fields change.

Deleting a variant with order history remains blocked. Set stock to `0` instead.

## Shipping

Tenant category defaults remain in `shipping_defaults`.

Product shipping behavior:

- `products.shipping_price_cents = null`: use tenant category default.
- `products.shipping_price_cents = 0`: free shipping for this product.
- `products.shipping_price_cents > 0`: use the product-specific shipping price.

Checkout resolves each cart line item to an effective shipping price. The existing aggregation rule may remain: shipping is the maximum effective shipping cost across shippable line items. Pickup shipping remains zero.

## Images

Product images stay related by `product_images.product_id`.

No base SKU is needed for images. Images describe the parent listing. Variant-specific images are out of scope unless the Lightspeed import proves they are necessary.

## Cart And Checkout

Cart line identity remains `product_id + variant_id`.

Cart validation fetches live variant price, stock, and SKU by `variant_id`. Product display price is derived from variants, generally the lowest in-stock sale price or the selected variant price.

Product out-of-stock status must not drift from variants. The implementation should either derive it from variant stock or update it consistently after variant writes.

Checkout uses:

- `product.name`
- `product.brand`
- `product.model`
- `product.category`
- `product.condition`
- `variant.sku`
- `variant.size_label`
- `variant.sale_price_cents`
- `variant.unit_cost_cents`
- effective product shipping price

## Orders

Orders must snapshot purchased item details so future product edits or inventory imports do not rewrite order history.

`order_items` should store:

- `product_id`
- `variant_id`
- `variant_sku`
- `product_name`
- `brand`
- `model`
- `category`
- `condition`
- `size_label`
- `unit_price`
- `unit_cost`
- `quantity`

Admin order views, customer order views, emails, exports, payment metadata, and fraud metadata should read snapshot values first. Joined product and variant data can be used as fallback only.

## Tags And Filters

Automatic tags continue to come from product and variant facts:

- brand
- model
- category
- condition
- size

Size tags are built from `product.size_type` and each variant `size_label`. Tags are not gated by parser verification metadata.

Storefront filters and inventory filters must stop reading `title_raw`, `title_display`, and product SKU. Search should use `product.name`, `brand`, `model`, and variant SKU where appropriate.

## Inventory Search And Export

Admin inventory search should search:

- variant SKU
- product name
- brand
- model
- category
- condition

Inventory export should produce variant-level rows, not product-level rows. Each row should include:

- SKU
- product name
- size
- category/type
- condition
- sale price
- unit cost
- stock

## Implementation Areas

The implementation will touch:

- Supabase migration
- generated DB types
- validation schemas
- product repository and service
- SKU generation service
- admin product form
- storefront list/detail/card
- cart validation
- checkout pricing
- order creation and order item snapshots
- order views and emails
- inventory export/search
- tag generation and filters
- tests

Existing Lightspeed sync-preview tests that depend on the old SKU shape should be ignored or rewritten later when sync behavior is rebuilt on top of the new inventory model.

## Risks And Blockers

Known risks:

- Generated DB types will fail until regenerated or updated after the schema migration.
- Search and sort currently reference removed title columns and product SKU.
- Checkout and order code must be updated together so purchases use variant pricing and order history snapshots.
- Product out-of-stock state can drift if not derived or maintained after variant changes.
- Any code that assumes one SKU per product must be rewritten to variant-level SKU.

These risks are expected and are part of the implementation plan.
