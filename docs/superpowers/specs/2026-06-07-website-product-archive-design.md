# Website Product Archive Design

## Goal

Add a website-only archive state for products so old website inventory can remain in the database, remain visible in historical sales/admin records, and stay hidden from customers.

This archive state must not affect Lightspeed inventory or Lightspeed sync behavior.

## Scope

This design covers:

- product data model changes
- storefront visibility rules
- admin inventory tab/filter behavior
- archive and restore actions
- bulk archive actions
- read-only handling for archived products
- website to Lightspeed sync exclusions

This design does not cover:

- deleting archived products
- bulk migration of old inventory into archive state
- a new historical reporting module

## Requirements

### Functional

- Admins can archive a product from the website admin.
- Archived products remain in the database with variants, images, tags, and order relationships intact.
- Archived products do not appear on the public storefront.
- Archived products do not appear in the admin `In Stock` or `Out of Stock` tabs.
- Archived products appear only in a new admin `Archived` tab.
- Archived products are read-only until restored.
- Admins can restore archived products.
- Admins can bulk archive products from the admin inventory screen.
- Archive and restore do not create, update, delete, deactivate, or otherwise modify anything in Lightspeed.
- Archived products are excluded from website to Lightspeed sync.

### Behavioral

- Existing order, refund, pickup, shipping, and transaction views must still show archived products normally.
- Archived products must not appear in featured items, storefront search, storefront filters, or public product detail pages.
- If a product is archived, any attempt to edit it should be blocked or redirected into a read-only experience with a restore action.

## Data Model

### Recommended Schema

Add a nullable timestamp column:

- `products.archived_at timestamptz null`

Rules:

- `archived_at is null` means the product is not archived
- `archived_at is not null` means the product is archived

### Why Timestamp Instead Of Boolean

- It preserves when the archive happened.
- It is more useful for audits and later cleanup/reporting.
- It keeps the state explicit without overloading `is_active`.

## Domain Rules

Archive is a website-local state only.

- It is separate from `is_active`.
- It is separate from `is_out_of_stock`.
- It is separate from Lightspeed link state.

Interpretation:

- `is_active` continues to mean website-publishable in the normal lifecycle.
- `is_out_of_stock` continues to mean no sellable inventory.
- `archived_at` means hidden historical website inventory that is not currently part of the active catalog.

## Visibility Rules

### Storefront

Storefront queries must exclude archived products unconditionally.

This includes:

- store listing pages
- public product detail pages
- public search
- public filters
- featured items
- any cache/tagged storefront data sources

### Admin Inventory

Admin inventory will expose three tabs:

- `In Stock`
- `Out of Stock`
- `Archived`

Rules:

- `In Stock`: `archived_at is null` and normal in-stock criteria
- `Out of Stock`: `archived_at is null` and normal out-of-stock criteria
- `Archived`: `archived_at is not null`

Archived products must never be mixed into the first two tabs.

## Admin UX

### Actions

For non-archived products:

- show `Archive`

For archived products:

- show `Restore`

Archive should be explicit and confirmable.

### Bulk Archive UX

The inventory screen already supports page-local selection using the header checkbox. Archive needs a cross-page bulk affordance.

Required behavior:

- When the header checkbox selects the current page, and the UI shows the selected count such as `100 selected`, display an adjacent control like `Select all products`.
- `Select all products` must mean all products matching the current inventory filters, not only the current page.
- The resulting selection must respect the current tab/filter context. Archived products must not be mixed into `In Stock` or `Out of Stock` bulk operations.
- Next to `Delete Selected`, add `Archive Selected`.
- `Archive Selected` must support both:
  - page-local selected IDs
  - full filtered-result selection after `Select all products`

Recommended UX state:

- `100 selected on this page. Select all 2,438 matching products`
- after activating global selection:
  - `All 2,438 matching products selected. Clear selection`

### Bulk Archive Rules

- Bulk archive is allowed only from non-archived tabs.
- Archived products should not appear in the selection set for `In Stock` or `Out of Stock`.
- Bulk archive must be confirmable and report a count of affected products.
- Bulk archive must be reversible only through restore, not implicit undo.

### Read-Only State

Archived products should not be editable.

Recommended behavior:

- the edit page loads in read-only mode or redirects to a read-only detail view
- all editing controls are disabled
- a restore action is visible

This is better than silently allowing edits because it keeps archive semantics clean and predictable.

## Sync Rules

Archive is intentionally not synchronized with Lightspeed.

### Website To Lightspeed

Archived products must be skipped by:

- product create/update/delete sync paths
- inventory propagation paths

If a product is archived, the website should stop trying to keep it in sync with Lightspeed.

### Lightspeed To Website

Lightspeed events should not toggle archive state.

If a product is archived locally and a Lightspeed webhook arrives for a linked product, the local archive state should remain authoritative for website visibility. The product may still be updated internally if needed, but archive state itself must not be cleared by Lightspeed.

Recommended implementation rule:

- `archived_at` is never changed by Lightspeed inbound sync

## Suggested Implementation Boundaries

### Data Layer

- add `archived_at` to product row typing and queries
- add repository methods:
  - `archive(productId)`
  - `restore(productId)`

### Service Layer

- add archive/restore service methods
- add bulk archive service method
- enforce read-only/archive guards for update flows
- exclude archived products from website to Lightspeed sync entry points

### Admin UI

- add `Archived` tab
- add archive/restore actions
- add `Archive Selected`
- add cross-page `Select all products` selection flow
- block edit actions for archived products

### Storefront

- add `archived_at is null` filtering to all public product fetches

## Edge Cases

### Existing Orders

Archived products must continue to appear in:

- order detail pages
- transaction detail pages
- refund flows
- pickup/shipping admin views

These screens use historical or admin-scoped data, not storefront-scoped visibility.

### Featured Items

If an archived product is currently featured, it should be excluded from featured storefront output automatically. Optional later cleanup can remove such rows proactively, but storefront exclusion is the required behavior.

### Bulk Actions

Bulk delete and bulk archive should remain separate concepts.

Archive is reversible.
Delete is destructive.

Do not merge them into one action.

Cross-page bulk selection must be filter-aware. If the admin is viewing `In Stock` with a search/category filter applied, `Select all products` should target exactly that filtered result set and nothing outside it.

## Testing

Minimum test coverage:

- archived products excluded from storefront lists
- archived products excluded from storefront product detail fetches
- admin inventory tabs separate archived products correctly
- archived products cannot be updated through normal edit flow
- restore returns product to normal admin tab visibility
- bulk archive works for page-local selections
- bulk archive works for full filtered-result selections after `Select all products`
- archived products are skipped by website to Lightspeed sync
- order/admin historical views still render archived product data

## Recommendation

Implement archive as:

- `products.archived_at`
- website-only behavior
- read-only until restored
- separate admin `Archived` tab
- full exclusion from website to Lightspeed sync

This matches the existing system structure and avoids mixing historical website inventory with the active synced catalog.
