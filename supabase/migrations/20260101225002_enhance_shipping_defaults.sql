-- Rename the existing default_price column to be more descriptive
ALTER TABLE public.shipping_defaults
RENAME COLUMN default_price TO shipping_rate_threshold_cents;

-- Add new columns for default dimensions and weight
ALTER TABLE public.shipping_defaults
ADD COLUMN default_weight_oz NUMERIC,
ADD COLUMN default_length_in NUMERIC,
ADD COLUMN default_width_in NUMERIC,
ADD COLUMN default_height_in NUMERIC;

-- It's good practice to set a default value for the new columns
UPDATE public.shipping_defaults
SET default_weight_oz = 16, -- e.g., 1 lb
    default_length_in = 12,
    default_width_in = 12,
    default_height_in = 12;

-- And to make them NOT NULL if they should always have a value
ALTER TABLE public.shipping_defaults
ALTER COLUMN default_weight_oz SET NOT NULL,
ALTER COLUMN default_length_in SET NOT NULL,
ALTER COLUMN default_width_in SET NOT NULL,
ALTER COLUMN default_height_in SET NOT NULL;
