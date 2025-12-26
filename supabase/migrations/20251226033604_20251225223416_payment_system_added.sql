
  create table "public"."order_items" (
    "id" uuid not null default gen_random_uuid(),
    "order_id" uuid not null,
    "product_id" uuid not null,
    "variant_id" uuid,
    "quantity" integer not null,
    "unit_price" numeric(10,2) not null,
    "line_total" numeric(10,2) not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."order_items" enable row level security;


  create table "public"."order_shipping" (
    "id" uuid not null default gen_random_uuid(),
    "order_id" uuid not null,
    "name" text,
    "phone" text,
    "line1" text,
    "line2" text,
    "city" text,
    "state" text,
    "postal_code" text,
    "country" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."order_shipping" enable row level security;


  create table "public"."stripe_events" (
    "id" uuid not null default gen_random_uuid(),
    "stripe_event_id" text not null,
    "type" text not null,
    "created" bigint not null,
    "payload_hash" text not null,
    "processed_at" timestamp with time zone default now(),
    "order_id" uuid
      );


alter table "public"."stripe_events" enable row level security;


  create table "public"."user_addresses" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "name" text,
    "phone" text,
    "line1" text,
    "line2" text,
    "city" text,
    "state" text,
    "postal_code" text,
    "country" text,
    "is_default" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."user_addresses" enable row level security;

alter table "public"."orders" add column "cart_hash" text;

alter table "public"."orders" add column "currency" text default 'USD'::text;

alter table "public"."orders" add column "expires_at" timestamp with time zone;

alter table "public"."orders" add column "fee" numeric(10,2);

alter table "public"."orders" add column "fulfillment" text;

alter table "public"."orders" add column "idempotency_key" text;

alter table "public"."orders" add column "public_token" text;

alter table "public"."orders" add column "stripe_payment_intent_id" text;

alter table "public"."orders" add column "updated_at" timestamp with time zone default now();

alter table "public"."products" add column "default_shipping_price" numeric(10,2) default 5.00;

alter table "public"."profiles" add column "stripe_customer_id" text;

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);

CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);

CREATE INDEX idx_order_shipping_order_id ON public.order_shipping USING btree (order_id);

CREATE INDEX idx_profiles_stripe_customer ON public.profiles USING btree (stripe_customer_id);

CREATE INDEX idx_stripe_events_order_id ON public.stripe_events USING btree (order_id);

CREATE INDEX idx_stripe_events_stripe_id ON public.stripe_events USING btree (stripe_event_id);

CREATE INDEX idx_user_addresses_user_id ON public.user_addresses USING btree (user_id);

CREATE UNIQUE INDEX order_items_pkey ON public.order_items USING btree (id);

CREATE UNIQUE INDEX order_shipping_order_id_key ON public.order_shipping USING btree (order_id);

CREATE UNIQUE INDEX order_shipping_pkey ON public.order_shipping USING btree (id);

CREATE UNIQUE INDEX orders_idempotency_key_key ON public.orders USING btree (idempotency_key);

CREATE UNIQUE INDEX stripe_events_pkey ON public.stripe_events USING btree (id);

CREATE UNIQUE INDEX stripe_events_stripe_event_id_key ON public.stripe_events USING btree (stripe_event_id);

CREATE UNIQUE INDEX user_addresses_pkey ON public.user_addresses USING btree (id);

alter table "public"."order_items" add constraint "order_items_pkey" PRIMARY KEY using index "order_items_pkey";

alter table "public"."order_shipping" add constraint "order_shipping_pkey" PRIMARY KEY using index "order_shipping_pkey";

alter table "public"."stripe_events" add constraint "stripe_events_pkey" PRIMARY KEY using index "stripe_events_pkey";

alter table "public"."user_addresses" add constraint "user_addresses_pkey" PRIMARY KEY using index "user_addresses_pkey";

alter table "public"."order_items" add constraint "order_items_line_total_check" CHECK ((line_total >= (0)::numeric)) not valid;

alter table "public"."order_items" validate constraint "order_items_line_total_check";

alter table "public"."order_items" add constraint "order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE not valid;

alter table "public"."order_items" validate constraint "order_items_order_id_fkey";

alter table "public"."order_items" add constraint "order_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) not valid;

alter table "public"."order_items" validate constraint "order_items_product_id_fkey";

alter table "public"."order_items" add constraint "order_items_quantity_check" CHECK ((quantity > 0)) not valid;

alter table "public"."order_items" validate constraint "order_items_quantity_check";

alter table "public"."order_items" add constraint "order_items_unit_price_check" CHECK ((unit_price >= (0)::numeric)) not valid;

alter table "public"."order_items" validate constraint "order_items_unit_price_check";

alter table "public"."order_items" add constraint "order_items_variant_id_fkey" FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) not valid;

alter table "public"."order_items" validate constraint "order_items_variant_id_fkey";

alter table "public"."order_shipping" add constraint "order_shipping_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE not valid;

alter table "public"."order_shipping" validate constraint "order_shipping_order_id_fkey";

alter table "public"."order_shipping" add constraint "order_shipping_order_id_key" UNIQUE using index "order_shipping_order_id_key";

alter table "public"."orders" add constraint "orders_fulfillment_check" CHECK ((fulfillment = ANY (ARRAY['ship'::text, 'pickup'::text]))) not valid;

alter table "public"."orders" validate constraint "orders_fulfillment_check";

alter table "public"."stripe_events" add constraint "stripe_events_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) not valid;

alter table "public"."stripe_events" validate constraint "stripe_events_order_id_fkey";

alter table "public"."stripe_events" add constraint "stripe_events_stripe_event_id_key" UNIQUE using index "stripe_events_stripe_event_id_key";

alter table "public"."user_addresses" add constraint "user_addresses_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_addresses" validate constraint "user_addresses_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_orders_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."order_items" to "anon";

grant insert on table "public"."order_items" to "anon";

grant references on table "public"."order_items" to "anon";

grant select on table "public"."order_items" to "anon";

grant trigger on table "public"."order_items" to "anon";

grant truncate on table "public"."order_items" to "anon";

grant update on table "public"."order_items" to "anon";

grant delete on table "public"."order_items" to "authenticated";

grant insert on table "public"."order_items" to "authenticated";

grant references on table "public"."order_items" to "authenticated";

grant select on table "public"."order_items" to "authenticated";

grant trigger on table "public"."order_items" to "authenticated";

grant truncate on table "public"."order_items" to "authenticated";

grant update on table "public"."order_items" to "authenticated";

grant delete on table "public"."order_items" to "postgres";

grant insert on table "public"."order_items" to "postgres";

grant references on table "public"."order_items" to "postgres";

grant select on table "public"."order_items" to "postgres";

grant trigger on table "public"."order_items" to "postgres";

grant truncate on table "public"."order_items" to "postgres";

grant update on table "public"."order_items" to "postgres";

grant delete on table "public"."order_items" to "service_role";

grant insert on table "public"."order_items" to "service_role";

grant references on table "public"."order_items" to "service_role";

grant select on table "public"."order_items" to "service_role";

grant trigger on table "public"."order_items" to "service_role";

grant truncate on table "public"."order_items" to "service_role";

grant update on table "public"."order_items" to "service_role";

grant delete on table "public"."order_shipping" to "anon";

grant insert on table "public"."order_shipping" to "anon";

grant references on table "public"."order_shipping" to "anon";

grant select on table "public"."order_shipping" to "anon";

grant trigger on table "public"."order_shipping" to "anon";

grant truncate on table "public"."order_shipping" to "anon";

grant update on table "public"."order_shipping" to "anon";

grant delete on table "public"."order_shipping" to "authenticated";

grant insert on table "public"."order_shipping" to "authenticated";

grant references on table "public"."order_shipping" to "authenticated";

grant select on table "public"."order_shipping" to "authenticated";

grant trigger on table "public"."order_shipping" to "authenticated";

grant truncate on table "public"."order_shipping" to "authenticated";

grant update on table "public"."order_shipping" to "authenticated";

grant delete on table "public"."order_shipping" to "postgres";

grant insert on table "public"."order_shipping" to "postgres";

grant references on table "public"."order_shipping" to "postgres";

grant select on table "public"."order_shipping" to "postgres";

grant trigger on table "public"."order_shipping" to "postgres";

grant truncate on table "public"."order_shipping" to "postgres";

grant update on table "public"."order_shipping" to "postgres";

grant delete on table "public"."order_shipping" to "service_role";

grant insert on table "public"."order_shipping" to "service_role";

grant references on table "public"."order_shipping" to "service_role";

grant select on table "public"."order_shipping" to "service_role";

grant trigger on table "public"."order_shipping" to "service_role";

grant truncate on table "public"."order_shipping" to "service_role";

grant update on table "public"."order_shipping" to "service_role";

grant delete on table "public"."stripe_events" to "anon";

grant insert on table "public"."stripe_events" to "anon";

grant references on table "public"."stripe_events" to "anon";

grant select on table "public"."stripe_events" to "anon";

grant trigger on table "public"."stripe_events" to "anon";

grant truncate on table "public"."stripe_events" to "anon";

grant update on table "public"."stripe_events" to "anon";

grant delete on table "public"."stripe_events" to "authenticated";

grant insert on table "public"."stripe_events" to "authenticated";

grant references on table "public"."stripe_events" to "authenticated";

grant select on table "public"."stripe_events" to "authenticated";

grant trigger on table "public"."stripe_events" to "authenticated";

grant truncate on table "public"."stripe_events" to "authenticated";

grant update on table "public"."stripe_events" to "authenticated";

grant delete on table "public"."stripe_events" to "postgres";

grant insert on table "public"."stripe_events" to "postgres";

grant references on table "public"."stripe_events" to "postgres";

grant select on table "public"."stripe_events" to "postgres";

grant trigger on table "public"."stripe_events" to "postgres";

grant truncate on table "public"."stripe_events" to "postgres";

grant update on table "public"."stripe_events" to "postgres";

grant delete on table "public"."stripe_events" to "service_role";

grant insert on table "public"."stripe_events" to "service_role";

grant references on table "public"."stripe_events" to "service_role";

grant select on table "public"."stripe_events" to "service_role";

grant trigger on table "public"."stripe_events" to "service_role";

grant truncate on table "public"."stripe_events" to "service_role";

grant update on table "public"."stripe_events" to "service_role";

grant delete on table "public"."user_addresses" to "anon";

grant insert on table "public"."user_addresses" to "anon";

grant references on table "public"."user_addresses" to "anon";

grant select on table "public"."user_addresses" to "anon";

grant trigger on table "public"."user_addresses" to "anon";

grant truncate on table "public"."user_addresses" to "anon";

grant update on table "public"."user_addresses" to "anon";

grant delete on table "public"."user_addresses" to "authenticated";

grant insert on table "public"."user_addresses" to "authenticated";

grant references on table "public"."user_addresses" to "authenticated";

grant select on table "public"."user_addresses" to "authenticated";

grant trigger on table "public"."user_addresses" to "authenticated";

grant truncate on table "public"."user_addresses" to "authenticated";

grant update on table "public"."user_addresses" to "authenticated";

grant delete on table "public"."user_addresses" to "postgres";

grant insert on table "public"."user_addresses" to "postgres";

grant references on table "public"."user_addresses" to "postgres";

grant select on table "public"."user_addresses" to "postgres";

grant trigger on table "public"."user_addresses" to "postgres";

grant truncate on table "public"."user_addresses" to "postgres";

grant update on table "public"."user_addresses" to "postgres";

grant delete on table "public"."user_addresses" to "service_role";

grant insert on table "public"."user_addresses" to "service_role";

grant references on table "public"."user_addresses" to "service_role";

grant select on table "public"."user_addresses" to "service_role";

grant trigger on table "public"."user_addresses" to "service_role";

grant truncate on table "public"."user_addresses" to "service_role";

grant update on table "public"."user_addresses" to "service_role";


  create policy "Users can view own order items"
  on "public"."order_items"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND (orders.user_id = auth.uid())))));



  create policy "Users can view own order shipping"
  on "public"."order_shipping"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_shipping.order_id) AND (orders.user_id = auth.uid())))));



  create policy "Users can view own orders"
  on "public"."orders"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can manage own addresses"
  on "public"."user_addresses"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_orders_updated_at();

CREATE TRIGGER trg_user_addresses_updated_at BEFORE UPDATE ON public.user_addresses FOR EACH ROW EXECUTE FUNCTION public.update_orders_updated_at();


