# Lightspeed Reconciliation Diff Preview Design

## Goal

Upgrade the manual Lightspeed reconciliation sync so the preview answers two separate questions correctly:

1. Does this Lightspeed product already correspond to a website product?
2. If it does, is the website product already up to date, or will sync edit it?

The preview must stop overloading `matched` as a catch-all identity bucket and instead show operational buckets that reflect what apply will actually do.

## Scope

This design only covers the manual reconciliation sync accessed from the admin inventory page.

It does not redesign:

- automatic website -> Lightspeed sync
- automatic webhook-driven Lightspeed -> website sync
- storefront inventory behavior
- product authoring flows

## Current Problem

The current reconciliation preview only classifies identity/existence:

- `matched`
- `imports`
- `restores`
- `archives`
- `conflicts`

That is insufficient because:

- `matched` does not tell the admin whether the website product is already identical to Lightspeed
- there is no field-level comparison for stock, variants, prices, images, tags, or product metadata
- the preview list is not actionable enough to understand what will change
- the apply step cannot distinguish `leave alone` from `overwrite website with Lightspeed`

## Desired Behavior

The manual reconciliation preview must classify active Lightspeed inventory into these buckets:

- `No Change`
- `Add To Website`
- `Edit On Website`
- `Restore On Website`
- `Archive On Website`
- `Conflicts`

`Apply Sync` must then perform only the actions represented by those buckets.

## Source Of Truth

For this manual reconciliation flow, Lightspeed is the source of truth for synced inventory.

That means:

- `Add To Website` creates missing website products from Lightspeed
- `Edit On Website` overwrites the website product with the normalized Lightspeed representation
- `Restore On Website` unarchives the website product, then overwrites it with the normalized Lightspeed representation
- `Archive On Website` archives active website products that are missing from Lightspeed
- `No Change` does nothing
- `Conflicts` do nothing automatically

## Identity Matching Rules

Identity resolution remains:

1. Existing non-tombstoned Lightspeed link to an active website product
2. Existing non-tombstoned Lightspeed link to an archived website product
3. Exact SKU fallback against unlinked active website products
4. Exact SKU fallback against unlinked archived website products

Ambiguous matches remain conflicts and are skipped.

Archived website products must never count as active matches.

If a Lightspeed product matches an archived website product, it becomes `Restore On Website`, not `Matched`, not `Import`.

## Comparison Model

Once identity is resolved to an active or archived website product, the reconciliation preview must compare the normalized Lightspeed representation against the current website representation.

The comparison model is based on normalized, website-shaped data rather than raw Lightspeed payloads.

### Product-Level Fields

Compare:

- `name`
- `description`
- `brand`
- `model`
- `category`
- `condition`
- `size_type`
- `is_active`
- `is_out_of_stock`

### Variant-Level Fields

Compare the full variant set, keyed by SKU:

- `sku`
- `size_label`
- `sale_price_cents`
- `unit_cost_cents`
- `stock`
- `sort_order`

Variant additions, removals, or reordered variants count as an edit.

### Image Fields

Compare product-level image sets only.

Variant images remain ignored because the website only models product images.

Compare:

- ordered image URLs
- primary image position

### Tag Fields

Compare the normalized tag output the website would derive from the Lightspeed-normalized product, not only the raw persisted tag rows.

This keeps manual sync aligned with the tagger used during normal website product creation and Lightspeed inbound sync.

### Non-Goals In Comparison

Do not compare:

- database IDs
- timestamps
- internal link row metadata
- raw Lightspeed-only fields the website does not store

## Preview Buckets

### No Change

The Lightspeed product maps to an active website product and there are no meaningful field-level differences after normalization.

Apply behavior: do nothing.

### Add To Website

The Lightspeed product has no active or archived website match.

Apply behavior: create the website product from the normalized Lightspeed representation.

### Edit On Website

The Lightspeed product maps to an active website product but at least one meaningful field differs.

Apply behavior: overwrite the website product with the normalized Lightspeed representation.

### Restore On Website

The Lightspeed product maps to an archived website product.

This bucket remains `Restore On Website` whether or not the archived website product is identical, because restoring is itself an action.

Apply behavior:

1. restore the archived website product
2. apply the normalized Lightspeed representation to it

### Archive On Website

An active website product has no matching Lightspeed product and is not involved in a conflict.

Apply behavior: archive the website product.

### Conflicts

A Lightspeed product matches multiple website candidates or otherwise cannot be resolved safely.

Apply behavior: none.

## Preview UI

## Summary Cards

Replace the current high-level summary with cards for:

- `No Change`
- `Add To Website`
- `Edit On Website`
- `Restore On Website`
- `Archive On Website`
- `Conflicts`

Each card must reflect the true final bucket counts from preview.

## Legend

The modal must show a compact visible legend near the top that explains each bucket in plain language.

The admin should not have to infer semantics from the labels alone.

## List Sections

The preview detail area must show sections for:

- `Add To Website`
- `Edit On Website`
- `Restore On Website`
- `Archive On Website`
- `Conflicts`

`No Change` only needs to be summarized by count by default and may have an expandable list later if needed, but it should not dominate the preview surface.

## Clickable Details

Each list item must have a `Details` affordance.

The details experience depends on bucket:

- `Add To Website`: show a product details modal for the normalized Lightspeed product
- `Edit On Website`: show a side-by-side diff modal
- `Restore On Website`: show a side-by-side diff modal
- `Archive On Website`: show the current website product details
- `Conflicts`: show the Lightspeed product plus the candidate website products involved in the conflict

## Diff Modal

The side-by-side diff modal is the key review surface for `Edit` and `Restore`.

### Layout

Two panels side by side:

- left: current website product
- right: normalized Lightspeed version that will be applied

### Shared Sections

Each side must show:

- product title
- SKU summary
- product images
- unit cost
- sale price
- total stock
- brand
- model
- category
- condition
- description
- tags

### Variant Display

The diff modal must support all variants, not a single selected variant.

It should show a full variant list per side including:

- SKU
- size
- sale price
- unit cost
- stock

Variant additions, removals, and changed rows must be obvious.

### Change Highlighting

Fields that differ should be visually marked.

The first version only needs clear value-level highlighting, not a complex inline word diff.

## Preview Scan Progress

The preview scan progress should remain chunked, but the labels must reflect the new categories.

The progress area must show running counts for:

- `No Change`
- `Add`
- `Edit`
- `Restore`
- `Archive`
- `Conflicts`

Estimated time remaining can remain approximate, based on throughput during scanning.

The progress bar should use the processed remote product count against the best available total remote count.

If the API cannot provide a trustworthy total, the UI should fall back to an indeterminate progress state instead of pretending to know a stable percentage.

## Apply Progress

Apply progress must be phased in this order:

1. `Restoring`
2. `Importing`
3. `Editing`
4. `Archiving`
5. `Finishing`

The apply modal must report counts for:

- restored
- imported
- edited
- archived
- failed

## Service Design Changes

The reconciliation service needs a richer internal representation than the current simple preview buckets.

### New Intermediate Shape

After identity matching, each remote product should be classified into one of:

- `no_change`
- `import`
- `edit`
- `restore`
- `conflict`

Separately, website-only active products become `archive`.

### Comparison Helpers

Add comparison helpers that convert:

- website product -> reconciliation comparable shape
- normalized Lightspeed product -> reconciliation comparable shape

These helpers should be deterministic and side-effect free so the UI, preview, and tests all rely on the same comparison logic.

## Apply Semantics

`applyImportChunk` remains for imports.

`applyRestoreChunk` remains for restores, but now its preview data must include diff-capable details.

Add `applyEditChunk` for active matched products whose normalized Lightspeed data differs from the website.

`applyArchiveChunk` remains unchanged in principle.

## Data Needed For Details

The preview response must include enough detail to support the details modal without forcing the client to reconstruct the comparison from incomplete list rows.

That means the preview needs richer item payloads than only `title`, `skuSample`, and IDs.

At minimum:

- normalized remote summary
- website summary for matched/edit/restore/archive/conflict cases
- variant summaries
- image lists
- tags
- diff field list for edit/restore

If payload size becomes too large, details may be loaded lazily by item ID, but the first implementation should prefer correctness and clarity over premature optimization.

## Testing

Add tests covering:

- archived product matched by old link becomes `restore`, not `matched`
- active matched identical product becomes `no_change`
- active matched changed product becomes `edit`
- field-level differences in stock, price, image set, and variants trigger `edit`
- preview API returns the new bucket counts and payload shape
- apply executes restore/import/edit/archive in the correct buckets

## Constraints

- Archived website products must not be treated as active inventory during reconciliation.
- Manual sync remains website-only; it must not mutate Lightspeed.
- Conflicts remain non-destructive.
- Product formatting must continue to rely on the existing Lightspeed normalization path so website inventory remains consistent with inbound sync.

## Recommendation

Implement this in two layers:

1. service/model upgrade: identity plus field-level diff classification
2. UI upgrade: preview buckets, legend, and detail/diff modal

That keeps the correctness model separate from the presentation layer and makes the preview trustworthy before adding richer UI behavior.
