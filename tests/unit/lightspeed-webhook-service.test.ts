import { createHmac } from "crypto";

import { LightspeedWebhookService } from "@/services/lightspeed-webhook-service";

describe("LightspeedWebhookService", () => {
  it("parses form-encoded webhook payloads and verifies the HMAC signature", async () => {
    const rawBody =
      "type=product.update&domain_prefix=demo-store&retailer_id=retailer-1&payload=%7B%22id%22%3A%22product-1%22%2C%22deleted_at%22%3Anull%7D";
    const signature = createHmac("sha256", "shared-secret")
      .update(rawBody, "utf8")
      .digest("hex");

    const service = new LightspeedWebhookService(
      {
        findTenantIdByRetailerOrDomainPrefix: jest.fn().mockResolvedValue("tenant-1"),
        saveRetailerIdForTenant: jest.fn().mockResolvedValue(undefined),
      } as never,
      {
        insertIfAbsent: jest.fn().mockResolvedValue({
          inserted: true,
          event: {
            id: "event-1",
            tenant_id: "tenant-1",
            event_id: "event-key-1",
            topic: "product.update",
            payload: { id: "product-1", deleted_at: null },
            processed_at: null,
          },
        }),
        markProcessed: jest.fn(),
      } as never,
      {
        handleProductUpdate: jest.fn(),
        handleInventoryUpdate: jest.fn(),
        handleSaleUpdate: jest.fn(),
      } as never,
      "shared-secret",
    );

    const result = await service.processIncomingWebhook({
      rawBody,
      signatureHeader: `signature=${signature},algorithm=HMAC-SHA256`,
      contentType: "application/x-www-form-urlencoded",
    });

    expect(result.status).toBe("processed");
    expect(result.topic).toBe("product.update");
    expect(result.tenantId).toBe("tenant-1");
  });

  it("matches tenants by retailer_id when domain_prefix is missing", async () => {
    const findTenantIdByRetailerOrDomainPrefix = jest.fn().mockResolvedValue("tenant-1");

    const service = new LightspeedWebhookService(
      {
        findTenantIdByRetailerOrDomainPrefix,
        saveRetailerIdForTenant: jest.fn(),
      } as never,
      {
        insertIfAbsent: jest.fn().mockResolvedValue({
          inserted: true,
          event: {
            id: "event-1",
            tenant_id: "tenant-1",
            event_id: "event-key-1",
            topic: "inventory.update",
            payload: { product_id: "product-1", count: 1 },
            processed_at: null,
          },
        }),
        markProcessed: jest.fn(),
      } as never,
      {
        handleProductUpdate: jest.fn(),
        handleInventoryUpdate: jest.fn(),
        handleSaleUpdate: jest.fn(),
      } as never,
      null,
    );

    const result = await service.processIncomingWebhook({
      rawBody:
        "type=inventory.update&retailer_id=retailer-1&payload=%7B%22product_id%22%3A%22product-1%22%2C%22count%22%3A1%7D",
      signatureHeader: null,
      contentType: "application/x-www-form-urlencoded",
    });

    expect(findTenantIdByRetailerOrDomainPrefix).toHaveBeenCalledWith({
      retailerId: "retailer-1",
      domainPrefix: null,
    });
    expect(result).toEqual({
      status: "processed",
      topic: "inventory.update",
      tenantId: "tenant-1",
    });
  });

  it("persists retailer_id when a webhook matches by domain_prefix", async () => {
    const saveRetailerIdForTenant = jest.fn().mockResolvedValue(undefined);

    const service = new LightspeedWebhookService(
      {
        findTenantIdByRetailerOrDomainPrefix: jest.fn().mockResolvedValue("tenant-1"),
        saveRetailerIdForTenant,
      } as never,
      {
        insertIfAbsent: jest.fn().mockResolvedValue({
          inserted: true,
          event: {
            id: "event-1",
            tenant_id: "tenant-1",
            event_id: "event-key-1",
            topic: "product.update",
            payload: { id: "product-1" },
            processed_at: null,
          },
        }),
        markProcessed: jest.fn(),
      } as never,
      {
        handleProductUpdate: jest.fn(),
        handleInventoryUpdate: jest.fn(),
        handleSaleUpdate: jest.fn(),
      } as never,
      null,
    );

    await service.processIncomingWebhook({
      rawBody:
        "type=product.update&domain_prefix=demo-store&retailer_id=retailer-1&payload=%7B%22id%22%3A%22product-1%22%7D",
      signatureHeader: null,
      contentType: "application/x-www-form-urlencoded",
    });

    expect(saveRetailerIdForTenant).toHaveBeenCalledWith("tenant-1", "retailer-1");
  });

  it("rejects webhooks with an invalid signature", async () => {
    const service = new LightspeedWebhookService(
      {
        findTenantIdByRetailerOrDomainPrefix: jest.fn(),
        saveRetailerIdForTenant: jest.fn(),
      } as never,
      {
        insertIfAbsent: jest.fn(),
        markProcessed: jest.fn(),
      } as never,
      {
        handleProductUpdate: jest.fn(),
        handleInventoryUpdate: jest.fn(),
        handleSaleUpdate: jest.fn(),
      } as never,
      "shared-secret",
    );

    await expect(
      service.processIncomingWebhook({
        rawBody: "type=product.update&payload=%7B%7D",
        signatureHeader: "signature=bad,algorithm=HMAC-SHA256",
        contentType: "application/x-www-form-urlencoded",
      }),
    ).rejects.toThrow("Invalid Lightspeed webhook signature.");
  });
});
