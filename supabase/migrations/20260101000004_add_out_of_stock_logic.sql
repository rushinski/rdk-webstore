-- Migration to handle out-of-stock status for products

-- 1. Add the is_out_of_stock flag to the products table
ALTER TABLE public.products
ADD COLUMN is_out_of_stock BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Create a function to update the parent product's stock status
CREATE OR REPLACE FUNCTION update_product_out_of_stock_status()
RETURNS TRIGGER AS $$
DECLARE
    product_id_to_check UUID;
    total_stock INTEGER;
BEGIN
    -- Determine which product_id to check based on the operation
    IF (TG_OP = 'DELETE') THEN
        product_id_to_check := OLD.product_id;
    ELSE
        product_id_to_check := NEW.product_id;
    END IF;

    -- Exit if product_id is null
    IF product_id_to_check IS NULL THEN
        RETURN NULL;
    END IF;

    -- Calculate the total stock for all variants of the product
    SELECT SUM(stock)
    INTO total_stock
    FROM public.product_variants
    WHERE product_id = product_id_to_check;

    -- Update the is_out_of_stock flag on the parent product
    IF (total_stock <= 0) THEN
        UPDATE public.products
        SET is_out_of_stock = TRUE
        WHERE id = product_id_to_check;
    ELSE
        UPDATE public.products
        SET is_out_of_stock = FALSE
        WHERE id = product_id_to_check;
    END IF;

    RETURN NULL; -- The result is ignored since this is an AFTER trigger
END;
$$ LANGUAGE plpgsql;

-- 3. Create a trigger that fires on stock changes
CREATE TRIGGER product_variant_stock_change_trigger
AFTER INSERT OR UPDATE OF stock OR DELETE ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION update_product_out_of_stock_status();
