-- Fix Database Schema to Allow Orders Without Email Initially
-- This allows the checkout flow to create pending orders before email is provided

-- ISSUE: The constraint `orders_contact_info_required_when_paid` prevents
-- creating pending orders without email/user_id, but we need to allow this
-- for the checkout flow where email might be provided later.

-- SOLUTION: Relax the constraint to only enforce contact info when status = 'paid'

BEGIN;

-- Drop the old constraint
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_contact_info_required_when_paid;

-- Add new constraint that's more flexible
-- Contact info (user_id OR guest_email) is only required when:
-- 1. Order status is 'paid', 'shipped', 'refunded', or 'processing'
-- 2. This allows 'pending' orders to exist without contact info temporarily
ALTER TABLE orders 
ADD CONSTRAINT orders_contact_info_required_when_paid 
CHECK (
  (status = ANY(ARRAY['pending'::text, 'canceled'::text, 'failed'::text]))
  OR (user_id IS NOT NULL)
  OR (guest_email IS NOT NULL)
);

-- Update the status constraint to include new statuses we're using
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_status_check 
CHECK (
  status = ANY(ARRAY[
    'pending'::text,
    'processing'::text,  -- NEW: For BNPL async payments
    'paid'::text,
    'shipped'::text,
    'canceled'::text,
    'refunded'::text,
    'refund_pending'::text,  -- NEW: For pending refunds
    'refund_failed'::text,   -- NEW: For failed refunds
    'failed'::text           -- NEW: For failed payments
  ])
);

COMMIT;

-- Verify the changes
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
  AND conname IN ('orders_contact_info_required_when_paid', 'orders_status_check');

-- Test: Should allow creating pending order without email
-- This should work now:
/*
INSERT INTO orders (
  tenant_id,
  currency,
  subtotal,
  shipping,
  total,
  status,
  fulfillment,
  idempotency_key,
  cart_hash,
  expires_at
) VALUES (
  'some-tenant-id'::uuid,
  'USD',
  100.00,
  10.00,
  110.00,
  'pending',
  'ship',
  gen_random_uuid()::text,
  'some-cart-hash',
  NOW() + INTERVAL '1 hour'
);
*/

-- Test: Should fail when trying to mark paid without email
-- This should fail:
/*
UPDATE orders 
SET status = 'paid' 
WHERE id = 'order-id-without-email';
-- ERROR: orders_contact_info_required_when_paid
*/