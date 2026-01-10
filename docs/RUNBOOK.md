# Runbook

This runbook provides operational steps for common incidents.

## Quick health checks
- `GET /api/healthz` and `GET /api/readyz`
- Check Vercel logs for `requestId` and error spikes

## Incident: checkout failures
1) Verify Stripe status dashboard.
2) Check `/api/checkout/session` and `/api/checkout/confirm-payment` logs.
3) Inspect `orders` table for stuck `pending` orders.
4) Confirm Stripe event delivery to `/api/webhooks/stripe`.
5) If needed, replay Stripe events in the Stripe dashboard.

## Incident: payment stuck in processing
1) Check Stripe payment intent status.
2) Confirm `confirm-payment` responses for `processing` vs `succeeded`.
3) Validate `stripe_events` contains the event ID (idempotency).

## Incident: shipping label failures
1) Check `/api/admin/shipping/labels` logs.
2) Verify Shippo API token and account status.
3) Confirm address and parcel inputs.

## Incident: admin access denied
1) Confirm user profile role in `profiles`.
2) Verify `admin_session` cookie is present and valid.
3) Check MFA status (AAL2) for the user.

## Incident: rate limiting blocks legitimate users
1) Check Upstash usage and logs (if `rateLimit.store = "upstash"`).
2) Review `security.proxy.rateLimitPrefixes`, `rateLimit.bypassPrefixes`, and `rateLimit.applyInLocalDev`.
3) Adjust limits in `src/config/security.ts` if needed and redeploy.

## Incident: email delivery errors
1) Check SES send failures in logs (`order_email_failed`).
2) Verify SES credentials and region.
3) Confirm SES sending limits.

## Recovery actions
- Rotate secrets via env vars and redeploy.
- Pause marketing campaigns that spike traffic if rate limits are hit.
- Disable Stripe webhook processing only as a last resort.

## Escalation
- App errors: engineering owner
- Payments: Stripe support
- Shipping: Shippo support
- Database: Supabase support
