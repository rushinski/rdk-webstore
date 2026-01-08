
-- 1. Allow guest users to create orders.
create policy "Allow anon insert on orders"
on "public"."orders"
as permissive
for insert
to anon
with check (true);

-- 2. Allow guest users to create order items.
create policy "Allow anon insert on order_items"
on "public"."order_items"
as permissive
for insert
to anon
with check (true);

-- 3. Allow guest users to create order shipping.
create policy "Allow anon insert on order_shipping"
on "public"."order_shipping"
as permissive
for insert
to anon
with check (true);

-- 4. Allow guest users to create chats for pickup orders.
create policy "Allow anon insert on chats for pickup orders"
on "public"."chats"
as permissive
for insert
to anon
with check (
  source = 'order'
  and guest_email is not null
  and user_id is null
  and exists (
    select 1
    from public.orders
    where orders.id = chats.order_id
      and orders.fulfillment = 'pickup'
  )
);
