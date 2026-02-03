# Real Deal Kickz (RDK)

Real Deal Kickz is a full-stack ecommerce storefront and admin console built on Next.js App Router with Supabase and Stripe.

## Stack
- Next.js 16 App Router (React 19)
- Supabase Postgres + Auth (SSR helpers)
- Stripe Checkout + Stripe Connect (admin payouts)
- Shippo (shipping rates and labels)
- Upstash Redis (rate limiting; memory fallback in dev/test)
- AWS SES (transactional email)
- Tailwind CSS

## Repo layout
- `app/`: App Router pages and API route handlers
- `src/components/`: UI components
- `src/services/`: business logic
- `src/repositories/`: database access
- `src/lib/`: shared helpers (supabase, auth, logging, idempotency)
- `src/proxy/` and `proxy.ts`: request proxy pipeline
- `src/config/`: env validation, security config, constants
- `supabase/`: migrations and seed data
- `tests/`: unit, integration, RLS, and Playwright E2E

## Local development
1) Install dependencies:
```
npm ci
```
2) Create local env:
```
cp .env.example .env.local
# PowerShell: Copy-Item .env.example .env.local
```
Fill in values in `.env.local`.
Upstash is optional for local dev; the proxy uses an in-memory rate limiter when Upstash is not configured.

3) Start Supabase locally:
```
npm run supabase:start
```

4) Start Next.js:
```
npm run dev
```

Optional HTTPS (for local OAuth callbacks and Supabase auth redirects):
```
npm run caddy:start
```
This serves Next.js at `https://localhost:8444` and Supabase at `https://localhost:8443`.

## Tests
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Unit + integration: `npm run test:jest`
- E2E: `npm run test:e2e`

E2E configuration flags:
- `E2E_MODE=local|vercel`
- `E2E_BASE_URL` (set to target Vercel)
- `E2E_SEED_STRATEGY=cli|remote|none`
- `E2E_TEST_MODE=1` and `NEXT_PUBLIC_E2E_TEST_MODE=1` enable test-only bypasses

See `package.json` and `tests/` for test entry points and coverage areas.

## Documentation
- `docs/PROJECT_OVERVIEW.md` (full system overview for rebuild planning)
- `docs/ARCHITECTURE.md`
- `docs/API_SPEC.md`
- `docs/SECURITY.md`
- `docs/DEPLOYMENT_PIPELINE.md`
- `docs/INFRA_GUIDE.md`
- `docs/MONITORING_GUIDE.md`
- `docs/PROXY_PIPELINE.md`
- `docs/RUNBOOK.md`
- `docs/SYSTEM_DESIGN.md`
