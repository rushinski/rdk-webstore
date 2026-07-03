# Modular Monolith Architecture Design

## Goal

Standardize the repository around a modular monolith with vertical slices so storefront, admin, services, repositories, and integrations follow one coherent structure instead of growing in disconnected shared layers.

## Current State

The codebase is a single Next.js and Supabase application with valid layering conventions, but most of the structure is still horizontally organized:

- `src/services/**`
- `src/repositories/**`
- `src/components/**`

This works at small scale but has already produced oversized shared files and weak domain ownership. The codebase now needs stronger feature boundaries inside the monolith.

## Chosen Architecture

Use a modular monolith organized by business capability, with vertical slices at the top level and clean or hexagonal boundaries inside each slice.

Top-level target:

```text
src/
  modules/
    orders/
    catalog/
    inventory/
    checkout/
    shipping/
    customers/
    nexus/
    auth/
    storefront/
    admin-shell/
  shared/
```

Each module should contain:

```text
domain/
application/
infrastructure/
presentation/
index.ts
```

## Why This Architecture Fits

### It matches the deployment model

This is one application with one deployment surface and tightly related business flows. It does not currently justify microservice overhead.

### It solves the actual pain

The main problem is not infrastructure scaling. It is code ownership drift:

- business logic spread across global service and repository directories
- large files that collect unrelated workflows
- admin and storefront surfaces that depend on scattered helpers

### It keeps useful current conventions

The repo already values:

- thin routes
- explicit service orchestration
- repository-only database access

Those rules still apply, but inside module boundaries instead of primarily across global folders.

## Rules

See `docs/ARCHITECTURE_RULES.md` for the durable ruleset. That document is the implementation-facing reference.

## Initial Module Priorities

Migration should start with the modules that currently carry the most cross-cutting complexity:

1. `orders`
2. `catalog`
3. `inventory`
4. `shipping`
5. `checkout`
6. `customers`
7. `nexus`
8. `storefront`
9. `admin-shell`
10. `auth`

## Migration Strategy

Use incremental extraction, not a flag day rewrite.

Each step should:

1. create the target module files
2. move or extract focused code into the module
3. leave compatibility exports in place when needed
4. update imports in touched surfaces
5. verify with targeted tests and type checks

## Shared Boundary Rules

Only truly cross-cutting code belongs in `src/shared/**`, such as:

- config
- generic utility helpers
- shared UI primitives
- generic validation helpers
- shared type definitions

If the code is about orders, products, customers, checkout, shipping, or a similar business concept, it belongs in a module.

## Risks

### Risk: shallow feature folders

A bad migration would move UI files into feature folders while leaving all business logic in global services and repositories. That would preserve the current problem.

### Risk: over-modeling

A bad migration would impose heavyweight DDD or CQRS patterns on simple CRUD settings surfaces. Use those patterns only where complexity justifies them.

### Risk: breakage from large moves

Broad renames across the repo without compatibility shims will create churn and make validation harder. Migrate in verified slices.

## Success Criteria

The architecture migration is succeeding when:

- new work lands in `src/modules/**`
- large shared files stop growing
- module public exports become the normal import path
- route handlers and pages stay thin
- business logic becomes easier to locate by capability
- admin and storefront surfaces feel structurally consistent
