drop policy "profiles_update_own" on "public"."profiles";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.block_privileged_field_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  acting_role text;
begin
  -- 1. Allow SQL console / service key / migrations
  if auth.uid() is null then
    return new;
  end if;

  -- 2. Determine the user's role
  select role into acting_role
  from public.profiles
  where id = auth.uid();

  -- 3. Allow admins to modify privileged fields
  if acting_role = 'admin' then
    return new;
  end if;

  -- 4. Block privileged field changes for normal users
  if new.role <> old.role then
    raise exception 'Cannot modify role';
  end if;

  if new.totp_secret <> old.totp_secret then
    raise exception 'Cannot modify totp_secret';
  end if;

  if new.twofa_enabled <> old.twofa_enabled then
    raise exception 'Cannot modify twofa_enabled';
  end if;

  return new;
end;
$function$
;


  create policy "profiles_update_self"
  on "public"."profiles"
  as permissive
  for update
  to authenticated
using ((auth.uid() = id))
with check ((auth.uid() = id));


CREATE TRIGGER block_privileged_fields BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.block_privileged_field_changes();


