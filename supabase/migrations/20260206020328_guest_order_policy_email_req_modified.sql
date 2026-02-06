-- Migration: Remove guest_email_required constraint
-- This allows creating orders without email initially for guest checkout

-- Drop the existing constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_guest_email_required;

-- Optional: Add a new, less restrictive constraint
-- This ensures that paid orders must have either user_id or guest_email
-- But allows pending orders to have neither temporarily
ALTER TABLE orders ADD CONSTRAINT orders_contact_info_required_when_paid
  CHECK (
    status != 'paid' OR 
    user_id IS NOT NULL OR 
    guest_email IS NOT NULL
  );

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT orders_contact_info_required_when_paid ON orders IS 
  'Ensures paid orders have contact information (user_id or guest_email), but allows pending orders to be created without email for guest checkout UX';