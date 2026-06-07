import { createHash, createHmac, timingSafeEqual } from "crypto";

import type { LightspeedWebhookEvent } from "@/repositories/lightspeed-webhook-events-repo";
import type { LightspeedWebhookEventsRepository } from "@/repositories/lightspeed-webhook-events-repo";
import type { LightspeedSettingsRepository } from "@/repositories/lightspeed-settings-repo";

type WebhookHandler = {
  handleProductUpdate: (
    tenantId: string,
    payload: Record<string, unknown>,
  ) => Promise<void>;
  handleInventoryUpdate: (
    tenantId: string,
    payload: Record<string, unknown>,
  ) => Promise<void>;
  handleSaleUpdate: (tenantId: string, payload: Record<string, unknown>) => Promise<void>;
};

type ProcessIncomingWebhookInput = {
  rawBody: string;
  signatureHeader: string | null;
  contentType: string | null;
};

type ParsedWebhook = {
  retailerId: string | null;
  domainPrefix: string | null;
  topic: string;
  payload: Record<string, unknown>;
};

export class LightspeedWebhookService {
  constructor(
    private readonly settingsRepo: Pick<
      LightspeedSettingsRepository,
      "findTenantIdByRetailerOrDomainPrefix" | "saveRetailerIdForTenant"
    >,
    private readonly eventsRepo: Pick<
      LightspeedWebhookEventsRepository,
      "insertIfAbsent" | "markProcessed"
    >,
    private readonly handler: WebhookHandler,
    private readonly sharedSecret: string | null,
  ) {}

  async ingestIncomingWebhook(input: ProcessIncomingWebhookInput) {
    this.assertValidSignature(input.rawBody, input.signatureHeader);

    const parsed = this.parseBody(input.rawBody, input.contentType);
    const tenantId = await this.settingsRepo.findTenantIdByRetailerOrDomainPrefix({
      retailerId: parsed.retailerId,
      domainPrefix: parsed.domainPrefix,
    });
    if (tenantId && parsed.retailerId?.trim()) {
      await this.settingsRepo.saveRetailerIdForTenant(tenantId, parsed.retailerId);
    }
    const eventId = this.buildEventId(parsed.topic, input.rawBody);
    const persisted = await this.eventsRepo.insertIfAbsent({
      tenantId,
      eventId,
      topic: parsed.topic,
      payload: parsed.payload,
    });

    if (!persisted.inserted) {
      return {
        status: "duplicate" as const,
        topic: parsed.topic,
        tenantId,
        event: persisted.event,
      };
    }

    return {
      status: "accepted" as const,
      topic: parsed.topic,
      tenantId,
      event: persisted.event,
    };
  }

  async processPersistedEvent(
    event: Pick<LightspeedWebhookEvent, "id" | "tenant_id" | "topic" | "payload">,
  ) {
    if (!event.tenant_id) {
      return {
        status: "ignored" as const,
        topic: event.topic,
        tenantId: null,
      };
    }

    const payload =
      event.payload && typeof event.payload === "object" && !Array.isArray(event.payload)
        ? (event.payload as Record<string, unknown>)
        : {};

    await this.dispatch(event.tenant_id, event.topic, payload);
    await this.eventsRepo.markProcessed(event.id);

    return {
      status: "processed" as const,
      topic: event.topic,
      tenantId: event.tenant_id,
    };
  }

  async processIncomingWebhook(input: ProcessIncomingWebhookInput) {
    const ingested = await this.ingestIncomingWebhook(input);

    if (ingested.status !== "accepted") {
      return {
        status: ingested.status,
        topic: ingested.topic,
        tenantId: ingested.tenantId,
      };
    }

    return this.processPersistedEvent(ingested.event);
  }

  private async dispatch(
    tenantId: string,
    topic: string,
    payload: Record<string, unknown>,
  ) {
    if (topic === "product.update") {
      await this.handler.handleProductUpdate(tenantId, payload);
      return;
    }

    if (topic === "inventory.update") {
      await this.handler.handleInventoryUpdate(tenantId, payload);
      return;
    }

    if (topic === "sale.update") {
      await this.handler.handleSaleUpdate(tenantId, payload);
    }
  }

  private parseBody(rawBody: string, contentType: string | null): ParsedWebhook {
    const normalizedContentType = contentType?.toLowerCase() ?? "";
    if (normalizedContentType.includes("application/json")) {
      const parsed = JSON.parse(rawBody) as Record<string, unknown>;
      return this.normalizeParsedWebhook(parsed);
    }

    const params = new URLSearchParams(rawBody);
    const payloadRaw = params.get("payload");
    const payload = payloadRaw ? (JSON.parse(payloadRaw) as Record<string, unknown>) : {};

    return {
      retailerId: params.get("retailer_id"),
      domainPrefix: params.get("domain_prefix"),
      topic: params.get("type") ?? "unknown",
      payload,
    };
  }

  private normalizeParsedWebhook(parsed: Record<string, unknown>): ParsedWebhook {
    const payloadValue = parsed.payload;
    const payload =
      payloadValue && typeof payloadValue === "object" && !Array.isArray(payloadValue)
        ? (payloadValue as Record<string, unknown>)
        : {};

    return {
      retailerId: typeof parsed.retailer_id === "string" ? parsed.retailer_id : null,
      domainPrefix:
        typeof parsed.domain_prefix === "string" ? parsed.domain_prefix : null,
      topic: typeof parsed.type === "string" ? parsed.type : "unknown",
      payload,
    };
  }

  private assertValidSignature(rawBody: string, signatureHeader: string | null) {
    if (!this.sharedSecret) {
      return;
    }

    if (!signatureHeader) {
      throw new Error("Invalid Lightspeed webhook signature.");
    }

    const signatureMatch = signatureHeader.match(/signature=([^,]+)/i);
    if (!signatureMatch) {
      throw new Error("Invalid Lightspeed webhook signature.");
    }

    const expected = createHmac("sha256", this.sharedSecret)
      .update(rawBody, "utf8")
      .digest("hex");
    const actual = signatureMatch[1].trim();

    const expectedBuffer = Buffer.from(expected, "utf8");
    const actualBuffer = Buffer.from(actual, "utf8");
    if (
      expectedBuffer.length !== actualBuffer.length ||
      !timingSafeEqual(expectedBuffer, actualBuffer)
    ) {
      throw new Error("Invalid Lightspeed webhook signature.");
    }
  }

  private buildEventId(topic: string, rawBody: string) {
    return createHash("sha256").update(`${topic}:${rawBody}`, "utf8").digest("hex");
  }
}
