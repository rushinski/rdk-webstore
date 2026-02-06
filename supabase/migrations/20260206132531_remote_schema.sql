alter table "public"."products" alter column "default_shipping_price" set default 10.00;

CREATE INDEX idx_orders_cart_hash ON public.orders USING btree (cart_hash);

CREATE INDEX idx_orders_customer_state ON public.orders USING btree (customer_state);

CREATE INDEX idx_orders_stripe_session_id ON public.orders USING btree (stripe_session_id);


