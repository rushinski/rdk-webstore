const getByLightspeedVariantIdMock = jest.fn();
const getByLightspeedProductIdMock = jest.fn();
const updateVariantMock = jest.fn();
const getConnectionByTenantMock = jest.fn();
const applyProductPayloadMock = jest.fn();
const applyDeleteMock = jest.fn();
const getProductMock = jest.fn();

jest.mock("@/repositories/lightspeed-links-repo", () => ({
  LightspeedLinksRepository: jest.fn().mockImplementation(() => ({
    getByLightspeedVariantId: getByLightspeedVariantIdMock,
    getByLightspeedProductId: getByLightspeedProductIdMock,
    upsertLink: jest.fn(),
  })),
}));

jest.mock("@/repositories/product-repo", () => ({
  ProductRepository: jest.fn().mockImplementation(() => ({
    updateVariant: updateVariantMock,
  })),
}));

jest.mock("@/repositories/lightspeed-settings-repo", () => ({
  LightspeedSettingsRepository: jest.fn().mockImplementation(() => ({
    getConnectionByTenant: getConnectionByTenantMock,
  })),
}));

jest.mock("@/services/lightspeed-inbound-sync-service", () => ({
  LightspeedInboundSyncService: jest.fn().mockImplementation(() => ({
    applyProductPayload: applyProductPayloadMock,
    applyDelete: applyDeleteMock,
  })),
}));

jest.mock("@/lib/lightspeed/client", () => ({
  LightspeedClient: jest.fn().mockImplementation(() => ({
    getProduct: getProductMock,
  })),
}));

import { LightspeedSaleSyncService } from "@/services/lightspeed-sale-sync-service";

describe("LightspeedSaleSyncService", () => {
  beforeEach(() => {
    getByLightspeedVariantIdMock.mockReset();
    getByLightspeedProductIdMock.mockReset();
    updateVariantMock.mockReset();
    getConnectionByTenantMock.mockReset();
    applyProductPayloadMock.mockReset();
    applyDeleteMock.mockReset();
    getProductMock.mockReset();
  });

  it("fetches the full current Lightspeed product before applying product.update", async () => {
    getConnectionByTenantMock.mockResolvedValue({
      syncEnabled: true,
      domainPrefix: "demo-store",
      accessToken: "token",
    });
    getProductMock.mockResolvedValue({
      id: "ls-product-1",
      name: "Jordan 4 Delta",
      updated_at: "2026-06-07T10:00:00.000Z",
    });
    applyProductPayloadMock.mockResolvedValue({
      status: "applied",
      productId: "product-1",
    });

    const service = new LightspeedSaleSyncService({} as never);

    await service.handleProductUpdate("tenant-1", {
      id: "ls-product-1",
      updated_at: "2026-06-07T09:00:00.000Z",
    });

    expect(getProductMock).toHaveBeenCalledWith("ls-product-1");
    expect(applyProductPayloadMock).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      payload: {
        id: "ls-product-1",
        name: "Jordan 4 Delta",
        updated_at: "2026-06-07T10:00:00.000Z",
      },
      topic: "product.update",
      remoteModifiedAt: "2026-06-07T10:00:00.000Z",
    });
  });
});
