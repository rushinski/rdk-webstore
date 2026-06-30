# Admin Featured Items Redesign

Date: 2026-06-30
Area: `app/admin/featured-items`
Status: Draft approved for spec review

## Goal

Rebuild the featured-items admin surface so it matches the shared admin UI system, keeps the current merchandising workflow intact, and becomes easier to maintain through clearer component boundaries.

## Scope

In scope:
- Redesign the existing featured-items admin page
- Preserve current search, add, remove, and drag-to-reorder behavior
- Replace legacy zinc/dark styling with the shared admin visual system
- Split the large client UI into smaller focused local components
- Keep toast-based feedback intact

Out of scope:
- API changes
- Search behavior changes
- Reordering logic changes
- Replacing drag-and-drop with a different interaction model
- New routes or subpages

## UX Direction

The page remains a single operational admin surface with two clear sections:
- product search and add
- current featured lineup

Drag-to-reorder remains the primary interaction because it is the fastest and most natural fit for merchandising order management. The redesign focuses on visual consistency and structural clarity, not on altering the workflow.

The consistent page pattern will be:
- `AdminPageHeader` for page title and description
- one `AdminSectionCard` for product search and add
- one `AdminSectionCard` for the current featured lineup
- shared form/button/empty-state styling
- restyled drag handles, cards, hover states, and placeholders

## Layout Design

### Page Structure

The route remains a simple wrapper that renders the client manager.

The client page contains:
- page header
- search/add section
- featured lineup section
- toast feedback layer

### Search/Add Section

The search/add section remains at the top.

Design:
- search input aligned with shared admin form styling
- search results presented in a clean surfaced list/dropdown
- add-product actions remain one click
- image thumbnails and metadata stay visible
- loading and no-results states are normalized to the admin system

### Featured Lineup Section

The featured lineup remains below the search section.

Design:
- current count stays visible
- optional public-view link remains available
- drag-to-reorder remains primary
- each item becomes a cleaner surfaced row/card
- drag state, hover state, and handle visuals are aligned with the rebuilt admin language
- empty state uses shared admin primitives

## Component Architecture

The route stays minimal. The client file remains the owner of state and mutations, while presentational UI moves into local components.

Target structure:
- `app/admin/featured-items/page.tsx`
  - minimal route wrapper
- `app/admin/featured-items/client.tsx`
  - state ownership
  - data loading
  - search state and async search logic
  - add/remove/reorder mutations
  - toast state
  - composition
- `app/admin/featured-items/components/FeaturedItemsSearchPanel.tsx`
  - search input
  - search results surface
  - add actions
- `app/admin/featured-items/components/FeaturedItemsList.tsx`
  - current featured lineup
  - drag/reorder UI
  - remove actions
  - empty state
- `app/admin/featured-items/components/featuredItemsStyles.ts`
  - optional shared class tokens for list rows, drag states, search result items, and placeholders

## State And Data Flow

`client.tsx` remains the single owner of:
- featured item loading
- search query
- async search results
- add mutation
- remove mutation
- reorder state and reorder persistence
- toast feedback

Child components receive only the data and callbacks they need. No new state layer or data abstraction is introduced in this pass.

## Visual System Rules

The featured-items page should match the rebuilt admin pages by following these rules:
- use `brand-page`, `brand-surface`, `brand-border`, `brand-text`, and `brand-muted`
- reuse `AdminPageHeader`, `AdminSectionCard`, `AdminEmptyState`, `adminFormStyles`, and `adminButtonStyles` where appropriate
- avoid legacy dark one-off cards and controls
- keep spacing, typography, and action styling aligned with the rebuilt admin system

## Error Handling

Behavior stays local and explicit.

Rules:
- preserve toast feedback for recoverable failures and successes
- keep existing abort handling for search requests
- do not silently swallow failed add/remove/reorder operations
- preserve current fallback behavior of reloading featured items after reorder failure

## Verification

This pass is complete only if all of the following hold:
- product search still returns and displays results
- add featured item still works
- remove featured item still works
- drag-to-reorder still updates the order and persists
- empty and loading states still render correctly
- the page visually aligns with the rebuilt admin system
- no dead helpers or unused imports remain after the split

Required checks:
- `npx prettier --write` on touched featured-items files
- `npx eslint` on touched featured-items files
- `npm run typecheck`

## Risks

Primary risks:
- accidentally breaking reorder persistence while restyling the list
- introducing prop sprawl between the client file and extracted components
- making the search results surface look consistent but less usable

Mitigation:
- keep all mutation logic centralized in `client.tsx`
- keep extracted components presentational
- verify add, remove, and reorder behavior after the refactor

## Implementation Summary

Recommended implementation approach:
1. Normalize the page shell to shared admin primitives.
2. Extract the search/add panel into a focused component.
3. Extract the featured lineup into a focused component while preserving drag behavior.
4. Introduce minimal shared style tokens if needed.
5. Run formatting, linting, and type-checking.
6. Do a final pass for unused code and legacy styling remnants.
