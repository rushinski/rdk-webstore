# Frontend Standards

## Placement

- `app/` contains route entrypoints, route layouts, and server composition.
- `src/components/<domain>` contains renderable UI components.
- `src/components/storefront/*` is the canonical storefront UI tree.
- `src/components/admin/*` is the canonical admin UI tree.

## Imports

- Use `@/` imports for application code.
- Do not import from `../../../src/...` out of `app/`.

## Route Shape

- Prefer server `page.tsx` by default.
- Move heavy interactive UI into `client.tsx` or focused screen components.
- Keep page files thin and declarative.
