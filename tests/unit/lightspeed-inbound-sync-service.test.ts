const createMock = jest.fn();
const updateMock = jest.fn();
const createVariantMock = jest.fn();
const updateVariantMock = jest.fn();
const createImageMock = jest.fn();
const deleteImagesByProductMock = jest.fn();
const deleteVariantMock = jest.fn();
const deleteProductMock = jest.fn();
const getProductByIdMock = jest.fn();

const getByLightspeedVariantIdMock = jest.fn();
const getByExternalSkuMock = jest.fn();
const getByLightspeedProductIdMock = jest.fn();
const listByProductIdMock = jest.fn();
const upsertLinkMock = jest.fn();
const updateLinkByIdMock = jest.fn();

jest.mock("@/repositories/product-repo", () => ({
  ProductRepository: jest.fn().mockImplementation(() => ({
    create: createMock,
    update: updateMock,
    createVariant: createVariantMock,
    updateVariant: updateVariantMock,
    createImage: createImageMock,
    deleteImagesByProduct: deleteImagesByProductMock,
    deleteVariant: deleteVariantMock,
    delete: deleteProductMock,
    getById: getProductByIdMock,
  })),
}));

jest.mock("@/repositories/lightspeed-links-repo", () => ({
  LightspeedLinksRepository: jest.fn().mockImplementation(() => ({
    getByLightspeedVariantId: getByLightspeedVariantIdMock,
    getByExternalSku: getByExternalSkuMock,
    getByLightspeedProductId: getByLightspeedProductIdMock,
    listByProductId: listByProductIdMock,
    upsertLink: upsertLinkMock,
    updateLinkById: updateLinkByIdMock,
  })),
}));

import { LightspeedInboundSyncService } from "@/services/lightspeed-inbound-sync-service";

describe("LightspeedInboundSyncService", () => {
  beforeEach(() => {
    createMock.mockReset();
    updateMock.mockReset();
    createVariantMock.mockReset();
    updateVariantMock.mockReset();
    createImageMock.mockReset();
    deleteImagesByProductMock.mockReset();
    deleteVariantMock.mockReset();
    deleteProductMock.mockReset();
    getProductByIdMock.mockReset();
    getByLightspeedVariantIdMock.mockReset();
    getByExternalSkuMock.mockReset();
    getByLightspeedProductIdMock.mockReset();
    listByProductIdMock.mockReset();
    upsertLinkMock.mockReset();
    updateLinkByIdMock.mockReset();
  });

  it("creates a website product from an unlinked Lightspeed variant family", async () => {
    getByLightspeedVariantIdMock.mockResolvedValue(null);
    getByExternalSkuMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "product-1" });
    createVariantMock
      .mockResolvedValueOnce({ id: "variant-1" })
      .mockResolvedValueOnce({ id: "variant-2" });

    const service = new LightspeedInboundSyncService({} as never);

    const result = await service.applyProductPayload({
      tenantId: "tenant-1",
      payload: {
        id: "ls-family-1",
        name: "Jordan 4 Delta",
        description: "desc",
        brand_name: "Jordan",
        product_category: "Sneakers",
        is_active: true,
        variants: [
          {
            id: "ls-child-1",
            sku: "N-JDN-DEL-11-01",
            price_including_tax: 200,
            supply_price: 100,
            variant_option_one_name: "Size",
            variant_option_one_value: "11.5M / 13W",
            inventory_Main_Outlet: 1,
          },
          {
            id: "ls-child-2",
            sku: "N-JDN-DEL-12-02",
            price_including_tax: 210,
            supply_price: 101,
            variant_option_one_name: "Size",
            variant_option_one_value: "12M / 13.5W",
            inventory_Main_Outlet: 2,
          },
        ],
      },
      topic: "product.update",
      remoteModifiedAt: "2026-06-05T20:30:00.000Z",
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: "tenant-1",
        name: "Jordan 4 Delta",
        brand: "Jordan",
        category: "sneakers",
        condition: "new",
      }),
    );
    expect(createVariantMock).toHaveBeenCalledTimes(2);
    expect(upsertLinkMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        tenantId: "tenant-1",
        productId: "product-1",
        variantId: "variant-1",
        lightspeedFamilyId: "ls-family-1",
        lightspeedVariantId: "ls-child-1",
        externalSku: "N-JDN-DEL-11-01",
      }),
    );
    expect(upsertLinkMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        tenantId: "tenant-1",
        productId: "product-1",
        variantId: "variant-2",
        lightspeedFamilyId: "ls-family-1",
        lightspeedVariantId: "ls-child-2",
        externalSku: "N-JDN-DEL-12-02",
      }),
    );
    expect(result).toEqual({ status: "applied", productId: "product-1" });
  });

  it("ignores stale Lightspeed product updates when the website timestamp is newer", async () => {
    getByLightspeedVariantIdMock.mockResolvedValue({
      id: "link-1",
      product_id: "product-1",
      variant_id: "variant-1",
      last_website_modified_at: "2026-06-05T21:00:00.000Z",
    });

    const service = new LightspeedInboundSyncService({} as never);

    const result = await service.applyProductPayload({
      tenantId: "tenant-1",
      payload: {
        id: "ls-child-1",
        name: "Jordan 4 Delta",
        sku: "N-JDN-DEL-11-01",
        variant_option_one_name: "Size",
        variant_option_one_value: "11.5M / 13W",
      },
      topic: "product.update",
      remoteModifiedAt: "2026-06-05T20:30:00.000Z",
    });

    expect(updateMock).not.toHaveBeenCalled();
    expect(updateVariantMock).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "skipped", reason: "stale_remote_write" });
  });

  it("hard deletes linked website records when Lightspeed deletes the family", async () => {
    getByLightspeedProductIdMock.mockResolvedValue([
      {
        id: "link-1",
        product_id: "product-1",
        variant_id: "variant-1",
        last_website_modified_at: "2026-06-05T19:00:00.000Z",
      },
      {
        id: "link-2",
        product_id: "product-1",
        variant_id: "variant-2",
        last_website_modified_at: "2026-06-05T19:00:00.000Z",
      },
    ]);

    const service = new LightspeedInboundSyncService({} as never);

    const result = await service.applyDelete({
      tenantId: "tenant-1",
      lightspeedFamilyId: "ls-family-1",
      remoteModifiedAt: "2026-06-05T20:30:00.000Z",
    });

    expect(updateLinkByIdMock).toHaveBeenCalledTimes(2);
    expect(deleteProductMock).toHaveBeenCalledWith("product-1");
    expect(result).toEqual({ status: "applied", deletedProductIds: ["product-1"] });
  });
});
