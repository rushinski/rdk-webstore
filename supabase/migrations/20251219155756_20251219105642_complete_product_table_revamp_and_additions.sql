drop policy "admin_full_products" on "public"."products";

drop policy "public_read_products" on "public"."products";

alter table "public"."products" drop constraint "products_tenant_id_fkey";

drop index if exists "public"."products_brand_idx";

drop index if exists "public"."products_clothing_sizes_idx";

drop index if exists "public"."products_created_idx";

drop index if exists "public"."products_shoe_sizes_idx";

drop index if exists "public"."products_tenant_idx";


  create table "public"."product_images" (
    "id" uuid not null default gen_random_uuid(),
    "product_id" uuid not null,
    "url" text not null,
    "sort_order" integer not null default 0,
    "is_primary" boolean not null default false
      );


alter table "public"."product_images" enable row level security;


  create table "public"."product_tags" (
    "product_id" uuid not null,
    "tag_id" uuid not null
      );


alter table "public"."product_tags" enable row level security;


  create table "public"."product_variants" (
    "id" uuid not null default gen_random_uuid(),
    "product_id" uuid not null,
    "size_type" text not null,
    "size_label" text not null,
    "price_cents" integer not null,
    "stock" integer not null default 1
      );


alter table "public"."product_variants" enable row level security;


  create table "public"."shipping_profiles" (
    "user_id" uuid not null,
    "tenant_id" uuid,
    "full_name" text,
    "phone" text,
    "address_line1" text,
    "address_line2" text,
    "city" text,
    "state" text,
    "postal_code" text,
    "country" text,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."shipping_profiles" enable row level security;


  create table "public"."tags" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid,
    "label" text not null,
    "group_key" text not null
      );


alter table "public"."tags" enable row level security;

alter table "public"."products" drop column "clothing_sizes";

alter table "public"."products" drop column "images";

alter table "public"."products" drop column "price";

alter table "public"."products" drop column "shoe_sizes";

alter table "public"."products" add column "category" text not null;

alter table "public"."products" add column "condition_note" text;

alter table "public"."products" add column "cost_cents" integer not null default 0;

alter table "public"."products" add column "created_by" uuid;

alter table "public"."products" add column "is_active" boolean not null default true;

alter table "public"."products" add column "shipping_override_cents" integer;

alter table "public"."products" add column "sku" text not null;

alter table "public"."products" add column "updated_at" timestamp with time zone not null default now();

alter table "public"."products" alter column "brand" set not null;

alter table "public"."products" alter column "condition" drop default;

alter table "public"."products" alter column "condition" set not null;

alter table "public"."products" alter column "created_at" set not null;

alter table "public"."products" alter column "tenant_id" set not null;

CREATE INDEX idx_product_images_product_id ON public.product_images USING btree (product_id);

CREATE INDEX idx_product_tags_product_id ON public.product_tags USING btree (product_id);

CREATE INDEX idx_product_tags_tag_id ON public.product_tags USING btree (tag_id);

CREATE INDEX idx_product_variants_product_id ON public.product_variants USING btree (product_id);

CREATE INDEX idx_products_brand ON public.products USING btree (brand);

CREATE INDEX idx_products_category ON public.products USING btree (category);

CREATE INDEX idx_products_created_at ON public.products USING btree (created_at DESC);

CREATE INDEX idx_products_is_active ON public.products USING btree (is_active);

CREATE INDEX idx_products_marketplace_id ON public.products USING btree (marketplace_id);

CREATE INDEX idx_products_seller_id ON public.products USING btree (seller_id);

CREATE INDEX idx_products_tenant_id ON public.products USING btree (tenant_id);

CREATE INDEX idx_shipping_profiles_tenant_id ON public.shipping_profiles USING btree (tenant_id);

CREATE INDEX idx_tags_group_key ON public.tags USING btree (group_key);

CREATE INDEX idx_tags_tenant_id ON public.tags USING btree (tenant_id);

CREATE UNIQUE INDEX product_images_pkey ON public.product_images USING btree (id);

CREATE UNIQUE INDEX product_tags_pkey ON public.product_tags USING btree (product_id, tag_id);

CREATE UNIQUE INDEX product_variants_pkey ON public.product_variants USING btree (id);

CREATE UNIQUE INDEX product_variants_unique_per_size ON public.product_variants USING btree (product_id, size_type, size_label);

CREATE UNIQUE INDEX products_tenant_sku_key ON public.products USING btree (tenant_id, sku);

CREATE UNIQUE INDEX shipping_profiles_pkey ON public.shipping_profiles USING btree (user_id);

CREATE UNIQUE INDEX tags_pkey ON public.tags USING btree (id);

CREATE UNIQUE INDEX tags_unique_per_tenant ON public.tags USING btree (tenant_id, label, group_key);

alter table "public"."product_images" add constraint "product_images_pkey" PRIMARY KEY using index "product_images_pkey";

alter table "public"."product_tags" add constraint "product_tags_pkey" PRIMARY KEY using index "product_tags_pkey";

alter table "public"."product_variants" add constraint "product_variants_pkey" PRIMARY KEY using index "product_variants_pkey";

alter table "public"."shipping_profiles" add constraint "shipping_profiles_pkey" PRIMARY KEY using index "shipping_profiles_pkey";

alter table "public"."tags" add constraint "tags_pkey" PRIMARY KEY using index "tags_pkey";

alter table "public"."product_images" add constraint "product_images_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE not valid;

alter table "public"."product_images" validate constraint "product_images_product_id_fkey";

alter table "public"."product_tags" add constraint "product_tags_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE not valid;

alter table "public"."product_tags" validate constraint "product_tags_product_id_fkey";

alter table "public"."product_tags" add constraint "product_tags_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE not valid;

alter table "public"."product_tags" validate constraint "product_tags_tag_id_fkey";

alter table "public"."product_variants" add constraint "product_variants_price_cents_check" CHECK ((price_cents >= 0)) not valid;

alter table "public"."product_variants" validate constraint "product_variants_price_cents_check";

alter table "public"."product_variants" add constraint "product_variants_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE not valid;

alter table "public"."product_variants" validate constraint "product_variants_product_id_fkey";

alter table "public"."product_variants" add constraint "product_variants_size_type_check" CHECK ((size_type = ANY (ARRAY['shoe'::text, 'clothing'::text, 'custom'::text, 'none'::text]))) not valid;

alter table "public"."product_variants" validate constraint "product_variants_size_type_check";

alter table "public"."product_variants" add constraint "product_variants_stock_check" CHECK ((stock >= 0)) not valid;

alter table "public"."product_variants" validate constraint "product_variants_stock_check";

alter table "public"."product_variants" add constraint "product_variants_unique_per_size" UNIQUE using index "product_variants_unique_per_size";

alter table "public"."products" add constraint "products_category_check" CHECK ((category = ANY (ARRAY['sneakers'::text, 'clothing'::text, 'accessories'::text, 'electronics'::text]))) not valid;

alter table "public"."products" validate constraint "products_category_check";

alter table "public"."products" add constraint "products_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."products" validate constraint "products_created_by_fkey";

alter table "public"."products" add constraint "products_tenant_sku_key" UNIQUE using index "products_tenant_sku_key";

alter table "public"."shipping_profiles" add constraint "shipping_profiles_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL not valid;

alter table "public"."shipping_profiles" validate constraint "shipping_profiles_tenant_id_fkey";

alter table "public"."shipping_profiles" add constraint "shipping_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."shipping_profiles" validate constraint "shipping_profiles_user_id_fkey";

alter table "public"."tags" add constraint "tags_group_key_check" CHECK ((group_key = ANY (ARRAY['brand'::text, 'size_shoe'::text, 'size_clothing'::text, 'size_custom'::text, 'size_none'::text, 'condition'::text, 'category'::text]))) not valid;

alter table "public"."tags" validate constraint "tags_group_key_check";

alter table "public"."tags" add constraint "tags_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."tags" validate constraint "tags_tenant_id_fkey";

alter table "public"."tags" add constraint "tags_unique_per_tenant" UNIQUE using index "tags_unique_per_tenant";

alter table "public"."products" add constraint "products_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."products" validate constraint "products_tenant_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.is_admin_for_tenant(target_tenant uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.tenant_id = target_tenant
  );
$function$
;

CREATE OR REPLACE FUNCTION public.rdk_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."product_images" to "anon";

grant insert on table "public"."product_images" to "anon";

grant references on table "public"."product_images" to "anon";

grant select on table "public"."product_images" to "anon";

grant trigger on table "public"."product_images" to "anon";

grant truncate on table "public"."product_images" to "anon";

grant update on table "public"."product_images" to "anon";

grant delete on table "public"."product_images" to "authenticated";

grant insert on table "public"."product_images" to "authenticated";

grant references on table "public"."product_images" to "authenticated";

grant select on table "public"."product_images" to "authenticated";

grant trigger on table "public"."product_images" to "authenticated";

grant truncate on table "public"."product_images" to "authenticated";

grant update on table "public"."product_images" to "authenticated";

grant delete on table "public"."product_images" to "postgres";

grant insert on table "public"."product_images" to "postgres";

grant references on table "public"."product_images" to "postgres";

grant select on table "public"."product_images" to "postgres";

grant trigger on table "public"."product_images" to "postgres";

grant truncate on table "public"."product_images" to "postgres";

grant update on table "public"."product_images" to "postgres";

grant delete on table "public"."product_images" to "service_role";

grant insert on table "public"."product_images" to "service_role";

grant references on table "public"."product_images" to "service_role";

grant select on table "public"."product_images" to "service_role";

grant trigger on table "public"."product_images" to "service_role";

grant truncate on table "public"."product_images" to "service_role";

grant update on table "public"."product_images" to "service_role";

grant delete on table "public"."product_tags" to "anon";

grant insert on table "public"."product_tags" to "anon";

grant references on table "public"."product_tags" to "anon";

grant select on table "public"."product_tags" to "anon";

grant trigger on table "public"."product_tags" to "anon";

grant truncate on table "public"."product_tags" to "anon";

grant update on table "public"."product_tags" to "anon";

grant delete on table "public"."product_tags" to "authenticated";

grant insert on table "public"."product_tags" to "authenticated";

grant references on table "public"."product_tags" to "authenticated";

grant select on table "public"."product_tags" to "authenticated";

grant trigger on table "public"."product_tags" to "authenticated";

grant truncate on table "public"."product_tags" to "authenticated";

grant update on table "public"."product_tags" to "authenticated";

grant delete on table "public"."product_tags" to "postgres";

grant insert on table "public"."product_tags" to "postgres";

grant references on table "public"."product_tags" to "postgres";

grant select on table "public"."product_tags" to "postgres";

grant trigger on table "public"."product_tags" to "postgres";

grant truncate on table "public"."product_tags" to "postgres";

grant update on table "public"."product_tags" to "postgres";

grant delete on table "public"."product_tags" to "service_role";

grant insert on table "public"."product_tags" to "service_role";

grant references on table "public"."product_tags" to "service_role";

grant select on table "public"."product_tags" to "service_role";

grant trigger on table "public"."product_tags" to "service_role";

grant truncate on table "public"."product_tags" to "service_role";

grant update on table "public"."product_tags" to "service_role";

grant delete on table "public"."product_variants" to "anon";

grant insert on table "public"."product_variants" to "anon";

grant references on table "public"."product_variants" to "anon";

grant select on table "public"."product_variants" to "anon";

grant trigger on table "public"."product_variants" to "anon";

grant truncate on table "public"."product_variants" to "anon";

grant update on table "public"."product_variants" to "anon";

grant delete on table "public"."product_variants" to "authenticated";

grant insert on table "public"."product_variants" to "authenticated";

grant references on table "public"."product_variants" to "authenticated";

grant select on table "public"."product_variants" to "authenticated";

grant trigger on table "public"."product_variants" to "authenticated";

grant truncate on table "public"."product_variants" to "authenticated";

grant update on table "public"."product_variants" to "authenticated";

grant delete on table "public"."product_variants" to "postgres";

grant insert on table "public"."product_variants" to "postgres";

grant references on table "public"."product_variants" to "postgres";

grant select on table "public"."product_variants" to "postgres";

grant trigger on table "public"."product_variants" to "postgres";

grant truncate on table "public"."product_variants" to "postgres";

grant update on table "public"."product_variants" to "postgres";

grant delete on table "public"."product_variants" to "service_role";

grant insert on table "public"."product_variants" to "service_role";

grant references on table "public"."product_variants" to "service_role";

grant select on table "public"."product_variants" to "service_role";

grant trigger on table "public"."product_variants" to "service_role";

grant truncate on table "public"."product_variants" to "service_role";

grant update on table "public"."product_variants" to "service_role";

grant delete on table "public"."products" to "postgres";

grant insert on table "public"."products" to "postgres";

grant references on table "public"."products" to "postgres";

grant select on table "public"."products" to "postgres";

grant trigger on table "public"."products" to "postgres";

grant truncate on table "public"."products" to "postgres";

grant update on table "public"."products" to "postgres";

grant delete on table "public"."shipping_profiles" to "anon";

grant insert on table "public"."shipping_profiles" to "anon";

grant references on table "public"."shipping_profiles" to "anon";

grant select on table "public"."shipping_profiles" to "anon";

grant trigger on table "public"."shipping_profiles" to "anon";

grant truncate on table "public"."shipping_profiles" to "anon";

grant update on table "public"."shipping_profiles" to "anon";

grant delete on table "public"."shipping_profiles" to "authenticated";

grant insert on table "public"."shipping_profiles" to "authenticated";

grant references on table "public"."shipping_profiles" to "authenticated";

grant select on table "public"."shipping_profiles" to "authenticated";

grant trigger on table "public"."shipping_profiles" to "authenticated";

grant truncate on table "public"."shipping_profiles" to "authenticated";

grant update on table "public"."shipping_profiles" to "authenticated";

grant delete on table "public"."shipping_profiles" to "postgres";

grant insert on table "public"."shipping_profiles" to "postgres";

grant references on table "public"."shipping_profiles" to "postgres";

grant select on table "public"."shipping_profiles" to "postgres";

grant trigger on table "public"."shipping_profiles" to "postgres";

grant truncate on table "public"."shipping_profiles" to "postgres";

grant update on table "public"."shipping_profiles" to "postgres";

grant delete on table "public"."shipping_profiles" to "service_role";

grant insert on table "public"."shipping_profiles" to "service_role";

grant references on table "public"."shipping_profiles" to "service_role";

grant select on table "public"."shipping_profiles" to "service_role";

grant trigger on table "public"."shipping_profiles" to "service_role";

grant truncate on table "public"."shipping_profiles" to "service_role";

grant update on table "public"."shipping_profiles" to "service_role";

grant delete on table "public"."tags" to "anon";

grant insert on table "public"."tags" to "anon";

grant references on table "public"."tags" to "anon";

grant select on table "public"."tags" to "anon";

grant trigger on table "public"."tags" to "anon";

grant truncate on table "public"."tags" to "anon";

grant update on table "public"."tags" to "anon";

grant delete on table "public"."tags" to "authenticated";

grant insert on table "public"."tags" to "authenticated";

grant references on table "public"."tags" to "authenticated";

grant select on table "public"."tags" to "authenticated";

grant trigger on table "public"."tags" to "authenticated";

grant truncate on table "public"."tags" to "authenticated";

grant update on table "public"."tags" to "authenticated";

grant delete on table "public"."tags" to "postgres";

grant insert on table "public"."tags" to "postgres";

grant references on table "public"."tags" to "postgres";

grant select on table "public"."tags" to "postgres";

grant trigger on table "public"."tags" to "postgres";

grant truncate on table "public"."tags" to "postgres";

grant update on table "public"."tags" to "postgres";

grant delete on table "public"."tags" to "service_role";

grant insert on table "public"."tags" to "service_role";

grant references on table "public"."tags" to "service_role";

grant select on table "public"."tags" to "service_role";

grant trigger on table "public"."tags" to "service_role";

grant truncate on table "public"."tags" to "service_role";

grant update on table "public"."tags" to "service_role";


  create policy "Public can view images of active marketplace products"
  on "public"."product_images"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_images.product_id) AND (p.is_active = true) AND (p.marketplace_id IS NOT NULL)))));



  create policy "Tenant admins can manage images via product"
  on "public"."product_images"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_images.product_id) AND public.is_admin_for_tenant(p.tenant_id)))))
with check ((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_images.product_id) AND public.is_admin_for_tenant(p.tenant_id)))));



  create policy "Public can view product tags for active marketplace products"
  on "public"."product_tags"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_tags.product_id) AND (p.is_active = true) AND (p.marketplace_id IS NOT NULL)))));



  create policy "Tenant admins can manage product tags via product"
  on "public"."product_tags"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_tags.product_id) AND public.is_admin_for_tenant(p.tenant_id)))))
with check ((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_tags.product_id) AND public.is_admin_for_tenant(p.tenant_id)))));



  create policy "Public can view variants of active marketplace products"
  on "public"."product_variants"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_variants.product_id) AND (p.is_active = true) AND (p.marketplace_id IS NOT NULL)))));



  create policy "Tenant admins can manage variants via product"
  on "public"."product_variants"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_variants.product_id) AND public.is_admin_for_tenant(p.tenant_id)))))
with check ((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_variants.product_id) AND public.is_admin_for_tenant(p.tenant_id)))));



  create policy "Public can view active marketplace products"
  on "public"."products"
  as permissive
  for select
  to public
using (((is_active = true) AND (marketplace_id IS NOT NULL)));



  create policy "Tenant admins can delete products"
  on "public"."products"
  as permissive
  for delete
  to public
using (public.is_admin_for_tenant(tenant_id));



  create policy "Tenant admins can insert products"
  on "public"."products"
  as permissive
  for insert
  to public
with check (public.is_admin_for_tenant(tenant_id));



  create policy "Tenant admins can update products"
  on "public"."products"
  as permissive
  for update
  to public
using (public.is_admin_for_tenant(tenant_id))
with check (public.is_admin_for_tenant(tenant_id));



  create policy "Users can insert own shipping profile"
  on "public"."shipping_profiles"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update own shipping profile"
  on "public"."shipping_profiles"
  as permissive
  for update
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Users can view own shipping profile"
  on "public"."shipping_profiles"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Public can view global tags"
  on "public"."tags"
  as permissive
  for select
  to public
using ((tenant_id IS NULL));



  create policy "Tenant admins can manage tenant tags"
  on "public"."tags"
  as permissive
  for all
  to public
using (((tenant_id IS NOT NULL) AND public.is_admin_for_tenant(tenant_id)))
with check (((tenant_id IS NOT NULL) AND public.is_admin_for_tenant(tenant_id)));


CREATE TRIGGER trg_products_set_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.rdk_set_updated_at();

CREATE TRIGGER trg_shipping_profiles_set_updated_at BEFORE UPDATE ON public.shipping_profiles FOR EACH ROW EXECUTE FUNCTION public.rdk_set_updated_at();


