const DEFAULT_STARTING_SKU = 100001;

export class ProductSkuService {
  getNextNumericSku(existingSkus: string[], startingSku = DEFAULT_STARTING_SKU) {
    const maxExisting = existingSkus.reduce((max, sku) => {
      const trimmed = sku.trim();
      if (!/^\d+$/.test(trimmed)) {
        return max;
      }

      const value = Number.parseInt(trimmed, 10);
      if (!Number.isSafeInteger(value)) {
        return max;
      }

      return Math.max(max, value);
    }, startingSku - 1);

    return String(maxExisting + 1);
  }

  normalizeImportedSku(input: string) {
    const sku = input.trim();
    if (!sku) {
      throw new Error("SKU is required.");
    }
    return sku;
  }
}
