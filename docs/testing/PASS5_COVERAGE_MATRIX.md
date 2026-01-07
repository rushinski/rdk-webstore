# Pass 5 Coverage Matrix (Draft)

This file is the required "inventory + coverage matrix" for Pass 5.
It must be updated as tests are added so CI/Vercel readiness stays provable.

## Inventory

### API routes (app/api/**/route.ts)
- app/api/account/addresses/[addressId]/route.ts
- app/api/account/addresses/route.ts
- app/api/account/notifications/route.ts
- app/api/account/orders/route.ts
- app/api/account/password/route.ts
- app/api/account/shipping/route.ts
- app/api/admin/analytics/route.ts
- app/api/admin/catalog/aliases/[id]/route.ts
- app/api/admin/catalog/aliases/route.ts
- app/api/admin/catalog/brand-groups/[id]/route.ts
- app/api/admin/catalog/brand-groups/route.ts
- app/api/admin/catalog/brands/[id]/route.ts
- app/api/admin/catalog/brands/route.ts
- app/api/admin/catalog/candidates/[id]/accept/route.ts
- app/api/admin/catalog/candidates/[id]/reject/route.ts
- app/api/admin/catalog/candidates/route.ts
- app/api/admin/catalog/models/[id]/route.ts
- app/api/admin/catalog/models/route.ts
- app/api/admin/catalog/parse-title/route.ts
- app/api/admin/invites/route.ts
- app/api/admin/notifications/unread-count/route.ts
- app/api/admin/notifications/route.ts
- app/api/admin/orders/[orderId]/fulfill/route.ts
- app/api/admin/orders/[orderId]/refund/route.ts
- app/api/admin/orders/route.ts
- app/api/admin/payout/route.ts
- app/api/admin/profile/route.ts
- app/api/admin/products/[id]/duplicate/route.ts
- app/api/admin/products/[id]/route.ts
- app/api/admin/products/route.ts
- app/api/admin/shipping/carriers/route.ts
- app/api/admin/shipping/defaults/route.ts
- app/api/admin/shipping/labels/route.ts
- app/api/admin/shipping/origin/route.ts
- app/api/admin/shipping/rates/route.ts
- app/api/admin/stripe/account-session/route.ts
- app/api/admin/stripe/account/route.ts
- app/api/admin/stripe/bank-account-delete/route.ts
- app/api/admin/stripe/payout-account/route.ts
- app/api/admin/stripe/payout-create/route.ts
- app/api/admin/stripe/payout-schedule/route.ts
- app/api/admin/stripe/payouts/route.ts
- app/api/analytics/track/route.ts
- app/api/auth/2fa/challenge/start/route.ts
- app/api/auth/2fa/challenge/verify/route.ts
- app/api/auth/2fa/enroll/route.ts
- app/api/auth/2fa/verify-enrollment/route.ts
- app/api/auth/callback/route.ts
- app/api/auth/forgot-password/route.ts
- app/api/auth/forgot-password/verify-code/route.ts
- app/api/auth/login/route.ts
- app/api/auth/logout/route.ts
- app/api/auth/otp/request/route.ts
- app/api/auth/otp/verify/route.ts
- app/api/auth/register/route.ts
- app/api/auth/resend-verification/route.ts
- app/api/auth/session/route.ts
- app/api/auth/update-password/route.ts
- app/api/auth/verify-email/route.ts
- app/api/cart/validate/route.ts
- app/api/chats/[chatId]/close/route.ts
- app/api/chats/[chatId]/messages/route.ts
- app/api/chats/current/route.ts
- app/api/chats/guest/[chatId]/close/route.ts
- app/api/chats/guest/[chatId]/messages/route.ts
- app/api/chats/guest/route.ts
- app/api/chats/route.ts
- app/api/checkout/calculate-shipping/route.ts
- app/api/checkout/confirm-payment/route.ts
- app/api/checkout/create-payment-intent/route.ts
- app/api/checkout/session/route.ts
- app/api/checkout/update-fulfillment/route.ts
- app/api/contact/route.ts
- app/api/email/confirm/route.ts
- app/api/email/subscribe/route.ts
- app/api/healthz/route.ts
- app/api/invites/accept/route.ts
- app/api/me/route.ts
- app/api/orders/[orderId]/route.ts
- app/api/readyz/route.ts
- app/api/store/catalog/brand-groups/route.ts
- app/api/store/catalog/brands/route.ts
- app/api/store/filters/route.ts
- app/api/store/products/[id]/route.ts
- app/api/store/products/route.ts
- app/api/webhooks/shippo/route.ts
- app/api/webhooks/stripe/route.ts

### Services (src/services/**)
- admin-auth-service.ts
- admin-invite-service.ts
- admin-notification-service.ts
- admin-service.ts
- analytics-service.ts
- auth-service.ts
- cart-service.ts
- catalog-service.ts
- chat-email-service.ts
- chat-service.ts
- checkout-service.ts
- email-subscription-service.ts
- mfa-service.ts
- order-email-service.ts
- orders-service.ts
- product-service.ts
- product-title-parser-service.ts
- product-title-parser.ts
- shipping-carriers-service.ts
- shipping-defaults-service.ts
- shipping-label-service.ts
- shipping-service.ts
- storefront-service.ts
- stripe-admin-service.ts
- tag-service.ts
- tenant-service.ts

### Repositories (src/repositories/**)
- addresses-repo.ts
- admin-invites-repo.ts
- admin-notifications-repo.ts
- catalog-repo.ts
- chat-messages-repo.ts
- chats-repo.ts
- contact-messages-repo.ts
- email-subscriber-repo.ts
- email-subscription-token-repo.ts
- orders-repo.ts
- payout-settings-repo.ts
- product-repo.ts
- profile-repo.ts
- shipping-carriers-repo.ts
- shipping-defaults-repo.ts
- shipping-origins-repo.ts
- shipping-repo.ts
- site-pageviews-repo.ts
- stripe-events-repo.ts
- tenant-repo.ts

### Jobs (src/jobs/**)
- stripe-order-job.ts

### Proxy (src/proxy/** and proxy.ts)
- src/proxy/auth.ts
- src/proxy/bot.ts
- src/proxy/canonicalize.ts
- src/proxy/csrf.ts
- src/proxy/finalize.ts
- src/proxy/rate-limit.ts
- src/proxy/security-headers.ts
- proxy.ts

### Major pages (app/**/page.tsx)
- storefront: app/page.tsx, app/store/page.tsx, app/store/[productId]/page.tsx
- checkout: app/checkout/page.tsx, app/checkout/processing/page.tsx, app/checkout/success/page.tsx, app/checkout/cancel/page.tsx
- cart: app/cart/page.tsx
- auth: app/auth/login/page.tsx, app/auth/register/page.tsx, app/auth/2fa/setup/page.tsx, app/auth/2fa/challenge/page.tsx
- account: app/account/page.tsx
- admin: app/admin/** (dashboard, inventory, shipping, analytics, chats, bank, settings, sales)
- messaging: app/admin/chats/page.tsx
- misc: app/contact/page.tsx, app/brands/page.tsx, app/shipping/page.tsx

## Existing tests (pre-pass 5)
- tests/unit/proxy/*.test.ts (proxy pipeline coverage)
- tests/unit/catalog/product-title-parser.test.ts

## Coverage matrix (planned, Pass 5)
Legend: Unit = Jest unit, Integration = Jest + Supabase (local or remote DB), E2E = Playwright (local + vercel with seeded DB).
E2E seeding uses `E2E_SEED_STRATEGY=cli|remote|none`; vercel runs must use a dedicated staging Supabase with `SUPABASE_DB_URL` set.
Client E2E hooks require `NEXT_PUBLIC_E2E_TEST_MODE=1` and server-side auth bypass uses `E2E_TEST_MODE=1`.

### Payments (Stripe)
- Totals computation + rounding (checkout-service): Unit
- Idempotency store (stripe-events-repo + webhook service): Unit + Integration
- Webhook state updates (app/api/webhooks/stripe): Integration
- Confirm-payment status handling (processing/requires_action/succeeded/canceled/requires_payment_method): Unit
- Create-payment-intent totals + idempotency mismatch: Integration
- Checkout happy path (mocked Stripe via E2E hooks): E2E
- Non-card payment flow (processing status): E2E
- Client tampering (idempotency/cart mismatch, amount mismatch): Integration + Unit
- Email failure non-blocking order completion: Integration

### Auth, sessions, password reset/change password
- change password regression (app/api/account/password): Integration + E2E
- reset TTL + one-time use (app/api/auth/forgot-password): Integration
- wrong user/expired/reuse failure cases: Integration
- session refresh + logout: Unit + Integration
- 2FA enroll/challenge/verify: Integration + E2E (smoke)

### RBAC admin roles
- Permission helpers (roles constants): Unit
- Admin invite permissions (admin-invite-service + route): Integration + E2E
- Bank settings visibility (admin vs super_admin vs dev): E2E
- Server-enforced authz on admin routes: Integration

### Shipping
- Shipping calc validation (checkout-service + shipping-service): Unit
- Shipping address validation edge cases: Unit + Integration
- Calculate-shipping endpoint max-cost selection: Integration
- Update-fulfillment recalculates totals: Integration
- Shipping rates endpoint validates selection: Integration
- Loading skeleton when delayed (shipping info UI): E2E

### Inventory + cart staleness
- Decrement stock rules (orders-repo RPC): Unit + Integration
- Last unit purchase -> out-of-stock transition: Integration + E2E
- Cart invalidation when item removed/out-of-stock: Integration + E2E
- Revalidation tags/path behavior: Integration + E2E
- Concurrency/race simulation (two buyers): Integration

### Storefront, filters, caching
- Filters do not crash (>2MB cache guard): Integration + E2E
- Duplicates regression (catalog): Integration + E2E
- Pagination/select trimming enforced: Integration

### Proxy + headers
- Rate limiting (proxy/rate-limit + proxy.ts): Unit + Integration
- Cache-control + no duplicate headers: Unit + Integration
- Stripe webhook not blocked: Unit

### UI robustness
- Messaging format + long content wrap: E2E
- Textbox adaptive sizing and styling: E2E
- QR copy button behavior: E2E
- Sign-in icon loading state: E2E

### Analytics + tracking
- Analytics aggregation uses minimal queries: Unit + Integration
- Pageview tracking endpoint: Integration

### Catalog + admin
- Catalog candidate accept/reject paths: Integration
- Title parser pipeline: Unit (existing) + Integration
