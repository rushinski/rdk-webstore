# Architecture Rules

This repository uses a modular monolith architecture organized around vertical slices.

These rules define the target structure for all new work and the migration direction for existing code.

## Core Principles

1. Organize by business capability first, not by technical layer alone.
2. Keep route handlers and pages thin.
3. Keep business rules independent from frameworks and vendor SDKs.
4. Keep database and third-party integrations behind module infrastructure boundaries.
5. Prefer small, focused files with explicit ownership over shared catch-all utilities.

## Target Repository Shape

```text
app/
  ... Next.js route and page adapters only

src/
  modules/
    <module>/
      domain/
      application/
      infrastructure/
      presentation/
      index.ts
  shared/
    config/
    lib/
    types/
    ui/
    validation/
```

## Layer Responsibilities

### `app/**`

- Next.js pages, layouts, and route handlers.
- Compose presentation and application code from `src/modules/**`.
- Do not contain business logic beyond request parsing, auth checks, and response formatting.

### `src/modules/<module>/domain`

- Business concepts, invariants, value objects, and pure domain helpers.
- No framework imports.
- No direct database or HTTP client access.

### `src/modules/<module>/application`

- Use cases and orchestration.
- Coordinates domain logic and infrastructure interfaces.
- Accepts dependencies explicitly.

### `src/modules/<module>/infrastructure`

- Supabase repositories.
- External service adapters.
- Persistence mappers and transport mappers.
- This is the only module layer that talks directly to storage or third-party SDKs.

### `src/modules/<module>/presentation`

- React components, hooks, view models, client-side state helpers, and screen composition.
- Presentation code may depend on application-facing module exports, but not on another module's infrastructure internals.

### `src/shared/**`

- Cross-cutting code used by multiple modules.
- Allowed categories: config, generic utilities, shared UI primitives, shared types, validation helpers.
- Shared code must stay generic. If logic is domain-specific, it belongs in a module.

## Import Rules

1. `app/**` may import from `src/modules/**` and `src/shared/**`.
2. A module may import from its own subdirectories and from `src/shared/**`.
3. A module must not import another module's `infrastructure/**` directly.
4. Cross-module access must go through the other module's public exports in `index.ts`.
5. Presentation code must not import server-only infrastructure files directly.

## Module Boundaries

The current primary modules are:

- `auth`
- `catalog`
- `inventory`
- `checkout`
- `orders`
- `shipping`
- `customers`
- `nexus`
- `storefront`
- `admin-shell`

Additional modules may be introduced when they represent durable business capabilities with clear ownership.

## Design Guidance

### Use DDD selectively

Apply richer domain modeling only where the business rules justify it, especially:

- orders
- checkout
- shipping
- nexus

Keep CRUD-heavy admin settings simpler unless real invariants emerge.

### Use CQRS selectively

Separate read and write models only where complexity or performance clearly benefits from it, such as:

- order reporting
- transaction detail surfaces
- admin list/detail views with heavy projections

Do not impose CQRS globally.

### Use Hexagonal Boundaries Pragmatically

External integrations such as Supabase, email, shipping APIs, and hosted payments must remain outside domain code.

Use ports and adapters where it reduces coupling. Do not add ceremony without a boundary worth protecting.

## Migration Rules For Existing Code

1. New features should be added under `src/modules/**` unless a strong reason exists not to.
2. When touching large files under `src/services/**`, `src/repositories/**`, or `src/components/**`, prefer extraction into a module-owned file instead of growing the shared layer.
3. Keep compatibility shims when needed during migration, but treat them as temporary.
4. Do not perform broad repo-wide moves without a clear module target and verification.
5. Each migration step must leave the application in a working, testable state.

## Anti-Patterns

Avoid:

- giant shared service files that own multiple business workflows
- giant shared repository files that mix unrelated queries
- route handlers with embedded business logic
- UI components importing server-side persistence code
- domain-specific helpers hidden in generic utility folders
- creating a microservice boundary before module boundaries are stable

## Definition Of Done For Architecture Work

An architecture migration step is complete when:

1. Ownership moved into the correct module or shared boundary.
2. Imports follow the rules above.
3. Runtime behavior is unchanged unless intentionally modified.
4. Tests and type checks covering the touched surface pass.
