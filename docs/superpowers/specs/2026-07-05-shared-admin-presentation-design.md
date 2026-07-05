# Shared Admin Presentation Design

## Goal

Finish the architectural transition away from `src/components/admin/*` by moving the remaining shared admin presentation primitives into a module-owned shared boundary.

The target outcome is:

- feature presentation remains inside feature modules
- cross-feature admin presentation is owned by a shared module
- `src/components/admin/*` no longer exists

## Scope

This design covers only the remaining shared admin presentation layer:

- admin shell primitives
- admin UI primitives
- import and dependency rules for those primitives
- migration order and verification

This design does not introduce new user-facing behavior, redesign existing admin screens, or change domain/application boundaries.

## Problem

Most admin feature surfaces were already migrated into module-owned presentation directories, but the repo retained a special-case namespace for shared admin presentation:

- `src/components/admin/shell/*`
- `src/components/admin/ui/*`

That structure was cleaner than the old feature-specific component trees, but it still preserved an architectural split between:

- module-owned presentation code
- non-module shared admin presentation code

Leaving that split in place weakens the architecture in three ways:

1. It preserves the old mental model that admin presentation belongs under `src/components/admin/*`.
2. It makes dependency direction less explicit than a module-owned shared boundary.
3. It leaves the migration incomplete, which makes future placement decisions inconsistent.

## Decision

Create a module-owned shared admin presentation boundary at:

- `src/modules/shared/presentation/admin/`

with these subareas:

- `src/modules/shared/presentation/admin/shell/`
- `src/modules/shared/presentation/admin/ui/`

This becomes the only valid location for shared admin presentation primitives used across multiple feature modules.

## Target Structure

### Shell

Move the remaining shell/navigation primitives to:

- `src/modules/shared/presentation/admin/shell/AdminSidebar.tsx`
- `src/modules/shared/presentation/admin/shell/AdminSidebarContent.tsx`
- `src/modules/shared/presentation/admin/shell/AdminSidebarProfileDock.tsx`
- `src/modules/shared/presentation/admin/shell/AdminTopbar.tsx`
- `src/modules/shared/presentation/admin/shell/AdminBrandHeader.tsx`
- `src/modules/shared/presentation/admin/shell/AdminNavItem.tsx`
- `src/modules/shared/presentation/admin/shell/adminSidebarNavigation.ts`

### UI

Move the remaining shared UI primitives to:

- `src/modules/shared/presentation/admin/ui/AdminEmptyState.tsx`
- `src/modules/shared/presentation/admin/ui/AdminMetricCard.tsx`
- `src/modules/shared/presentation/admin/ui/AdminPageHeader.tsx`
- `src/modules/shared/presentation/admin/ui/AdminSectionCard.tsx`
- `src/modules/shared/presentation/admin/ui/AdminStatusBadge.tsx`
- `src/modules/shared/presentation/admin/ui/adminButtonStyles.ts`
- `src/modules/shared/presentation/admin/ui/adminFormStyles.ts`

## Dependency Rules

The final dependency direction is:

1. `app/*` routes import module presentation entrypoints or route-facing module files.
2. Feature modules may import shared admin presentation from `src/modules/shared/presentation/admin/*`.
3. Shared admin presentation may import only:
   - generic base UI
   - framework utilities
   - config/theme assets
   - low-level shared helpers
4. Shared admin presentation must not import feature modules.

In short:

- feature presentation can depend on shared admin presentation
- shared admin presentation cannot depend on feature presentation

## Migration Strategy

### Batch 1: Shell

Move the shell primitives first because they have a tighter dependency graph and fewer downstream imports than the UI primitives.

Tasks:

- move `src/components/admin/shell/*` to `src/modules/shared/presentation/admin/shell/*`
- update imports in:
  - `src/modules/app-shell/presentation/*`
  - `src/components/shell/ClientShell.tsx`
  - shell/sidebar unit tests
- update any structure tests that still reference old paths
- remove the old `src/components/admin/shell` directory

Verification:

- focused shell/sidebar Jest suites
- `npm run typecheck`
- import sweep for `@/components/admin/shell`

### Batch 2: UI

Move shared admin UI primitives second because they fan out into many feature modules.

Tasks:

- move `src/components/admin/ui/*` to `src/modules/shared/presentation/admin/ui/*`
- update imports across admin feature modules
- update unit tests that assert old paths
- remove the old `src/components/admin/ui` directory

Verification:

- focused primitive Jest suites
- targeted feature presentation Jest suites for touched imports where applicable
- `npm run typecheck`
- import sweep for `@/components/admin/ui`

### Batch 3: Final Namespace Removal

After shell and UI are both moved:

- confirm `src/components/admin/*` no longer exists
- update architecture docs and migration notes
- remove stale wording that implies old legacy admin component paths remain valid

Verification:

- import sweep for `@/components/admin/`
- `npm run typecheck`
- selected Jest structure suites that exercise shell, shared UI, and admin module presentation

## Testing and Verification

Every migration batch must satisfy all of the following before commit:

1. Focused Jest suites for the touched shared layer pass.
2. `npm run typecheck` passes.
3. A path sweep confirms old import targets are gone or reduced exactly as intended.
4. Any touched migration tests assert the final desired state, not transitional shim behavior.

## Success Criteria

The work is complete when:

- `src/components/admin/*` no longer exists
- all remaining shared admin primitives live under `src/modules/shared/presentation/admin/*`
- admin feature modules import shared primitives only from the shared module boundary
- no route or module imports reference old `@/components/admin/*` paths
- tests and typecheck pass

## Risks and Mitigations

### Risk: Broad UI import churn

Moving `ui/*` will touch many files at once.

Mitigation:

- move shell and UI in separate batches
- use import sweeps after each batch
- verify with focused tests plus typecheck before commit

### Risk: Reintroducing feature-specific logic into shared primitives

A shared boundary can become a dumping ground if not constrained.

Mitigation:

- keep only cross-feature admin primitives in the shared module
- keep feature-specific variants inside their feature modules
- enforce one-way dependency rules in review and follow-up docs

### Risk: Leaving transitional test language behind

Some existing tests were originally written around shim-based migration steps.

Mitigation:

- update touched tests to assert final ownership and path removal
- remove wording that treats transitional compatibility files as long-term valid

## Recommendation

Proceed with the migration in this order:

1. move shell into `src/modules/shared/presentation/admin/shell`
2. move UI into `src/modules/shared/presentation/admin/ui`
3. remove the remaining `src/components/admin/*` namespace

This provides the cleanest end state with the lowest risk of partial architectural drift.
