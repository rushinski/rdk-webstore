# SECURITY.md — Realdealkickz

**Comprehensive Security Architecture (Local → Staging → Production)**

**Version: 2025-Q4 Rewrite**

---

# 0) Purpose & Scope

This document defines the **security posture, controls, enforcement rules, and operational guardrails** for the Real Deal Kickz platform across all environments:

- **Local Development**
- **Staging (Prod-like)**
- **Production**

The security model is built on:

- Supabase (Postgres + Auth + RLS)
- Next.js App Router (server actions, route handlers)
- Stripe Checkout
- Upstash rate limiting
- Structured logging with request IDs
- Versioned migrations + CI enforcement
- Centralized Zod-based environment validation
- Multi-tenant-ready schema and RLS model

This doc is authoritative for all phases (MVP → Scaling).

---

# 1) Security Goals

1. Prevent account takeover for admins and customers.
2. Enforce strict least-privilege access via RLS + app-level guards.
3. Guarantee env correctness via centralized validation (`src/config/env.ts`).
4. Ensure reliable, tamper-proof payment flows through Stripe Checkout & webhook signatures.
5. Avoid data leakage from caching, rate limits, RLS, or multi-tenant expansions.
6. Maintain integrity across environments through versioned migrations.
7. Provide auditable logs with request correlation (x-request-id).
8. Protect infrastructure through edge rate limiting and abuse mitigation.

---

# 2) Environment Model Security

## 2.1 Local Development

- Stripe **test** keys only.
- Optional local Supabase OR staging Supabase.
- No sensitive admin operations.
- Non-persistent session cookies allowed.
- Caddy provides HTTPS simulation only.

## 2.2 Staging

**Purpose:** Full prod-like environment for load testing, RLS validation, migration rehearsal.

Controls:

- Uses same migrations and schema as prod.
- Stripe **sandbox** flows only.
- Admin access restricted (least privilege).
- RLS and tenant isolation tests executed here.
- Rate limiting active.

## 2.3 Production

- Only deployable via **signed Git tags**.
- All secrets injected through Vercel & GitHub Secrets.
- Webhooks must verify signatures and idempotency keys.
- Full monitoring & alerting active.
- No local or staging keys permitted.

---

# 3) Authentication & Identity

## 3.1 Providers

- Supabase Auth (email/password, TOTP 2FA).
- Roles: `customer`, `admin` (future: `tenant_admin`, `ops`).

## 3.2 Mandatory 2FA for Admins

- Admin dashboard access requires TOTP setup.
- Enforced in backend, not client-only.

## 3.3 Session Model

- HTTPOnly + Secure + SameSite=Lax cookies.
- **Non-persistent** session cookies → require login after browser close.
- Sessions refresh on activity (optional).
- No access tokens in localStorage ever.

---

# 4) Authorization & RLS

## 4.1 RLS Baseline

- Products: public read, admin write.
- Orders: users may read only their own; admin/system may update.
- Profiles: self-read/write; admins read all.

## 4.2 Multi-Tenant / Multi-Seller Ready Model

Tables optionally include:

- `tenant_id` or `seller_id`
- Index on tenant/seller
- Row policies isolate resources per tenant/customer

Repo layer automatically injects tenant context.

## 4.3 App-Level Authorization

- Middleware checks role claims for all admin routes.
- Server actions validate user + role before executing.
- No trust in client-side state.

---

# 5) Payments Security (Stripe)

## 5.1 Checkout-Only Architecture

- Platform never sees card numbers (SAQ-A).
- Only Stripe-hosted Checkout is used.

## 5.2 Webhook Enforcement

- Verify signature against `STRIPE_WEBHOOK_SECRET`.
- Reject if timestamp window invalid or replay detected.
- Use idempotency keys for all DB mutations.
- Log request IDs + webhook event IDs.

## 5.3 Data Stored

- Only: `checkout.session.id`, `payment_intent.id`, amounts, and status.
- **No card data stored.**
- Taxes remain out-of-scope and handled externally by business operations.

---

# 6) Secrets Management & Environment Validation

## 6.1 Secrets Storage

- Local: `.env.local` (ignored in Git).
- CI: GitHub Secrets.
- Prod/Staging: Vercel Environment Variables.
- Rotation required quarterly or after incident.

## 6.2 Centralized Env Validation

File: `src/config/env.ts` (Zod schema)

- Build fails if any required env var missing.
- Prevents silent misconfiguration across environments.

## 6.3 Critical Vars

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY

STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET

SENTRY_DSN
POSTHOG_KEY
RATE_LIMIT_REDIS_URL   # Upstash

```

---

# 7) Caching & CDN Controls

## 7.1 Public / Catalog Pages

- ISR w/ revalidate: 60s
- `dynamic = "force-static"`
- Tag-based invalidation: `revalidateTag("products")`

## 7.2 User / Sensitive Pages

- `dynamic = "force-dynamic"`
- `fetchCache = "force-no-store"`
- No cache for orders, user data, or admin data.

## 7.3 Images & Assets

- `max-age=86400`, `immutable`
- Content-hashed filenames prevent poisoning.

## 7.4 APIs

- Public APIs: short TTL (≤30s)
- Private APIs: `no-store`

## 7.5 Risk Mitigation

- Prevents private data caching leakage.
- Predictable invalidation system-wide.

---

# 8) Edge Rate Limiting & Abuse Prevention

## 8.1 Upstash Rate Limiting

Applied to:

- `/api/*`
- `/auth/*`
- `/checkout/*`
- `/admin/*`

Default:

- **30 requests/min per IP**
- Hard fail with JSON error + request ID.

## 8.2 Abuse Traffic Detection

Staging & production log:

- IP spikes
- Repeated authentication failures
- Checkout thrashing
- High-volume scraper behavior

---

# 9) Logging, Observability & Request IDs

## 9.1 Structured Logging

All logs emitted in JSON:

- timestamp
- x-request-id
- userId (if available)
- route
- stripeSessionId
- duration
- error details

## 9.2 Correlation

Logs unify across:

- Vercel
- Supabase
- Stripe logs
- Sentry traces

## 9.3 PII Redaction

- No emails or addresses logged except in admin-only paths.
- Error logs scrub PII by default.

---

# 10) Background Jobs & Long-Running Workflows

**Jobs live in `/src/jobs/*`**, including:

- Stripe webhook processors
- Cache revalidation
- Inventory synchronization
- Emails
- Order lifecycle workflows

Security rules:

- Jobs must validate all inputs.
- Jobs run with minimal Supabase permissions.
- Idempotency required for all job actions.
- No unbounded loops or retry storms.

---

# 11) Database & Migration Integrity

## 11.1 Versioned Migrations

- All schema stored in `/supabase/migrations/*`.
- No ad-hoc SQL allowed.
- Migrations applied in CI during tag-based deploys.

## 11.2 Schema Drift Prevention

- CI performs migration dry-run.
- Checksums validated.
- Staging validated daily.

---

# 12) Data Classification & Retention

## 12.1 Classes

- **Public:** catalog, marketing assets
- **Internal:** logs, metrics (non-PII)
- **PII:** user profile + shipping info
- **Sensitive 3rd-party:** Stripe tokens/IDs only

## 12.2 Retention Rules

- Guests: no persisted PII.
- Registered users: PII retained until deletion request.
- Orders: retained 24 months or business-defined.
- Backups: Supabase default retention windows.

---

# 13) Failure Modes & Mitigations

| Failure | Mitigation |
| --- | --- |
| Missing env var | Env validator blocks build |
| Abuse traffic | Upstash rate limiting |
| RLS leak | Staging RLS test suite + policy CI tests |
| Stripe replay | Signature + idempotency checks |
| Cache staleness | Tag revalidation |
| Schema drift | Versioned migrations + CI dry-run |
| Webhook outage | Automatic alert + replay flow |
| Multi-tenant bleed | Tenant-scoped queries + RLS |

---

# 14) CI/CD Security

- Releases only via **signed Git tags**.
- Deploy pipeline applies migrations **before** deploying.
- No secrets printed in logs.
- Dependabot + npm audit enforced.
- OpenAPI schema validated on every run.

---

# 15) Headers & Transport Security

- Strict CSP (default-src self; allowlists for Stripe, Supabase, PostHog).
- HSTS: `max-age=31536000; includeSubDomains; preload`
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY (or via CSP frame-ancestors)
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: minimum viable surface

---

# 16) Incident Response

1. Detect alert (Sentry / Stripe / DB).
2. Classify severity (P0–P3).
3. Contain (disable feature, rotate secrets, rate-limit heavy traffic).
4. Patch + redeploy via tagged build.
5. Validate `/healthz` + `/readyz`.
6. Postmortem within 48 hours.

---

# 17) Security Checklist (MVP → Scaling)

- [ ]  Admin 2FA enforced
- [ ]  RLS active + tested (orders/products/profiles)
- [ ]  Zod env validator passing in all envs
- [ ]  Upstash rate limiting active
- [ ]  Structured logging with request ID
- [ ]  Stripe webhook signature + idempotency
- [ ]  Non-persistent session cookies
- [ ]  Cache safety rules enforced
- [ ]  Versioned migrations in place
- [ ]  No secrets in git
- [ ]  Sentry/PostHog configured
- [ ]  Staging environment active
- [ ]  Load tests + RLS tests pass