import { ProductSkuService } from "@/services/product-sku-service";

describe("ProductSkuService", () => {
  it("returns the next numeric SKU after existing numeric values", () => {
    const service = new ProductSkuService();

    expect(service.getNextNumericSku(["100001", "100002", "ABC-1"])).toBe("100003");
  });

  it("starts at 100001 when no numeric SKU exists", () => {
    const service = new ProductSkuService();

    expect(service.getNextNumericSku(["ABC-1", "LS-200"])).toBe("100001");
  });

  it("accepts imported non-numeric SKUs as valid non-empty strings", () => {
    const service = new ProductSkuService();

    expect(service.normalizeImportedSku(" ls-ABC-001 ")).toBe("ls-ABC-001");
  });

  it("rejects empty imported SKUs", () => {
    const service = new ProductSkuService();

    expect(() => service.normalizeImportedSku("   ")).toThrow("SKU is required.");
  });
});
