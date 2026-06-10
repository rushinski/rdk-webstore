const listProductsMock = jest.fn();
const getProductMock = jest.fn();
const getConnectionByTenantMock = jest.fn();
const listForReconciliationMock = jest.fn();
const listByTenantMock = jest.fn();
const applyProductPayloadMock = jest.fn();
const archiveProductMock = jest.fn();
const getByIdMock = jest.fn();
const upsertLinkMock = jest.fn();

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

jest.mock("@/services/product-service", () => ({
  ProductService: jest.fn().mockImplementation(() => ({
    archiveProduct: archiveProductMock,
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
        updated_at: "2026-06-08T10:00:00.000Z",
        has_variants: true,
        variants: [{ id: "ls-linked-variant", sku: "LINK-001", name: "Linked Product" }],
      },
      {
        id: "ls-import",
        name: "Import Product",
        version: 102,
        updated_at: "2026-06-08T11:00:00.000Z",
        variants: [
          { id: "ls-import-variant", sku: "IMPORT-001", name: "Import Product" },
        ],
      },
      {
        id: "ls-sku",
        name: "SKU Match Product",
        version: 103,
        updated_at: "2026-06-08T12:00:00.000Z",
        variants: [{ id: "ls-sku-variant", sku: "SKU-001", name: "SKU Match Product" }],
      },
      {
        id: "ls-conflict",
        name: "Conflict Product",
        version: 104,
        updated_at: "2026-06-08T13:00:00.000Z",
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
    listForReconciliationMock.mockResolvedValue([
      {
        id: "website-linked",
        name: "Linked Product",
        variants: [{ id: "variant-linked", sku: "LINK-001" }],
        images: [],
        tags: [],
      },
      {
        id: "website-archive",
        name: "Archive Product",
        variants: [{ id: "variant-archive", sku: "ARCHIVE-001" }],
        images: [],
        tags: [],
      },
      {
        id: "website-sku",
        name: "SKU Match Product",
        variants: [{ id: "variant-sku", sku: "SKU-001" }],
        images: [],
        tags: [],
      },
      {
        id: "website-conflict-a",
        name: "Conflict A",
        variants: [{ id: "variant-conflict-a", sku: "CONFLICT-001" }],
        images: [],
        tags: [],
      },
      {
        id: "website-conflict-b",
        name: "Conflict B",
        variants: [{ id: "variant-conflict-b", sku: "CONFLICT-001" }],
        images: [],
        tags: [],
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
      variants: [{ id: "variant-sku", sku: "SKU-001" }],
      images: [],
      tags: [],
    });
    applyProductPayloadMock.mockResolvedValue({
      status: "applied",
      productId: "product-1",
    });
    archiveProductMock.mockResolvedValue({ archived: true });
    upsertLinkMock.mockResolvedValue({});
  });

  it("classifies linked matches, imports, archives, and conflicts", async () => {
    const service = new LightspeedReconciliationSyncService({} as never);

    const result = await service.preview({ tenantId: "tenant-1" });

    expect(result.matchedCount).toBe(2);
    expect(result.importCount).toBe(1);
    expect(result.archiveCount).toBe(1);
    expect(result.conflictCount).toBe(1);
    expect(result.matched).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          websiteProductId: "website-linked",
          remoteProductId: "ls-linked",
          reason: "link",
        }),
        expect.objectContaining({
          websiteProductId: "website-sku",
          remoteProductId: "ls-sku",
          reason: "sku",
          skuMatches: ["SKU-001"],
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

  it("imports missing products and archives website-only products on apply", async () => {
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
    expect(applyProductPayloadMock).toHaveBeenCalledTimes(2);
    expect(archiveProductMock).toHaveBeenCalledWith("website-archive", "tenant-1");
    expect(result).toEqual({
      matchedCount: 2,
      importedCount: 1,
      archivedCount: 1,
      conflictCount: 1,
      failedCount: 0,
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
    });
  });

  it("archives a specific chunk of website products", async () => {
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
    });
  });

  it("returns a preview scan chunk with cumulative counts", async () => {
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
      includeImages: false,
    });
    expect(result.processedCount).toBe(4);
    expect(result.totalRemoteProducts).toBe(4);
    expect(result.hasNextPage).toBe(false);
    expect(result.preview.matchedCount).toBe(2);
    expect(result.preview.importCount).toBe(1);
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
});
