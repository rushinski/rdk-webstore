# Solesneakers Admin Redesign Design

**Objective**

Finish the admin-facing frontend for the `solesneakers` deployment by replacing the remaining legacy dark/red admin UI with the new brand system, while preserving all routes, backend contracts, server actions, and business behavior.

## Scope

This pass covers the live admin routes in this order:

1. `dashboard`
2. `orders`
3. `shipping`
4. `inventory`
5. `transactions`
6. `settings`
7. `analytics`
8. `customers`
9. `chats`
10. `profile`
11. `nexus`
12. `notifications`
13. `featured-items`

Included supporting surfaces:

- shared admin shell components
- shared admin UI primitives
- shared modals / drawers / confirm dialogs used by admin pages
- page-level empty, loading, success, and error states inside admin routes

Excluded from this pass:

- backend logic changes
- route changes
- permission model changes
- data model changes
- unrelated storefront work already completed

## Current State

The admin shell branding is partially migrated:

- `app/admin/layout.tsx` uses `brand-*` page framing
- `src/components/admin/AdminSidebar.tsx` and `src/components/admin/AdminTopbar.tsx` are partially aligned

But many page surfaces still use legacy utility classes and visual patterns:

- `bg-zinc-*`
- `border-zinc-*`
- `text-gray-*`
- `text-zinc-*`
- `bg-red-*`
- old dark drawer, modal, badge, table, and form treatments

Large admin files, especially in shipping, transactions, and inventory, also mix layout, styling, and interaction concerns in ways that make reuse harder.

## Recommended Approach

Use a shared admin UI layer first, then convert pages section by section in the approved order.

This is the preferred approach because:

- it keeps the admin visual language consistent across many routes
- it avoids repeating the same card, table, form, and badge restyles in every page
- it lets large pages be improved incrementally without a destabilizing rewrite

## Architecture

### 1. Shared admin primitives

Create or normalize a small set of admin-facing building blocks that express the `solesneakers` admin visual language:

- page header / title / subtitle block
- content section card
- metric stat card
- admin table shell and row treatments
- filter / toolbar row
- form field styling and grouped form sections
- action buttons and sticky action bars
- status badges
- empty states
- inline error / warning / info callouts
- admin drawer / modal / confirm dialog framing

These primitives should be low-logic presentation components or style exports, not new stateful abstractions unless the current duplication clearly justifies it.

### 2. Section-by-section route conversion

Convert each admin section on top of those primitives, preserving:

- data loading strategy
- server/client boundaries
- server actions and fetch calls
- route structure
- table behavior
- filters
- search
- pagination
- drawers and dialogs

### 3. Targeted file splits only where needed

Do not refactor the whole admin tree preemptively.

Do split a file when:

- it is too large to safely restyle in place
- multiple repeated subviews already exist inside one file
- a repeated block can become a focused reusable unit with a clear interface

Expected high-value split candidates:

- `app/admin/shipping/page.tsx`
- `app/admin/transactions/page.tsx`
- `app/admin/transactions/[orderId]/page.tsx`
- `app/admin/settings/shipping/page.tsx`
- `src/components/inventory/ProductForm.tsx`

## Visual Direction

Admin should feel consistent with the new storefront, but more operational and utilitarian.

Core visual rules:

- light `brand-page` and `brand-surface` backgrounds
- strong black text hierarchy using `brand-text`
- restrained muted copy via `brand-muted`
- thin structured borders via `brand-border`
- red reserved mostly for destructive actions, warnings, and failure states
- uppercase editorial headings where helpful, but not everywhere
- cleaner spacing and calmer information density than the legacy admin

The admin UI should read as:

- structured
- editorial
- task-oriented
- not consumer-facing

## Section Order

### Phase 1: Operational entry points

1. `dashboard`
2. `orders`
3. `shipping`

Reason:

- these are high-visibility and operationally critical
- they establish the card, list, table, and workflow patterns the rest of admin can reuse

### Phase 2: Core catalog and payment operations

4. `inventory`
5. `transactions`
6. `settings`

Reason:

- these contain the densest form and table UIs
- they benefit most from shared primitives already proven in phase 1

### Phase 3: Insight and relationship surfaces

7. `analytics`
8. `customers`
9. `chats`

Reason:

- these are easier once cards, tables, and detail panes are standardized

### Phase 4: Remaining secondary pages

10. `profile`
11. `nexus`
12. `notifications`
13. `featured-items`

Reason:

- these are smaller or less structurally central
- they can close the remaining legacy UI without blocking the main workflow sections

## Component and File Strategy

### Shared admin UI layer

Expected location:

- `src/components/admin/ui/*`

Expected kinds of files:

- `AdminPageHeader.tsx`
- `AdminSectionCard.tsx`
- `AdminMetricCard.tsx`
- `AdminDataTable.tsx`
- `AdminEmptyState.tsx`
- `AdminStatusBadge.tsx`
- `adminFormStyles.ts`
- `adminButtonStyles.ts`

This does not require those exact names, but the implementation should keep responsibilities discrete and easy to reuse.

### Existing shell components

Keep and extend the current shell:

- `app/admin/layout.tsx`
- `src/components/admin/AdminSidebar.tsx`
- `src/components/admin/AdminTopbar.tsx`
- `src/components/admin/shell/*`

These should remain the entry shell for all admin routes.

### Shared admin support components

Normalize or reskin shared operational components that admin pages depend on:

- `src/components/admin/AdminNotificationCenter.tsx`
- `src/components/admin/AdminNotificationsDrawer.tsx`
- `src/components/ui/ConfirmDialog.tsx`
- inventory subcomponents in `src/components/inventory/*`
- order display components in `src/components/orders/*`

## Error Handling

Behavior must stay unchanged.

UI-only requirements:

- destructive errors remain red and clearly visible
- validation errors are readable on light surfaces
- empty states use the new admin card language
- loading states use brand-neutral skeleton or muted messaging rather than legacy dark panels

## Testing Strategy

### Keep existing shell regression coverage

Continue using the existing admin shell branding tests.

### Add focused regression tests where risk is highest

Add targeted tests for:

- shared admin primitives
- any extracted helper views from large files
- especially risky route surfaces after major decomposition

Prefer:

- render assertions for branding and structure
- small interaction tests where drawers, filters, or toggles are restyled but behavior must stay stable

Avoid:

- snapshot-heavy tests
- duplicating coverage for unchanged backend behavior

## Verification Strategy

For each section:

- run targeted `eslint` on touched files
- run `npm run typecheck`
- run focused tests for touched admin surfaces

After major phases:

- run the admin shell regression suite
- run broader targeted admin route checks

Before claiming the full admin pass is complete:

- scan for remaining legacy admin visual tokens in admin files
- run targeted admin verification
- run `npm run typecheck`

## Risks and Mitigations

### Risk: large files become unsafe to restyle inline

Mitigation:

- extract repeated subviews into focused local components during the same section pass

### Risk: shared primitives become over-abstracted

Mitigation:

- keep primitives shallow and presentational
- only abstract repeated structure or repeated style contracts

### Risk: behavior regressions during visual cleanup

Mitigation:

- preserve existing data flow and handlers
- add narrow regression coverage around risky interactive sections

## Success Criteria

The admin redesign is complete when:

- all admin sections in the approved order are visually migrated
- legacy dark/red page chrome is removed from the live admin surfaces
- the shared admin UI layer is reused across sections
- admin routes preserve existing behavior
- targeted tests and typecheck pass

