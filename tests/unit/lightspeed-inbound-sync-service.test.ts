const createMock = jest.fn();
const updateMock = jest.fn();
const createVariantMock = jest.fn();
const updateVariantMock = jest.fn();
const createImageMock = jest.fn();
const deleteImagesByProductMock = jest.fn();
const deleteVariantMock = jest.fn();
const deleteProductMock = jest.fn();
const getProductByIdMock = jest.fn();
const unlinkProductTagsMock = jest.fn();
const linkProductTagMock = jest.fn();

const getByLightspeedVariantIdMock = jest.fn();
const getByExternalSkuMock = jest.fn();
const getByLightspeedProductIdMock = jest.fn();
const listByProductIdMock = jest.fn();
const upsertLinkMock = jest.fn();
const updateLinkByIdMock = jest.fn();
const parseTitleMock = jest.fn();
const upsertTagsMock = jest.fn();

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
    unlinkProductTags: unlinkProductTagsMock,
    linkProductTag: linkProductTagMock,
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

jest.mock("@/services/product-title-parser-service", () => ({
  ProductTitleParserService: jest.fn().mockImplementation(() => ({
    parseTitle: parseTitleMock,
  })),
}));

jest.mock("@/services/tag-service", () => {
  const actual = jest.requireActual("@/services/tag-service");
  return {
    ...actual,
    upsertTags: jest.fn((...args) => upsertTagsMock(...args)),
  };
});

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
    unlinkProductTagsMock.mockReset();
    linkProductTagMock.mockReset();
    getByLightspeedVariantIdMock.mockReset();
    getByExternalSkuMock.mockReset();
    getByLightspeedProductIdMock.mockReset();
    listByProductIdMock.mockReset();
    upsertLinkMock.mockReset();
    updateLinkByIdMock.mockReset();
    parseTitleMock.mockReset();
    upsertTagsMock.mockReset();

    parseTitleMock.mockResolvedValue({
      brand: { label: "Jordan", groupKey: null },
      model: { label: "Jordan 4" },
    });
    upsertTagsMock.mockResolvedValue([
      { id: "tag-brand" },
      { id: "tag-model" },
      { id: "tag-category" },
      { id: "tag-condition" },
      { id: "tag-size" },
    ]);
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
        model: "Jordan 4",
        category: "sneakers",
        condition: "new",
      }),
    );
    expect(createVariantMock).toHaveBeenCalledTimes(2);
    expect(unlinkProductTagsMock).toHaveBeenCalledWith("product-1");
    expect(linkProductTagMock).toHaveBeenCalledTimes(5);
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

  it("uses parser normalization to canonicalize imported brands before saving", async () => {
    getByLightspeedVariantIdMock.mockResolvedValue(null);
    getByExternalSkuMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "product-2" });
    createVariantMock.mockResolvedValue({ id: "variant-3" });
    parseTitleMock.mockResolvedValue({
      brand: { label: "Adidas", groupKey: null },
      model: { label: null },
    });

    const service = new LightspeedInboundSyncService({} as never);

    await service.applyProductPayload({
      tenantId: "tenant-1",
      payload: {
        id: "ls-product-2",
        name: "Campus 00s - New - 10.5 - N-ADI-CMP-10-01",
        brand_name: "Addidas",
        sku: "N-ADI-CMP-10-01",
        product_category: "Sneakers",
        active: true,
        variant_option_one_name: "Size",
        variant_option_one_value: "10.5",
        inventory_Main_Outlet: 1,
      },
      topic: "product.update",
      remoteModifiedAt: "2026-06-07T19:30:00.000Z",
    });

    expect(parseTitleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        titleRaw: "Addidas Campus 00s",
        category: "sneakers",
        tenantId: "tenant-1",
      }),
    );
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Campus 00s",
        brand: "Adidas",
      }),
    );
  });

  it("creates standard products as active when Lightspeed omits active flags", async () => {
    getByLightspeedVariantIdMock.mockResolvedValue(null);
    getByExternalSkuMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "product-3" });
    createVariantMock.mockResolvedValue({ id: "variant-4" });

    const service = new LightspeedInboundSyncService({} as never);

    await service.applyProductPayload({
      tenantId: "tenant-1",
      payload: {
        id: "ls-product-3",
        name: "Default Active Product",
        sku: "DEFAULT-ACTIVE-001",
        product_category: "Sneakers",
        deleted_at: null,
        inventory_Main_Outlet: 1,
      },
      topic: "product.update",
      remoteModifiedAt: "2026-06-07T19:30:00.000Z",
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        is_active: true,
      }),
    );
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
