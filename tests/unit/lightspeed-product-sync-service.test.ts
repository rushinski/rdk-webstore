const createProductMock = jest.fn();
const updateProductMock = jest.fn();
const deleteProductMock = jest.fn();
const listVariantAttributesMock = jest.fn();
const createVariantAttributeMock = jest.fn();

const getByIdMock = jest.fn();
const getConnectionByTenantMock = jest.fn();
const getByVariantIdMock = jest.fn();
const getByExternalSkuMock = jest.fn();
const listByProductIdMock = jest.fn();
const updateLinkByIdMock = jest.fn();
const upsertLinkMock = jest.fn();

jest.mock("@/lib/lightspeed/client", () => ({
  LightspeedClient: jest.fn().mockImplementation(() => ({
    createProduct: createProductMock,
    updateProduct: updateProductMock,
    deleteProduct: deleteProductMock,
    listVariantAttributes: listVariantAttributesMock,
    createVariantAttribute: createVariantAttributeMock,
  })),
}));

jest.mock("@/repositories/product-repo", () => ({
  ProductRepository: jest.fn().mockImplementation(() => ({
    getById: getByIdMock,
  })),
}));

jest.mock("@/repositories/lightspeed-settings-repo", () => ({
  LightspeedSettingsRepository: jest.fn().mockImplementation(() => ({
    getConnectionByTenant: getConnectionByTenantMock,
  })),
}));

jest.mock("@/repositories/lightspeed-links-repo", () => ({
  LightspeedLinksRepository: jest.fn().mockImplementation(() => ({
    getByVariantId: getByVariantIdMock,
    getByExternalSku: getByExternalSkuMock,
    listByProductId: listByProductIdMock,
    updateLinkById: updateLinkByIdMock,
    upsertLink: upsertLinkMock,
  })),
}));

import { LightspeedProductSyncService } from "@/services/lightspeed-product-sync-service";

describe("LightspeedProductSyncService", () => {
  beforeEach(() => {
    createProductMock.mockReset();
    updateProductMock.mockReset();
    deleteProductMock.mockReset();
    listVariantAttributesMock.mockReset();
    createVariantAttributeMock.mockReset();
    getByIdMock.mockReset();
    getConnectionByTenantMock.mockReset();
    getByVariantIdMock.mockReset();
    getByExternalSkuMock.mockReset();
    listByProductIdMock.mockReset();
    updateLinkByIdMock.mockReset();
    upsertLinkMock.mockReset();
  });

  it("stores family and child ids per variant after a multi-variant create", async () => {
    getConnectionByTenantMock.mockResolvedValue({
      syncEnabled: true,
      domainPrefix: "demo-store",
      accessToken: "token",
    });

    getByIdMock.mockResolvedValue({
      id: "product-1",
      name: "Jordan 4 Delta",
      condition: "new",
      brand: "Jordan",
      model: "Delta",
      description: "desc",
      is_active: true,
      variants: [
        {
          id: "variant-1",
          sku: "100001",
          size_label: "11.5M / 13W",
          sale_price_cents: 20000,
        },
        {
          id: "variant-2",
          sku: "100002",
          size_label: "12M / 13.5W",
          sale_price_cents: 21000,
        },
      ],
    });

    getByVariantIdMock.mockResolvedValue(null);
    getByExternalSkuMock.mockResolvedValue(null);
    listVariantAttributesMock.mockResolvedValue([{ id: "attr-size-1", name: "Size" }]);
    createProductMock.mockResolvedValue({
      data: ["ls-family-1", "ls-child-1", "ls-child-2"],
    });

    const service = new LightspeedProductSyncService({} as never);

    const result = await service.syncWebsiteProduct("product-1", {
      tenantId: "tenant-1",
      source: "create",
    });

    expect(createProductMock).toHaveBeenCalledTimes(1);
    expect(createProductMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variants: expect.arrayContaining([
          expect.objectContaining({
            variant_definitions: [{ attribute_id: "attr-size-1", value: "11.5M / 13W" }],
          }),
        ]),
      }),
    );
    expect(upsertLinkMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        tenantId: "tenant-1",
        productId: "product-1",
        variantId: "variant-1",
        lightspeedFamilyId: "ls-family-1",
        lightspeedProductId: "ls-family-1",
        lightspeedVariantId: "ls-child-1",
      }),
    );
    expect(upsertLinkMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        tenantId: "tenant-1",
        productId: "product-1",
        variantId: "variant-2",
        lightspeedFamilyId: "ls-family-1",
        lightspeedProductId: "ls-family-1",
        lightspeedVariantId: "ls-child-2",
      }),
    );
    expect(result).toEqual({
      status: "synced",
      lightspeedFamilyId: "ls-family-1",
      variantCount: 2,
    });
  });

  it("hard deletes a linked Lightspeed family before local delete completes", async () => {
    getConnectionByTenantMock.mockResolvedValue({
      syncEnabled: true,
      domainPrefix: "demo-store",
      accessToken: "token",
    });
    listByProductIdMock.mockResolvedValue([
      {
        id: "link-1",
        product_id: "product-1",
        variant_id: "variant-1",
        lightspeed_family_id: "ls-family-1",
        lightspeed_product_id: "ls-family-1",
      },
      {
        id: "link-2",
        product_id: "product-1",
        variant_id: "variant-2",
        lightspeed_family_id: "ls-family-1",
        lightspeed_product_id: "ls-family-1",
      },
    ]);
    updateLinkByIdMock.mockResolvedValue({});

    const service = new LightspeedProductSyncService({} as never);

    const result = await service.deleteWebsiteProduct({
      tenantId: "tenant-1",
      productId: "product-1",
      websiteModifiedAt: "2026-06-05T20:30:00.000Z",
    });

    expect(deleteProductMock).toHaveBeenCalledTimes(1);
    expect(deleteProductMock).toHaveBeenCalledWith("ls-family-1");
    expect(updateLinkByIdMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      status: "synced",
      deletedRemoteIds: ["ls-family-1"],
    });
  });
});
