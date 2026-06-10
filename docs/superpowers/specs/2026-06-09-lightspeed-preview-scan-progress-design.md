# Lightspeed Preview Scan Progress Design

## Goal

Make the manual Lightspeed sync understandable from the first click by opening the sync modal immediately and showing real preview-scan progress, including current scan position, remaining items, and estimated time.

## Scope

This design extends the manual reconciliation sync preview and modal experience.

In scope:

- open the sync modal immediately on click
- replace the one-shot preview request with chunked preview scanning
- show current preview scan position, items remaining, and estimated time
- keep the existing apply-time chunk progress model
- keep archived website products excluded from preview and apply

Out of scope:

- background jobs
- persisted resumable sync state
- Lightspeed-side changes

## Core Semantics

Archived website products remain excluded everywhere:

- preview comparison excludes archived website products
- apply excludes archived website products
- preview and apply progress totals exclude archived website products

Conflicts remain non-mutating:

- counted in preview
- shown in summary
- excluded from apply work totals

## Three-State Modal

The sync modal should have three explicit states:

1. `Scanning Preview`
2. `Preview Summary`
3. `Applying Changes`

### Scanning Preview

The modal opens immediately when the admin clicks `Sync Inventory`.

The UI should show:

- phase label: `Scanning Lightspeed inventory`
- items processed so far
- total items if known
- items remaining
- current page/chunk
- rolling ETA
- running discovered counts:
  - matched
  - imports
  - archives
  - conflicts

### Preview Summary

After scanning completes, the modal transitions into the existing review state:

- matched count
- import count
- archive count
- conflict count
- sample rows

### Applying Changes

After `Apply Sync`, the modal transitions into the existing chunked apply progress state:

- phase
- progress bar
- completed work units / total work units
- ETA
- imported / archived / failed counts

## Preview Mechanics

Preview can no longer be a single blocking `GET /api/admin/lightspeed/sync`.

Recommended backend contract:

- a preview-start or first-page action that returns:
  - chunk items processed
  - cumulative counts
  - total remote items if known
  - whether more pages remain
  - cursor or page number for the next step
- repeated preview-scan actions that continue from the returned cursor
- a final preview payload once scanning completes

Recommended frontend behavior:

1. Open modal immediately.
2. Set phase to `Scanning Preview`.
3. Request preview chunks sequentially.
4. Update counts, processed items, remaining items, and ETA after each chunk.
5. When complete, switch modal to review state.

## ETA

ETA is approximate and should be derived from rolling throughput during the current phase.

Recommended calculation:

- track `startedAt`
- track `processedItems`
- compute `itemsPerSecond = processedItems / elapsedSeconds`
- compute `remainingItems / itemsPerSecond`

The UI should label it clearly as an estimate.

If too little data exists to compute a stable estimate, show `Estimating...`.

## Backend Boundaries

Recommended responsibilities:

- reconciliation service:
  - preview chunk scan
  - cumulative result aggregation
  - final preview result assembly
- API route:
  - preview chunk actions
  - apply chunk actions
- inventory client:
  - modal state machine
  - ETA math
  - chunk orchestration

## Error Handling

If preview scan fails:

- keep modal open
- show partial counts
- show error state and message
- allow closing and rerunning later

If apply fails:

- keep modal open
- show partial progress and failure count
- allow closing after review

## Testing

Required coverage:

- modal opens immediately before preview is complete
- preview chunk API advances cumulative counts correctly
- ETA calculation handles zero/low-throughput startup safely
- archived website products remain excluded from preview totals
- transition from preview scanning to preview summary works correctly
- transition from preview summary to apply progress works correctly

## Constraints

- Progress and counts must be honest, not invented placeholders.
- Archived website products must remain ignored throughout.
- The first visible UI should appear immediately after the admin clicks sync.
