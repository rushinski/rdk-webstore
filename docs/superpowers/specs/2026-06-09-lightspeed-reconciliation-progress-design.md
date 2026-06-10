# Lightspeed Reconciliation Progress Design

## Goal

Add visible approximate progress feedback to the manual Lightspeed reconciliation sync so admins can tell that a large sync is running and how much work remains.

## Scope

This design extends the existing manual reconciliation sync only.

In scope:

- an apply-time progress modal or popup
- approximate progress based on preview counts
- chunked apply behavior so the UI can advance between batches
- explicit exclusion of archived website products from sync work and progress totals

Out of scope:

- a background job system
- exact per-item server-side progress persistence
- sync behavior changes for matching, importing, or archiving

## Core Semantics

Archived website products remain ignored.

That means:

- archived website products are excluded from preview
- archived website products are excluded from apply
- archived website products are excluded from progress totals

Progress applies only to actual mutable work:

- imports
- archives

Matched products and conflicts do not count as progress units because they are not mutated during apply.

## Progress Model

Use preview counts as the expected workload.

Total progress units:

- `preview.importCount + preview.archiveCount`

Approximate phases:

1. `Preparing`
2. `Importing`
3. `Archiving`
4. `Finishing`

The UI should show:

- progress bar percentage
- completed work units out of total work units
- current phase label
- current chunk message such as `Importing 40 of 120`

If total work units are zero, the modal should short-circuit to a completed state without running an apply sequence.

## Apply Mechanics

The current one-shot apply request is too opaque for long syncs. To support visible progress without redesigning the backend into a job runner, the frontend should apply the preview result in chunks.

Recommended backend contract:

- keep preview endpoint
- add chunk-aware apply endpoint that can process:
  - `imports` for a list of remote product IDs
  - `archives` for a list of website product IDs

Recommended frontend flow:

1. Load preview.
2. Partition preview imports and archives into fixed-size chunks.
3. Open progress modal.
4. Process import chunks one by one, updating progress after each chunk.
5. Process archive chunks one by one, updating progress after each chunk.
6. Show completion summary and refresh inventory.

This keeps the progress bar moving and gives the admin feedback during large syncs.

## Chunking

Chunking should be deterministic and moderate in size so requests are not too large and the UI updates often enough.

Recommended initial chunk sizes:

- imports: 10 to 25 remote products per request
- archives: 25 to 50 website products per request

The exact values can be chosen based on current request latency, but the first version should prefer more frequent visible updates over maximum throughput.

## Admin UX

The current preview modal should transition into a progress state after `Apply Sync` is pressed.

Expected UX:

- disable close while a chunk request is in flight
- keep the modal visible during the entire sync
- show current phase and numeric progress
- after completion, show final totals:
  - imported
  - archived
  - conflicts skipped
  - failures

If a chunk fails:

- stop further processing
- show partial progress
- show an error summary
- allow the admin to close the modal and rerun sync later

## Testing

Required coverage:

- zero-work preview results produce immediate complete state
- frontend progress totals ignore matched and conflict buckets
- apply chunk requests advance progress cumulatively
- archive chunks never include archived website products
- completion and partial failure states render correctly

## Constraints

- Archived products must remain ignored end to end.
- This feature must not change Lightspeed-side state.
- This feature must not silently auto-close before the admin sees completion.
