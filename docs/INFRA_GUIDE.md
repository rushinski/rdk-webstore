# Infra Guide

This document describes the infrastructure components used by the RDK stack.

## Core services
- **Vercel**: hosting for Next.js (serverless + edge runtime)
- **Supabase**: Postgres, Auth, Storage, and SSR helpers
- **Stripe**: checkout payments and Connect payouts
- **Shippo**: shipping rates and label purchase
- **Upstash Redis**: rate limiting
- **AWS SES**: transactional email

## Supabase
- Local config: `supabase/config.toml`
- Migrations: `supabase/migrations/*.sql`
- Seed: `supabase/seed.sql`
- Type generation: `npm run gen:types:local` or `npm run gen:types:hosted`

Local ports (default):
- API: 54321
- DB: 54322
- Studio: 54323

## Storage
- Product images are stored in Supabase Storage.
- Next.js remote image config allows Supabase Storage domains.

## Stripe
- Server SDK usage in `src/lib/stripe/stripe-server.ts` and `src/services/checkout-service.ts`.
- Stripe Connect flows in `src/services/stripe-admin-service.ts`.
- Webhooks: `/api/webhooks/stripe`.

## Shippo
- Server SDK usage in `src/services/shipping-label-service.ts`.
- Webhooks: `/api/webhooks/shippo`.

## Upstash Redis
- Used by `src/proxy/rate-limit.ts` and `app/api/contact/route.ts`.
- Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

## Email (AWS SES)
- Email sending via `src/lib/email/mailer.ts`.
- Required env vars: `SES_SMTP_HOST`, `SES_SMTP_USER`, `SES_SMTP_PASS`, `SES_FROM_EMAIL`, `SES_FROM_NAME`.

## Local HTTPS with Caddy
For local HTTPS (auth callbacks):
- Start with `npm run caddy:start`
- Supabase is proxied to `https://localhost:8443`
- Next.js is proxied to `https://localhost:8444`

## Environment variables
See `.env.example` and `src/config/env.ts` for the complete required list.
