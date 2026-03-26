-- Normalize order status and contact-info constraints.
--
-- This keeps environments that already applied earlier migrations aligned
-- with the checkout flow, which uses 'blocked' and 'review' order statuses.

BEGIN;

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

COMMIT;
