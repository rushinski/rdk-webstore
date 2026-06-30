# Admin Catalog Redesign

Date: 2026-06-30
Area: `app/admin/catalog`
Status: Draft approved for spec review

## Goal

Rebuild the admin catalog surface so it follows the same UI and structural pattern as the other rebuilt admin pages. The result should feel cohesive with the rest of admin, preserve the current catalog workflow, and improve maintainability through clearer component boundaries and naming.

## Scope

In scope:
- Redesign the existing single-route catalog page at `app/admin/catalog/page.tsx`
- Keep the current three-tab workflow: `Tags`, `Aliases`, `Candidates`
- Replace legacy zinc/dark styling with the shared admin visual system
- Normalize layout, controls, empty states, and modal styling
- Refactor the page into smaller focused components under `app/admin/catalog/components`
- Preserve current create, edit, delete, filter, and candidate review behavior

Out of scope:
- API contract changes
- Server-side filtering/search changes
- Catalog domain logic changes
- New routes or subpages for catalog
- New data model behavior

## UX Direction

The catalog page remains a dense admin workspace rather than becoming a guided wizard or multi-route flow. This better matches the operational nature of the screen and avoids slowing down frequent staff actions.

The consistent page pattern will be:
- `AdminPageHeader` for page title and description
- A compact top control strip for search and global filters
- A shared tab bar style consistent with other rebuilt admin pages
- Each tab rendered inside `AdminSectionCard`
- Shared empty/loading states through existing admin UI primitives
- Inline quick-create surfaces for frequent actions
- Modals reserved for edit and delete confirmation flows

## Layout Design

### Page Structure

The page will remain a single route with three tabs:
- `Tags`
- `Aliases`
- `Candidates`

The top of the page will contain:
- Page header
- Page-level status/message area for recoverable errors and operation feedback
- Search and filter controls
- Shared tab navigation

Below the tabs, each active tab renders one focused section card.

### Tags Tab

The `Tags` tab remains the primary brand/model management surface.

Design:
- Inline `Add Brand` action at the top of the tab
- Brands displayed in a structured table/list using the brand/page/surface palette
- Expand/collapse brand rows to reveal models
- Inline `Add Model` action remains attached to each brand row
- Row-level edit/delete actions move through a shared action menu pattern
- Status and verification states use the shared badge language instead of bespoke pills

### Aliases Tab

The `Aliases` tab keeps alias creation directly on the page for speed.

Design:
- Inline create form at the top of the tab
- Shared select and input styling aligned with the rebuilt admin system
- Table/list below for current aliases
- Action menu for edit/delete
- Active/inactive state shown through shared badge treatment

### Candidates Tab

The `Candidates` tab remains a review queue.

Design:
- No route split
- Cleaner table treatment
- Accept/reject actions stay visible and fast
- Entity type and brand relationship shown more clearly
- Empty states rendered via shared admin primitives

## Component Architecture

The route file should own orchestration and mutation logic, while UI-heavy sections move into focused local components.

Target structure:
- `app/admin/catalog/page.tsx`
  - data loading
  - tab state
  - filters/search state
  - mutation handlers
  - layout composition
- `app/admin/catalog/components/CatalogToolbar.tsx`
  - search
  - global filters
  - tab controls if useful to colocate
- `app/admin/catalog/components/BrandsTab.tsx`
  - brands table/list
  - expansion UI
  - inline `Add Brand`
  - inline `Add Model` entry points
- `app/admin/catalog/components/AliasesTab.tsx`
  - inline alias create row
  - aliases table/list
- `app/admin/catalog/components/CandidatesTab.tsx`
  - candidates review table/list
  - accept/reject actions
- `app/admin/catalog/components/CatalogActionMenu.tsx`
  - reusable row actions for edit/delete
- `app/admin/catalog/components/TagModals.tsx`
  - restyled modals
  - edit flows
  - delete confirmation
- `app/admin/catalog/components/catalogStyles.ts`
  - optional shared class tokens for tabs, tables, action menus, and compact badges

## State And Data Flow

`page.tsx` remains the single owner of catalog data.

It continues to load:
- brand groups
- brands
- models
- aliases
- candidates

It also continues to own:
- loading state
- page message state
- active tab state
- search/filter state
- create/edit/delete handlers
- candidate accept/reject handlers

Child components receive only the minimal derived props they need. Filtering remains client-side in this pass to avoid expanding scope into API changes.

## Visual System Rules

The catalog page should match the rebuilt admin pages by following these rules:
- Use `brand-page`, `brand-surface`, `brand-border`, `brand-text`, and `brand-muted`
- Reuse `AdminPageHeader`, `AdminSectionCard`, `AdminEmptyState`, `AdminStatusBadge`, `adminFormStyles`, and `adminButtonStyles` where appropriate
- Avoid one-off dark theme styling and custom ad hoc cards
- Keep spacing and typography consistent with `transactions`, `shipping`, `inventory`, and `customers`
- Keep actions dense but visually organized

## Modal Behavior

Create/edit/delete actions are split by frequency:
- Frequent create actions stay inline on the page
- Edit actions remain modal-based
- Delete remains a confirmation modal and continues to behave as a soft delete

Modals will be restyled to use the same admin palette and control language as the rebuilt pages.

## Error Handling

Recoverable failures remain local to the page.

Rules:
- Keep one page-level message region for load or mutation feedback
- Preserve existing validation logic for duplicates and required fields
- Use shared empty/loading treatments instead of plain text placeholders
- Do not introduce silent failures or hidden state changes

## Verification

This pass is complete only if all of the following hold:
- The catalog workflow still supports creating brands, models, and aliases
- Editing and soft-delete behavior still works
- Candidate accept/reject behavior still works
- Tab switching and client-side filtering still work
- The page visually aligns with the rebuilt admin system
- The refactor does not leave dead helpers or unused components behind

Required checks:
- `npx prettier --write` on touched catalog files
- `npx eslint` on touched catalog files
- `npm run typecheck`

## Risks

Primary risks:
- Over-refactoring the route and accidentally breaking mutation wiring
- Creating a second tab/control pattern instead of reusing the admin one
- Leaving modal styling or action menus visually inconsistent with the rebuilt pages

Mitigation:
- Keep data ownership centralized in `page.tsx`
- Move only presentation-heavy sections out to child components
- Validate behavior tab by tab after the refactor

## Implementation Summary

Recommended implementation approach:
1. Normalize the page shell and top controls to shared admin primitives.
2. Extract the three tab bodies into focused components.
3. Introduce a shared catalog action menu and any minimal shared style tokens needed.
4. Restyle `TagModals` to the new admin system.
5. Run formatting, linting, and type-checking.
6. Do a final pass for dead catalog code or inconsistent naming.
