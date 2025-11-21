
  create table "public"."admin_audit_log" (
    "id" uuid not null default gen_random_uuid(),
    "admin_id" uuid,
    "action" text not null,
    "old_value" jsonb,
    "new_value" jsonb,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."admin_audit_log" enable row level security;


  create table "public"."marketplaces" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid,
    "name" text not null,
    "created_at" timestamp with time zone default now()
      );



  create table "public"."orders" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "tenant_id" uuid,
    "seller_id" uuid,
    "marketplace_id" uuid,
    "stripe_session_id" text,
    "subtotal" numeric(10,2) not null,
    "shipping" numeric(10,2) not null,
    "total" numeric(10,2) not null,
    "status" text default 'pending'::text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."orders" enable row level security;


  create table "public"."products" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid,
    "seller_id" uuid,
    "marketplace_id" uuid,
    "name" text not null,
    "brand" text,
    "description" text,
    "price" numeric(10,2) not null,
    "shoe_sizes" numeric[],
    "clothing_sizes" text[],
    "images" text[],
    "condition" text default 'new'::text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."products" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "email" text,
    "role" text default 'customer'::text,
    "twofa_enabled" boolean default false,
    "display_name" text,
    "avatar_url" text,
    "tenant_id" uuid,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."profiles" enable row level security;


  create table "public"."sellers" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid,
    "name" text not null,
    "created_at" timestamp with time zone default now()
      );



  create table "public"."tenants" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "created_at" timestamp with time zone default now()
      );


CREATE INDEX admin_audit_log_admin_idx ON public.admin_audit_log USING btree (admin_id);

CREATE UNIQUE INDEX admin_audit_log_pkey ON public.admin_audit_log USING btree (id);

CREATE UNIQUE INDEX marketplaces_pkey ON public.marketplaces USING btree (id);

CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id);

CREATE UNIQUE INDEX orders_stripe_session_id_key ON public.orders USING btree (stripe_session_id);

CREATE INDEX orders_tenant_idx ON public.orders USING btree (tenant_id);

CREATE INDEX orders_user_id_idx ON public.orders USING btree (user_id);

CREATE INDEX products_brand_idx ON public.products USING btree (brand);

CREATE INDEX products_clothing_sizes_idx ON public.products USING gin (clothing_sizes);

CREATE INDEX products_created_idx ON public.products USING btree (created_at);

CREATE UNIQUE INDEX products_pkey ON public.products USING btree (id);

CREATE INDEX products_shoe_sizes_idx ON public.products USING gin (shoe_sizes);

CREATE INDEX products_tenant_idx ON public.products USING btree (tenant_id);

CREATE UNIQUE INDEX profiles_email_key ON public.profiles USING btree (email);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE INDEX profiles_tenant_idx ON public.profiles USING btree (tenant_id);

CREATE UNIQUE INDEX sellers_pkey ON public.sellers USING btree (id);

CREATE UNIQUE INDEX tenants_pkey ON public.tenants USING btree (id);

alter table "public"."admin_audit_log" add constraint "admin_audit_log_pkey" PRIMARY KEY using index "admin_audit_log_pkey";

alter table "public"."marketplaces" add constraint "marketplaces_pkey" PRIMARY KEY using index "marketplaces_pkey";

alter table "public"."orders" add constraint "orders_pkey" PRIMARY KEY using index "orders_pkey";

alter table "public"."products" add constraint "products_pkey" PRIMARY KEY using index "products_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."sellers" add constraint "sellers_pkey" PRIMARY KEY using index "sellers_pkey";

alter table "public"."tenants" add constraint "tenants_pkey" PRIMARY KEY using index "tenants_pkey";

alter table "public"."admin_audit_log" add constraint "admin_audit_log_admin_id_fkey" FOREIGN KEY (admin_id) REFERENCES public.profiles(id) not valid;

alter table "public"."admin_audit_log" validate constraint "admin_audit_log_admin_id_fkey";

alter table "public"."marketplaces" add constraint "marketplaces_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) not valid;

alter table "public"."marketplaces" validate constraint "marketplaces_tenant_id_fkey";

alter table "public"."orders" add constraint "orders_marketplace_id_fkey" FOREIGN KEY (marketplace_id) REFERENCES public.marketplaces(id) not valid;

alter table "public"."orders" validate constraint "orders_marketplace_id_fkey";

alter table "public"."orders" add constraint "orders_seller_id_fkey" FOREIGN KEY (seller_id) REFERENCES public.sellers(id) not valid;

alter table "public"."orders" validate constraint "orders_seller_id_fkey";

alter table "public"."orders" add constraint "orders_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'shipped'::text, 'canceled'::text]))) not valid;

alter table "public"."orders" validate constraint "orders_status_check";

alter table "public"."orders" add constraint "orders_stripe_session_id_key" UNIQUE using index "orders_stripe_session_id_key";

alter table "public"."orders" add constraint "orders_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) not valid;

alter table "public"."orders" validate constraint "orders_tenant_id_fkey";

alter table "public"."orders" add constraint "orders_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."orders" validate constraint "orders_user_id_fkey";

alter table "public"."products" add constraint "products_condition_check" CHECK ((condition = ANY (ARRAY['new'::text, 'used'::text]))) not valid;

alter table "public"."products" validate constraint "products_condition_check";

alter table "public"."products" add constraint "products_marketplace_id_fkey" FOREIGN KEY (marketplace_id) REFERENCES public.marketplaces(id) not valid;

alter table "public"."products" validate constraint "products_marketplace_id_fkey";

alter table "public"."products" add constraint "products_seller_id_fkey" FOREIGN KEY (seller_id) REFERENCES public.sellers(id) not valid;

alter table "public"."products" validate constraint "products_seller_id_fkey";

alter table "public"."products" add constraint "products_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) not valid;

alter table "public"."products" validate constraint "products_tenant_id_fkey";

alter table "public"."profiles" add constraint "profiles_email_key" UNIQUE using index "profiles_email_key";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_role_check" CHECK ((role = ANY (ARRAY['customer'::text, 'admin'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_role_check";

alter table "public"."profiles" add constraint "profiles_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) not valid;

alter table "public"."profiles" validate constraint "profiles_tenant_id_fkey";

alter table "public"."sellers" add constraint "sellers_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) not valid;

alter table "public"."sellers" validate constraint "sellers_tenant_id_fkey";

grant delete on table "public"."admin_audit_log" to "anon";

grant insert on table "public"."admin_audit_log" to "anon";

grant references on table "public"."admin_audit_log" to "anon";

grant select on table "public"."admin_audit_log" to "anon";

grant trigger on table "public"."admin_audit_log" to "anon";

grant truncate on table "public"."admin_audit_log" to "anon";

grant update on table "public"."admin_audit_log" to "anon";

grant delete on table "public"."admin_audit_log" to "authenticated";

grant insert on table "public"."admin_audit_log" to "authenticated";

grant references on table "public"."admin_audit_log" to "authenticated";

grant select on table "public"."admin_audit_log" to "authenticated";

grant trigger on table "public"."admin_audit_log" to "authenticated";

grant truncate on table "public"."admin_audit_log" to "authenticated";

grant update on table "public"."admin_audit_log" to "authenticated";

grant delete on table "public"."admin_audit_log" to "postgres";

grant insert on table "public"."admin_audit_log" to "postgres";

grant references on table "public"."admin_audit_log" to "postgres";

grant select on table "public"."admin_audit_log" to "postgres";

grant trigger on table "public"."admin_audit_log" to "postgres";

grant truncate on table "public"."admin_audit_log" to "postgres";

grant update on table "public"."admin_audit_log" to "postgres";

grant delete on table "public"."admin_audit_log" to "service_role";

grant insert on table "public"."admin_audit_log" to "service_role";

grant references on table "public"."admin_audit_log" to "service_role";

grant select on table "public"."admin_audit_log" to "service_role";

grant trigger on table "public"."admin_audit_log" to "service_role";

grant truncate on table "public"."admin_audit_log" to "service_role";

grant update on table "public"."admin_audit_log" to "service_role";

grant delete on table "public"."marketplaces" to "anon";

grant insert on table "public"."marketplaces" to "anon";

grant references on table "public"."marketplaces" to "anon";

grant select on table "public"."marketplaces" to "anon";

grant trigger on table "public"."marketplaces" to "anon";

grant truncate on table "public"."marketplaces" to "anon";

grant update on table "public"."marketplaces" to "anon";

grant delete on table "public"."marketplaces" to "authenticated";

grant insert on table "public"."marketplaces" to "authenticated";

grant references on table "public"."marketplaces" to "authenticated";

grant select on table "public"."marketplaces" to "authenticated";

grant trigger on table "public"."marketplaces" to "authenticated";

grant truncate on table "public"."marketplaces" to "authenticated";

grant update on table "public"."marketplaces" to "authenticated";

grant delete on table "public"."marketplaces" to "postgres";

grant insert on table "public"."marketplaces" to "postgres";

grant references on table "public"."marketplaces" to "postgres";

grant select on table "public"."marketplaces" to "postgres";

grant trigger on table "public"."marketplaces" to "postgres";

grant truncate on table "public"."marketplaces" to "postgres";

grant update on table "public"."marketplaces" to "postgres";

grant delete on table "public"."marketplaces" to "service_role";

grant insert on table "public"."marketplaces" to "service_role";

grant references on table "public"."marketplaces" to "service_role";

grant select on table "public"."marketplaces" to "service_role";

grant trigger on table "public"."marketplaces" to "service_role";

grant truncate on table "public"."marketplaces" to "service_role";

grant update on table "public"."marketplaces" to "service_role";

grant delete on table "public"."orders" to "anon";

grant insert on table "public"."orders" to "anon";

grant references on table "public"."orders" to "anon";

grant select on table "public"."orders" to "anon";

grant trigger on table "public"."orders" to "anon";

grant truncate on table "public"."orders" to "anon";

grant update on table "public"."orders" to "anon";

grant delete on table "public"."orders" to "authenticated";

grant insert on table "public"."orders" to "authenticated";

grant references on table "public"."orders" to "authenticated";

grant select on table "public"."orders" to "authenticated";

grant trigger on table "public"."orders" to "authenticated";

grant truncate on table "public"."orders" to "authenticated";

grant update on table "public"."orders" to "authenticated";

grant delete on table "public"."orders" to "postgres";

grant insert on table "public"."orders" to "postgres";

grant references on table "public"."orders" to "postgres";

grant select on table "public"."orders" to "postgres";

grant trigger on table "public"."orders" to "postgres";

grant truncate on table "public"."orders" to "postgres";

grant update on table "public"."orders" to "postgres";

grant delete on table "public"."orders" to "service_role";

grant insert on table "public"."orders" to "service_role";

grant references on table "public"."orders" to "service_role";

grant select on table "public"."orders" to "service_role";

grant trigger on table "public"."orders" to "service_role";

grant truncate on table "public"."orders" to "service_role";

grant update on table "public"."orders" to "service_role";

grant delete on table "public"."products" to "anon";

grant insert on table "public"."products" to "anon";

grant references on table "public"."products" to "anon";

grant select on table "public"."products" to "anon";

grant trigger on table "public"."products" to "anon";

grant truncate on table "public"."products" to "anon";

grant update on table "public"."products" to "anon";

grant delete on table "public"."products" to "authenticated";

grant insert on table "public"."products" to "authenticated";

grant references on table "public"."products" to "authenticated";

grant select on table "public"."products" to "authenticated";

grant trigger on table "public"."products" to "authenticated";

grant truncate on table "public"."products" to "authenticated";

grant update on table "public"."products" to "authenticated";

grant delete on table "public"."products" to "postgres";

grant insert on table "public"."products" to "postgres";

grant references on table "public"."products" to "postgres";

grant select on table "public"."products" to "postgres";

grant trigger on table "public"."products" to "postgres";

grant truncate on table "public"."products" to "postgres";

grant update on table "public"."products" to "postgres";

grant delete on table "public"."products" to "service_role";

grant insert on table "public"."products" to "service_role";

grant references on table "public"."products" to "service_role";

grant select on table "public"."products" to "service_role";

grant trigger on table "public"."products" to "service_role";

grant truncate on table "public"."products" to "service_role";

grant update on table "public"."products" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "postgres";

grant insert on table "public"."profiles" to "postgres";

grant references on table "public"."profiles" to "postgres";

grant select on table "public"."profiles" to "postgres";

grant trigger on table "public"."profiles" to "postgres";

grant truncate on table "public"."profiles" to "postgres";

grant update on table "public"."profiles" to "postgres";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."sellers" to "anon";

grant insert on table "public"."sellers" to "anon";

grant references on table "public"."sellers" to "anon";

grant select on table "public"."sellers" to "anon";

grant trigger on table "public"."sellers" to "anon";

grant truncate on table "public"."sellers" to "anon";

grant update on table "public"."sellers" to "anon";

grant delete on table "public"."sellers" to "authenticated";

grant insert on table "public"."sellers" to "authenticated";

grant references on table "public"."sellers" to "authenticated";

grant select on table "public"."sellers" to "authenticated";

grant trigger on table "public"."sellers" to "authenticated";

grant truncate on table "public"."sellers" to "authenticated";

grant update on table "public"."sellers" to "authenticated";

grant delete on table "public"."sellers" to "postgres";

grant insert on table "public"."sellers" to "postgres";

grant references on table "public"."sellers" to "postgres";

grant select on table "public"."sellers" to "postgres";

grant trigger on table "public"."sellers" to "postgres";

grant truncate on table "public"."sellers" to "postgres";

grant update on table "public"."sellers" to "postgres";

grant delete on table "public"."sellers" to "service_role";

grant insert on table "public"."sellers" to "service_role";

grant references on table "public"."sellers" to "service_role";

grant select on table "public"."sellers" to "service_role";

grant trigger on table "public"."sellers" to "service_role";

grant truncate on table "public"."sellers" to "service_role";

grant update on table "public"."sellers" to "service_role";

grant delete on table "public"."tenants" to "anon";

grant insert on table "public"."tenants" to "anon";

grant references on table "public"."tenants" to "anon";

grant select on table "public"."tenants" to "anon";

grant trigger on table "public"."tenants" to "anon";

grant truncate on table "public"."tenants" to "anon";

grant update on table "public"."tenants" to "anon";

grant delete on table "public"."tenants" to "authenticated";

grant insert on table "public"."tenants" to "authenticated";

grant references on table "public"."tenants" to "authenticated";

grant select on table "public"."tenants" to "authenticated";

grant trigger on table "public"."tenants" to "authenticated";

grant truncate on table "public"."tenants" to "authenticated";

grant update on table "public"."tenants" to "authenticated";

grant delete on table "public"."tenants" to "postgres";

grant insert on table "public"."tenants" to "postgres";

grant references on table "public"."tenants" to "postgres";

grant select on table "public"."tenants" to "postgres";

grant trigger on table "public"."tenants" to "postgres";

grant truncate on table "public"."tenants" to "postgres";

grant update on table "public"."tenants" to "postgres";

grant delete on table "public"."tenants" to "service_role";

grant insert on table "public"."tenants" to "service_role";

grant references on table "public"."tenants" to "service_role";

grant select on table "public"."tenants" to "service_role";

grant trigger on table "public"."tenants" to "service_role";

grant truncate on table "public"."tenants" to "service_role";

grant update on table "public"."tenants" to "service_role";


  create policy "admin_full_auditlog"
  on "public"."admin_audit_log"
  as permissive
  for all
  to public
using ((auth.role() = 'admin'::text));



  create policy "admin_full_orders"
  on "public"."orders"
  as permissive
  for all
  to public
using ((auth.role() = 'admin'::text));



  create policy "customer_rw_own_orders"
  on "public"."orders"
  as permissive
  for all
  to public
using ((user_id = auth.uid()));



  create policy "admin_full_products"
  on "public"."products"
  as permissive
  for all
  to public
using ((auth.role() = 'admin'::text));



  create policy "public_read_products"
  on "public"."products"
  as permissive
  for select
  to public
using (true);



  create policy "admin_full_profiles"
  on "public"."profiles"
  as permissive
  for all
  to public
using ((auth.role() = 'admin'::text));



  create policy "customer_own_profile_rw"
  on "public"."profiles"
  as permissive
  for all
  to public
using ((id = auth.uid()));



