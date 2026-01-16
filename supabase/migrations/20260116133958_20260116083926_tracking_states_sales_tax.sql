alter table "public"."state_sales_tracking" add column "tax_collected" numeric(10,2) not null default 0;

CREATE INDEX idx_state_sales_tracking_tax_collected ON public.state_sales_tracking USING btree (tenant_id, state_code, tax_collected);


