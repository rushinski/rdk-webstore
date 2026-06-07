# Lightspeed Preview Normalization Design

Date: 2026-05-31
Status: Draft for review

## Goal

Make the Lightspeed sync preview trustworthy enough for real approval decisions.

The current preview has three core problems:

- it only shows page-local data and not full sync totals
- the UI still feels like a debug tool instead of a review workflow
- the Lightspeed normalization is too shallow, so size, price, cost, grouping, parser-derived fields, shipping, and tags do not reflect what would actually land in the website database

This design upgrades the preview into a paged review workspace backed by a website-shaped normalization pipeline.

## Scope

This work only upgrades the `preview` path.

It does not attempt to finish the entire apply engine. The preview must become correct before broader apply behavior is expanded.

## Preview UX

The sync modal should behave like a paged review workspace, not a raw response viewer.

It should show:

- total Lightspeed products
- total proposed changes across the full sync mode
- current page
- total pages
- page-local grouped counts
- next/previous controls at both the top and bottom
- larger spacing around header text, controls, summary cards, and product comparison rows

It should not show:

- raw JSON payloads beneath product cards

## Product Comparison Layout

Each review row should render as a side-by-side comparison only.

### Added

- source-side product card on the left
- empty destination placeholder on the right

### Modified

- current destination card on the left
- after-sync destination card on the right

### Archived

- current card on the left
- archived/deactivated result state on the right

## Card Content

The preview cards should reflect the actual website-shaped result data.

Required fields:

- Title
- Brand
- Model
- Category
- Condition
- Description
- Size
- Price
- Cost
- Stock
- Images

Rules:

- `Description` should be empty when missing and must never render the text `null`
- images must be fully available in preview wherever Lightspeed exposes them
- `Brand` and `Model` should come from the parser/autotagger pipeline, not from a simplistic raw copy

## Grouping Rules

### New

`new` products should be grouped into website-style product families.

That means:

- one product identity
- multiple variant rows beneath it
- shared product-level presentation
- size/price/cost/stock matrix for the grouped variants

### Preowned

`preowned` products should remain one product per SKU.

That means:

- one sellable unit
- one variant
- its own images
- no multi-size grouping

## Normalization Pipeline

Before preview rows are built, each Lightspeed product or variant record should be converted into a website-shaped snapshot.

### Title

- strip POS-only disambiguators such as appended SKU suffixes
- normalize into website display naming

### Brand and Model

- resolve through the existing parser/autotagger pipeline
- do not trust the raw Lightspeed fields as the final website answer

### Category

- normalize into the website category set already used by filters and shipping defaults

### Condition

- `new` remains grouping-capable
- `preowned` remains single-SKU

### Description

- preserve if present
- otherwise leave empty

### Variant Data

For each normalized unit or variant:

- size
- price
- cost
- stock
- images

must be extracted into the same shape the website uses for preview and eventual persistence.

## Shipping Normalization

Lightspeed should not be treated as the shipping source for this preview.

Instead:

- normalize category first
- compute the website shipping result from the existing default shipping rules

The preview should show the website-side shipping result that would actually be applied after import.

## Tags

Tags must be generated through the existing parser/tagging system so the preview reflects the actual website result rather than a simplified sync-only interpretation.

## Parser Confidence and Conflicts

If the parser cannot confidently resolve `brand` or `model`, the preview must not guess silently.

Instead:

- route the item into `conflicts`
- mark it as needing review before apply

This prevents bad product metadata from being approved accidentally.

## Totals and Paging

The backend should distinguish between:

### Remote Page Results

The current page of Lightspeed products used for detailed card rendering.

### Global Sync Totals

Computed totals for the selected sync mode:

- total Lightspeed products
- total grouped preview items
- total proposed adds
- total proposed modifies
- total proposed archives
- total proposed conflicts

This requires two layers:

- a paged Lightspeed fetch for detailed rendering
- a lightweight full-catalog aggregation pass for totals and total pages

## Source Of Truth Semantics

### Inventory-Only Modes

- selected side owns inventory values only

### Full Override Modes

Selected side owns:

- record existence
- metadata
- inventory
- images
- price
- cost
- shipping result
- tags
- active/archive state

Even in full override:

- destination formatting rules still apply

When the selected source lacks a record:

- preview should propose archive/deactivate
- never hard delete

## Implementation Shape

Implement this as three connected slices within the preview feature.

### 1. Snapshot Layer

- fetch paged Lightspeed products
- compute lightweight full-catalog count and summary totals

### 2. Normalization Layer

- convert Lightspeed rows into grouped website-shaped preview records
- run parser/autotagger
- resolve shipping defaults
- enforce `new` vs `preowned` grouping rules
- generate conflicts for low-confidence parser results

### 3. Presentation Layer

- render grouped side-by-side cards
- show full totals and total pages
- show pagination at top and bottom
- remove raw JSON
- increase spacing and readability

## Testing

Cover at minimum:

- grouped `new` products across multiple sizes
- single-SKU `preowned` products with distinct images
- parser success vs low-confidence conflict routing
- empty description handling
- size extraction
- price extraction
- cost extraction
- stock extraction
- shipping default resolution from normalized category
- total product counts across the full Lightspeed catalog
- total page count accuracy
- page-local counts vs global counts
- full override archive proposals

## Risks

- the full-catalog totals pass can become expensive if it reuses the same heavy normalization path as page rendering
- parser confidence thresholds may need tuning once real Lightspeed data is exercised at scale
- grouped `new` product logic must be careful not to merge unrelated products with similar names

## Recommendation

Implement the richer preview-first normalization pipeline before expanding apply behavior further.

That gives the admin a trustworthy review surface and prevents approving incorrect imports based on misleading preview data.
