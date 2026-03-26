-- Migration: transaction detail fields + order status corrections
-- 2026-03-24
--
-- Changes:
--   1. payment_transactions: add card_expiry_month, card_expiry_year
--   2. orders: add failure_reason column
--   3. Allow blocked/review order statuses in schema constraints
--   4. Rename existing status='failed' rows to 'blocked'
--      (historically "failed" was set by NoFraud fraud-check failures;
--       going forward "blocked" = fraud rejection, "failed" = card declined)

BEGIN;

-- 1. Card expiry on payment transactions (needed for transaction detail display)
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS card_expiry_month SMALLINT,
  ADD COLUMN IF NOT EXISTS card_expiry_year  SMALLINT;

-- 2. Human-readable failure reason on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- 3. Allow the fraud-review lifecycle states already used by the app.
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (
    status = ANY (ARRAY[
      'pending'::text,
      'processing'::text,
      'paid'::text,
      'shipped'::text,
      'canceled'::text,
      'refunded'::text,
      'partially_refunded'::text,
      'refund_pending'::text,
      'refund_failed'::text,
      'failed'::text,
      'blocked'::text,
      'review'::text
    ])
  );

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_contact_info_required_when_paid;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_contact_info_required_when_paid
  CHECK (
    (status = ANY (ARRAY[
      'pending'::text,
      'canceled'::text,
      'failed'::text,
      'blocked'::text,
      'review'::text
    ]))
    OR user_id IS NOT NULL
    OR guest_email IS NOT NULL
  );

-- 4. Rename old 'failed' (NoFraud block) records to 'blocked'
UPDATE public.orders
SET status = 'blocked'
WHERE status = 'failed';

COMMIT;
