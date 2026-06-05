import { ProductSkuService } from "@/services/product-sku-service";

describe("variant SKU assignment", () => {
  it("generates numeric SKUs for variants missing a SKU", () => {
    const skuService = new ProductSkuService();
    const existing = ["100001"];

    const first = skuService.getNextNumericSku(existing);
    const second = skuService.getNextNumericSku([...existing, first]);

    expect(first).toBe("100002");
    expect(second).toBe("100003");
  });
});
