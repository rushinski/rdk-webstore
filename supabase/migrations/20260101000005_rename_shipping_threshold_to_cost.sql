-- Renames the shipping threshold column to a shipping cost column
-- to reflect the new logic where customers are charged a flat rate.

ALTER TABLE public.shipping_defaults
RENAME COLUMN shipping_rate_threshold_cents TO shipping_cost_cents;
