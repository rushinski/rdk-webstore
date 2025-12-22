
  create table "public"."email_subscribers" (
    "id" uuid not null default gen_random_uuid(),
    "email" text not null,
    "subscribed_at" timestamp with time zone not null default now(),
    "source" text
      );


CREATE INDEX email_subscribers_email_idx ON public.email_subscribers USING btree (email);

CREATE UNIQUE INDEX email_subscribers_email_key ON public.email_subscribers USING btree (email);

CREATE UNIQUE INDEX email_subscribers_pkey ON public.email_subscribers USING btree (id);

alter table "public"."email_subscribers" add constraint "email_subscribers_pkey" PRIMARY KEY using index "email_subscribers_pkey";

alter table "public"."email_subscribers" add constraint "email_subscribers_email_key" UNIQUE using index "email_subscribers_email_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."email_subscribers" to "anon";

grant insert on table "public"."email_subscribers" to "anon";

grant references on table "public"."email_subscribers" to "anon";

grant select on table "public"."email_subscribers" to "anon";

grant trigger on table "public"."email_subscribers" to "anon";

grant truncate on table "public"."email_subscribers" to "anon";

grant update on table "public"."email_subscribers" to "anon";

grant delete on table "public"."email_subscribers" to "authenticated";

grant insert on table "public"."email_subscribers" to "authenticated";

grant references on table "public"."email_subscribers" to "authenticated";

grant select on table "public"."email_subscribers" to "authenticated";

grant trigger on table "public"."email_subscribers" to "authenticated";

grant truncate on table "public"."email_subscribers" to "authenticated";

grant update on table "public"."email_subscribers" to "authenticated";

grant delete on table "public"."email_subscribers" to "postgres";

grant insert on table "public"."email_subscribers" to "postgres";

grant references on table "public"."email_subscribers" to "postgres";

grant select on table "public"."email_subscribers" to "postgres";

grant trigger on table "public"."email_subscribers" to "postgres";

grant truncate on table "public"."email_subscribers" to "postgres";

grant update on table "public"."email_subscribers" to "postgres";

grant delete on table "public"."email_subscribers" to "service_role";

grant insert on table "public"."email_subscribers" to "service_role";

grant references on table "public"."email_subscribers" to "service_role";

grant select on table "public"."email_subscribers" to "service_role";

grant trigger on table "public"."email_subscribers" to "service_role";

grant truncate on table "public"."email_subscribers" to "service_role";

grant update on table "public"."email_subscribers" to "service_role";


  create policy "Admins can manage images"
  on "public"."product_images"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));



  create policy "Public can view images of active products"
  on "public"."product_images"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.products
  WHERE ((products.id = product_images.product_id) AND (products.is_active = true)))));



  create policy "Admins can manage product tags"
  on "public"."product_tags"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));



  create policy "Public can view product tags"
  on "public"."product_tags"
  as permissive
  for select
  to public
using (true);



  create policy "Admins can manage variants"
  on "public"."product_variants"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));



  create policy "Public can view variants of active products"
  on "public"."product_variants"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.products
  WHERE ((products.id = product_variants.product_id) AND (products.is_active = true)))));



  create policy "Admins can manage products"
  on "public"."products"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));



  create policy "Public can view active products"
  on "public"."products"
  as permissive
  for select
  to public
using ((is_active = true));



  create policy "Admins can manage tags"
  on "public"."tags"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));



  create policy "Public can view tags"
  on "public"."tags"
  as permissive
  for select
  to public
using (true);


CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipping_profiles_updated_at BEFORE UPDATE ON public.shipping_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


