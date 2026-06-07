const listProductsMock = jest.fn();
const getConnectionByTenantMock = jest.fn();
const applyProductPayloadMock = jest.fn();

jest.mock("@/lib/lightspeed/client", () => ({
  LightspeedClient: jest.fn().mockImplementation(() => ({
    listProducts: listProductsMock,
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
        products: [{ id: "ls-1", updated_at: "2026-06-06T10:00:00.000Z" }],
        page: 1,
        pageSize: 50,
        hasNextPage: true,
      })
      .mockResolvedValueOnce({
        products: [{ id: "ls-2", updated_at: "2026-06-06T11:00:00.000Z" }],
        page: 2,
        pageSize: 50,
        hasNextPage: false,
      });
    applyProductPayloadMock
      .mockResolvedValueOnce({ status: "applied", productId: "product-1" })
      .mockResolvedValueOnce({ status: "skipped", reason: "stale_remote_write" });

    const service = new LightspeedManualImportService({} as never);

    const result = await service.importProducts({ tenantId: "tenant-1" });

    expect(listProductsMock).toHaveBeenCalledTimes(2);
    expect(applyProductPayloadMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      status: "completed",
      scanned: 2,
      applied: 1,
      skipped: 1,
    });
  });
});
