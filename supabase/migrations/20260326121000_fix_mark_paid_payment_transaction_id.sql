-- Fix mark_order_paid_and_decrement after orders.stripe_payment_intent_id
-- was renamed to orders.payment_transaction_id.
--
-- Also allow failed -> paid recovery when the gateway has already captured
-- funds for a retried checkout attempt against the same order.

create or replace function public.mark_order_paid_and_decrement(
  p_order_id uuid,
  p_stripe_payment_intent_id text,
  p_items jsonb
)
returns boolean
language plpgsql
as $function$
declare
  v_order_updated integer;
  v_expected integer;
  v_updated integer;
begin
  update public.orders
  set
    status = 'paid',
    payment_transaction_id = p_stripe_payment_intent_id,
    failure_reason = null
  where id = p_order_id
    and status in ('pending', 'processing', 'failed')
  returning 1 into v_order_updated;

  if v_order_updated is null then
    return false;
  end if;

  with raw_items as (
    select
      (item->>'variant_id')::uuid as variant_id,
      (item->>'quantity')::int as quantity
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) item
    where (item->>'variant_id') is not null
  ),
  agg as (
    select variant_id, sum(quantity) as quantity
    from raw_items
    where quantity > 0
    group by variant_id
  ),
  updated as (
    update public.product_variants pv
    set stock = pv.stock - agg.quantity
    from agg
    where pv.id = agg.variant_id
      and pv.stock >= agg.quantity
    returning pv.id
  )
  select (select count(*) from agg), (select count(*) from updated)
  into v_expected, v_updated;

  if v_expected is null or v_expected = 0 then
    return true;
  end if;

  return true;
end;
$function$;
