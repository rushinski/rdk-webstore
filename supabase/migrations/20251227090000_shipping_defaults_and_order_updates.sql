create table "public"."shipping_defaults" (
  "id" uuid not null default gen_random_uuid(),
  "tenant_id" uuid,
  "category" text not null,
  "default_price" numeric(10,2) not null default 0,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);

alter table "public"."shipping_defaults" enable row level security;

alter table "public"."product_variants" add column "cost_cents" integer default 0;

alter table "public"."order_items" add column "unit_cost" numeric(10,2);

alter table "public"."orders" add column "fulfillment_status" text default 'unfulfilled';
alter table "public"."orders" add column "shipping_carrier" text;
alter table "public"."orders" add column "tracking_number" text;
alter table "public"."orders" add column "shipped_at" timestamp with time zone;
alter table "public"."orders" add column "refund_amount" numeric(10,2);
alter table "public"."orders" add column "refunded_at" timestamp with time zone;

create unique index shipping_defaults_pkey on public.shipping_defaults using btree (id);
create unique index shipping_defaults_tenant_category_key on public.shipping_defaults using btree (tenant_id, category);

alter table "public"."shipping_defaults" add constraint "shipping_defaults_pkey" PRIMARY KEY using index "shipping_defaults_pkey";

alter table "public"."orders" drop constraint if exists "orders_status_check";
alter table "public"."orders" add constraint "orders_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'shipped'::text, 'canceled'::text, 'refunded'::text]))) not valid;
alter table "public"."orders" validate constraint "orders_status_check";

grant delete on table "public"."shipping_defaults" to "anon";
grant insert on table "public"."shipping_defaults" to "anon";
grant references on table "public"."shipping_defaults" to "anon";
grant select on table "public"."shipping_defaults" to "anon";
grant trigger on table "public"."shipping_defaults" to "anon";
grant truncate on table "public"."shipping_defaults" to "anon";
grant update on table "public"."shipping_defaults" to "anon";

grant delete on table "public"."shipping_defaults" to "authenticated";
grant insert on table "public"."shipping_defaults" to "authenticated";
grant references on table "public"."shipping_defaults" to "authenticated";
grant select on table "public"."shipping_defaults" to "authenticated";
grant trigger on table "public"."shipping_defaults" to "authenticated";
grant truncate on table "public"."shipping_defaults" to "authenticated";
grant update on table "public"."shipping_defaults" to "authenticated";

grant delete on table "public"."shipping_defaults" to "postgres";
grant insert on table "public"."shipping_defaults" to "postgres";
grant references on table "public"."shipping_defaults" to "postgres";
grant select on table "public"."shipping_defaults" to "postgres";
grant trigger on table "public"."shipping_defaults" to "postgres";
grant truncate on table "public"."shipping_defaults" to "postgres";
grant update on table "public"."shipping_defaults" to "postgres";

grant delete on table "public"."shipping_defaults" to "service_role";
grant insert on table "public"."shipping_defaults" to "service_role";
grant references on table "public"."shipping_defaults" to "service_role";
grant select on table "public"."shipping_defaults" to "service_role";
grant trigger on table "public"."shipping_defaults" to "service_role";
grant truncate on table "public"."shipping_defaults" to "service_role";
grant update on table "public"."shipping_defaults" to "service_role";

create policy "admin_full_shipping_defaults"
on "public"."shipping_defaults"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));

create policy "admin_full_order_items"
on "public"."order_items"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));

create policy "admin_full_order_shipping"
on "public"."order_shipping"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));
