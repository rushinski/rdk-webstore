# System Design

This document provides a high-level design view of the RDK platform.

## Context
- Web UI: Next.js App Router
- Data store: Supabase Postgres
- Auth: Supabase Auth + MFA for admins
- Payments: hosted checkout and server-side order completion
- Shipping: Shippo rates and label purchase

## Core entities (public schema)
- `tenants`, `marketplaces`
- `products`, `product_variants`, `product_images`, `product_tags`, `tags`
- `catalog_brands`, `catalog_models`, `catalog_aliases`, `catalog_brand_groups`
- `orders`, `order_items`, `order_shipping`
- `profiles`, `user_addresses`, `shipping_profiles`
- `shipping_defaults`, `shipping_carriers`, `shipping_origins`
- `admin_invites`, `admin_audit_log`
- `email_subscribers`, `email_subscription_tokens`
- `contact_messages`

There are no database views.

## Checkout flow (high level)
1) Client calls `/api/checkout/init-checkout` with cart and fulfillment.
2) Server validates inventory and calculates totals.
3) Checkout is initialized with hosted payment state and idempotency.
4) Client submits the completed payment payload to `/api/checkout/create-checkout`.
5) Server verifies the payment outcome before moving the order to `paid`.
6) Inventory is decremented and order completion side effects are recorded.
7) Confirmation email is sent asynchronously with retry logic.

## Confirm-payment flow (client-side)
1) Client calls `/api/checkout/confirm-payment` with `orderId` and payment metadata.
2) Server verifies payment status and totals.
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

## Observability
- Structured JSON logs with request IDs.
- Health and readiness endpoints for monitoring.
