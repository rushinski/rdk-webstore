-- Fix: Allow mark_order_paid_and_decrement to transition orders from
-- BOTH 'pending' AND 'processing' to 'paid'.
--
-- BNPL methods (Afterpay, Affirm, Klarna) go through a 'processing' state
-- before settling. The webhook fires payment_intent.succeeded when the
-- payment settles, but the previous version of this function only matched
-- status = 'pending', causing BNPL orders to silently fail to transition
-- to 'paid'.

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
    stripe_payment_intent_id = p_stripe_payment_intent_id
  where id = p_order_id
    and status in ('pending', 'processing')
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

  if v_updated <> v_expected then
    raise exception 'Insufficient stock for one or more variants';
  end if;

  return true;
end;
$function$;
