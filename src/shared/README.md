# Shared

`src/shared/**` contains cross-cutting code that is intentionally reused by multiple modules.

Allowed examples:

- shared UI primitives
- generic utilities
- config
- shared validation helpers
- broad type helpers

If code is primarily about a single business capability such as orders, products, shipping, or checkout, it should live in that module instead.
