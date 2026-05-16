import { LightspeedSyncApplyService } from "@/services/lightspeed-sync-apply-service";

describe("LightspeedSyncApplyService", () => {
  it("applies accepted items and rejects denied ones", async () => {
    const getRun = jest.fn().mockResolvedValue({
      id: "run-1",
      tenant_id: "tenant-1",
      source_of_truth: "lightspeed_inventory",
    });
    const listItems = jest.fn().mockResolvedValue([
      {
        id: "item-1",
        tenant_id: "tenant-1",
        action: "create_lightspeed_product",
        entity_key: "product-1",
        payload: { productId: "product-1" },
      },
      {
        id: "item-2",
        tenant_id: "tenant-1",
        action: "archive_lightspeed_product",
        entity_key: "product-2",
        payload: { lightspeedProductId: "ls-product-2" },
      },
    ]);
    const updateApproval = jest.fn();
    const updateApplyStatus = jest.fn();
    const completeRun = jest.fn();
    const syncWebsiteProduct = jest.fn().mockResolvedValue({
      status: "synced",
    });
    const archiveLightspeedProduct = jest.fn().mockResolvedValue(undefined);
    const sendFailureReport = jest.fn();

    const service = new LightspeedSyncApplyService(
      {
        getRun,
        listItems,
        updateApproval,
        updateApplyStatus,
        completeRun,
      } as never,
      {
        syncWebsiteProduct,
      } as never,
      {
        archiveLightspeedProduct,
      },
      {
        sendFailureReport,
      } as never,
    );

    const result = await service.applySync({
      tenantId: "tenant-1",
      syncRunId: "run-1",
      mode: "selective",
      decisions: [
        { itemId: "item-1", approved: true },
        { itemId: "item-2", approved: false },
      ],
    });

    expect(updateApproval).toHaveBeenCalledWith("item-1", true);
    expect(updateApproval).toHaveBeenCalledWith("item-2", false);
    expect(syncWebsiteProduct).toHaveBeenCalledWith("product-1", {
      tenantId: "tenant-1",
      source: "create",
    });
    expect(archiveLightspeedProduct).not.toHaveBeenCalled();
    expect(updateApplyStatus).toHaveBeenCalledWith("item-1", {
      applyStatus: "applied",
      failureReason: null,
    });
    expect(updateApplyStatus).toHaveBeenCalledWith("item-2", {
      applyStatus: "rejected",
      failureReason: null,
    });
    expect(completeRun).toHaveBeenCalledWith("run-1", {
      status: "applied",
      summary: {
        applied: 1,
        rejected: 1,
        failed: 0,
      },
    });
    expect(result.summary).toEqual({
      applied: 1,
      rejected: 1,
      failed: 0,
    });
    expect(sendFailureReport).not.toHaveBeenCalled();
  });

  it("reports failures for accepted items that cannot be applied", async () => {
    const getRun = jest.fn().mockResolvedValue({
      id: "run-2",
      tenant_id: "tenant-1",
      source_of_truth: "website_inventory",
    });
    const listItems = jest.fn().mockResolvedValue([
      {
        id: "item-3",
        tenant_id: "tenant-1",
        action: "resolve_duplicate_link",
        entity_key: "SKU-1",
        payload: { externalSku: "SKU-1" },
      },
    ]);
    const updateApproval = jest.fn();
    const updateApplyStatus = jest.fn();
    const completeRun = jest.fn();
    const sendFailureReport = jest.fn();

    const service = new LightspeedSyncApplyService(
      {
        getRun,
        listItems,
        updateApproval,
        updateApplyStatus,
        completeRun,
      } as never,
      {
        syncWebsiteProduct: jest.fn(),
      } as never,
      {
        archiveLightspeedProduct: jest.fn(),
      },
      {
        sendFailureReport,
      } as never,
    );

    const result = await service.applySync({
      tenantId: "tenant-1",
      syncRunId: "run-2",
      mode: "accept_all",
    });

    expect(updateApplyStatus).toHaveBeenCalledWith("item-3", {
      applyStatus: "failed",
      failureReason: expect.stringContaining("manual resolution"),
    });
    expect(sendFailureReport).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        syncRunId: "run-2",
        failures: [
          expect.objectContaining({
            itemId: "item-3",
          }),
        ],
      }),
    );
    expect(result.summary).toEqual({
      applied: 0,
      rejected: 0,
      failed: 1,
    });
  });
});
