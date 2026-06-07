# Lightspeed Two-Way Sync Design

Date: 2026-06-05
Status: Draft for review

## Goal

Replace the current broken manual Lightspeed sync workflow with a full automatic two-way synchronization system between the website inventory model and Lightspeed Retail X-Series.

The finished system must support:

- website product create, update, delete, and purchase-driven stock changes syncing to Lightspeed
- Lightspeed product create, update, delete, and sale/inventory-driven stock changes syncing to the website
- last-write-wins conflict resolution
- hard delete propagation in both directions
- variant-level identity and stock handling

## Confirmed Business Rules

These requirements were explicitly confirmed for this design:

- synchronization is fully two-way
- conflict resolution is `last-write-wins`
- delete propagation is `hard delete`
- there is only one Lightspeed outlet, so no outlet aggregation logic is required

## Why The Current System Must Be Replaced

The current integration should not be extended incrementally as-is.

It has three structural problems:

- the manual preview/apply model is incomplete and executes only a subset of proposed actions
- the website product routes do not automatically trigger outbound Lightspeed synchronization
- the multi-variant Lightspeed payload and link model do not correctly represent Retail X-Series variant families

Because these are architectural faults rather than isolated bugs, the correct approach is replacement of the manual sync path with one automatic synchronization pipeline.

## Current Domain Model

### Website Model

The website inventory model is variant-first.

Shared product-level fields:

- `name`
- `brand`
- `model`
- `category`
- `condition`
- `description`
- `size_type`
- images

Variant-level fields:

- `sku`
- `size_label`
- `sale_price_cents`
- `unit_cost_cents`
- `stock`

A website product is a customer-facing family of one or more sellable variants.

### Lightspeed Model

Retail X-Series variant families are product families with child products.

For this integration:

- one website variant maps to one Lightspeed variant child
- a website product maps to one Lightspeed variant family
- even a single-variant website product must be modeled consistently so it can round-trip through the same link and timestamp rules

## Synchronization Model

Use one automatic event-driven synchronization model with persistent sync state.

### Outbound Flow: Website To Lightspeed

After a successful website-side create, update, delete, or stock mutation:

1. commit the local database change
2. load the current website product family and sync link state
3. normalize into Lightspeed payload shape
4. compare timestamps when a linked remote record already exists
5. create, update, delete, or adjust inventory in Lightspeed
6. persist updated sync metadata

### Inbound Flow: Lightspeed To Website

After a valid Lightspeed webhook is received:

1. authenticate and deduplicate the webhook
2. normalize the remote product or inventory payload into website shape
3. resolve link state by Lightspeed IDs first, then SKU fallback only when unlinked
4. compare inbound remote timestamps against stored website sync timestamps
5. apply create, update, delete, or stock mutation if the inbound event is newer
6. persist updated sync metadata

### Real-Time Versus Repair

The primary system is real-time and automatic.

Manual preview/apply sync should be removed.

A lightweight repair or reconciliation command may still exist later as an operational tool, but it is not part of the normal synchronization workflow and must not remain the source of truth for correctness.

## Conflict Resolution

### Strategy

Conflict resolution is `last-write-wins`.

That means whichever side has the newer authoritative modification timestamp wins, even if the other side has also changed.

### Required Timestamp State

Each linked record must persist enough timing data to evaluate stale versus current updates:

- last website modification timestamp observed
- last Lightspeed modification timestamp observed
- last successful sync write time
- last deletion timestamp, if deleted

### Normalization Rule

Both sides must be normalized into one comparable timestamp format before comparison.

The system should never compare arrival order alone because webhook delivery and retry timing are not reliable conflict indicators.

### Stale Event Rule

If an inbound event is older than the latest known write from the opposite side, it is ignored and logged as stale.

Ignoring stale events is required to prevent rollback caused by retries, delayed webhooks, or slow outbound jobs.

## Delete Semantics

Delete propagation is hard delete in both directions.

### Website Delete

When a website product or variant is deleted:

- delete the linked Lightspeed child products
- delete the linked Lightspeed family when no children remain
- delete the local website record when permitted by local business rules
- preserve a tombstone sync record long enough to suppress stale re-creation from delayed webhooks

### Lightspeed Delete

When a Lightspeed product or variant is deleted:

- delete the linked website variant
- delete the linked website product when no variants remain
- preserve a tombstone sync record long enough to suppress stale website re-creation from delayed outbound retries

### Tombstone Requirement

Because delete propagation is hard delete, a minimal tombstone layer is still required.

Without tombstones, delayed webhook or retry events can incorrectly recreate records that were intentionally deleted later by a newer write.

The tombstone is sync metadata, not a visible product record.

## Formatting Rules

These formatting rules define how data must round-trip.

### Identity

- website variant `sku` is the primary sellable-unit identity
- Lightspeed `sku` is preferred remote SKU identity
- if Lightspeed `sku` is absent, use the first valid `product_codes[].code`
- product title must never be treated as primary identity once a link or SKU exists

### Name

- website `name` maps to the Lightspeed family name
- inbound Lightspeed family name maps to website `name`
- do not rely on SKU suffixes embedded in titles for identity or reconstruction
- title cleanup may still remove legacy operational suffixes, but this is presentation cleanup only

### Variants

- each website variant maps to one Lightspeed variant child
- `size_label` maps to a real Lightspeed `Size` variant attribute value
- variant attribute creation and lookup must use real Lightspeed variant attribute IDs
- the integration must not flatten multiple Lightspeed children into one website variant

### SKU And Product Codes

- website `variant.sku` maps to Lightspeed `sku`
- mirror the same value into Lightspeed `product_codes` with type `CUSTOM`
- once linked, a variant SKU must never be regenerated

### Price

- website `sale_price_cents / 100` maps to Lightspeed `price_including_tax`
- inbound Lightspeed price prefers `price_including_tax`
- if `price_including_tax` is absent, fallback to `retail_price`
- website stores the inbound value as `sale_price_cents`

### Cost

- website `unit_cost_cents / 100` maps to Lightspeed `supply_price`
- inbound `supply_price` maps to `unit_cost_cents`

### Stock

- website variant `stock` maps to the single Lightspeed outlet inventory quantity
- inbound inventory maps directly to website variant `stock`
- because there is only one outlet, no outlet summing or outlet filtering logic is required

### Condition

Current code implies the following normalization:

- Lightspeed `preowned` maps to website `used`
- all other inbound condition values map to website `new`

This should remain the explicit normalization rule unless additional condition labels are discovered in the live catalog and deliberately added.

### Category

Current code loosely infers website categories from Lightspeed category text.

The replacement system must make category mapping deterministic and round-trip stable:

- `clothing` stays `clothing`
- `accessories` stays `accessories`
- `electronics` stays `electronics`
- everything else defaults to `sneakers` only if no stronger mapping rule exists

The final mapping table should live in one dedicated normalization module so both directions use the same logic.

### Images

- inbound Lightspeed images map to website product images
- preserve one primary image and stable sort order
- outbound image sync should treat the website as the image source of truth for what should be reflected remotely when the API permits it

## Sync State Model

The existing `lightspeed_product_links` table is not sufficient as a long-term sync state model.

It should be extended or replaced so each linked variant can track:

- `tenant_id`
- website `product_id`
- website `variant_id`
- Lightspeed family product ID
- Lightspeed child variant ID
- Lightspeed inventory item ID if required by remote inventory APIs
- `external_sku`
- last website modified timestamp seen
- last Lightspeed modified timestamp seen
- last successful sync direction
- deletion tombstone timestamp
- last error code or message for observability

The sync state must be variant-granular because stock, SKU, price, and child IDs are variant-granular.

## Module Responsibilities

The replacement system should separate responsibilities more sharply than the current code.

### Mapping Service

`lightspeed-mapping-service` should become a pure formatting and normalization layer.

Responsibilities:

- website -> Lightspeed field mapping
- Lightspeed -> website field mapping
- category normalization
- condition normalization
- title cleanup
- SKU extraction
- timestamp normalization

Non-responsibilities:

- HTTP calls
- database writes
- webhook dispatch

### Outbound Sync Service

The outbound service should own all website -> Lightspeed side effects.

Responsibilities:

- create/update/delete remote product families and child variants
- push stock changes
- persist resulting sync metadata
- enforce last-write-wins before remote mutation

### Inbound Apply Service

Add a dedicated inbound Lightspeed apply service.

Responsibilities:

- apply remote create/update/delete/inventory changes to the website
- resolve links by remote IDs and SKU fallback
- enforce last-write-wins before local mutation
- persist resulting sync metadata and tombstones

### Webhook Service

The webhook service should only:

- verify signatures
- parse and normalize payload envelopes
- deduplicate events
- dispatch to the inbound apply service

It should not directly own product mutation logic.

## Trigger Points

### Website Product Create

After a local product create succeeds:

- trigger automatic outbound Lightspeed create
- create family and variant links
- store returned Lightspeed parent/child IDs and timestamps

### Website Product Update

After a local product update succeeds:

- trigger automatic outbound Lightspeed update
- propagate metadata, variant changes, price, cost, stock, and image changes
- create or delete variant children as required

### Website Product Delete

After a local delete succeeds:

- trigger automatic outbound Lightspeed delete
- delete child variants first when required by the remote model
- persist tombstone sync state

### Website Purchase

When a website purchase decrements local inventory:

- propagate the resulting variant stock change to Lightspeed
- update sync timestamps so delayed Lightspeed inventory webhooks do not incorrectly overwrite the newer website write

### Lightspeed Product Update

When Lightspeed changes product metadata:

- apply the normalized change to the website if the remote timestamp wins
- ignore if stale

### Lightspeed Inventory Update Or Sale

When Lightspeed changes inventory due to sale or adjustment:

- apply the new variant stock to the website if the remote timestamp wins
- ignore if stale

`inventory.update` is the preferred authoritative stock signal for Lightspeed-side quantity changes.

## Manual Sync Removal

The following manual-sync-oriented surfaces are no longer part of the architecture:

- preview/apply sync workflow
- admin Lightspeed sync panel used for operational approval
- apply actions that mutate only a subset of previewed changes

These should be removed rather than left as inactive or misleading controls.

If any diagnostic tooling remains, it should be clearly labeled as read-only health or repair tooling and must not perform business synchronization through the old preview/apply pathway.

## Observability

Even without manual sync approval, the system needs auditability.

Record:

- synchronization direction
- entity IDs on both systems
- action type
- timestamp used for conflict resolution
- stale-event skip decisions
- success/failure outcome
- remote and local error payload summaries

Operational visibility should help answer:

- what changed
- which side won
- why a write was skipped
- why a record failed to sync

## Testing Scope

At minimum, the replacement must be covered by tests for:

- website create -> Lightspeed family and child creation
- website update -> Lightspeed metadata and variant update
- website delete -> Lightspeed hard delete
- Lightspeed create -> website product and variant creation
- Lightspeed update -> website metadata update
- Lightspeed delete -> website hard delete
- website purchase -> Lightspeed stock decrement
- Lightspeed sale or inventory update -> website stock decrement
- stale inbound webhook ignored because website write is newer
- stale outbound retry ignored because Lightspeed write is newer
- tombstone preventing stale record recreation after delete
- category normalization stability
- condition normalization stability
- SKU extraction fallback from product codes
- variant family handling for both single-variant and multi-variant products

## Risks

- Retail X variant APIs require real variant attribute IDs, so attribute provisioning must be solved as part of implementation rather than assumed
- hard delete propagation increases the importance of tombstone correctness
- last-write-wins depends on reliable timestamp normalization, which must be tested with delayed webhook scenarios
- checkout-driven stock sync can race with inbound inventory webhooks unless sync state updates are ordered carefully

## Recommendation

Implement the replacement as one automatic bidirectional sync architecture and remove the existing manual sync path entirely.

Do not try to repair the preview/apply system and automatic sync in parallel.

That would preserve two competing synchronization models and make the resulting state harder to reason about, test, and operate.
