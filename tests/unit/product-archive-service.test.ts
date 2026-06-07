import { ProductService } from "@/services/product-service";

describe("ProductService archive behavior", () => {
  it("archives a product without deleting it", async () => {
    const getByIdMock = jest.fn().mockResolvedValue({
      id: "product-1",
      tenant_id: "tenant-1",
      archived_at: null,
    });
    const archiveMock = jest.fn().mockResolvedValue(undefined);
    const deleteMock = jest.fn().mockResolvedValue(undefined);

    const service = new ProductService({} as never);
    (service as unknown as { repo: unknown }).repo = {
      getById: getByIdMock,
      archive: archiveMock,
      delete: deleteMock,
    };

    const result = await service.archiveProduct("product-1", "tenant-1");

    expect(getByIdMock).toHaveBeenCalledWith("product-1", {
      tenantId: "tenant-1",
      includeOutOfStock: true,
      includeUnpublished: true,
      archivedStatus: "all",
    });
    expect(archiveMock).toHaveBeenCalledWith("product-1");
    expect(deleteMock).not.toHaveBeenCalled();
    expect(result).toEqual({ archived: true });
  });

  it("restores an archived product", async () => {
    const getByIdMock = jest.fn().mockResolvedValue({
      id: "product-1",
      tenant_id: "tenant-1",
      archived_at: "2026-06-07T20:00:00.000Z",
    });
    const restoreMock = jest.fn().mockResolvedValue(undefined);

    const service = new ProductService({} as never);
    (service as unknown as { repo: unknown }).repo = {
      getById: getByIdMock,
      restore: restoreMock,
    };

    const result = await service.restoreProduct("product-1", "tenant-1");

    expect(restoreMock).toHaveBeenCalledWith("product-1");
    expect(result).toEqual({ restored: true });
  });

  it("blocks updates to archived products", async () => {
    const getByIdMock = jest.fn().mockResolvedValue({
      id: "product-1",
      tenant_id: "tenant-1",
      archived_at: "2026-06-07T20:00:00.000Z",
      variants: [],
      images: [],
      tags: [],
      go_live_at: "2026-06-07T20:00:00.000Z",
    });

    const service = new ProductService({} as never);
    (service as unknown as { repo: unknown }).repo = {
      getById: getByIdMock,
    };

    await expect(
      service.updateProduct(
        "product-1",
        {
          name: "Archived Product",
          category: "sneakers",
          condition: "new",
          size_type: "shoe",
          variants: [
            {
              size_label: "9.5M / 11W",
              sale_price_cents: 10000,
              unit_cost_cents: 5000,
              stock: 1,
              sort_order: 0,
            },
          ],
          images: [
            {
              url: "https://example.com/test.jpg",
              sort_order: 0,
              is_primary: true,
            },
          ],
        },
        { userId: "user-1", tenantId: "tenant-1" },
      ),
    ).rejects.toThrow("Archived products are read-only until restored.");
  });
});
