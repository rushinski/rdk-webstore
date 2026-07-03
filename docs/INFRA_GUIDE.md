# Infra Guide

This document describes the infrastructure components used by the RDK stack.

## Core services

- **Vercel**: hosting for Next.js (serverless + edge runtime)
- **Supabase**: Postgres, Auth, Storage, and SSR helpers
- **Hosted payment provider**: checkout payments
- **Shippo**: shipping rates and label purchase
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

## Payments

- Active checkout payment flow lives under `app/api/checkout/*` and the supporting services in `src/services/**`.
- Provider-specific integrations are being standardized; prefer code inspection over legacy assumptions when working in this area.

## Shippo

- Server SDK usage in `src/services/shipping-label-service.ts`.
- Webhooks: `/api/webhooks/shippo`.
- `track_updated` is the webhook event for carrier lifecycle updates like in transit and delivered.
- `label created` is not driven by the tracking webhook in this repo. Customer label-created emails are sent immediately from `app/api/admin/shipping/labels/route.ts` when the label purchase succeeds.
- For Shippo-managed label-purchase events, subscribe separately to `transaction_created` or `transaction_updated`.
- Shippo cannot deliver webhooks to `localhost`. For non-production testing, use a public HTTPS tunnel URL instead of `https://localhost:8444`.
- Live carrier tracking updates require a live Shippo key. Test-mode tracking should use Shippo's mock tracking numbers.

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
