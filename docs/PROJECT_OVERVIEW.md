# PROJECT_OVERVIEW.md — Realdealkickz

> Purpose: Single authoritative overview of the Real Deal Kickz platform — architecture, environments, processes, and ownership. This document maps the entire system at a high level and links into deeper docs (Architecture, Security, Infra Guide, Runbook, Deployment Pipeline).
> 

---

## 1) Project Summary

**Project Name:** Real Deal Kickz (RDK)

**Mission:** Build a production-grade resale platform with **predictable reliability**, **strict security**, and **scalable architecture**.

**Core Stack:** Next.js (App Router) · Supabase · Stripe Checkout · Vercel · Docker · GitHub Actions

**Architecture Principles:**

- Enforce correctness through **explicit versioned migrations** and **tag-gated deployments**.
- Guarantee config safety via the **central env validator**.
- Adopt a clean **layered application architecture** (repositories → services → jobs → route handlers).
- Treat staging as a **production-like test bed**.
- Every workflow and component passes the **Critical Validation Loop (CVL)**.

---

## 2) Documentation Map (Authoritative Sources)

| Document | Purpose |
| --- | --- |
| **ARCHITECTURE.md** | Full system architecture, environment design, runtime model |
| **SECURITY.md** | Secrets, RLS, 2FA, access control, security posture |
| **INFRA_GUIDE.md** | Infra layout, Docker, Vercel, Supabase, networking |
| **SYSTEM_PLAN.md** | Project phases and business/system roadmap |
| **RUNBOOK.md** | Operational playbooks for incidents, deploys, backups |
| **DEPLOYMENT_PIPELINE.md** | CI/CD, tag-based release model, migration flow |
| **MONITORING_GUIDE.md** | Observability, dashboards, alerting, SLOs |
| **API_SPEC.yaml** | OpenAPI contract for backend routes |

---

## 3) Environment Model (New 3-Tier Architecture)

### **Local Development**

- Fast iteration.
- Supabase: local instance or staging DB.
- Stripe test keys only.
- Zero risk: no production data or money.

### **Staging (Production-Like)**

- Full integration & load testing.
- All migrations applied before production.
- Rate limiting, caching, RLS validation.
- Stripe sandbox flows.
- Security scanning & QA.

### **Production**

- Only deployed via **signed Git tags**.
- Observability, SLOs, monitoring, alerts enforced.
- Schema, env, and build parity with staging.

**Why this matters:**

No more “works locally, breaks in prod.” Staging guarantees runtime parity, reduces unknowns, and prevents last-minute deploy failures.

---

## 4) Repository Structure (Updated)

```
/
├─ app/                     # Next.js (App Router)
│  ├─ api/                  # Route Handlers (thin controllers)
│  ├─ (store)/...           # Pages
│  └─ admin/...
├─ src/
│  ├─ repositories/         # Data access (Supabase queries)
│  ├─ services/             # Domain logic
│  ├─ jobs/                 # Background workflows
│  ├─ config/               # env.ts, caching, rate limits, runtime config
│  ├─ lib/                  # supabase client, stripe, logging, helpers
│  └─ types/
├─ supabase/
│  ├─ migrations/           # Versioned SQL migrations
│  └─ seed.sql
├─ infra/                   # Docker, Caddy, local env
├─ docs/                    # All documentation
├─ .github/workflows/       # CI/CD
└─ .env.example

```

---

## 5) Application Layering Model

The application is now structured as a **professional multi-layered architecture**:

### **Repositories (Data Layer)**

- All database access centralized.
- Index-aware queries.
- Enforced RLS context.
- Future-ready for multi-tenant injection.

### **Services (Domain Logic Layer)**

- Business rules, validation.
- Order flows, pricing rules.
- Inventory coordination.

### **Jobs (Background Workflow Layer)**

- Stripe webhook processing.
- Cache revalidation & invalidation.
- Email sending.
- Inventory lifecycle operations.

### **Route Handlers (I/O Layer)**

- Thin controllers.
- Input validation → call service → return response.

**Why this matters:**

Massive reduction in complexity, clean refactoring, easier testing, and scalable long-term architecture.

---

## 6) Data Model (Multi-Tenant Ready)

All core tables are structured with optional **tenant_id / seller_id** fields (not used yet, but safe for future expansion).

Indexes exist to support multi-seller queries with zero schema rewrite.

RLS is validated through CI + staging tests.

---

## 7) Caching Strategy (Explicit Rules)

| Category | Behavior |
| --- | --- |
| Catalog (public) | ISR (60s), `force-static`, tag revalidation |
| Product detail | ISR with `revalidateTag('products')` |
| Images & assets | `max-age=86400, immutable`, hashed filenames |
| User pages | `force-dynamic`, no-store |
| Public API | Short TTL (30s) |
| Private API | no-store |

No accidental caching of private data.

Cache invalidation triggered from both **admin actions** and **Stripe events**.

---

## 8) Rate Limiting (Edge Middleware)

Upstash-based:

- `/api/*`
- `/auth/*`
- `/checkout/*`
- `/admin/*`

Default: **30 requests/min per IP**.

Protects Stripe, Supabase, and prevents bot scrapers.

---

## 9) Structured Logging + Request IDs

Each request includes:

- `x-request-id`
- JSON logs with contextual metadata:
    - userId
    - stripeSessionId
    - route
    - duration

Correlates across:

- Vercel logs
- Supabase logs
- Sentry traces
- Stripe events

Critical for high-fidelity debugging.

---

## 10) Migrations & Release Discipline

### Versioned Migrations

- Every schema change created via `supabase db diff`.
- All SQL stored in `supabase/migrations/*`.
- Staging always receives migrations before prod.

### Deployments

- Only via **signed tags**: `vMAJOR.MINOR.PATCH`.
- CI/CD enforces:
    - Lint
    - Type checks
    - Tests
    - OpenAPI validation
    - Migration dry-run
    - Preview + e2e tests (PRs)
    - Staging → Production release path

No untagged deploys allowed.

---

## 11) Load Testing & RLS Testing

Staging environment supports:

### Load Testing

- Catalog pages
- Product pages
- Checkout flows
- Admin APIs
- Rate limit response

### RLS Testing

- Validate tenant isolation (when activated)
- Validate user ownership rules
- Validate admin override logic

Guarantees safety under real load.

---

## 12) Observability & Monitoring (Updated)

- Sentry (errors)
- PostHog (events)
- Vercel Analytics (performance)
- Request-ID tracing
- Stripe dashboard monitoring
- Supabase audit logs

**SLO Targets**

- 99.9% uptime
- <200ms p95 DB latency
- ≥98% checkout success rate

---

## 13) Failure Modes & Mitigations (Expanded)

| Failure Mode | Mitigation |
| --- | --- |
| Schema drift | Versioned migrations + staging verification |
| Webhook replay | Stripe signature verification + idempotency |
| Cache staleness | Tag revalidation from jobs & services |
| Abuse traffic | IP-based rate limiting at edge |
| Env misconfig | Centralized env validator (`src/config/env.ts`) |
| RLS leaks | Staging RLS tests + CI policy checks |
| Load spikes | ISR + CDN + rate limits |
| Missing admin safety | Mandatory 2FA + short-lived sessions |

---

## 14) Roadmap (Phase Summary)

| Phase | Focus |
| --- | --- |
| MVP | Core platform, secure checkout, admin CRUD |
| Post-MVP | Sentry, analytics, audit logs, SEO |
| Scaling | Staging env, workers, R2, dashboards |
| Intelligence | Advanced analytics, ML-ready schema |
| Maintenance | Stability, audits, upgrades |

---

## 15) Handoff Expectations

**New Engineer:**

Read ARCHITECTURE.md → INFRA_GUIDE.md → SYSTEM_PLAN.md.

**Ops & Admin:**

Read RUNBOOK.md → MONITORING_GUIDE.md → SECURITY.md.

**Integrators:**

Read API_SPEC.yaml (version linked to deployment tag).

---

**Real Deal Kickz — Modern, defensible, scalable system architecture.
Built for correctness today and flexibility tomorrow.**