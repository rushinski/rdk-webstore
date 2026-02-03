# Project Overview - Real Deal Kickz (RDK)

This is the high-level, full-system reference for the RDK codebase. It summarizes
the stack, system boundaries, core flows, data model, integrations, and operational
posture. Use this when planning a backend rebuild.

RDK is currently single-tenant. The schema and layering are structured to support
multi-tenant expansion, but tenant scoping is not enabled in this release.

## 1) System at a glance

RDK is a full-stack ecommerce storefront and admin console built on Next.js App Router,
with Supabase as the database and auth provider. Payments are handled by Stripe
(Checkout and Connect payouts). Shipping is handled by Shippo. Rate limiting is
Upstash Redis in production and in-memory in local/dev/test. Transactional email
is sent via AWS SES. Deployments run on Vercel via GitHub Actions.

## 2) Core stack and services

Application:
- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS

Data and auth:
- Supabase Postgres (primary data store)
- Supabase Auth (user sessions, MFA)
- Supabase Storage (product images)

Payments and shipping:
- Stripe Checkout (payments)
- Stripe Connect (admin payouts)
- Shippo (rates and labels)

Infra and ops:
- Vercel (hosting)
- Upstash Redis (rate limiting)
- AWS SES (transactional email)

Observability:
- Structured JSON logs with request IDs
- Health and readiness endpoints

## 3) Repository layout and boundaries

Top-level structure:
- `app/`         Next.js App Router pages and API route handlers
- `src/`         business logic, config, helpers, and infra glue
- `supabase/`    migrations and seed data
- `docs/`        system documentation
- `infra/`       local infrastructure (Caddy, etc.)
- `tests/`       unit, integration, RLS, and E2E tests

Layering rules (enforced by convention):
- Route handlers are thin (validation + orchestration).
- Services contain domain logic.
- Repositories are the only layer that queries the database.
- Services do not create Supabase clients; callers pass them in.
- UI components do not import server-only modules.

Key entry points:
- `app/api/**/route.ts`         API routes
- `src/services/**`             domain logic
- `src/repositories/**`         data access
- `src/jobs/**`                 async workflows
- `src/lib/**`                  shared helpers
- `src/config/**`               env validation, security, constants
- `proxy.ts` and `src/proxy/**` request proxy pipeline

## 4) Runtime request flow (high level)

1) Request enters `proxy.ts` for canonicalization, security checks, and rate limiting.
2) Route handler validates input (zod schemas under `src/lib/validation/**`).
3) Route creates a Supabase client and calls services.
4) Services coordinate repositories and external APIs.
5) Repositories execute typed Supabase queries.
6) Response is finalized with security headers and `x-request-id`.

## 5) Core domains and capabilities

Storefront and catalog:
- Product listing and filtering (`/store`, `/api/store/*`)
- Catalog normalization and parsing tools for admin

Cart and checkout:
- Cart validation (`/api/cart/validate`)
- Stripe Checkout session creation (server-side totals)
- Confirm-payment flow for server verification

Orders:
- Orders and order items persisted in Postgres
- Stripe event idempotency with `stripe_events`

Shipping:
- Shipping defaults, carriers, and origins
- Shippo rate lookup and label purchase
- Shippo webhook processing

Accounts and auth:
- Supabase Auth sessions
- Account management (addresses, password, preferences)
- Admin MFA requirements (Supabase AAL policies)

Admin:
- Product CRUD and catalog tooling
- Order refunds and fulfillment
- Shipping configuration and label purchase
- Stripe Connect payouts
- Admin invites and notifications

Messaging:
- Chats and messages stored in `chats` and `chat_messages`
- Admin notifications for chat events

Analytics and email:
- Basic event tracking endpoint
- Email subscriptions and contact form

Full API list:
- See `docs/API_SPEC.md` for every route and method.

## 6) Data model summary (public schema)

Core entities:
- Tenancy: `tenants`, `marketplaces` (present for future multi-tenant use)
- Catalog: `products`, `product_variants`, `product_images`, `tags`, `catalog_*`
- Orders: `orders`, `order_items`, `order_shipping`
- Users: `profiles`, `user_addresses`, `shipping_profiles`
- Admin: `admin_invites`, `admin_notifications`, `admin_audit_log`
- Messaging: `chats`, `chat_messages`
- Payments: `stripe_events` (idempotency)
- Email: `email_subscribers`, `email_subscription_tokens`
- Support: `contact_messages`

Typed DB schema lives in `src/types/db/database.types.ts`.

## 7) Security model

Authentication:
- Supabase Auth for user sessions
- Admin access requires role checks plus an admin session cookie
- MFA is enforced via Supabase AAL policies

Authorization:
- RLS enforced in Supabase for user data
- Server-side role checks for admin routes
- Admin roles: `admin`, `super_admin`, `dev`

Proxy pipeline (in `proxy.ts`):
- Canonicalization (lowercase, no duplicate slashes)
- Bot filtering
- CSRF protection for unsafe methods
- Rate limiting (Upstash in prod, memory in dev/test)
- Admin guard for `/admin` and `/api/admin`
- Security headers (CSP, HSTS, etc.)

Webhooks:
- Stripe signature verification is required
- Shippo webhook token verification is required

Guest access:
- Order status links use expiring tokens
- Only HMAC hashes are stored (peppered with `ORDER_ACCESS_TOKEN_SECRET`)

## 8) Configuration and environment

Env validation:
- `src/config/env.ts` validates server env vars
- `src/config/client-env.ts` validates public env vars
- `src/config/ci-env.ts` defines CI requirements

Security config:
- `src/config/security.ts` centralizes proxy behavior and CSP

Public vs private:
- Only `NEXT_PUBLIC_*` variables are client-exposed
- Secrets must never be in client envs

## 9) CI/CD and environments

Environments:
- Local development
- Staging (production-like)
- Production

Staging pipeline (see `docs/DEPLOYMENT_PIPELINE.md`):
- Lint, typecheck, unit/integration tests
- Supabase migration validation and linting
- Build verification
- Deploy via Vercel CLI
- Smoke tests plus RLS and E2E tests

Production pipeline:
- Tag-gated releases (`vMAJOR.MINOR.PATCH`)
- Migration validation on a local Postgres service
- Build, migrate, deploy via Vercel CLI
- Post-deploy health check (`/api/healthz`)

## 10) Testing strategy

Test types:
- Unit tests and integration tests (Jest)
- RLS tests (custom script)
- E2E tests (Playwright)

Coverage guidance:
- See `package.json` and `tests/` for test entry points and coverage areas.

## 11) Observability and operations

Logging:
- Structured JSON logs with request IDs
- PII masking for sensitive fields

Health:
- `GET /api/healthz` liveness
- `GET /api/readyz` readiness

Operational guidance:
- See `docs/RUNBOOK.md` and `docs/MONITORING_GUIDE.md`.

## 12) Backend rebuild considerations

If you rebuild the backend, preserve these contracts and behaviors:
- API surface in `docs/API_SPEC.md` (routes, shapes, auth assumptions)
- Stripe Checkout and confirm-payment flow (server-side totals and verification)
- Stripe and Shippo webhook verification and idempotency
- Order lifecycle transitions and inventory decrement logic
- Admin role checks and MFA enforcement
- Guest order access token hashing and expiry
- Rate limiting and CSRF protection at the edge or gateway
- RLS or equivalent data isolation for user data
- Environment validation and strict secret handling

Recommended module boundaries in the new backend:
- API layer (routing and input validation)
- Service layer (business logic and orchestration)
- Repository/data layer (DB access and transactions)
- Job/worker layer (webhooks, email, async tasks)
- Integration layer (Stripe, Shippo, SES, Supabase)

Suggested data ownership:
- Orders and order_items are source of truth for fulfillment
- Stripe events are the source of idempotency truth
- Catalog tables drive storefront visibility and filtering

## 13) Document map

Primary references:
- `docs/ARCHITECTURE.md`
- `docs/API_SPEC.md`
- `docs/SECURITY.md`
- `docs/INFRA_GUIDE.md`
- `docs/DEPLOYMENT_PIPELINE.md`
- `docs/MONITORING_GUIDE.md`
- `docs/PROXY_PIPELINE.md`
- `docs/RUNBOOK.md`
- `docs/SYSTEM_DESIGN.md`

Start here for rebuild planning:
- `docs/PROJECT_OVERVIEW.md`
