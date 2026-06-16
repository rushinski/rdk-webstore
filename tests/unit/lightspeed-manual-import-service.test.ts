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

  it("prefers the fullest variant family payload when getProduct returns an incomplete family", async () => {
    getConnectionByTenantMock.mockResolvedValue({
      syncEnabled: true,
      domainPrefix: "demo-store",
      accessToken: "token",
    });
    listProductsMock.mockResolvedValueOnce({
      products: [
        {
          id: "ls-family-9",
          updated_at: "2026-06-15T10:00:00.000Z",
          variants: Array.from({ length: 9 }, (_, index) => ({
            id: `ls-child-${index + 1}`,
            sku: `SKU-${index + 1}`,
          })),
        },
      ],
      after: null,
      pageSize: 50,
      hasNextPage: false,
      nextAfter: null,
      totalProducts: 1,
    });
    getProductMock.mockResolvedValueOnce({
      id: "ls-family-9",
      updated_at: "2026-06-15T10:00:00.000Z",
      variants: [{ id: "ls-child-1", sku: "SKU-1" }],
    });
    applyProductPayloadMock.mockResolvedValueOnce({
      status: "applied",
      productId: "product-9",
    });

    const service = new LightspeedManualImportService({} as never);

    await service.importProducts({ tenantId: "tenant-1" });

    expect(applyProductPayloadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          id: "ls-family-9",
          variants: expect.arrayContaining([
            expect.objectContaining({ id: "ls-child-1", sku: "SKU-1" }),
            expect.objectContaining({ id: "ls-child-9", sku: "SKU-9" }),
          ]),
        }),
      }),
    );
    expect(
      (
        applyProductPayloadMock.mock.calls[0]?.[0] as {
          payload?: { variants?: unknown[] };
        }
      ).payload?.variants,
    ).toHaveLength(9);
  });

  it("assembles family children from separate Lightspeed rows when the parent payload is not expanded", async () => {
    getConnectionByTenantMock.mockResolvedValue({
      syncEnabled: true,
      domainPrefix: "demo-store",
      accessToken: "token",
    });
    listProductsMock.mockResolvedValueOnce({
      products: [
        {
          id: "ls-family-6",
          updated_at: "2026-06-16T10:00:00.000Z",
          has_variants: true,
        },
        {
          id: "ls-child-1",
          variant_parent_id: "ls-family-6",
          sku: "SKU-1",
          variant_option_one_name: "Size",
          variant_option_one_value: "28",
        },
        {
          id: "ls-child-2",
          variant_parent_id: "ls-family-6",
          sku: "SKU-2",
          variant_option_one_name: "Size",
          variant_option_one_value: "30",
        },
        {
          id: "ls-child-3",
          variant_parent_id: "ls-family-6",
          sku: "SKU-3",
          variant_option_one_name: "Size",
          variant_option_one_value: "32",
        },
        {
          id: "ls-child-4",
          variant_parent_id: "ls-family-6",
          sku: "SKU-4",
          variant_option_one_name: "Size",
          variant_option_one_value: "34",
        },
        {
          id: "ls-child-5",
          variant_parent_id: "ls-family-6",
          sku: "SKU-5",
          variant_option_one_name: "Size",
          variant_option_one_value: "36",
        },
        {
          id: "ls-child-6",
          variant_parent_id: "ls-family-6",
          sku: "SKU-6",
          variant_option_one_name: "Size",
          variant_option_one_value: "38",
        },
      ],
      after: null,
      pageSize: 50,
      hasNextPage: false,
      nextAfter: null,
      totalProducts: 7,
    });
    getProductMock.mockResolvedValueOnce({
      id: "ls-family-6",
      updated_at: "2026-06-16T10:00:00.000Z",
      has_variants: true,
      variants: [{ id: "ls-child-1", sku: "SKU-1" }],
    });
    applyProductPayloadMock.mockResolvedValueOnce({
      status: "applied",
      productId: "product-6",
    });

    const service = new LightspeedManualImportService({} as never);

    await service.importProducts({ tenantId: "tenant-1" });

    expect(
      (
        applyProductPayloadMock.mock.calls[0]?.[0] as {
          payload?: { variants?: Array<{ id: string }> };
        }
      ).payload?.variants,
    ).toHaveLength(6);
  });
});
