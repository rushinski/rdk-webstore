# Security

This document describes the current security posture of the codebase. It is derived from the implementation, not legacy docs.

## Core principles
- Defense in depth with a request proxy pipeline in `proxy.ts`.
- Supabase RLS enforced for user data; admin access is server validated.
- No secrets in the client bundle; only `NEXT_PUBLIC_*` values are exposed.
- Structured logging with PII masking.

## Authentication and sessions
- User authentication is handled by Supabase Auth.
- Admin access requires:
  - an authenticated Supabase user
  - profile role in `admin`, `super_admin`, or `dev`
  - a short-lived admin session cookie (`admin_session`)
  - MFA when required by Supabase AAL policies

## RBAC
Roles and permissions are centralized in `src/config/constants/roles.ts`:
- `dev`: full access
- `super_admin`: full access except admin invites
- `admin`: cannot invite, cannot view bank details

## Request proxy pipeline
All requests pass through the proxy pipeline in `proxy.ts`:
- Canonicalization (lowercase, no duplicate slashes)
- Bot filtering (UA checks)
- CSRF protection for unsafe methods
- Upstash rate limiting for `/api`, `/admin`, `/auth`, `/checkout`
- Admin guard for `/admin` and `/api/admin`
- Response finalization with security headers and `x-request-id`

Configuration lives in `src/config/security.ts`. The proxy is the enforcement point for request IDs, security headers, and admin guardrails.

## Webhooks
- Stripe webhooks must validate signatures before processing.
- Shippo webhooks must validate their shared secret.
- Stripe events are persisted for idempotency in the `stripe_events` table.

## Logging and PII
- Logs are structured JSON via `src/lib/log.ts`.
- Email addresses are masked in logs.
- Sensitive keys (tokens, cookies, passwords) are redacted.

## Secrets and env vars
- Secrets are loaded and validated in `src/config/env.ts`.
- Client-exposed env vars are validated in `src/config/client-env.ts`.
- Never place secrets in `NEXT_PUBLIC_*` variables.

## Storage and files
- Supabase Storage is used for product images (see Next.js remote image config).
- File attachments to contact forms are limited by `security.contact.attachments`.

## Vulnerability reporting
- Report security issues to the engineering owner.
- Include request IDs, timestamps, and any Stripe/Shippo event IDs.

## Incident response
See `docs/RUNBOOK.md` for triage steps and escalation.
