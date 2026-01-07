alter table "public"."orders" add column "actual_shipping_cost_cents" integer;

alter table "public"."orders" add column "label_created_at" timestamp without time zone;

alter table "public"."orders" add column "label_created_by" uuid;

alter table "public"."orders" add column "label_url" text;

CREATE INDEX idx_orders_label_created_at ON public.orders USING btree (label_created_at) WHERE (label_created_at IS NOT NULL);

CREATE INDEX idx_orders_label_url ON public.orders USING btree (label_url) WHERE (label_url IS NOT NULL);

alter table "public"."orders" add constraint "orders_label_created_by_fkey" FOREIGN KEY (label_created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."orders" validate constraint "orders_label_created_by_fkey";

set check_function_bodies = off;

create or replace view "public"."order_labels" as  SELECT o.id AS order_id,
    o.tracking_number,
    o.shipping_carrier,
    o.label_url,
    o.label_created_at,
    o.label_created_by,
    o.fulfillment_status,
    p.email AS created_by_email,
    p.full_name AS created_by_name
   FROM (public.orders o
     LEFT JOIN public.profiles p ON ((o.label_created_by = p.id)))
  WHERE (o.label_url IS NOT NULL)
  ORDER BY o.label_created_at DESC;


CREATE OR REPLACE FUNCTION public.set_label_created_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.label_url IS NOT NULL AND OLD.label_url IS NULL THEN
    NEW.label_created_at = NOW();
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE TRIGGER trigger_set_label_created_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_label_created_at();


