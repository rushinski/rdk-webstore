import { ProductSkuService } from "@/services/product-sku-service";
import { ProductService } from "@/services/product-service";

describe("variant SKU assignment", () => {
  it("generates numeric SKUs for variants missing a SKU", () => {
    const skuService = new ProductSkuService();
    const existing = ["100001"];

    const first = skuService.getNextNumericSku(existing);
    const second = skuService.getNextNumericSku([...existing, first]);

    expect(first).toBe("100002");
    expect(second).toBe("100003");
  });

  it("hard deletes products even when order items exist", async () => {
    const deleteMock = jest.fn().mockResolvedValue(undefined);
    const archiveMock = jest.fn().mockResolvedValue(undefined);

    const service = new ProductService({} as never);
    (service as unknown as { repo: unknown }).repo = {
      delete: deleteMock,
      archive: archiveMock,
    };

    const result = await service.deleteProduct("product-1");

    expect(deleteMock).toHaveBeenCalledWith("product-1");
    expect(archiveMock).not.toHaveBeenCalled();
    expect(result).toEqual({ archived: false });
  });
});
