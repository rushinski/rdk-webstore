export const PROCESSING_FEE_RATE = 0.04;
export const PROCESSING_FEE_LABEL = `${PROCESSING_FEE_RATE * 100}%`;

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

export function calculateCheckoutDisplayTotals(params: {
  subtotal: number;
  shipping: number;
  tax: number;
  fulfillment: "ship" | "pickup";
}) {
  const subtotalCents = toCents(params.subtotal);
  const shippingCents = params.fulfillment === "pickup" ? 0 : toCents(params.shipping);
  const taxCents = toCents(params.tax);
  const actualTotalCents = subtotalCents + shippingCents + taxCents;
  const processingFeeCents = Math.round(actualTotalCents * PROCESSING_FEE_RATE);

  return {
    actualTotal: fromCents(actualTotalCents),
    processingFee: fromCents(processingFeeCents),
    displayTotal: fromCents(actualTotalCents + processingFeeCents),
  };
}
