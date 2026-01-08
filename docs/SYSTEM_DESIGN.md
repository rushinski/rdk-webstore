# System Design

This document provides a high-level design view of the RDK platform.

## Context
- Web UI: Next.js App Router
- Data store: Supabase Postgres
- Auth: Supabase Auth + MFA for admins
- Payments: Stripe Checkout and webhook processing
- Shipping: Shippo rates and label purchase

## Core entities (public schema)
- `tenants`, `marketplaces`
- `products`, `product_variants`, `product_images`, `product_tags`, `tags`
- `catalog_brands`, `catalog_models`, `catalog_aliases`, `catalog_brand_groups`
- `orders`, `order_items`, `order_shipping`
- `profiles`, `user_addresses`, `shipping_profiles`
- `shipping_defaults`, `shipping_carriers`, `shipping_origins`
- `admin_invites`, `admin_notifications`, `admin_audit_log`
- `chats`, `chat_messages`
- `stripe_events` (idempotency)
- `email_subscribers`, `email_subscription_tokens`
- `contact_messages`

There are no database views.

## Checkout flow (high level)
1) Client calls `/api/checkout/session` with cart and fulfillment.
2) `CheckoutService` validates inventory and calculates totals.
3) Stripe Checkout session is created with idempotency.
4) User completes payment in Stripe.
5) `/api/webhooks/stripe` receives the event and runs `StripeOrderJob`.
6) Order state moves to `paid` and inventory is decremented.
7) Confirmation email is sent asynchronously with retry logic.

## Confirm-payment flow (client-side)
1) Client calls `/api/checkout/confirm-payment` with `orderId` and `paymentIntentId`.
2) Server verifies Stripe status and totals.
3) Order is marked paid transactionally and inventory is decremented.

## Shipping flow
1) Admin configures shipping defaults and origins.
2) Admin fetches rates via `/api/admin/shipping/rates`.
3) Admin purchases labels via `/api/admin/shipping/labels`.
4) Shippo webhook updates label status.

## Admin and RBAC flow
1) Proxy enforces admin guard for `/admin` and `/api/admin`.
2) Role permissions are enforced by server logic and RLS policies.
3) Admin invites are constrained by role permissions.

## Messaging flow
- Chats and messages are stored in `chats` and `chat_messages`.
- Admin notifications are generated for chat events.

## Observability
- Structured JSON logs with request IDs.
- Health and readiness endpoints for monitoring.
