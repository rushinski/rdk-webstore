# MVP Plan

## Checkout flow (required)
- Create a pending order before redirecting to Stripe Checkout.
- Stripe Checkout is the only payment UI in MVP (no tax logic).
- Webhook finalization:
  - Verify signature.
  - Enforce idempotency with the `stripe_events` table.
  - Update order status and inventory.
  - Create order timeline events.
  - Send order confirmation and local pickup instruction emails.

## Guest checkout
- Unauthenticated users see a checkout gate with guest vs sign-in/create options.
- Guest checkout requires a valid email with clear disclosure copy.
- Guest order access is via an expiring tokenized link; only hashes are stored.
- Guest checkout can be disabled via `NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED`.

## Local pickup communications
- Send a dedicated local pickup instructions email after payment confirmation.
- Reply-To is set to `SUPPORT_INBOX_EMAIL` to keep communications in email.
- Signed-in customers may also use in-app messaging; guests do not.

## Order access model
- Authenticated users view order history in account pages and API routes using RLS.
- Guest order status is fetched via server routes that validate access tokens with the service role.

## Rollback
- Disable guest checkout via feature flag.
- Revert to previous deployment tag if needed; Stripe webhook flow remains unchanged.
