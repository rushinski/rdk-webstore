# Lightspeed Manual Reconciliation Sync Design

## Goal

Add a website-admin-triggered manual sync that makes active website inventory mirror current Lightspeed inventory. The sync should:

- add products to the website when they exist in Lightspeed but not on the website
- archive website products when they do not exist in Lightspeed
- leave matched products unchanged
- never modify Lightspeed

The feature is a deliberate admin action, not a background process.

## Scope

This feature is limited to the admin inventory screen and the website-side reconciliation workflow.

In scope:

- a `Sync Inventory` button beside `Export Inventory`
- a preview step before any changes are applied
- import of Lightspeed-only products into website inventory
- archive of active website-only products
- conflict detection for ambiguous matches
- summary results for matched, imported, archived, and conflicted products

Out of scope:

- pushing any changes back to Lightspeed
- deleting website products
- modifying archived website products during sync
- automatic scheduled reconciliation

## Core Semantics

The manual sync is a one-way reconciliation from Lightspeed to the website.

Comparison set:

- Lightspeed side: all current Lightspeed products returned by the existing product listing API
- Website side: all non-archived website products

Outcomes:

- `matched`: product exists on both sides
- `import`: product exists only in Lightspeed and should be created on the website
- `archive`: product exists only on the website and should be archived
- `conflict`: the system found an ambiguous fallback match and should not change anything automatically

Archived website products are not part of the active comparison set and should not be auto-restored by this sync.

## Matching Rules

The sync should match products using two tiers:

1. Existing Lightspeed link is authoritative.
2. Exact SKU fallback is allowed only for unlinked website products.

SKU fallback rules:

- compare exact normalized SKU strings at the variant level
- if exactly one website product is identified from SKU matches, attach the Lightspeed link and treat it as matched
- if no SKU match exists, treat the Lightspeed product as importable
- if multiple website candidates exist, mark the result as a conflict

Link-based matching always wins over SKU-based matching.

## Apply Behavior

Preview does not mutate data.

Apply must:

- import every Lightspeed-only product through the existing inbound Lightspeed product normalization path
- archive every active website-only product through the website-only archive path
- persist any newly discovered Lightspeed links created by successful SKU fallback matches
- skip conflicts entirely

No Lightspeed product should be created, updated, archived, or deleted by this feature.

## Admin UX

Add `Sync Inventory` beside `Export Inventory` on the admin inventory page.

Expected flow:

1. Admin clicks `Sync Inventory`.
2. Website runs preview and returns counts plus a short sample list for each bucket.
3. Admin reviews preview results in a dialog.
4. Admin clicks `Apply Sync` to perform the reconciliation.
5. Website shows the final counts and refreshes inventory data.

The preview dialog should show:

- matched count
- import count
- archive count
- conflict count
- sample rows for imports, archives, and conflicts

If conflicts exist, apply is still allowed, but conflicts remain untouched and must be called out clearly.

## Data and Service Boundaries

The feature should reuse the existing Lightspeed client and inbound sync pipeline rather than inventing a second product-mapping path.

Recommended units:

- a reconciliation service that builds preview results from Lightspeed data plus website inventory
- an apply method on that service that executes imports, archives, and link attachments
- admin API endpoints for preview and apply
- inventory client UI state for opening the preview dialog and invoking apply

## Error Handling

Preview should fail fast if the Lightspeed connection is unavailable.

Apply should return structured partial results:

- imported count
- archived count
- matched count
- skipped conflict count
- failure count

Failures during one item should not abort the entire apply unless the initial Lightspeed fetch fails.

## Testing

Required coverage:

- preview classification for linked matches, SKU matches, imports, archives, and conflicts
- apply path imports missing Lightspeed products
- apply path archives website-only products
- archived website products are excluded from comparison
- admin API preview/apply endpoints
- inventory UI button and dialog state for preview/apply

## Constraints

- The sync must remain website-only in effect.
- Archive is the only destructive website action allowed.
- Existing archived products remain archived unless a separate admin restore action is used.
- Conflict cases must never be auto-resolved.
