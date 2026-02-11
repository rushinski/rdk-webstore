type NumericLike = number | string | null | undefined;

const toNonNegativeNumber = (value: NumericLike): number => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, parsed);
};

export const getOrderRefundDollars = (
  orderTotal: NumericLike,
  refundAmountRaw: NumericLike,
): number => {
  const totalCents = Math.round(toNonNegativeNumber(orderTotal) * 100);
  const refundCents = Math.round(toNonNegativeNumber(refundAmountRaw));
  const appliedRefundCents = Math.min(refundCents, totalCents);
  return appliedRefundCents / 100;
};

export const getOrderNetRevenueDollars = (
  orderTotal: NumericLike,
  refundAmountRaw: NumericLike,
): number => {
  const total = toNonNegativeNumber(orderTotal);
  const refund = getOrderRefundDollars(orderTotal, refundAmountRaw);
  return Math.max(0, total - refund);
};

type ItemLike = {
  quantity?: NumericLike;
  refunded_at?: string | null;
};

export const getOrderNetProfitDollars = <TItem extends ItemLike>(params: {
  subtotal: NumericLike;
  total: NumericLike;
  refundAmountRaw: NumericLike;
  items: TItem[] | null | undefined;
  resolveUnitCost: (item: TItem) => number;
}) => {
  const subtotal = toNonNegativeNumber(params.subtotal);
  const refund = getOrderRefundDollars(params.total, params.refundAmountRaw);

  let totalItemCost = 0;
  let refundedItemCost = 0;

  for (const item of params.items ?? []) {
    const quantity = Math.max(0, Number(item.quantity ?? 0));
    const unitCost = Math.max(0, Number(params.resolveUnitCost(item) || 0));
    const lineCost = unitCost * quantity;

    totalItemCost += lineCost;
    if (item.refunded_at) {
      refundedItemCost += lineCost;
    }
  }

  // Product refunds are restocked, so refunded item COGS should not stay in realized profit.
  const effectiveItemCost = Math.max(0, totalItemCost - refundedItemCost);
  return subtotal - effectiveItemCost - refund;
};
