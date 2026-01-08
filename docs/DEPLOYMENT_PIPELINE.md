# Deployment Pipeline

This document reflects the current CI and deployment flow defined in `.github/workflows/staging.yml` and `vercel.json`.

## Environments
- `staging`: GitHub Actions workflow on the `staging` branch
- `production`: Vercel production deployment (manual or separate workflow if added)

## CI pipeline (staging branch)
The `staging` workflow runs three jobs:

### 1) upstream-validation
Runs on every `staging` branch push:
- Checkout
- Node setup + `npm ci`
- Validate CI env (`npm run ci-env:check`)
- Enforce env and file case rules (`npm run check:env-case`, `npm run check:file-case`)
- Start a local Postgres service and apply Supabase migrations
- `supabase db lint`
- Lint, typecheck, unit/integration tests
- `npm run build`

### 2) push-migrations
After validation, push migrations to the staging Supabase project:
- `supabase db push --db-url $SUPABASE_DB_URL`

### 3) deploy-staging
Deploys to Vercel using Vercel CLI:
- `vercel link` to the staging project
- `vercel deploy --prod`
- Smoke tests `/api/healthz` and `/api/readyz`
- Run RLS tests and E2E tests

## Vercel settings
`vercel.json` disables automatic Git deploys:
- deployments are driven by CI or manual Vercel CLI runs

## Required secrets
See `src/config/ci-env.ts` for CI-required secrets. These must be set in GitHub Environment secrets for `staging`.

## Local staging simulation
- Use Supabase CLI: `supabase start`
- Run `npm run ci-env:check`
- Run `npm run test:jest` and `npm run test:e2e`
