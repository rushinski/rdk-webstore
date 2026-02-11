-- Partial refund support
-- 1) Track item-level refunds
-- 2) Allow partially_refunded order status
-- 3) Add stock increment helper for refund restocks

BEGIN;

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS refund_amount numeric(10,2),
ADD COLUMN IF NOT EXISTS refunded_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_order_items_order_refunded_at
ON public.order_items (order_id, refunded_at);

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
    'failed'::text
  ])
);

CREATE OR REPLACE FUNCTION public.increment_variant_stock(
  p_variant_id uuid,
  p_quantity integer
)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Increment quantity must be positive';
  END IF;

  UPDATE product_variants
  SET stock = stock + p_quantity
  WHERE id = p_variant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variant not found: %', p_variant_id;
  END IF;
END;
$function$;

COMMIT;
