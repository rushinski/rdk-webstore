# Architecture

This document describes the current architecture of the RDK codebase. It is derived from the code, not legacy docs.

## System overview
- Next.js App Router handles all pages and API routes.
- Supabase provides Postgres, Auth, Storage, and SSR session helpers.
- Stripe handles checkout and Connect payouts.
- Shippo handles shipping rates and label purchase.
- Upstash Redis provides rate limiting in production; local/dev/test uses an in-memory fallback.
- AWS SES is used for transactional email.

## Layering and boundaries
Code is organized into strict layers:
- `app/api/**/route.ts`: route handlers (thin controllers)
- `app/**`: pages (thin composition)
- `src/components/**`: UI components
- `src/services/**`: domain logic
- `src/repositories/**`: database queries
- `src/lib/**`: shared helpers, infra glue
- `src/jobs/**`: async workflows
- `src/proxy/**` and `proxy.ts`: request proxy pipeline
- `src/config/**`: env validation, security, constants

Rules:
- Services never create Supabase clients. Routes or jobs create clients and pass them in.
- Repositories are the only layer that executes database queries.
- UI components do not import server-only modules.

## Request flow
1) Request enters `middleware.ts`, which delegates to `proxy.ts` (canonicalization, bot checks, CSRF, rate limits, admin guard).
2) Route handler validates input using `src/lib/validation/**`.
3) Route creates Supabase client (SSR) and calls services.
4) Services coordinate repositories and external APIs.
5) Repositories execute typed Supabase queries.
6) Responses include `x-request-id` and security headers.

## Key subsystems

### Storefront and catalog
- Product browse and filtering via `/store` and `/api/store/*` routes.
- Product parsing and catalog normalization via `catalog-service` and admin catalog routes.

### Cart and checkout
- Cart validation in `/api/cart/validate`.
- Checkout session creation in `CheckoutService` with server-side totals.
- Payment confirmation verifies Stripe status, amount, and currency.

### Orders
- Orders and order items persisted in `orders` and `order_items`.
- `stripe_events` stores processed event IDs for idempotency.

### Shipping
- Shipping defaults and carriers stored in `shipping_defaults` and `shipping_carriers`.
- Shippo integration in `shipping-label-service`.

### Admin
- Admin guard is enforced in the proxy and in admin route handlers.
- Admin roles are defined in `src/config/constants/roles.ts`.
- Stripe Connect admin flows are handled by `stripe-admin-service`.

### Messaging
- Chats and chat messages are stored in `chats` and `chat_messages`.

## Supabase usage
- Server clients: `src/lib/supabase/server.ts`
- Client-side Supabase: `src/lib/supabase/client.ts`
- Admin service role client: `src/lib/supabase/admin.ts`
- Typed DB schema: `src/types/database.types.ts`

## Proxy pipeline
See `docs/PROXY_PIPELINE.md` for the detailed proxy sequence and enforcement rules.

## Constants
Non-trivial constants are centralized under `src/config/constants/**`.

## Testing
- Unit and integration tests are in `tests/unit` and `tests/integration`.
- RLS tests are in `tests/rls`.
- Playwright E2E tests are in `tests/e2e`.
- Coverage matrix: `docs/testing/PASS5_COVERAGE_MATRIX.md`.
