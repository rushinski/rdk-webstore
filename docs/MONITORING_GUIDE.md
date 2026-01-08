# Monitoring Guide

This document describes the current monitoring and observability approach.

## Logs
- Structured JSON logging via `src/lib/log.ts`.
- Logs include `requestId`, `layer`, `route`, and redacted metadata.
- Email addresses are masked before output.
- Logs are written to stdout/stderr (Vercel logs in production).

## Request IDs
- The proxy adds `x-request-id` to all responses.
- Use `x-request-id` to correlate client errors with server logs.

## Health checks
- `GET /api/healthz` (liveness)
- `GET /api/readyz` (readiness)

## Stripe and Shippo
- Stripe webhook processing logs are tagged with `stripeEventId`.
- Shippo failures are logged from `shipping-label-service`.

## Rate limiting
- Proxy rate limiting emits structured logs when limits are exceeded.
- Upstash dashboard provides request metrics and usage.

## External observability
- `src/config/ci-env.ts` includes placeholders for Sentry and PostHog.
- There is no runtime instrumentation in code yet; Vercel logs are the current source of truth.

## Recommended alerts
- High rate of 4xx/5xx in `/api/checkout/*`
- Spike in `/api/webhooks/stripe` failures
- Elevated rate limit blocks on `/auth` and `/admin`
- Email send failures (SES timeouts)
