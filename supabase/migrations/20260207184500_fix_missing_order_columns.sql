-- Fix Missing Order Columns
-- These columns should have been added by 20251226033604 but are missing from the database

BEGIN;

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add idempotency_key column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'idempotency_key'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN idempotency_key text;
        CREATE UNIQUE INDEX orders_idempotency_key_key ON public.orders USING btree (idempotency_key);
    END IF;

    -- Add cart_hash column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'cart_hash'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN cart_hash text;
        CREATE INDEX idx_orders_cart_hash ON public.orders USING btree (cart_hash);
    END IF;

    -- Add expires_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN expires_at timestamp with time zone;
    END IF;

    -- Add fee column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'fee'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN fee numeric(10,2);
    END IF;

    -- Add public_token column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'public_token'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN public_token text;
    END IF;
END $$;

COMMIT;

-- Verify the columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('idempotency_key', 'cart_hash', 'expires_at', 'fee', 'public_token')
ORDER BY column_name;
