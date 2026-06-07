const updateProductMock = jest.fn();
const getConnectionByTenantMock = jest.fn();
const getByVariantIdMock = jest.fn();
const upsertLinkMock = jest.fn();

jest.mock("@/lib/lightspeed/client", () => ({
  LightspeedClient: jest.fn().mockImplementation(() => ({
    updateProduct: updateProductMock,
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
    upsertLink: upsertLinkMock,
  })),
}));

jest.mock("@/repositories/product-repo", () => ({
  ProductRepository: jest.fn().mockImplementation(() => ({})),
}));

import { LightspeedProductSyncService } from "@/services/lightspeed-product-sync-service";

describe("Lightspeed inventory sync", () => {
  beforeEach(() => {
    updateProductMock.mockReset();
    getConnectionByTenantMock.mockReset();
    getByVariantIdMock.mockReset();
    upsertLinkMock.mockReset();
  });

  it("pushes website stock decrements to Lightspeed", async () => {
    getConnectionByTenantMock.mockResolvedValue({
      syncEnabled: true,
      domainPrefix: "demo-store",
      accessToken: "token",
    });
    getByVariantIdMock.mockResolvedValue({
      product_id: "product-1",
      variant_id: "variant-1",
      external_sku: "N-JDN-DEL-11-01",
      lightspeed_family_id: "ls-family-1",
      lightspeed_product_id: "ls-family-1",
      lightspeed_variant_id: "ls-child-1",
      lightspeed_inventory_item_id: null,
      last_lightspeed_modified_at: "2026-06-05T19:00:00.000Z",
    });

    const service = new LightspeedProductSyncService({} as never);

    const result = await service.syncVariantInventory({
      tenantId: "tenant-1",
      variantId: "variant-1",
      stock: 0,
      websiteModifiedAt: "2026-06-05T20:00:00.000Z",
    });

    expect(updateProductMock).toHaveBeenCalledWith("ls-child-1", {
      details: {
        inventory: [{ current_amount: 0 }],
      },
    });
    expect(upsertLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        variantId: "variant-1",
        lastWebsiteModifiedAt: "2026-06-05T20:00:00.000Z",
        lastSyncDirection: "website_to_lightspeed",
      }),
    );
    expect(result).toEqual({ status: "synced" });
  });

  it("skips outbound inventory sync when Lightspeed already has a newer write", async () => {
    getConnectionByTenantMock.mockResolvedValue({
      syncEnabled: true,
      domainPrefix: "demo-store",
      accessToken: "token",
    });
    getByVariantIdMock.mockResolvedValue({
      variant_id: "variant-1",
      lightspeed_variant_id: "ls-child-1",
      last_lightspeed_modified_at: "2026-06-05T21:00:00.000Z",
    });

    const service = new LightspeedProductSyncService({} as never);

    const result = await service.syncVariantInventory({
      tenantId: "tenant-1",
      variantId: "variant-1",
      stock: 1,
      websiteModifiedAt: "2026-06-05T20:00:00.000Z",
    });

    expect(updateProductMock).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "skipped", reason: "stale_website_write" });
  });
});
