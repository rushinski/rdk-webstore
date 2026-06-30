# Admin Inventory Create/Edit Redesign

Date: 2026-06-30
Area: `app/admin/inventory/create`, `app/admin/inventory/[id]/edit`
Status: Draft approved for spec review

## Goal

Rebuild the inventory create and edit surfaces so they use the same shared admin framing, feel like one cohesive workflow, and preserve the existing inventory form behavior.

## Scope

In scope:
- Redesign the create page shell
- Redesign the edit page shell
- Restyle the edit client wrapper to match the shared admin system
- Normalize back navigation, title/description treatment, section framing, and action placement
- Preserve all current form logic and data flow

Out of scope:
- Inventory form logic changes
- API changes
- Form field behavior changes
- Inventory data model changes
- Large refactors of the shared inventory form internals

## UX Direction

Create and edit should feel visually near-identical, with differences limited to:
- header wording
- edit-only actions such as archive/back

This makes the inventory workflow feel like one product surface instead of two separate tools. The redesign is focused on shell consistency and framing, not behavioral change.

The consistent page pattern will be:
- shared admin page header treatment
- consistent back navigation style
- same spacing and typography rhythm
- same section/card framing around the main form surface
- edit-only actions placed in the same action zone rather than a separate visual treatment

## Layout Design

### Create Page

The create page remains server-rendered for initial form data loading.

Design:
- replace legacy header styling with the shared admin header pattern
- keep the back link, but style it consistently with other rebuilt admin pages
- keep the existing form client and initial data flow intact

### Edit Page

The edit page keeps its current load and edit workflow, but the surrounding shell becomes visually aligned with the create page.

Design:
- same header/back navigation structure as create
- edit-specific action area remains available
- remove separate dark-theme framing in favor of the shared admin surface language

### Edit Client Wrapper

The edit client wrapper should be normalized to the rebuilt admin system.

Design:
- replace standalone dark card treatment with shared surface/card styling
- normalize archive/back or similar controls to shared admin button treatments
- preserve the current form content and behavior inside the wrapper

## Component Architecture

This pass stays intentionally modest in scope.

Target structure:
- `app/admin/inventory/create/page.tsx`
  - shared page shell for create
- `app/admin/inventory/[id]/edit/page.tsx`
  - shared page shell for edit
- `app/admin/inventory/[id]/edit/client.tsx`
  - restyled wrapper and actions
  - existing edit behavior preserved

Optional:
- introduce a tiny local inventory page frame helper only if it reduces obvious duplication without hiding behavior

## State And Data Flow

Data ownership remains exactly where it is today:
- create page keeps loading initial server-side form bootstrap data
- edit page keeps its existing product load/edit flow
- edit client keeps its current actions

This is a presentation-focused pass. No state ownership or business logic should move unless required by the shell cleanup itself.

## Visual System Rules

The create and edit pages should match the rebuilt admin pages by following these rules:
- use `brand-page`, `brand-surface`, `brand-border`, `brand-text`, and `brand-muted`
- reuse `AdminPageHeader`, `AdminSectionCard`, `adminButtonStyles`, and any other existing admin UI primitives where appropriate
- avoid standalone dark-theme wrappers and one-off button styles
- keep spacing and typography consistent with other rebuilt admin routes

## Error Handling

No new error-handling model is introduced.

Rules:
- preserve existing create page bootstrap behavior
- preserve existing edit page and edit client error behavior
- do not introduce hidden failures by moving actions into new wrappers

## Verification

This pass is complete only if all of the following hold:
- create page still loads initial brand and shipping defaults
- edit page still loads the current product and supports its existing actions
- no inventory form behavior regresses
- create and edit now read as one cohesive workflow visually
- no dead wrapper code or unused imports remain

Required checks:
- `npx prettier --write` on touched inventory create/edit files
- `npx eslint` on touched inventory create/edit files
- `npm run typecheck`

## Risks

Primary risks:
- accidentally pulling the larger inventory form into scope
- restyling the edit wrapper in a way that breaks existing actions
- leaving create and edit only partially aligned after the pass

Mitigation:
- keep the scope constrained to shell and framing
- preserve existing form internals
- verify both routes after the restyle

## Implementation Summary

Recommended implementation approach:
1. Normalize the create page shell.
2. Normalize the edit page shell.
3. Restyle the edit client wrapper and action treatment.
4. Run formatting, linting, and type-checking.
5. Do a final pass for unused code and legacy styling remnants.
