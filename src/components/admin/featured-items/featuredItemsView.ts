type PriceVariant = {
  sale_price_cents: number;
};

export function formatFeaturedItemPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function getFeaturedItemMinPrice(variants?: PriceVariant[]) {
  if (!variants || variants.length === 0) {
    return 0;
  }

  return Math.min(...variants.map((variant) => variant.sale_price_cents));
}
