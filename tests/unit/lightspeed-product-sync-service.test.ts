const createProductMock = jest.fn();
const updateProductMock = jest.fn();
const deleteProductMock = jest.fn();
const getProductMock = jest.fn();
const listVariantAttributesMock = jest.fn();
const createVariantAttributeMock = jest.fn();

const getByIdMock = jest.fn();
const getConnectionByTenantMock = jest.fn();
const getByVariantIdMock = jest.fn();
const getByExternalSkuMock = jest.fn();
const listByProductIdMock = jest.fn();
const updateLinkByIdMock = jest.fn();
const upsertLinkMock = jest.fn();
const recordDeletionMock = jest.fn();

jest.mock("@/lib/lightspeed/client", () => ({
  LightspeedClient: jest.fn().mockImplementation(() => ({
    createProduct: createProductMock,
    updateProduct: updateProductMock,
    deleteProduct: deleteProductMock,
    getProduct: getProductMock,
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

jest.mock("@/repositories/deleted-product-recovery-repo", () => ({
  DeletedProductRecoveryRepository: jest.fn().mockImplementation(() => ({
    recordDeletion: recordDeletionMock,
  })),
}));

import { LightspeedProductSyncService } from "@/services/lightspeed-product-sync-service";

describe("LightspeedProductSyncService", () => {
  beforeEach(() => {
    createProductMock.mockReset();
    updateProductMock.mockReset();
    deleteProductMock.mockReset();
    getProductMock.mockReset();
    listVariantAttributesMock.mockReset();
    createVariantAttributeMock.mockReset();
    getByIdMock.mockReset();
    getConnectionByTenantMock.mockReset();
    getByVariantIdMock.mockReset();
    getByExternalSkuMock.mockReset();
    listByProductIdMock.mockReset();
    updateLinkByIdMock.mockReset();
    upsertLinkMock.mockReset();
    recordDeletionMock.mockReset();
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

  it("retries a used-product create with sku in the name after a duplicate-name error", async () => {
    getConnectionByTenantMock.mockResolvedValue({
      syncEnabled: true,
      domainPrefix: "demo-store",
      accessToken: "token",
    });

    getByIdMock.mockResolvedValue({
      id: "product-1",
      name: "Air Jordan 3",
      condition: "used",
      brand: "Jordan",
      model: "Jordan 3",
      description: "desc",
      is_active: true,
      variants: [
        {
          id: "variant-1",
          sku: "123456",
          size_label: "10M / 11.5W",
          sale_price_cents: 20000,
        },
      ],
    });

    getByVariantIdMock.mockResolvedValue(null);
    getByExternalSkuMock.mockResolvedValue(null);
    createProductMock
      .mockRejectedValueOnce(new Error("Product with this name already exists"))
      .mockResolvedValueOnce({ data: { id: "ls-family-1" } });

    const service = new LightspeedProductSyncService({} as never);

    await service.syncWebsiteProduct("product-1", {
      tenantId: "tenant-1",
      source: "create",
    });

    expect(createProductMock).toHaveBeenCalledTimes(2);
    expect(createProductMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ name: "Air Jordan 3" }),
    );
    expect(createProductMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ name: expect.stringMatching(/^Air Jordan 3 - /) }),
    );
  });

  it("does not retry a new-product create when Lightspeed rejects a duplicate name", async () => {
    getConnectionByTenantMock.mockResolvedValue({
      syncEnabled: true,
      domainPrefix: "demo-store",
      accessToken: "token",
    });

    getByIdMock.mockResolvedValue({
      id: "product-1",
      name: "Air Jordan 3",
      condition: "new",
      brand: "Jordan",
      model: "Jordan 3",
      description: "desc",
      is_active: true,
      variants: [
        {
          id: "variant-1",
          sku: "123456",
          size_label: "10M / 11.5W",
          sale_price_cents: 20000,
        },
      ],
    });

    getByVariantIdMock.mockResolvedValue(null);
    getByExternalSkuMock.mockResolvedValue(null);
    createProductMock.mockRejectedValueOnce(
      new Error("Product with this name already exists"),
    );

    const service = new LightspeedProductSyncService({} as never);

    await expect(
      service.syncWebsiteProduct("product-1", {
        tenantId: "tenant-1",
        source: "create",
      }),
    ).rejects.toThrow("Product with this name already exists");

    expect(createProductMock).toHaveBeenCalledTimes(1);
  });

  it("retries a used-product update with sku in the name after a duplicate-name error", async () => {
    getConnectionByTenantMock.mockResolvedValue({
      syncEnabled: true,
      domainPrefix: "demo-store",
      accessToken: "token",
    });

    getByIdMock.mockResolvedValue({
      id: "product-1",
      name: "Air Jordan 3",
      condition: "used",
      brand: "Jordan",
      model: "Jordan 3",
      description: "desc",
      is_active: true,
      variants: [
        {
          id: "variant-1",
          sku: "123456",
          size_label: "10M / 11.5W",
          sale_price_cents: 20000,
        },
      ],
    });

    getByVariantIdMock.mockResolvedValue({
      id: "link-1",
      variant_id: "variant-1",
      lightspeed_family_id: "ls-family-1",
      lightspeed_product_id: "ls-family-1",
      lightspeed_variant_id: null,
      external_sku: "N-JDN-J03-BH-01",
    });
    getByExternalSkuMock.mockResolvedValue(null);
    updateProductMock
      .mockRejectedValueOnce(new Error("Product with this name already exists"))
      .mockResolvedValueOnce({});

    const service = new LightspeedProductSyncService({} as never);

    await service.syncWebsiteProduct("product-1", {
      tenantId: "tenant-1",
      source: "update",
    });

    expect(updateProductMock).toHaveBeenCalledTimes(2);
    expect(updateProductMock).toHaveBeenNthCalledWith(
      1,
      "ls-family-1",
      expect.objectContaining({
        common: expect.objectContaining({ name: "Air Jordan 3" }),
      }),
    );
    expect(updateProductMock).toHaveBeenNthCalledWith(
      2,
      "ls-family-1",
      expect.objectContaining({
        common: expect.objectContaining({
          name: expect.stringMatching(/^Air Jordan 3 - /),
        }),
      }),
    );
  });

  it("hard deletes a linked Lightspeed family before local delete completes", async () => {
    getConnectionByTenantMock.mockResolvedValue({
      syncEnabled: true,
      domainPrefix: "demo-store",
      accessToken: "token",
    });
    getByIdMock.mockResolvedValue({
      id: "product-1",
      tenant_id: "tenant-1",
      name: "Jordan 4 Delta",
      brand: "Jordan",
      model: "Delta",
      category: "sneakers",
      condition: "new",
      size_type: "shoe",
      description: "desc",
      is_active: true,
      is_out_of_stock: false,
      archived_at: null,
      created_at: "2026-06-01T00:00:00.000Z",
      product_created_at: "2026-06-01T00:00:00.000Z",
      product_updated_at: "2026-06-05T20:30:00.000Z",
      variants: [
        {
          id: "variant-1",
          sku: "SKU-1",
          size_label: "10",
          sale_price_cents: 20000,
          unit_cost_cents: 10000,
          stock: 1,
          sort_order: 0,
        },
      ],
      images: [
        { id: "image-1", url: "https://img.test/1.jpg", sort_order: 0, is_primary: true },
      ],
      tags: [{ id: "tag-1", label: "Jordan", group_key: "brand" }],
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
    getProductMock.mockResolvedValue({
      id: "ls-family-1",
      name: "Jordan 4 Delta",
      sku: "SKU-1",
      created_at: "2026-06-01T00:00:00.000Z",
      updated_at: "2026-06-05T20:30:00.000Z",
    });
    recordDeletionMock.mockResolvedValue({ id: "recovery-1" });
    updateLinkByIdMock.mockResolvedValue({});

    const service = new LightspeedProductSyncService({} as never);

    const result = await service.deleteWebsiteProduct({
      tenantId: "tenant-1",
      productId: "product-1",
      websiteModifiedAt: "2026-06-05T20:30:00.000Z",
      deletedByUserId: "user-1",
    });

    expect(recordDeletionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        productId: "product-1",
        deletedByUserId: "user-1",
        lightspeedProductSnapshots: [
          expect.objectContaining({
            remoteId: "ls-family-1",
            payload: expect.objectContaining({
              id: "ls-family-1",
              sku: "SKU-1",
            }),
          }),
        ],
        links: expect.arrayContaining([
          expect.objectContaining({
            id: "link-1",
            lightspeed_family_id: "ls-family-1",
          }),
        ]),
      }),
    );
    expect(deleteProductMock).toHaveBeenCalledTimes(1);
    expect(deleteProductMock).toHaveBeenCalledWith("ls-family-1");
    expect(updateLinkByIdMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      status: "synced",
      deletedRemoteIds: ["ls-family-1"],
    });
  });
});
