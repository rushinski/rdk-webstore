set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.decrement_variant_stock(p_variant_id uuid, p_quantity integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE product_variants
  SET stock = stock - p_quantity
  WHERE id = p_variant_id
  AND stock >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for variant %', p_variant_id;
  END IF;
END;
$function$
;


