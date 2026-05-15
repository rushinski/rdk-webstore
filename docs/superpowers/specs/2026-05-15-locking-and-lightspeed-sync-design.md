# Store Locking And Lightspeed Sync Design

**Date:** 2026-05-15

## Scope

This design covers two rollout tracks:

1. Phase 1: store access controls
2. Phase 2: Lightspeed Retail X-Series synchronization

The two tracks should be implemented separately so lock/settings work is not blocked by integration work.

## Phase 1: Store Access Controls

### Goals

- Replace the current hardcoded site unlock behavior with persisted admin settings.
- Keep site lock and checkout lock as separate controls.
- Preserve the existing visual direction of the locked page while fixing its layout, spacing, grouping, and shell integration.
- Ensure all lock behavior reads from a single source of truth so middleware, pages, and admin UI cannot drift.

### Site Lock

Site lock is a persisted admin-controlled setting with:

- `enabled`
- `unlock_at`

Behavior:

- When enabled and current time is before `unlock_at`, public site routes are locked.
- Admin routes and admin-authenticated access remain allowed through the existing bypass path.
- When current time reaches `unlock_at`, the public site unlocks automatically.
- The locked page should continue to show countdown and unlock timing, but should use the website’s established shell/styling patterns so layout composition does not break.

### Checkout Lock

Checkout lock is a separate persisted admin-controlled setting with:

- `enabled`
- `message`

Behavior:

- It does not depend on site lock.
- It does not require an unlock date/time.
- When enabled, checkout payment flow is blocked and users are shown the configured message.
- Default message:
  `sorry we currently can not accept payments please message @realdealkickzsc on instagram the items you would like to purchase.`

### Admin Settings UX

Add a `Store Access` settings surface that contains:

- Site lock toggle
- Site unlock date/time input
- Checkout lock toggle
- Checkout lock message editor
- Locked-page preview or equivalent readback

### Implementation Principles

- Middleware/proxy and rendered pages must read the same persisted settings.
- Remove hardcoded unlock timestamps.
- Locked page should stay visually aligned with the rest of the storefront.

## Phase 2: Lightspeed Retail X-Series Sync

### Confirmed Platform

The integration target is Lightspeed Retail POS `X-Series` formerly Vend.

### External Capability Constraints

The design assumes the following documented Lightspeed capabilities and limitations:

- Products can be created and updated through the X-Series API.
- Sales can be created through the X-Series API.
- Webhooks exist for `product.update`, `inventory.update`, and `sale.update`.
- Webhooks are useful but not guaranteed as a sole synchronization mechanism, so reconciliation is still required.
- Product images cannot be attached by URL during product creation.
- Product image upload requires a separate binary multipart upload request.
- Image upload is product-level, not variant-level.
- No native scheduled sellable-at-time feature was confirmed in the reviewed docs, so scheduled go-live must be enforced by our own integration flow unless implementation proves a dependable alternative.

### High-Level Sync Strategy

Use a hybrid strategy:

- event-driven updates using Lightspeed webhooks
- manual preview/apply reconciliation workflow
- periodic reconciliation job

This avoids trusting webhooks alone while still allowing near-real-time updates.

## Data Model Direction

### Keep Existing Product Model

Retain the current website model:

- one `product` as the customer-facing listing
- one or more `variants` as sellable units

This remains true for synced inventory:

- `new` items remain grouped products with variant SKUs
- `preowned` items generally remain one website product with one variant when unique

### Identity Rules

Use `SKU` as the identity of a sellable unit across systems.

Do not use product name as the primary identity because:

- Lightspeed enforces stronger uniqueness constraints on names
- website names are intentionally cleaner than POS names
- POS names may include condition, size, or SKU for operational uniqueness

Add explicit Lightspeed external ID mapping fields so linked records update by:

1. stored Lightspeed external IDs first
2. SKU fallback only for first-time linking/import

### SKU Rules

Website-generated SKUs must follow:

- `C` = condition code
- `BBB` = brand code
- `MMM` = model code
- `SS` = size code
- `NN` = sequence number

Format:

- `C-BBB-MMM-SS-NN`

When importing from Lightspeed:

- preserve nonconforming legacy SKUs if already present there
- do not reject solely because an imported external SKU does not match the website-generated SKU pattern

When creating from the website:

- generated SKUs must follow the defined format consistently

## Naming And Condition Rules

### Condition Mapping

Use `preowned` as the POS-facing condition term.

Wherever sync or transformation logic maps condition values:

- website concept currently referred to as `used`
- POS-facing value should be `preowned`

### Website Names Vs POS Names

Website names should remain clean.

Lightspeed names may need additional disambiguation, especially for `preowned` products, because:

- X-Series cannot have duplicate product names in the same way the website can tolerate repeated clean names
- preowned products may be visually unique and must not be merged merely because the base shoe name matches

Rules:

- website display name should omit POS-only suffixes like embedded SKU, size, and condition text where not needed
- POS name may include SKU or other disambiguators when required for uniqueness
- imported POS names should be normalized before becoming website names

### Title Parsing And Tagging

When a product is imported from Lightspeed to the website:

- clean the POS title to website form
- run the cleaned title through the existing title parser/tagging pipeline
- derive brand/model/tagging using the website’s existing parser and catalog rules

This ensures imported inventory follows the same rules as locally created inventory.

## Images

### Website Import Strategy

Do not treat Lightspeed as the long-term live image CDN dependency for the website.

Preferred behavior:

- fetch or otherwise obtain the product images from Lightspeed-compatible flows
- mirror/store website-serving images in the website’s existing storage system
- associate mirrored images with local product records

Reasons:

- Lightspeed image upload is a separate binary flow
- product creation cannot simply point at an image URL
- image behavior should remain under website control

## Scheduled Go-Live

### Ownership

`go_live_at` remains owned by the website.

### Behavior

If a website product has a future `go_live_at`:

- preferred path: create it in Lightspeed early only if the integration can keep it non-sellable and then automatically make it sellable at the exact time without manual intervention
- fallback path: do not create/post it in Lightspeed until the scheduled time

If automatic state transition in Lightspeed is not dependable:

- queue creation/update until `go_live_at`

No manual POS action should be required to complete the transition.

## Sync Directions

### Inbound: Lightspeed To Website

For records arriving from Lightspeed:

1. match by linked external IDs first
2. if unlinked, fall back to SKU matching
3. if matched, transform to website shape
4. if missing on website, prepare creation on website
5. if conflict cannot be resolved safely, surface conflict instead of guessing

Inbound transformations include:

- POS `preowned` condition mapping
- title cleanup
- parser/tagging re-run
- image mirroring
- inventory mapping to local variant records

### Outbound: Website To Lightspeed

For records originating from the website:

- validate for duplicate SKU or conflicting linked record before posting
- generate POS-safe naming where uniqueness requires it
- preserve clean website naming locally
- create/update corresponding Lightspeed product family and variants
- honor `go_live_at` scheduling rules

## Duplicate And Conflict Handling

### Website-Origin Conflicts

When an admin action from the website would create an invalid sync state:

- block the action from posting to Lightspeed
- show immediate popup error
- include the specific product and reason

Examples:

- duplicate SKU
- conflicting Lightspeed mapping
- irreconcilable name uniqueness issue

### Lightspeed-Origin Conflicts

When an inbound Lightspeed change conflicts with the website state:

- reject automatic apply for that item
- create a sync failure/conflict record
- email the admin with:
  - product
  - attempted action
  - exact failure reason

### Safe Matching Rule

A duplicate should not be inferred from clean product name alone.

Conflict detection should prioritize:

1. external ID mismatch
2. SKU mismatch
3. incompatible mapping shape between local variant and Lightspeed sellable unit

## Manual Sync Workflow

### Manual Sync Is A Preview/Approval Flow

Manual sync is not a blind mutation job.

It is a dry-run reconciliation workflow followed by selective approval.

### Source Of Truth Selection

At the start of a sync preview, the admin selects the source of truth for the run.

At minimum:

- `Lightspeed inventory is authoritative`
- `Website inventory is authoritative`

Clarification:

- If `Lightspeed` is selected as source of truth for inventory, Lightspeed inventory should not be changed by that run for authoritative inventory fields.
- The website database should be updated to match Lightspeed for those inventory fields.
- If `Website` is selected as source of truth for inventory, the inverse applies.

This source-of-truth selection should apply at least to:

- inventory quantities
- stock availability state tied to inventory

Product metadata should still flow through the enforced sync rules and formatting logic rather than being copied blindly from whichever side was selected.

### Preview Sync

When the admin clicks preview:

- compute proposed changes without writing them
- group results by change type

Required change groups:

- added
- modified
- archived/deactivated/deleted-equivalent
- conflicts
- skipped

Each proposed item should explain:

- target system
- action
- exact product/variant
- field-level modifications
- reason for the proposal

Examples:

- create website product from Lightspeed product
- update Lightspeed product name to POS-safe unique form
- adjust website variant stock from `0` to `1`
- skip due to conflicting SKU mapping

### Admin Approval

Admin can:

- accept individual proposed changes
- deny individual proposed changes
- accept all
- deny all

Only accepted changes are applied.

Rejected changes remain logged.

### Apply Result

After apply, persist a sync report containing:

- selected source of truth
- preview counts
- accepted changes
- rejected changes
- applied changes
- failures
- reasons

## Operational Sync Layers

Use three layers together:

1. Lightspeed webhooks
2. scheduled reconciliation
3. manual preview/apply sync

This is required because the Lightspeed documentation explicitly warns that webhook delivery is not guaranteed and recommends polling/reconciliation to keep systems in sync.

## Admin Reporting And Auditability

Every sync run should record:

- who ran it
- when it ran
- source of truth selected
- counts by change type
- apply outcomes
- conflict/failure details

POS-origin failures should send admin email with product and exact reason.

Website-origin validation failures should:

- appear immediately in UI
- be logged for auditability

## Phase Breakdown

### Phase 1

- persisted site lock settings
- persisted checkout lock settings
- locked page layout/style cleanup
- shared settings-backed enforcement between proxy and page logic

### Phase 2

- Lightspeed credential/config setup
- local/external ID mapping
- inbound/outbound sync services
- webhook ingestion
- scheduled reconciliation
- preview/apply manual sync UI
- sync reporting and notifications

## Testing Scope

At minimum, verify:

- site lock before unlock time
- site auto-unlock at configured time
- checkout lock while site remains open
- admin bypass during site lock
- preowned condition mapping
- clean website naming from POS imports
- POS-safe naming for outbound preowned products
- variant SKU handling for new products
- duplicate/conflict detection
- scheduled `go_live_at` behavior
- preview diff generation grouped by change type
- selective accept/deny apply flow
- inventory reconciliation when Lightspeed is source of truth
- inventory reconciliation when website is source of truth
- failure email generation
- webhook + reconciliation coexistence
