const listProductsMock = jest.fn();
const getProductMock = jest.fn();
const getConnectionByTenantMock = jest.fn();
const applyProductPayloadMock = jest.fn();

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

jest.mock("@/services/lightspeed-inbound-sync-service", () => ({
  LightspeedInboundSyncService: jest.fn().mockImplementation(() => ({
    applyProductPayload: applyProductPayloadMock,
  })),
}));

import { LightspeedManualImportService } from "@/services/lightspeed-manual-import-service";

describe("LightspeedManualImportService", () => {
  beforeEach(() => {
    listProductsMock.mockReset();
    getProductMock.mockReset();
    getConnectionByTenantMock.mockReset();
    applyProductPayloadMock.mockReset();
  });

  it("imports Lightspeed products across pages and summarizes outcomes", async () => {
    getConnectionByTenantMock.mockResolvedValue({
      syncEnabled: true,
      domainPrefix: "demo-store",
      accessToken: "token",
    });
    listProductsMock
      .mockResolvedValueOnce({
        products: [
          { id: "ls-1", updated_at: "2026-06-06T10:00:00.000Z", version: 101 },
          {
            id: "ls-1-child",
            updated_at: "2026-06-06T10:00:00.000Z",
            version: 102,
            variant_parent_id: "ls-1",
          },
        ],
        after: null,
        pageSize: 50,
        hasNextPage: true,
        nextAfter: 102,
        totalProducts: 3,
      })
      .mockResolvedValueOnce({
        products: [{ id: "ls-2", updated_at: "2026-06-06T11:00:00.000Z", version: 103 }],
        after: 102,
        pageSize: 50,
        hasNextPage: false,
        nextAfter: null,
        totalProducts: 3,
      });
    getProductMock
      .mockResolvedValueOnce({ id: "ls-1", updated_at: "2026-06-06T10:00:00.000Z" })
      .mockResolvedValueOnce({ id: "ls-2", updated_at: "2026-06-06T11:00:00.000Z" });
    applyProductPayloadMock
      .mockResolvedValueOnce({ status: "applied", productId: "product-1" })
      .mockResolvedValueOnce({ status: "skipped", reason: "stale_remote_write" });

    const service = new LightspeedManualImportService({} as never);

    const result = await service.importProducts({ tenantId: "tenant-1" });

    expect(listProductsMock).toHaveBeenCalledTimes(2);
    expect(getProductMock).toHaveBeenCalledTimes(2);
    expect(applyProductPayloadMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      status: "completed",
      scanned: 2,
      applied: 1,
      skipped: 1,
    });
  });
});
