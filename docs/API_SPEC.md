# API Spec

This spec is derived from `app/api/**/route.ts`. It lists routes, methods, and primary validation sources.

## Conventions
- Base URL: `/api`
- JSON request/response unless noted.
- `x-request-id` is set by the proxy and is included in error responses.
- Most endpoints return `Cache-Control: no-store`.
- Validation schemas live under `src/lib/validation/**` (plus a few inline zod schemas in routes).
- Auth uses Supabase sessions. Admin routes additionally require an admin session cookie and role checks.

## Health
- `GET /api/healthz` - liveness probe
- `GET /api/readyz` - readiness probe

## Auth
- `POST /api/auth/register` - create user (body: `registerSchema`)
- `POST /api/auth/login` - sign in (body: `loginSchema`)
- `POST /api/auth/logout` - sign out
- `GET /api/auth/session` - current session summary
- `POST /api/auth/verify-email` - verify email code (body: `verifyEmailSchema`)
- `POST /api/auth/resend-verification` - resend verification (body: `resendVerificationSchema`)
- `POST /api/auth/otp/request` - request email OTP (body: `emailOnlySchema`)
- `POST /api/auth/otp/verify` - verify OTP (body: `otpVerifySchema`)
- `POST /api/auth/update-password` - update password (body: `updatePasswordSchema`)
- `POST /api/auth/forgot-password` - start reset (body: `emailOnlySchema`)
- `POST /api/auth/forgot-password/verify-code` - verify reset OTP (body: `otpVerifySchema`)
- `GET /api/auth/callback` - OAuth callback redirect
- `POST /api/auth/2fa/enroll` - enroll TOTP
- `POST /api/auth/2fa/verify-enrollment` - verify enrollment (body: `twoFactorVerifyEnrollmentSchema`)
- `POST /api/auth/2fa/challenge/start` - start MFA challenge
- `POST /api/auth/2fa/challenge/verify` - verify MFA challenge (body: `twoFactorChallengeVerifySchema`)

## Account
- `GET /api/me` - current user profile
- `GET /api/account/orders` - list orders
- `GET /api/account/addresses` - list addresses
- `POST /api/account/addresses` - add address
- `DELETE /api/account/addresses/{addressId}` - delete address
- `GET /api/account/notifications` - get chat notification preferences
- `PATCH /api/account/notifications` - update chat notification preferences (inline zod schema)
- `POST /api/account/password` - change password
- `GET /api/account/shipping` - fetch shipping profile
- `POST /api/account/shipping` - update shipping profile (inline zod schema)

## Storefront
- `GET /api/store/products` - list products (query: `storeProductsQuerySchema`)
- `GET /api/store/products/{id}` - product details
- `GET /api/store/filters` - list filter facets
- `GET /api/store/catalog/brands` - list brands (query: `storeBrandQuerySchema`)
- `GET /api/store/catalog/brand-groups` - list brand groups

## Cart
- `POST /api/cart/validate` - validate cart contents (body: `cartValidateSchema`)
- `POST /api/cart/snapshot` - store cart snapshot for auth redirects (body: `cartSnapshotSchema`)
- `GET /api/cart/restore` - restore cart snapshot

## Checkout
- `POST /api/checkout/session` - create Stripe checkout session (body: `checkoutSessionSchema`, optional `guestEmail`)
- `POST /api/checkout/create-payment-intent` - create or update payment intent (body: `checkoutSessionSchema`)
- `POST /api/checkout/update-fulfillment` - update fulfillment (body: `updateFulfillmentSchema`)
- `POST /api/checkout/calculate-shipping` - calculate shipping (body: `calculateShippingSchema`)
- `POST /api/checkout/confirm-payment` - confirm payment (body: `confirmPaymentSchema`)

## Orders
- `GET /api/orders/{orderId}` - order status + events (auth or guest token query)

## Email subscriptions
- `POST /api/email/subscribe` - request subscription (body: `emailSubscribeSchema`)
- `GET /api/email/confirm` - confirm subscription (redirects to `/email/confirm?status=...`)

## Contact
- `POST /api/contact` - contact form submission (body: `contactSchema`)

## Chats
- `GET /api/chats` - list chats (admin)
- `POST /api/chats` - create chat
- `GET /api/chats/current` - current chat for user
- `GET /api/chats/{chatId}/messages` - list messages
- `POST /api/chats/{chatId}/messages` - send message
- `POST /api/chats/{chatId}/close` - close chat
- Guest chat endpoints are disabled in MVP (return 403).

## Analytics
- `POST /api/analytics/track` - record client events

## Invites
- `POST /api/invites/accept` - accept admin invite (body: `adminInviteAcceptSchema`)

## Webhooks
- `POST /api/webhooks/stripe` - Stripe webhook (signature required)
- `POST /api/webhooks/shippo` - Shippo webhook (token required)

## Admin (requires admin role)

### Profile and preferences
- `GET /api/admin/profile` - current admin profile
- `PATCH /api/admin/profile` - update admin notification preferences (body: `adminPreferencesSchema`)

### Products
- `GET /api/admin/products` - list products
- `POST /api/admin/products` - create product (body: `productCreateSchema`)
- `PATCH /api/admin/products/{id}` - update product
- `DELETE /api/admin/products/{id}` - delete product
- `POST /api/admin/products/{id}/duplicate` - duplicate product

### Orders
- `GET /api/admin/orders` - list orders
- `POST /api/admin/orders/{orderId}/refund` - refund order
- `POST /api/admin/orders/{orderId}/fulfill` - fulfill order

### Catalog
- `POST /api/admin/catalog/parse-title` - parse product title
- `GET /api/admin/catalog/brands` - list brands
- `POST /api/admin/catalog/brands` - create brand
- `PATCH /api/admin/catalog/brands/{id}` - update brand
- `GET /api/admin/catalog/brand-groups` - list brand groups
- `POST /api/admin/catalog/brand-groups` - create brand group
- `PATCH /api/admin/catalog/brand-groups/{id}` - update brand group
- `GET /api/admin/catalog/models` - list models
- `POST /api/admin/catalog/models` - create model
- `PATCH /api/admin/catalog/models/{id}` - update model
- `GET /api/admin/catalog/aliases` - list aliases
- `POST /api/admin/catalog/aliases` - create alias
- `PATCH /api/admin/catalog/aliases/{id}` - update alias
- `GET /api/admin/catalog/candidates` - list candidates
- `POST /api/admin/catalog/candidates/{id}/accept` - accept candidate
- `POST /api/admin/catalog/candidates/{id}/reject` - reject candidate

### Shipping
- `GET /api/admin/shipping/defaults` - list shipping defaults
- `POST /api/admin/shipping/defaults` - update shipping defaults
- `GET /api/admin/shipping/carriers` - list carriers
- `POST /api/admin/shipping/carriers` - create carrier
- `GET /api/admin/shipping/origin` - get origin
- `POST /api/admin/shipping/origin` - update origin
- `POST /api/admin/shipping/rates` - fetch Shippo rates
- `POST /api/admin/shipping/labels` - purchase label

### Stripe Connect (admin payouts)
- `GET /api/admin/stripe/account` - get Stripe account summary
- `POST /api/admin/stripe/account-session` - create account session
- `POST /api/admin/stripe/payout-account` - create or update payout account
- `POST /api/admin/stripe/bank-account-delete` - delete external account
- `POST /api/admin/stripe/payout-schedule` - update payout schedule
- `GET /api/admin/stripe/payouts` - list payouts
- `POST /api/admin/stripe/payout-create` - create payout
- `POST /api/admin/payout` - update payout settings (body: `payoutSettingsSchema`)

### Invites and notifications
- `POST /api/admin/invites` - create admin invite (body: `adminInviteCreateSchema`)
- `GET /api/admin/notifications` - list notifications
- `PATCH /api/admin/notifications` - mark notifications read (body: `adminNotificationUpdateSchema`)
- `DELETE /api/admin/notifications` - clear notifications
- `GET /api/admin/notifications/unread-count` - unread count

### Analytics
- `GET /api/admin/analytics` - admin metrics
