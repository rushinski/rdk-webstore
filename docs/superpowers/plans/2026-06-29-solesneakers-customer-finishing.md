# Solesneakers Customer-Facing Finishing Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the remaining customer-facing `solesneakers` frontend so public storefront chrome, checkout, account, and auth customer flows all use the same brand system and no longer fall back to legacy RDK dark/red UI.

**Architecture:** Keep the route structure and behavior unchanged while replacing the remaining customer-facing presentation layer with `brand-*` tokens and the new storefront voice. Tackle shared public shell first, then checkout-specific primitives and routes, then account/auth customer flows so later tasks build on the cleaned primitives instead of re-skinning duplicate styles.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Jest

---

## File Structure Map

### Public shell and public route cleanup

- Modify: `src/components/shell/Navbar.tsx`
- Modify: `src/components/shell/Footer.tsx`
- Modify: `src/components/shell/MobileBottomNav.tsx`
- Modify: `src/components/home/FeaturedItems.tsx`
- Modify: `src/components/store/FilterPanel.tsx`
- Modify: `app/store/error.tsx`
- Modify: `app/bug-report/page.tsx`

### Checkout and shared customer purchase primitives

- Modify: `src/components/shared/AddressInput.tsx`
- Modify: `src/components/shared/AddressSuggestionModal.tsx`
- Modify: `src/components/checkout/OrderSummary.tsx`
- Modify: `src/components/checkout/SavedAddresses.tsx`
- Modify: `src/components/checkout/ShippingAddressModal.tsx`
- Modify: `src/components/checkout/BillingAddressModal.tsx`
- Modify: `src/components/checkout/BillingAddressForm.tsx`
- Modify: `src/components/checkout/CheckoutLockedNotice.tsx`
- Modify: `src/components/checkout/CheckoutGate.tsx`
- Modify: `src/components/checkout/CheckoutForm.tsx`
- Modify: `src/components/checkout/CheckoutStart.tsx`
- Modify: `src/components/checkout/ChevronPuller.tsx`
- Modify: `app/checkout/start/page.tsx`
- Modify: `app/checkout/processing/page.tsx`
- Modify: `app/checkout/success/page.tsx`
- Modify: `app/checkout/cancel/page.tsx`
- Modify: `app/checkout/error.tsx`

### Account and auth customer flow cleanup

- Modify: `app/account/page.tsx`
- Modify: `app/account/error.tsx`
- Modify: `src/components/auth/login/PasswordField.tsx`
- Modify: `src/components/auth/login/PasswordLoginForm.tsx`
- Modify: `src/components/auth/login/SplitCodeInputWithResend.tsx`
- Modify: `src/components/auth/login/EmailCodeFlow.tsx`
- Modify: `src/components/auth/ui/SixDigitCodeField.tsx`
- Modify: `src/components/auth/2fa/QRDisplay.tsx`
- Modify: `src/components/auth/2fa/EnrollmentForm.tsx`

### Verification

- Re-run targeted storefront/auth/admin-shell unit suite
- Re-run targeted ESLint for touched files
- Re-run `npm run typecheck`

---

### Task 1: Finish Public Storefront Shell and Public Route Chrome

**Files:**
- Modify: `src/components/shell/Navbar.tsx`
- Modify: `src/components/shell/Footer.tsx`
- Modify: `src/components/shell/MobileBottomNav.tsx`
- Modify: `src/components/home/FeaturedItems.tsx`
- Modify: `src/components/store/FilterPanel.tsx`
- Modify: `app/store/error.tsx`
- Modify: `app/bug-report/page.tsx`

- [ ] **Step 1: Replace legacy shell branding and dark navigation surfaces**

Update `Navbar`, `Footer`, and `MobileBottomNav` so they use:
- `solesneakers` branding and `/images/logo.svg`
- `brand-page`, `brand-surface`, `brand-text`, `brand-muted`, `brand-border`
- uppercase editorial link styling instead of the old black/zinc/red chrome
- `null@gmail.com` for customer contact references

- [ ] **Step 2: Keep the current shell behaviors intact**

Preserve:
- menu structure
- `openSearch` / `openCart` events
- auth/account menu logic
- mobile menu state and portal behavior
- cart count badges

No route, query, or session behavior changes.

- [ ] **Step 3: Reskin remaining public storefront content blocks**

Update:
- `src/components/home/FeaturedItems.tsx`
- `src/components/store/FilterPanel.tsx`
- `app/store/error.tsx`
- `app/bug-report/page.tsx`

Goal:
- remove remaining `bg-black`, `bg-zinc-*`, `border-zinc-*`, and `bg-red-*` customer-facing styling
- align typography and spacing with the rebuilt homepage / browse / PDP surfaces

- [ ] **Step 4: Run targeted lint verification**

Run:
`npx eslint src/components/shell/Navbar.tsx src/components/shell/Footer.tsx src/components/shell/MobileBottomNav.tsx src/components/home/FeaturedItems.tsx src/components/store/FilterPanel.tsx app/store/error.tsx app/bug-report/page.tsx`

Expected:
PASS

- [ ] **Step 5: Run typecheck verification**

Run:
`npm run typecheck`

Expected:
PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/shell/Navbar.tsx src/components/shell/Footer.tsx src/components/shell/MobileBottomNav.tsx src/components/home/FeaturedItems.tsx src/components/store/FilterPanel.tsx app/store/error.tsx app/bug-report/page.tsx
git commit -m "feat: finish solesneakers storefront shell"
```

### Task 2: Finish Checkout Primitives and Purchase Funnel UI

**Files:**
- Modify: `src/components/shared/AddressInput.tsx`
- Modify: `src/components/shared/AddressSuggestionModal.tsx`
- Modify: `src/components/checkout/OrderSummary.tsx`
- Modify: `src/components/checkout/SavedAddresses.tsx`
- Modify: `src/components/checkout/ShippingAddressModal.tsx`
- Modify: `src/components/checkout/BillingAddressModal.tsx`
- Modify: `src/components/checkout/BillingAddressForm.tsx`
- Modify: `src/components/checkout/CheckoutLockedNotice.tsx`
- Modify: `src/components/checkout/CheckoutGate.tsx`
- Modify: `src/components/checkout/CheckoutForm.tsx`
- Modify: `src/components/checkout/CheckoutStart.tsx`
- Modify: `src/components/checkout/ChevronPuller.tsx`
- Modify: `app/checkout/start/page.tsx`
- Modify: `app/checkout/processing/page.tsx`
- Modify: `app/checkout/success/page.tsx`
- Modify: `app/checkout/cancel/page.tsx`
- Modify: `app/checkout/error.tsx`

- [ ] **Step 1: Reskin shared address and modal primitives first**

Update:
- `AddressInput`
- `AddressSuggestionModal`
- `ShippingAddressModal`
- `BillingAddressModal`
- `ChevronPuller`

Goal:
- move overlays, cards, inputs, borders, and buttons to the `brand-*` palette
- keep current validation, focus flow, and submit behavior unchanged

- [ ] **Step 2: Reskin checkout selection and summary surfaces**

Update:
- `SavedAddresses`
- `BillingAddressForm`
- `OrderSummary`
- `CheckoutLockedNotice`
- `CheckoutGate`

Goal:
- replace legacy red-highlighted card selection with black/white editorial selection states
- keep selected / disabled / guest / default address semantics unchanged

- [ ] **Step 3: Reskin the main checkout form and loader / result states**

Update:
- `CheckoutForm`
- `CheckoutStart`
- `app/checkout/start/page.tsx`
- `app/checkout/processing/page.tsx`
- `app/checkout/success/page.tsx`
- `app/checkout/cancel/page.tsx`
- `app/checkout/error.tsx`

Goal:
- keep all submission, locking, payment, and progress behavior
- align page chrome, spinners, summary cards, and action buttons to `solesneakers`

- [ ] **Step 4: Re-run checkout regression test**

Run:
`npx jest --runInBand tests/unit/checkout-page.test.tsx`

Expected:
PASS

- [ ] **Step 5: Run targeted lint verification**

Run:
`npx eslint src/components/shared/AddressInput.tsx src/components/shared/AddressSuggestionModal.tsx src/components/checkout/OrderSummary.tsx src/components/checkout/SavedAddresses.tsx src/components/checkout/ShippingAddressModal.tsx src/components/checkout/BillingAddressModal.tsx src/components/checkout/BillingAddressForm.tsx src/components/checkout/CheckoutLockedNotice.tsx src/components/checkout/CheckoutGate.tsx src/components/checkout/CheckoutForm.tsx src/components/checkout/CheckoutStart.tsx src/components/checkout/ChevronPuller.tsx app/checkout/start/page.tsx app/checkout/processing/page.tsx app/checkout/success/page.tsx app/checkout/cancel/page.tsx app/checkout/error.tsx`

Expected:
PASS

- [ ] **Step 6: Run typecheck verification**

Run:
`npm run typecheck`

Expected:
PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/shared/AddressInput.tsx src/components/shared/AddressSuggestionModal.tsx src/components/checkout/OrderSummary.tsx src/components/checkout/SavedAddresses.tsx src/components/checkout/ShippingAddressModal.tsx src/components/checkout/BillingAddressModal.tsx src/components/checkout/BillingAddressForm.tsx src/components/checkout/CheckoutLockedNotice.tsx src/components/checkout/CheckoutGate.tsx src/components/checkout/CheckoutForm.tsx src/components/checkout/CheckoutStart.tsx src/components/checkout/ChevronPuller.tsx app/checkout/start/page.tsx app/checkout/processing/page.tsx app/checkout/success/page.tsx app/checkout/cancel/page.tsx app/checkout/error.tsx
git commit -m "feat: finish solesneakers checkout experience"
```

### Task 3: Finish Account and Auth Customer Flow Styling

**Files:**
- Modify: `app/account/page.tsx`
- Modify: `app/account/error.tsx`
- Modify: `src/components/auth/login/PasswordField.tsx`
- Modify: `src/components/auth/login/PasswordLoginForm.tsx`
- Modify: `src/components/auth/login/SplitCodeInputWithResend.tsx`
- Modify: `src/components/auth/login/EmailCodeFlow.tsx`
- Modify: `src/components/auth/ui/SixDigitCodeField.tsx`
- Modify: `src/components/auth/2fa/QRDisplay.tsx`
- Modify: `src/components/auth/2fa/EnrollmentForm.tsx`

- [ ] **Step 1: Finish customer account route chrome**

Update:
- `app/account/page.tsx`
- `app/account/error.tsx`

Goal:
- align page framing and action buttons with the already-reskinned `AccountProfile`
- remove any remaining old red/black customer-facing error and call-to-action styles

- [ ] **Step 2: Finish login field and code-entry primitives**

Update:
- `PasswordField`
- `PasswordLoginForm`
- `SplitCodeInputWithResend`
- `EmailCodeFlow`
- `SixDigitCodeField`

Goal:
- use `authStyles` and `brand-*` tokens consistently
- keep password toggle, resend, and verification flows unchanged

- [ ] **Step 3: Finish 2FA customer enrollment and QR surfaces**

Update:
- `QRDisplay`
- `EnrollmentForm`

Goal:
- reskin setup cards, secret display, confirmation states, and action buttons
- preserve all enrollment, recovery, and verification logic

- [ ] **Step 4: Run auth regression tests**

Run:
`npx jest --runInBand tests/unit/auth-shell-branding.test.tsx`

Expected:
PASS

- [ ] **Step 5: Run targeted lint verification**

Run:
`npx eslint app/account/page.tsx app/account/error.tsx src/components/auth/login/PasswordField.tsx src/components/auth/login/PasswordLoginForm.tsx src/components/auth/login/SplitCodeInputWithResend.tsx src/components/auth/login/EmailCodeFlow.tsx src/components/auth/ui/SixDigitCodeField.tsx src/components/auth/2fa/QRDisplay.tsx src/components/auth/2fa/EnrollmentForm.tsx`

Expected:
PASS

- [ ] **Step 6: Run typecheck verification**

Run:
`npm run typecheck`

Expected:
PASS

- [ ] **Step 7: Commit**

```bash
git add app/account/page.tsx app/account/error.tsx src/components/auth/login/PasswordField.tsx src/components/auth/login/PasswordLoginForm.tsx src/components/auth/login/SplitCodeInputWithResend.tsx src/components/auth/login/EmailCodeFlow.tsx src/components/auth/ui/SixDigitCodeField.tsx src/components/auth/2fa/QRDisplay.tsx src/components/auth/2fa/EnrollmentForm.tsx
git commit -m "feat: finish solesneakers customer account flows"
```

### Task 4: Final Customer-Facing Verification and Cleanup

**Files:**
- Modify: any touched files from Tasks 1-3
- Test: `tests/unit/solesneakers-brand-config.test.ts`
- Test: `tests/unit/storefront-header.test.tsx`
- Test: `tests/unit/storefront-homepage.test.tsx`
- Test: `tests/unit/storefront-product-detail.test.tsx`
- Test: `tests/unit/auth-shell-branding.test.tsx`
- Test: `tests/unit/admin-shell-branding.test.tsx`
- Test: `tests/unit/checkout-page.test.tsx`

- [ ] **Step 1: Scan remaining customer-facing legacy branding**

Run:
`rg -n "Realdealkickzsc|rdk-logo|bg-red-600|text-red-600|border-zinc-800|bg-black" app src/components | rg -v "app/admin|src/components/admin|src/components/inventory|src/components/orders|tests|docs"`

Expected:
Only intentional non-customer-facing leftovers remain, or remaining hits are limited to non-scoped admin/inventory code.

- [ ] **Step 2: Run the targeted customer-facing unit suite**

Run:
`npx jest --runInBand tests/unit/solesneakers-brand-config.test.ts tests/unit/storefront-header.test.tsx tests/unit/storefront-homepage.test.tsx tests/unit/storefront-product-detail.test.tsx tests/unit/auth-shell-branding.test.tsx tests/unit/admin-shell-branding.test.tsx tests/unit/checkout-page.test.tsx`

Expected:
PASS

- [ ] **Step 3: Run targeted lint sweep over touched customer-facing files**

Run:
`npx eslint app src/components`

Expected:
This command may still fail because of known unrelated baseline issues outside the customer-facing scope. If it does, record the exact unrelated blockers and verify all touched files remain clean with narrower targeted commands.

- [ ] **Step 4: Run repository typecheck**

Run:
`npm run typecheck`

Expected:
PASS

- [ ] **Step 5: Commit**

```bash
git add app src/components
git commit -m "chore: finalize solesneakers customer storefront"
```
