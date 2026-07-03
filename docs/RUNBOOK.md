# Runbook

This runbook provides operational steps for common incidents.

## Quick health checks
- `GET /api/healthz` and `GET /api/readyz`
- Check Vercel logs for `requestId` and error spikes

## Incident: checkout failures
1) Verify the active payment provider status dashboard.
2) Check `/api/checkout/init-checkout`, `/api/checkout/create-checkout`, and `/api/checkout/confirm-payment` logs.
3) Inspect `orders` table for stuck `pending` orders.
4) Inspect the latest `payment_transactions`, `payment_events`, and `checkout_api_logs` rows for the affected order.
5) If needed, manually reconcile the order using the recorded payment transaction state.

## Incident: payment stuck in processing
1) Check the recorded payment transaction status in `payment_transactions`.
2) Confirm checkout responses for `processing` vs `succeeded`.
3) Validate the order has not already been marked paid or blocked by a duplicated request.

## Incident: shipping label failures
1) Check `/api/admin/shipping/labels` logs.
2) Verify Shippo API token and account status.
3) Confirm address and parcel inputs.

## Incident: admin access denied
1) Confirm user profile role in `profiles`.
2) Verify the Supabase session is still active.
3) Check MFA status (AAL2) for the user.

## Incident: email delivery errors
1) Check SES send failures in logs (`order_email_failed`).
2) Verify SES credentials and region.
3) Confirm SES sending limits.

## Recovery actions
- Rotate secrets via env vars and redeploy.
- Disable payment intake only as a last resort.

## Escalation
- App errors: engineering owner
- Payments: active provider support
- Shipping: Shippo support
- Database: Supabase support
