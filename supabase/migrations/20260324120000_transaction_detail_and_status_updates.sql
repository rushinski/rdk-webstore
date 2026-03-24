-- Migration: transaction detail fields + order status corrections
-- 2026-03-24
--
-- Changes:
--   1. payment_transactions: add card_expiry_month, card_expiry_year
--   2. orders: add failure_reason column
--   3. Rename existing status='failed' rows to 'blocked'
--      (historically "failed" was set by NoFraud fraud-check failures;
--       going forward "blocked" = fraud rejection, "failed" = card declined)

-- 1. Card expiry on payment transactions (needed for transaction detail display)
ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS card_expiry_month SMALLINT,
  ADD COLUMN IF NOT EXISTS card_expiry_year  SMALLINT;

-- 2. Human-readable failure reason on orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- 3. Rename old 'failed' (NoFraud block) records to 'blocked'
UPDATE orders
SET status = 'blocked'
WHERE status = 'failed';
