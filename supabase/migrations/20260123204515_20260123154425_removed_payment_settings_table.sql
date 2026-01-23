drop trigger if exists "update_tenant_payment_settings_updated_at" on "public"."tenant_payment_settings";

drop policy "Admins can manage payment settings" on "public"."tenant_payment_settings";

revoke delete on table "public"."tenant_payment_settings" from "anon";

revoke insert on table "public"."tenant_payment_settings" from "anon";

revoke references on table "public"."tenant_payment_settings" from "anon";

revoke select on table "public"."tenant_payment_settings" from "anon";

revoke trigger on table "public"."tenant_payment_settings" from "anon";

revoke truncate on table "public"."tenant_payment_settings" from "anon";

revoke update on table "public"."tenant_payment_settings" from "anon";

revoke delete on table "public"."tenant_payment_settings" from "authenticated";

revoke insert on table "public"."tenant_payment_settings" from "authenticated";

revoke references on table "public"."tenant_payment_settings" from "authenticated";

revoke select on table "public"."tenant_payment_settings" from "authenticated";

revoke trigger on table "public"."tenant_payment_settings" from "authenticated";

revoke truncate on table "public"."tenant_payment_settings" from "authenticated";

revoke update on table "public"."tenant_payment_settings" from "authenticated";

revoke delete on table "public"."tenant_payment_settings" from "service_role";

revoke insert on table "public"."tenant_payment_settings" from "service_role";

revoke references on table "public"."tenant_payment_settings" from "service_role";

revoke select on table "public"."tenant_payment_settings" from "service_role";

revoke trigger on table "public"."tenant_payment_settings" from "service_role";

revoke truncate on table "public"."tenant_payment_settings" from "service_role";

revoke update on table "public"."tenant_payment_settings" from "service_role";

alter table "public"."tenant_payment_settings" drop constraint "tenant_payment_settings_tenant_id_fkey";

alter table "public"."tenant_payment_settings" drop constraint "tenant_payment_settings_pkey";

drop index if exists "public"."tenant_payment_settings_pkey";

drop index if exists "public"."tenant_payment_settings_tenant_id_key";

drop table "public"."tenant_payment_settings";


