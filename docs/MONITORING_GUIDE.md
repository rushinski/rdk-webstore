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

## Payments and Shippo
- Checkout and payment processing logs are tagged with request and order identifiers.
- Shippo failures are logged from `shipping-label-service`.

## External observability
- `src/config/ci-env.ts` includes placeholders for Sentry and PostHog.
- There is no runtime instrumentation in code yet; Vercel logs are the current source of truth.

## Recommended alerts
- High rate of 4xx/5xx in `/api/checkout/*`
- Spike in payment-processing failures for `/api/checkout/create-checkout`
- Email send failures (SES timeouts)
