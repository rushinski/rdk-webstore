const listProductsMock = jest.fn();
const getProductMock = jest.fn();
const getConnectionByTenantMock = jest.fn();
const listForReconciliationMock = jest.fn();
const listByTenantMock = jest.fn();
const applyProductPayloadMock = jest.fn();
const archiveProductMock = jest.fn();
const restoreProductMock = jest.fn();
const getByIdMock = jest.fn();
const upsertLinkMock = jest.fn();
const parseTitleMock = jest.fn();

jest.mock("@/lib/lightspeed/client", () => ({
  LightspeedClient: jest.fn().mockImplementation(() => ({
    listProducts: listProductsMock,
    getProduct: getProductMock,
  })),
}));

jest.mock("@/repositories/lightspeed-settings-repo", () => ({
  LightspeedSettingsRepository: jest.fn().mockImplementation(() => ({
    getConnectionByTenant: getConnectionByTenantMock,
  })),
}));

jest.mock("@/repositories/product-repo", () => ({
  ProductRepository: jest.fn().mockImplementation(() => ({
    listForReconciliation: listForReconciliationMock,
    getById: getByIdMock,
  })),
}));

jest.mock("@/repositories/lightspeed-links-repo", () => ({
  LightspeedLinksRepository: jest.fn().mockImplementation(() => ({
    listByTenant: listByTenantMock,
    upsertLink: upsertLinkMock,
  })),
}));

jest.mock("@/services/lightspeed-inbound-sync-service", () => ({
  LightspeedInboundSyncService: jest.fn().mockImplementation(() => ({
    applyProductPayload: applyProductPayloadMock,
  })),
}));

jest.mock("@/services/product-title-parser-service", () => ({
  ProductTitleParserService: jest.fn().mockImplementation(() => ({
    parseTitle: parseTitleMock,
  })),
}));

jest.mock("@/services/product-service", () => ({
  ProductService: jest.fn().mockImplementation(() => ({
    archiveProduct: archiveProductMock,
    restoreProduct: restoreProductMock,
  })),
}));

import { LightspeedReconciliationSyncService } from "@/services/lightspeed-reconciliation-sync-service";

describe("LightspeedReconciliationSyncService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const remoteProducts = [
      {
        id: "ls-linked",
        name: "Linked Product",
        version: 101,
        created_at: "2026-06-01T10:00:00.000Z",
        updated_at: "2026-06-08T10:00:00.000Z",
        product_category: "Sneakers",
        active: true,
        has_variants: true,
        variants: [
          {
            id: "ls-linked-variant",
            sku: "LINK-001",
            name: "Linked Product",
            variant_options: [{ name: "Size", value: "9M / 10.5W" }],
            inventory_Main_Outlet: 1,
            retail_price: 0,
            supply_price: 0,
          },
        ],
      },
      {
        id: "ls-import",
        name: "Import Product",
        version: 102,
        created_at: "2026-06-02T11:00:00.000Z",
        updated_at: "2026-06-08T11:00:00.000Z",
        product_category: "Sneakers",
        variants: [
          { id: "ls-import-variant", sku: "IMPORT-001", name: "Import Product" },
        ],
      },
      {
        id: "ls-sku",
        name: "SKU Match Product",
        version: 103,
        created_at: "2026-06-03T12:00:00.000Z",
        updated_at: "2026-06-08T12:00:00.000Z",
        product_category: "Sneakers",
        variants: [
          {
            id: "ls-sku-variant",
            sku: "SKU-001",
            name: "SKU Match Product",
            inventory_Main_Outlet: 3,
            inventory: [{ current_amount: 0 }],
          },
        ],
      },
      {
        id: "ls-conflict",
        name: "Conflict Product",
        version: 104,
        created_at: "2026-06-04T13:00:00.000Z",
        updated_at: "2026-06-08T13:00:00.000Z",
        product_category: "Sneakers",
        variants: [
          { id: "ls-conflict-variant", sku: "CONFLICT-001", name: "Conflict Product" },
        ],
      },
    ];
    getConnectionByTenantMock.mockResolvedValue({
      syncEnabled: true,
      domainPrefix: "demo-store",
      accessToken: "token",
    });
    listProductsMock.mockResolvedValue({
      products: remoteProducts,
      after: null,
      pageSize: 50,
      hasNextPage: false,
      nextAfter: null,
      totalProducts: 4,
    });
    listForReconciliationMock
      .mockResolvedValueOnce([
        {
          id: "website-linked",
          name: "Linked Product",
          brand: "Unknown",
          model: null,
          category: "sneakers",
          condition: "new",
          size_type: "shoe",
          description: null,
          is_active: true,
          is_out_of_stock: false,
          created_at: "2026-06-01T10:00:00.000Z",
          product_created_at: "2026-06-01T10:00:00.000Z",
          product_updated_at: "2026-06-08T10:00:00.000Z",
          variants: [
            {
              id: "variant-linked",
              sku: "LINK-001",
              size_label: "9M / 10.5W",
              sale_price_cents: 0,
              unit_cost_cents: 0,
              stock: 1,
              sort_order: 0,
            },
          ],
          images: [],
          tags: [
            { label: "Unknown", group_key: "brand" },
            { label: "sneakers", group_key: "category" },
            { label: "new", group_key: "condition" },
            { label: "9M / 10.5W", group_key: "size_shoe" },
          ],
        },
        {
          id: "website-archive",
          name: "Archive Product",
          brand: "Unknown",
          model: null,
          category: "sneakers",
          condition: "new",
          size_type: "shoe",
          description: null,
          is_active: true,
          is_out_of_stock: false,
          created_at: "2026-06-02T10:00:00.000Z",
          product_created_at: "2026-06-02T10:00:00.000Z",
          product_updated_at: "2026-06-02T10:00:00.000Z",
          variants: [{ id: "variant-archive", sku: "ARCHIVE-001" }],
          images: [],
          tags: [],
        },
        {
          id: "website-sku",
          name: "SKU Match Product",
          brand: "Unknown",
          model: null,
          category: "sneakers",
          condition: "new",
          size_type: "shoe",
          description: null,
          is_active: true,
          is_out_of_stock: false,
          created_at: "2026-06-03T12:00:00.000Z",
          product_created_at: "2026-06-03T12:00:00.000Z",
          product_updated_at: "2026-06-03T12:00:00.000Z",
          variants: [
            {
              id: "variant-sku",
              sku: "SKU-001",
              size_label: "One Size",
              sale_price_cents: 0,
              unit_cost_cents: 0,
              stock: 0,
              sort_order: 0,
            },
          ],
          images: [],
          tags: [],
        },
        {
          id: "website-conflict-a",
          name: "Conflict A",
          brand: "Unknown",
          model: null,
          category: "sneakers",
          condition: "new",
          size_type: "shoe",
          description: null,
          is_active: true,
          is_out_of_stock: false,
          created_at: "2026-06-04T13:00:00.000Z",
          product_created_at: "2026-06-04T13:00:00.000Z",
          product_updated_at: "2026-06-04T13:00:00.000Z",
          variants: [
            {
              id: "variant-conflict-a",
              sku: "CONFLICT-001",
              size_label: "One Size",
              sale_price_cents: 0,
              unit_cost_cents: 0,
              stock: 0,
              sort_order: 0,
            },
          ],
          images: [],
          tags: [],
        },
        {
          id: "website-conflict-b",
          name: "Conflict B",
          brand: "Unknown",
          model: null,
          category: "sneakers",
          condition: "new",
          size_type: "shoe",
          description: null,
          is_active: true,
          is_out_of_stock: false,
          created_at: "2026-06-04T13:05:00.000Z",
          product_created_at: "2026-06-04T13:05:00.000Z",
          product_updated_at: "2026-06-04T13:05:00.000Z",
          variants: [
            {
              id: "variant-conflict-b",
              sku: "CONFLICT-001",
              size_label: "One Size",
              sale_price_cents: 0,
              unit_cost_cents: 0,
              stock: 0,
              sort_order: 0,
            },
          ],
          images: [],
          tags: [],
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "website-archived-linked",
          name: "Archived Linked Product",
          brand: "Unknown",
          model: null,
          category: "sneakers",
          condition: "new",
          size_type: "shoe",
          description: null,
          is_active: true,
          is_out_of_stock: false,
          created_at: "2026-06-02T11:00:00.000Z",
          product_created_at: "2026-06-02T11:00:00.000Z",
          product_updated_at: "2026-06-02T11:00:00.000Z",
          variants: [
            {
              id: "variant-archived-linked",
              sku: "IMPORT-001",
              size_label: "One Size",
              sale_price_cents: 0,
              unit_cost_cents: 0,
              stock: 0,
              sort_order: 0,
            },
          ],
          images: [],
          tags: [],
          archived_at: "2026-06-01T00:00:00.000Z",
        },
      ]);
    listByTenantMock.mockResolvedValue([
      {
        id: "link-1",
        tenant_id: "tenant-1",
        product_id: "website-linked",
        variant_id: "variant-linked",
        lightspeed_family_id: "ls-linked",
        lightspeed_product_id: "ls-linked",
        lightspeed_variant_id: "ls-linked-variant",
        lightspeed_inventory_item_id: null,
        external_sku: "LINK-001",
        sync_state: "linked",
        last_website_modified_at: null,
        last_lightspeed_modified_at: null,
        last_sync_direction: null,
        tombstoned_at: null,
        last_error: null,
      },
    ]);
    getProductMock.mockImplementation((productId: string) => {
      return remoteProducts.find((product) => product.id === productId) ?? null;
    });
    getByIdMock.mockResolvedValue({
      id: "website-sku",
      name: "SKU Match Product",
      brand: "Unknown",
      model: null,
      category: "sneakers",
      condition: "new",
      size_type: "shoe",
      description: null,
      is_active: true,
      is_out_of_stock: false,
      created_at: "2026-06-03T12:00:00.000Z",
      product_created_at: "2026-06-03T12:00:00.000Z",
      product_updated_at: "2026-06-03T12:00:00.000Z",
      variants: [
        {
          id: "variant-sku",
          sku: "SKU-001",
          size_label: "One Size",
          sale_price_cents: 0,
          unit_cost_cents: 0,
          stock: 0,
          sort_order: 0,
        },
      ],
      images: [],
      tags: [],
    });
    applyProductPayloadMock.mockResolvedValue({
      status: "applied",
      productId: "product-1",
    });
    archiveProductMock.mockResolvedValue({ archived: true });
    restoreProductMock.mockResolvedValue({ restored: true });
    upsertLinkMock.mockResolvedValue({});
    parseTitleMock.mockResolvedValue({
      brand: { label: null, groupKey: null },
      model: { label: null },
    });
  });

  it("classifies no-change, edit, restore, archive, and conflict buckets", async () => {
    const service = new LightspeedReconciliationSyncService({} as never);

    const result = await service.preview({ tenantId: "tenant-1" });

    expect(result.noChangeCount).toBe(1);
    expect(result.importCount).toBe(0);
    expect(result.editCount).toBe(1);
    expect(result.restoreCount).toBe(1);
    expect(result.archiveCount).toBe(1);
    expect(result.conflictCount).toBe(1);
    expect(result.noChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          websiteProductId: "website-linked",
          remoteProductId: "ls-linked",
          reason: "link",
        }),
      ]),
    );
    expect(result.edits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          websiteProductId: "website-sku",
          remoteProductId: "ls-sku",
          reason: "sku",
          skuMatches: ["SKU-001"],
          diff: expect.objectContaining({
            fields: expect.arrayContaining(["tags", "variants"]),
          }),
        }),
      ]),
    );
    expect(
      result.edits.find((item) => item.remoteProductId === "ls-sku")?.remote.variants[0]
        ?.stock,
    ).toBe(3);
    expect(
      result.edits.find((item) => item.remoteProductId === "ls-sku")?.diff.variantChanges,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sku: "SKU-001",
          fields: expect.arrayContaining(["stock"]),
        }),
      ]),
    );
    expect(result.restores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          websiteProductId: "website-archived-linked",
          remoteProductId: "ls-import",
          reason: "sku",
        }),
      ]),
    );
    expect(result.conflicts[0]).toEqual(
      expect.objectContaining({
        remoteProductId: "ls-conflict",
        candidateWebsiteProductIds: ["website-conflict-a", "website-conflict-b"],
      }),
    );
  });

  it("classifies products with missing Lightspeed category as missing-category conflicts", async () => {
    listProductsMock.mockResolvedValueOnce({
      products: [
        {
          id: "ls-missing-category",
          name: "Unknown Category Product",
          updated_at: "2026-06-17T14:00:00.000Z",
          variants: [
            {
              id: "ls-missing-category-variant",
              sku: "MISS-001",
              variant_option_one_name: "Size",
              variant_option_one_value: "SMALL",
              inventory_Main_Outlet: 1,
            },
          ],
        },
      ],
      after: null,
      pageSize: 50,
      hasNextPage: false,
      nextAfter: null,
      totalProducts: 1,
    });
    listForReconciliationMock.mockReset();
    listForReconciliationMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    listByTenantMock.mockResolvedValueOnce([]);

    const service = new LightspeedReconciliationSyncService({} as never);
    const result = await service.preview({ tenantId: "tenant-1" });

    expect(result.importCount).toBe(0);
    expect(result.conflictCount).toBe(1);
    expect(result.conflicts[0]).toEqual(
      expect.objectContaining({
        remoteProductId: "ls-missing-category",
        skuSample: "MISS-001",
        conflictReason: "missing_category",
      }),
    );
  });

  it("ignores remote timestamp-only drift for already linked products", async () => {
    listProductsMock.mockResolvedValueOnce({
      products: [
        {
          id: "ls-timestamp-linked",
          name: "Timestamp Product",
          version: 701,
          created_at: "2026-06-10T10:00:00.000Z",
          updated_at: "2026-06-15T10:00:00.000Z",
          product_category: "Sneakers",
          active: true,
          has_variants: true,
          variants: [
            {
              id: "ls-timestamp-linked-variant",
              sku: "TIME-001",
              name: "Timestamp Product",
              variant_options: [{ name: "Size", value: "10M / 11.5W" }],
              inventory_Main_Outlet: 1,
              retail_price: 150,
              supply_price: 90,
            },
          ],
        },
      ],
      after: null,
      pageSize: 50,
      hasNextPage: false,
      nextAfter: null,
      totalProducts: 1,
    });
    listForReconciliationMock.mockReset();
    listForReconciliationMock
      .mockResolvedValueOnce([
        {
          id: "website-timestamp-linked",
          name: "Timestamp Product",
          brand: "Unknown",
          model: null,
          category: "sneakers",
          condition: "new",
          size_type: "shoe",
          description: null,
          is_active: true,
          is_out_of_stock: false,
          created_at: "2026-06-01T10:00:00.000Z",
          product_created_at: "2026-06-01T10:00:00.000Z",
          product_updated_at: "2026-06-01T10:00:00.000Z",
          variants: [
            {
              id: "variant-timestamp-linked",
              sku: "TIME-001",
              size_label: "10M / 11.5W",
              sale_price_cents: 15000,
              unit_cost_cents: 9000,
              stock: 1,
              sort_order: 0,
            },
          ],
          images: [],
          tags: [
            { label: "Unknown", group_key: "brand" },
            { label: "sneakers", group_key: "category" },
            { label: "new", group_key: "condition" },
            { label: "10M / 11.5W", group_key: "size_shoe" },
          ],
        },
      ])
      .mockResolvedValueOnce([]);
    listByTenantMock.mockResolvedValueOnce([
      {
        id: "link-timestamp-linked",
        tenant_id: "tenant-1",
        product_id: "website-timestamp-linked",
        variant_id: "variant-timestamp-linked",
        lightspeed_family_id: "ls-timestamp-linked",
        lightspeed_product_id: "ls-timestamp-linked",
        lightspeed_variant_id: "ls-timestamp-linked-variant",
        lightspeed_inventory_item_id: null,
        external_sku: "TIME-001",
        sync_state: "linked",
        last_website_modified_at: null,
        last_lightspeed_modified_at: null,
        last_sync_direction: null,
        tombstoned_at: null,
        last_error: null,
      },
    ]);

    const service = new LightspeedReconciliationSyncService({} as never);

    const result = await service.preview({ tenantId: "tenant-1" });

    expect(result.editCount).toBe(0);
    expect(result.noChangeCount).toBe(1);
    expect(result.noChanges[0]).toEqual(
      expect.objectContaining({
        websiteProductId: "website-timestamp-linked",
        remoteProductId: "ls-timestamp-linked",
        reason: "link",
      }),
    );
  });

  it("hydrates remote products during preview so inventory matches the chunked scanner", async () => {
    listProductsMock.mockResolvedValueOnce({
      products: [
        {
          id: "ls-hydrate",
          name: "Hydrated Product",
          version: 501,
          created_at: "2026-06-01T10:00:00.000Z",
          updated_at: "2026-06-08T10:00:00.000Z",
          product_category: "Sneakers",
          variants: [
            {
              id: "ls-hydrate-variant",
              sku: "HYD-001",
              name: "Hydrated Product",
              inventory: [{ current_amount: 0 }],
              variant_options: [{ name: "Size", value: "One Size" }],
            },
          ],
        },
      ],
      after: null,
      pageSize: 50,
      hasNextPage: false,
      nextAfter: null,
      totalProducts: 1,
    });
    getProductMock.mockImplementation((productId: string) =>
      Promise.resolve(
        productId !== "ls-hydrate"
          ? null
            : {
                id: "ls-hydrate",
                name: "Hydrated Product",
                version: 501,
                created_at: "2026-06-01T10:00:00.000Z",
                updated_at: "2026-06-08T10:00:00.000Z",
                product_category: "Sneakers",
                variants: [
                {
                  id: "ls-hydrate-variant",
                  sku: "HYD-001",
                  name: "Hydrated Product",
                  inventory: [{ current_amount: 1 }],
                  variant_options: [{ name: "Size", value: "One Size" }],
                },
              ],
            },
      ),
    );
    listForReconciliationMock.mockReset();
    listForReconciliationMock
      .mockResolvedValueOnce([
        {
          id: "website-hydrate",
          name: "Hydrated Product",
          brand: "Unknown",
          model: null,
          category: "sneakers",
          condition: "new",
          size_type: "shoe",
          description: null,
          is_active: true,
          is_out_of_stock: false,
          created_at: "2026-06-01T10:00:00.000Z",
          product_created_at: "2026-06-01T10:00:00.000Z",
          product_updated_at: "2026-06-08T10:00:00.000Z",
          variants: [
            {
              id: "variant-hydrate",
              sku: "HYD-001",
              size_label: "One Size",
              sale_price_cents: 0,
              unit_cost_cents: 0,
              stock: 1,
              sort_order: 0,
            },
          ],
          images: [],
          tags: [
            { label: "Unknown", group_key: "brand" },
            { label: "sneakers", group_key: "category" },
            { label: "new", group_key: "condition" },
            { label: "One Size", group_key: "size_shoe" },
          ],
        },
      ])
      .mockResolvedValueOnce([]);
    listByTenantMock.mockResolvedValueOnce([
      {
        id: "link-hydrate",
        tenant_id: "tenant-1",
        product_id: "website-hydrate",
        variant_id: "variant-hydrate",
        lightspeed_family_id: "ls-hydrate",
        lightspeed_product_id: "ls-hydrate",
        lightspeed_variant_id: "ls-hydrate-variant",
        lightspeed_inventory_item_id: null,
        external_sku: "HYD-001",
        sync_state: "linked",
        last_website_modified_at: null,
        last_lightspeed_modified_at: null,
        last_sync_direction: null,
        tombstoned_at: null,
        last_error: null,
      },
    ]);

    const service = new LightspeedReconciliationSyncService({} as never);
    const result = await service.preview({ tenantId: "tenant-1" });

    expect(getProductMock).toHaveBeenCalledWith("ls-hydrate");
    expect(result.editCount).toBe(0);
    expect(result.noChangeCount).toBe(1);
  });

  it("restores archived products and archives website-only products on apply", async () => {
    listForReconciliationMock.mockResolvedValueOnce([
      {
        id: "website-archive",
        name: "Archive Product",
        variants: [{ sku: "ARCHIVE-001" }],
      },
      {
        id: "website-sku",
        name: "SKU Match Product",
        variants: [{ sku: "SKU-001" }],
      },
    ]);

    const service = new LightspeedReconciliationSyncService({} as never);

    const result = await service.apply({ tenantId: "tenant-1" });

    expect(upsertLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "website-sku",
        variantId: "variant-sku",
        externalSku: "SKU-001",
        lightspeedFamilyId: "ls-sku",
      }),
    );
    expect(restoreProductMock).toHaveBeenCalledWith(
      "website-archived-linked",
      "tenant-1",
    );
    expect(applyProductPayloadMock).toHaveBeenCalledTimes(2);
    expect(archiveProductMock).toHaveBeenCalledWith("website-archive", "tenant-1");
    expect(result).toEqual({
      noChangeCount: 1,
      importedCount: 0,
      editedCount: 1,
      restoredCount: 1,
      archivedCount: 1,
      conflictCount: 1,
      failedCount: 0,
      failureDetails: [],
      resultItems: expect.arrayContaining([
        expect.objectContaining({
          status: "success",
          operation: "edit",
          websiteProductId: "website-sku",
          remoteProductId: "ls-sku",
          title: "SKU Match Product",
        }),
        expect.objectContaining({
          status: "success",
          operation: "restore",
          websiteProductId: "website-archived-linked",
          remoteProductId: "ls-import",
          title: "Import Product",
        }),
        expect.objectContaining({
          status: "success",
          operation: "archive",
          websiteProductId: "website-archive",
        }),
      ]),
    });
  });

  it("imports a specific chunk of remote products", async () => {
    const service = new LightspeedReconciliationSyncService({} as never);

    const result = await service.applyImportChunk({
      tenantId: "tenant-1",
      remoteProductIds: ["ls-import", "ls-sku"],
    });

    expect(applyProductPayloadMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      importedCount: 2,
      failedCount: 0,
      failureDetails: [],
      resultItems: expect.arrayContaining([
        expect.objectContaining({
          status: "success",
          operation: "import",
          remoteProductId: "ls-import",
          title: "Import Product",
        }),
        expect.objectContaining({
          status: "success",
          operation: "import",
          remoteProductId: "ls-sku",
          title: "SKU Match Product",
        }),
      ]),
    });
  });

  it("counts skipped edit sync results as failures with details", async () => {
    applyProductPayloadMock.mockResolvedValueOnce({
      status: "skipped",
      reason: "stale_remote_write",
    });

    const service = new LightspeedReconciliationSyncService({} as never);

    const result = await service.applyEditChunk({
      tenantId: "tenant-1",
      edits: [
        {
          websiteProductId: "website-sku",
          remoteProductId: "ls-sku",
          reason: "sku",
        },
      ],
    });

    expect(result).toEqual({
      editedCount: 0,
      failedCount: 1,
      failureDetails: [
        {
          operation: "edit",
          websiteProductId: "website-sku",
          remoteProductId: "ls-sku",
          message: "Lightspeed inbound sync skipped this product.",
          reason: "stale_remote_write",
        },
      ],
      resultItems: [
        expect.objectContaining({
          status: "failure",
          operation: "edit",
          websiteProductId: "website-sku",
          remoteProductId: "ls-sku",
          title: "SKU Match Product",
          reason: "stale_remote_write",
        }),
      ],
    });
  });

  it("surfaces structured non-Error sync failures instead of collapsing them", async () => {
    applyProductPayloadMock.mockRejectedValueOnce({
      message: "new row violates row-level security policy",
      details: 'table "deleted_product_recovery"',
      code: "42501",
    });

    const service = new LightspeedReconciliationSyncService({} as never);

    const result = await service.applyEditChunk({
      tenantId: "tenant-1",
      edits: [
        {
          websiteProductId: "website-linked",
          remoteProductId: "ls-linked",
          reason: "link",
        },
      ],
    });

    expect(result.failedCount).toBe(1);
    expect(result.failureDetails).toEqual([
      expect.objectContaining({
        operation: "edit",
        websiteProductId: "website-linked",
        remoteProductId: "ls-linked",
        message:
          'new row violates row-level security policy | table "deleted_product_recovery" | code 42501',
      }),
    ]);
    expect(result.resultItems).toEqual([
      expect.objectContaining({
        status: "failure",
        operation: "edit",
        websiteProductId: "website-linked",
        remoteProductId: "ls-linked",
        message:
          'new row violates row-level security policy | table "deleted_product_recovery" | code 42501',
      }),
    ]);
  });

  it("applies sku-matched edits for inactive website products", async () => {
    getByIdMock.mockImplementation(
      (productId: string, opts?: { includeInactive?: boolean }) =>
        Promise.resolve(
          productId !== "website-sku" || !opts?.includeInactive
            ? null
            : {
                id: "website-sku",
                name: "SKU Match Product",
                brand: "Unknown",
                model: null,
                category: "sneakers",
                condition: "new",
                size_type: "shoe",
                description: null,
                is_active: false,
                is_out_of_stock: false,
                created_at: "2026-06-03T12:00:00.000Z",
                product_created_at: "2026-06-03T12:00:00.000Z",
                product_updated_at: "2026-06-03T12:00:00.000Z",
                variants: [
                  {
                    id: "variant-sku",
                    sku: "SKU-001",
                    size_label: "One Size",
                    sale_price_cents: 0,
                    unit_cost_cents: 0,
                    stock: 0,
                    sort_order: 0,
                  },
                ],
                images: [],
                tags: [],
              },
        ),
    );

    const service = new LightspeedReconciliationSyncService({} as never);

    const result = await service.applyEditChunk({
      tenantId: "tenant-1",
      edits: [
        {
          websiteProductId: "website-sku",
          remoteProductId: "ls-sku",
          reason: "sku",
        },
      ],
    });

    expect(upsertLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "website-sku",
        variantId: "variant-sku",
        externalSku: "SKU-001",
      }),
    );
    expect(result).toEqual({
      editedCount: 1,
      failedCount: 0,
      failureDetails: [],
      resultItems: [
        expect.objectContaining({
          status: "success",
          operation: "edit",
          websiteProductId: "website-sku",
          remoteProductId: "ls-sku",
          title: "SKU Match Product",
        }),
      ],
    });
  });

  it("archives a specific chunk of website products", async () => {
    listForReconciliationMock.mockResolvedValueOnce([
      {
        id: "website-archive",
        name: "Archive Product",
        variants: [{ sku: "ARCHIVE-001" }],
      },
      {
        id: "website-sku",
        name: "SKU Match Product",
        variants: [{ sku: "SKU-001" }],
      },
    ]);

    const service = new LightspeedReconciliationSyncService({} as never);

    const result = await service.applyArchiveChunk({
      tenantId: "tenant-1",
      websiteProductIds: ["website-archive", "website-sku"],
    });

    expect(archiveProductMock).toHaveBeenCalledWith("website-archive", "tenant-1");
    expect(archiveProductMock).toHaveBeenCalledWith("website-sku", "tenant-1");
    expect(result).toEqual({
      archivedCount: 2,
      failedCount: 0,
      failureDetails: [],
      resultItems: expect.arrayContaining([
        expect.objectContaining({
          status: "success",
          operation: "archive",
          websiteProductId: "website-archive",
        }),
        expect.objectContaining({
          status: "success",
          operation: "archive",
          websiteProductId: "website-sku",
        }),
      ]),
    });
  });

  it("returns a preview scan chunk with cumulative counts", async () => {
    listForReconciliationMock.mockReset();
    listForReconciliationMock
      .mockResolvedValueOnce([
        {
          id: "website-linked",
          name: "Linked Product",
          brand: "Unknown",
          model: null,
          category: "sneakers",
          condition: "new",
          size_type: "shoe",
          description: null,
          is_active: true,
          is_out_of_stock: false,
          created_at: "2026-06-01T10:00:00.000Z",
          product_created_at: "2026-06-01T10:00:00.000Z",
          product_updated_at: "2026-06-08T10:00:00.000Z",
          variants: [
            {
              id: "variant-linked",
              sku: "LINK-001",
              size_label: "9M / 10.5W",
              sale_price_cents: 0,
              unit_cost_cents: 0,
              stock: 1,
              sort_order: 0,
            },
          ],
          images: [],
          tags: [
            { label: "Unknown", group_key: "brand" },
            { label: "sneakers", group_key: "category" },
            { label: "new", group_key: "condition" },
            { label: "9M / 10.5W", group_key: "size_shoe" },
          ],
        },
        {
          id: "website-archive",
          name: "Archive Product",
          brand: "Unknown",
          model: null,
          category: "sneakers",
          condition: "new",
          size_type: "shoe",
          description: null,
          is_active: true,
          is_out_of_stock: false,
          created_at: "2026-06-02T10:00:00.000Z",
          product_created_at: "2026-06-02T10:00:00.000Z",
          product_updated_at: "2026-06-02T10:00:00.000Z",
          variants: [{ id: "variant-archive", sku: "ARCHIVE-001" }],
          images: [],
          tags: [],
        },
        {
          id: "website-sku",
          name: "SKU Match Product",
          brand: "Unknown",
          model: null,
          category: "sneakers",
          condition: "new",
          size_type: "shoe",
          description: null,
          is_active: true,
          is_out_of_stock: false,
          created_at: "2026-06-03T12:00:00.000Z",
          product_created_at: "2026-06-03T12:00:00.000Z",
          product_updated_at: "2026-06-03T12:00:00.000Z",
          variants: [
            {
              id: "variant-sku",
              sku: "SKU-001",
              size_label: "One Size",
              sale_price_cents: 0,
              unit_cost_cents: 0,
              stock: 0,
              sort_order: 0,
            },
          ],
          images: [],
          tags: [],
        },
        {
          id: "website-conflict-a",
          name: "Conflict A",
          brand: "Unknown",
          model: null,
          category: "sneakers",
          condition: "new",
          size_type: "shoe",
          description: null,
          is_active: true,
          is_out_of_stock: false,
          created_at: "2026-06-04T13:00:00.000Z",
          product_created_at: "2026-06-04T13:00:00.000Z",
          product_updated_at: "2026-06-04T13:00:00.000Z",
          variants: [
            {
              id: "variant-conflict-a",
              sku: "CONFLICT-001",
              size_label: "One Size",
              sale_price_cents: 0,
              unit_cost_cents: 0,
              stock: 0,
              sort_order: 0,
            },
          ],
          images: [],
          tags: [],
        },
        {
          id: "website-conflict-b",
          name: "Conflict B",
          brand: "Unknown",
          model: null,
          category: "sneakers",
          condition: "new",
          size_type: "shoe",
          description: null,
          is_active: true,
          is_out_of_stock: false,
          created_at: "2026-06-04T13:05:00.000Z",
          product_created_at: "2026-06-04T13:05:00.000Z",
          product_updated_at: "2026-06-04T13:05:00.000Z",
          variants: [
            {
              id: "variant-conflict-b",
              sku: "CONFLICT-001",
              size_label: "One Size",
              sale_price_cents: 0,
              unit_cost_cents: 0,
              stock: 0,
              sort_order: 0,
            },
          ],
          images: [],
          tags: [],
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "website-archived-linked",
          name: "Archived Linked Product",
          brand: "Unknown",
          model: null,
          category: "sneakers",
          condition: "new",
          size_type: "shoe",
          description: null,
          is_active: true,
          is_out_of_stock: false,
          created_at: "2026-06-02T11:00:00.000Z",
          product_created_at: "2026-06-02T11:00:00.000Z",
          product_updated_at: "2026-06-02T11:00:00.000Z",
          variants: [
            {
              id: "variant-archived-linked",
              sku: "IMPORT-001",
              size_label: "One Size",
              sale_price_cents: 0,
              unit_cost_cents: 0,
              stock: 0,
              sort_order: 0,
            },
          ],
          images: [],
          tags: [],
          archived_at: "2026-06-01T00:00:00.000Z",
        },
      ]);

    const service = new LightspeedReconciliationSyncService({} as never);

    const result = await service.scanPreviewChunk({
      tenantId: "tenant-1",
      after: null,
      pageSize: 2,
      chunkIndex: 1,
    });

    expect(listProductsMock).toHaveBeenCalledWith({
      after: null,
      pageSize: 2,
    });
    expect(result.processedCount).toBe(4);
    expect(result.totalRemoteProducts).toBe(4);
    expect(result.hasNextPage).toBe(false);
    expect(result.preview.noChangeCount).toBe(1);
    expect(result.preview.importCount).toBe(0);
    expect(result.preview.editCount).toBe(1);
    expect(result.preview.restoreCount).toBe(1);
    expect(result.preview.conflictCount).toBe(1);
    expect(result.websiteCandidates).toHaveLength(5);
  });

  it("ignores child variant rows during preview scans", async () => {
    listProductsMock.mockResolvedValueOnce({
      products: [
        {
          id: "family-parent",
          version: 201,
          name: "Family Product",
          product_category: "Clothing",
          has_variants: true,
          variants: [
            { id: "family-child-a", sku: "FAM-001", name: "Family Product" },
            { id: "family-child-b", sku: "FAM-002", name: "Family Product" },
          ],
        },
        {
          id: "family-child-a",
          version: 202,
          name: "Family Product",
          variant_parent_id: "family-parent",
          sku: "FAM-001",
        },
      ],
      after: null,
      pageSize: 50,
      hasNextPage: false,
      nextAfter: null,
      totalProducts: 2,
    });
    listForReconciliationMock.mockResolvedValueOnce([]);
    listByTenantMock.mockResolvedValueOnce([]);

    const service = new LightspeedReconciliationSyncService({} as never);
    const result = await service.scanPreviewChunk({
      tenantId: "tenant-1",
      after: null,
      pageSize: 50,
      chunkIndex: 1,
    });

    expect(result.processedCount).toBe(1);
    expect(result.preview.importCount).toBe(1);
  });

  it("detects edits when a linked family has separate child rows but an incomplete parent fetch", async () => {
    listProductsMock.mockResolvedValueOnce({
      products: [
        {
          id: "family-parent",
          version: 301,
          name: "Family Product",
          updated_at: "2026-06-16T12:00:00.000Z",
          product_category: "Clothing",
          has_variants: true,
        },
        {
          id: "family-child-a",
          version: 302,
          name: "Family Product",
          variant_parent_id: "family-parent",
          sku: "FAM-001",
          variant_option_one_name: "Size",
          variant_option_one_value: "30",
          inventory_Main_Outlet: 1,
        },
        {
          id: "family-child-b",
          version: 303,
          name: "Family Product",
          variant_parent_id: "family-parent",
          sku: "FAM-002",
          variant_option_one_name: "Size",
          variant_option_one_value: "32",
          inventory_Main_Outlet: 1,
        },
      ],
      after: null,
      pageSize: 50,
      hasNextPage: false,
      nextAfter: null,
      totalProducts: 3,
    });
    getProductMock.mockImplementation((productId: string) =>
      Promise.resolve(
        productId !== "family-parent"
          ? null
          : {
              id: "family-parent",
              version: 301,
              name: "Family Product",
              updated_at: "2026-06-16T12:00:00.000Z",
              product_category: "Clothing",
              has_variants: true,
              variants: [
                {
                  id: "family-child-a",
                  sku: "FAM-001",
                  name: "Family Product",
                  variant_option_one_name: "Size",
                  variant_option_one_value: "30",
                  inventory_Main_Outlet: 1,
                },
              ],
            },
      ),
    );
    listForReconciliationMock.mockReset();
    listForReconciliationMock
      .mockResolvedValueOnce([
        {
          id: "website-family",
          name: "Family Product",
          brand: "Unknown",
          model: null,
          category: "sneakers",
          condition: "new",
          size_type: "shoe",
          description: null,
          is_active: true,
          is_out_of_stock: false,
          created_at: null,
          product_created_at: null,
          product_updated_at: "2026-06-16T12:00:00.000Z",
          variants: [
            {
              id: "variant-family-a",
              sku: "FAM-001",
              size_label: "30",
              sale_price_cents: 0,
              unit_cost_cents: 0,
              stock: 1,
              sort_order: 0,
            },
          ],
          images: [],
          tags: [
            { label: "Unknown", group_key: "brand" },
            { label: "sneakers", group_key: "category" },
            { label: "new", group_key: "condition" },
            { label: "30", group_key: "size_shoe" },
          ],
        },
      ])
      .mockResolvedValueOnce([]);
    listByTenantMock.mockResolvedValueOnce([
      {
        id: "link-family-a",
        tenant_id: "tenant-1",
        product_id: "website-family",
        variant_id: "variant-family-a",
        lightspeed_family_id: "family-parent",
        lightspeed_product_id: "family-parent",
        lightspeed_variant_id: "family-child-a",
        lightspeed_inventory_item_id: null,
        external_sku: "FAM-001",
        sync_state: "linked",
        last_website_modified_at: null,
        last_lightspeed_modified_at: null,
        last_sync_direction: null,
        tombstoned_at: null,
        last_error: null,
      },
    ]);

    const service = new LightspeedReconciliationSyncService({} as never);
    const result = await service.preview({ tenantId: "tenant-1" });

    expect(result.editCount).toBe(1);
    expect(result.noChangeCount).toBe(0);
    expect(result.edits[0]?.websiteProductId).toBe("website-family");
    expect(result.edits[0]?.remoteProductId).toBe("family-parent");
    expect(result.edits[0]?.reason).toBe("link");
    expect(result.edits[0]?.remote.variants).toHaveLength(2);
    expect(result.edits[0]?.diff.fields).toContain("variants");
    expect(result.edits[0]?.diff.variantChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sku: "FAM-002",
          changeType: "added",
        }),
      ]),
    );
  });

  it("applies imports using the full family when getProduct returns only one variant", async () => {
    listProductsMock.mockResolvedValueOnce({
      products: [
        {
          id: "family-parent",
          version: 401,
          name: "Family Product",
          updated_at: "2026-06-16T14:00:00.000Z",
          product_category: "Clothing",
          has_variants: true,
        },
        {
          id: "family-child-a",
          version: 402,
          name: "Family Product",
          variant_parent_id: "family-parent",
          sku: "FAM-001",
          variant_option_one_name: "Size",
          variant_option_one_value: "30",
          inventory_Main_Outlet: 1,
        },
        {
          id: "family-child-b",
          version: 403,
          name: "Family Product",
          variant_parent_id: "family-parent",
          sku: "FAM-002",
          variant_option_one_name: "Size",
          variant_option_one_value: "32",
          inventory_Main_Outlet: 1,
        },
      ],
      after: null,
      pageSize: 50,
      hasNextPage: false,
      nextAfter: null,
      totalProducts: 3,
    });
    getProductMock.mockImplementation((productId: string) =>
      Promise.resolve(
        productId !== "family-parent"
          ? null
            : {
                id: "family-parent",
                version: 401,
                name: "Family Product",
                updated_at: "2026-06-16T14:00:00.000Z",
                product_category: "Clothing",
                has_variants: true,
              variants: [
                {
                  id: "family-child-a",
                  sku: "FAM-001",
                  name: "Family Product",
                  variant_option_one_name: "Size",
                  variant_option_one_value: "30",
                  inventory_Main_Outlet: 1,
                },
              ],
            },
      ),
    );
    listForReconciliationMock.mockReset();
    listForReconciliationMock.mockResolvedValueOnce([]);
    applyProductPayloadMock.mockResolvedValueOnce({
      status: "applied",
      productId: "website-family",
    });

    const service = new LightspeedReconciliationSyncService({} as never);
    const result = await service.applyImportChunk({
      tenantId: "tenant-1",
      remoteProductIds: ["family-parent"],
    });

    expect(result).toEqual({
      importedCount: 1,
      failedCount: 0,
      failureDetails: [],
      resultItems: [
        expect.objectContaining({
          status: "success",
          operation: "import",
          remoteProductId: "family-parent",
          title: "Family Product",
        }),
      ],
    });
    expect(applyProductPayloadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          id: "family-parent",
          variants: expect.arrayContaining([
            expect.objectContaining({ id: "family-child-a", sku: "FAM-001" }),
            expect.objectContaining({ id: "family-child-b", sku: "FAM-002" }),
          ]),
        }),
      }),
    );
    expect(
      (
        applyProductPayloadMock.mock.calls.at(-1)?.[0] as {
          payload?: { variants?: unknown[] };
        }
      ).payload?.variants,
    ).toHaveLength(2);
  });

  it("passes sync-run category overrides into import application", async () => {
    listProductsMock.mockResolvedValueOnce({
      products: [
        {
          id: "ls-override-1",
          version: 501,
          name: "Override Import Product",
          updated_at: "2026-06-17T18:00:00.000Z",
          variants: [
            {
              id: "ls-override-variant-1",
              sku: "OVERRIDE-001",
              name: "Override Import Product",
              variant_option_one_name: "Size",
              variant_option_one_value: "SMALL",
              inventory_Main_Outlet: 1,
            },
          ],
        },
      ],
      after: null,
      pageSize: 50,
      hasNextPage: false,
      nextAfter: null,
      totalProducts: 1,
    });
    listForReconciliationMock.mockReset();
    listForReconciliationMock.mockResolvedValueOnce([]);
    applyProductPayloadMock.mockResolvedValueOnce({
      status: "applied",
      productId: "website-override-1",
    });

    const service = new LightspeedReconciliationSyncService({} as never);

    await service.applyImportChunk({
      tenantId: "tenant-1",
      remoteProductIds: ["ls-override-1"],
      categoryOverrides: [
        {
          remoteProductId: "ls-override-1",
          category: "clothing",
        },
      ],
    });

    expect(applyProductPayloadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ id: "ls-override-1" }),
        categoryOverride: "clothing",
      }),
    );
  });

  it("diagnoses why a remote product classified as a no-change link match", async () => {
    listForReconciliationMock.mockReset();
    listForReconciliationMock
      .mockResolvedValueOnce([
        {
          id: "website-linked",
          name: "Linked Product",
          brand: "Unknown",
          model: null,
          category: "sneakers",
          condition: "new",
          size_type: "shoe",
          description: null,
          is_active: true,
          is_out_of_stock: false,
          created_at: "2026-06-01T10:00:00.000Z",
          product_created_at: "2026-06-01T10:00:00.000Z",
          product_updated_at: "2026-06-08T10:00:00.000Z",
          variants: [
            {
              id: "variant-linked",
              sku: "LINK-001",
              size_label: "9M / 10.5W",
              sale_price_cents: 0,
              unit_cost_cents: 0,
              stock: 1,
              sort_order: 0,
            },
          ],
          images: [],
          tags: [
            { label: "Unknown", group_key: "brand" },
            { label: "sneakers", group_key: "category" },
            { label: "new", group_key: "condition" },
            { label: "9M / 10.5W", group_key: "size_shoe" },
          ],
        },
      ])
      .mockResolvedValueOnce([]);
    listByTenantMock.mockResolvedValueOnce([
      {
        id: "link-1",
        tenant_id: "tenant-1",
        product_id: "website-linked",
        variant_id: "variant-linked",
        lightspeed_family_id: "ls-linked",
        lightspeed_product_id: "ls-linked",
        lightspeed_variant_id: "ls-linked-variant",
        lightspeed_inventory_item_id: null,
        external_sku: "LINK-001",
        sync_state: "linked",
        last_website_modified_at: null,
        last_lightspeed_modified_at: null,
        last_sync_direction: null,
        tombstoned_at: null,
        last_error: null,
      },
    ]);

    const service = new LightspeedReconciliationSyncService({} as never);

    const result = await service.diagnoseRemoteProduct({
      tenantId: "tenant-1",
      remoteProductId: "ls-linked",
    });

    expect(result).toEqual(
      expect.objectContaining({
        remoteProductId: "ls-linked",
        classification: "no_change",
        matchReason: "link",
        linkedActiveWebsiteProductIds: ["website-linked"],
        linkedArchivedWebsiteProductIds: [],
        candidateActiveWebsiteProductIds: [],
        candidateArchivedWebsiteProductIds: [],
        skuMatches: [],
      }),
    );
  });
});
