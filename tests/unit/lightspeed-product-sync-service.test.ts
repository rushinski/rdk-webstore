const createProductMock = jest.fn();
const updateProductMock = jest.fn();
const deleteProductMock = jest.fn();
const getProductMock = jest.fn();
const listVariantAttributesMock = jest.fn();
const createVariantAttributeMock = jest.fn();
const listOutletsMock = jest.fn();

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
    listOutlets: listOutletsMock,
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
    listOutletsMock.mockReset();
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
    listVariantAttributesMock.mockResolvedValue([
      { id: "attr-condition-1", name: "Condition" },
      { id: "attr-size-1", name: "Size" },
    ]);
    listOutletsMock.mockResolvedValue([{ id: "outlet-1", is_default: true }]);
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
            sku: "100001",
            price_excluding_tax: 200,
            variant_definitions: expect.arrayContaining([
              { attribute_id: "attr-condition-1", value: "New" },
              { attribute_id: "attr-size-1", value: "11.5M / 13W" },
            ]),
          }),
        ]),
      }),
    );
    expect(createProductMock.mock.calls[0]?.[0]?.variants?.[0]).not.toHaveProperty(
      "price_including_tax",
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

  it("uses price_excluding_tax instead of price_including_tax for single-product creates", async () => {
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
    listVariantAttributesMock.mockResolvedValue([
      { id: "attr-condition-1", name: "Condition" },
      { id: "attr-size-1", name: "Size" },
    ]);
    listOutletsMock.mockResolvedValue([{ id: "outlet-1", is_default: true }]);
    createProductMock.mockResolvedValueOnce({ data: { id: "ls-family-1" } });

    const service = new LightspeedProductSyncService({} as never);

    await service.syncWebsiteProduct("product-1", {
      tenantId: "tenant-1",
      source: "create",
    });

    expect(createProductMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Air Jordan 3",
        variants: [
          expect.objectContaining({
            sku: "123456",
            price_excluding_tax: 200,
            variant_definitions: expect.arrayContaining([
              { attribute_id: "attr-condition-1", value: "New" },
              { attribute_id: "attr-size-1", value: "10M / 11.5W" },
            ]),
          }),
        ],
      }),
    );
    expect(createProductMock.mock.calls[0]?.[0]).not.toHaveProperty(
      "price_including_tax",
    );
  });

  it("uses the exact website sku instead of deriving a Lightspeed sku", async () => {
    getConnectionByTenantMock.mockResolvedValue({
      syncEnabled: true,
      domainPrefix: "demo-store",
      accessToken: "token",
    });

    getByIdMock.mockResolvedValue({
      id: "product-1",
      name: "Test Product",
      category: "accessories",
      condition: "new",
      brand: "Other",
      model: "Test Product",
      description: "desc",
      is_active: true,
      variants: [
        {
          id: "variant-1",
          sku: "358845370",
          size_label: "4Y",
          sale_price_cents: 20000,
          unit_cost_cents: 10000,
          stock: 2,
        },
      ],
    });

    getByVariantIdMock.mockResolvedValue(null);
    getByExternalSkuMock.mockResolvedValue(null);
    listVariantAttributesMock.mockResolvedValue([
      { id: "attr-condition-1", name: "Condition" },
      { id: "attr-size-1", name: "Size" },
    ]);
    listOutletsMock.mockResolvedValue([{ id: "outlet-1", is_default: true }]);
    createProductMock.mockResolvedValue({
      data: ["ls-family-1", "ls-child-1"],
    });

    const service = new LightspeedProductSyncService({} as never);

    await service.syncWebsiteProduct("product-1", {
      tenantId: "tenant-1",
      source: "create",
    });

    const payload = createProductMock.mock.calls[0]?.[0];
    expect(payload.variants?.[0]?.sku).toBe("358845370");
    expect(payload.variants?.[0]?.product_codes).toEqual([
      { code: "358845370", type: "CUSTOM" },
    ]);
  });

  it("creates a one-variant Lightspeed family with Condition and Size definitions", async () => {
    getConnectionByTenantMock.mockResolvedValue({
      syncEnabled: true,
      domainPrefix: "demo-store",
      accessToken: "token",
    });

    getByIdMock.mockResolvedValue({
      id: "product-1",
      name: "Used Jordan",
      category: "sneakers",
      condition: "used",
      brand: "Jordan",
      model: "Jordan 3",
      description: "desc",
      is_active: true,
      variants: [
        {
          id: "variant-1",
          sku: "358845370",
          size_label: "4Y",
          sale_price_cents: 20000,
          unit_cost_cents: 10000,
          stock: 1,
        },
      ],
    });

    getByVariantIdMock.mockResolvedValue(null);
    getByExternalSkuMock.mockResolvedValue(null);
    listVariantAttributesMock.mockResolvedValue([
      { id: "attr-condition-1", name: "Condition" },
      { id: "attr-size-1", name: "Size" },
    ]);
    listOutletsMock.mockResolvedValue([{ id: "outlet-1", is_default: true }]);
    createProductMock.mockResolvedValue({
      data: ["ls-family-1", "ls-child-1"],
    });

    const service = new LightspeedProductSyncService({} as never);

    await service.syncWebsiteProduct("product-1", {
      tenantId: "tenant-1",
      source: "create",
    });

    const payload = createProductMock.mock.calls[0]?.[0];
    expect(payload.variants).toHaveLength(1);
    expect(payload.variants?.[0]?.variant_definitions).toEqual(
      expect.arrayContaining([
        { attribute_id: "attr-condition-1", value: "Preowned" },
        { attribute_id: "attr-size-1", value: "4Y" },
      ]),
    );
  });

  it("includes description, price excluding tax, unit cost, and inventory in create payloads", async () => {
    getConnectionByTenantMock.mockResolvedValue({
      syncEnabled: true,
      domainPrefix: "demo-store",
      accessToken: "token",
    });

    getByIdMock.mockResolvedValue({
      id: "product-1",
      name: "Test Product",
      category: "accessories",
      condition: "new",
      brand: "Other",
      model: "Test Product",
      description: "desc",
      is_active: true,
      variants: [
        {
          id: "variant-1",
          sku: "358845370",
          size_label: "4Y",
          sale_price_cents: 20000,
          unit_cost_cents: 10000,
          stock: 2,
        },
      ],
    });

    getByVariantIdMock.mockResolvedValue(null);
    getByExternalSkuMock.mockResolvedValue(null);
    listVariantAttributesMock.mockResolvedValue([
      { id: "attr-condition-1", name: "Condition" },
      { id: "attr-size-1", name: "Size" },
    ]);
    listOutletsMock.mockResolvedValue([{ id: "outlet-1", is_default: true }]);
    createProductMock.mockResolvedValue({
      data: ["ls-family-1", "ls-child-1"],
    });

    const service = new LightspeedProductSyncService({} as never);

    await service.syncWebsiteProduct("product-1", {
      tenantId: "tenant-1",
      source: "create",
    });

    const payload = createProductMock.mock.calls[0]?.[0];
    expect(payload).toEqual(
      expect.objectContaining({
        name: "Test Product",
        description: "desc",
      }),
    );
    expect(payload.variants?.[0]).toEqual(
      expect.objectContaining({
        price_excluding_tax: 200,
        supply_price: 100,
        inventory: [{ current_amount: 2, outlet_id: "outlet-1" }],
      }),
    );
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
    listVariantAttributesMock.mockResolvedValue([
      { id: "attr-condition-1", name: "Condition" },
      { id: "attr-size-1", name: "Size" },
    ]);
    listOutletsMock.mockResolvedValue([{ id: "outlet-1", is_default: true }]);
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
    listVariantAttributesMock.mockResolvedValue([
      { id: "attr-condition-1", name: "Condition" },
      { id: "attr-size-1", name: "Size" },
    ]);
    listOutletsMock.mockResolvedValue([{ id: "outlet-1", is_default: true }]);
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
      lightspeed_variant_id: "ls-child-1",
      external_sku: "N-JDN-J03-BH-01",
    });
    getByExternalSkuMock.mockResolvedValue(null);
    listVariantAttributesMock.mockResolvedValue([
      { id: "attr-condition-1", name: "Condition" },
      { id: "attr-size-1", name: "Size" },
    ]);
    listOutletsMock.mockResolvedValue([{ id: "outlet-1", is_default: true }]);
    updateProductMock
      .mockRejectedValueOnce(new Error("Product with this name already exists"))
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const service = new LightspeedProductSyncService({} as never);

    await service.syncWebsiteProduct("product-1", {
      tenantId: "tenant-1",
      source: "update",
    });

    expect(updateProductMock).toHaveBeenCalledTimes(3);
    expect(updateProductMock).toHaveBeenNthCalledWith(
      1,
      "ls-family-1",
      expect.objectContaining({
        common: expect.objectContaining({ name: "Air Jordan 3" }),
      }),
    );
    expect(updateProductMock.mock.calls[0]?.[1]?.common).not.toHaveProperty("is_active");
    expect(updateProductMock.mock.calls[0]?.[1]).not.toHaveProperty("details");
    expect(updateProductMock).toHaveBeenNthCalledWith(
      2,
      "ls-family-1",
      expect.objectContaining({
        common: expect.objectContaining({
          name: expect.stringMatching(/^Air Jordan 3 - /),
        }),
      }),
    );
    expect(updateProductMock).toHaveBeenNthCalledWith(
      3,
      "ls-child-1",
      expect.objectContaining({
        details: expect.objectContaining({
          product_codes: [{ code: "N-JDN-J03-BH-01", type: "CUSTOM" }],
          inventory: [{ current_amount: 0, outlet_id: "outlet-1" }],
          variant_attribute_values: [
            { attribute_id: "attr-condition-1", attribute_value: "Preowned" },
            { attribute_id: "attr-size-1", attribute_value: "10M / 11.5W" },
          ],
        }),
      }),
    );
    expect(updateProductMock.mock.calls[2]?.[1]?.details).not.toHaveProperty("sku");
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

  it("does not delete the remote product when recovery persistence fails", async () => {
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
      images: [],
      tags: [],
    });
    listByProductIdMock.mockResolvedValue([
      {
        id: "link-1",
        product_id: "product-1",
        variant_id: "variant-1",
        lightspeed_family_id: "ls-family-1",
        lightspeed_product_id: "ls-family-1",
      },
    ]);
    getProductMock.mockResolvedValue({
      id: "ls-family-1",
      name: "Jordan 4 Delta",
      sku: "SKU-1",
    });
    recordDeletionMock.mockRejectedValueOnce(
      Object.assign(new Error("new row violates row-level security policy"), {
        code: "42501",
      }),
    );

    const service = new LightspeedProductSyncService({} as never);

    await expect(
      service.deleteWebsiteProduct({
        tenantId: "tenant-1",
        productId: "product-1",
      }),
    ).rejects.toThrow("new row violates row-level security policy");

    expect(deleteProductMock).not.toHaveBeenCalled();
  });
});
