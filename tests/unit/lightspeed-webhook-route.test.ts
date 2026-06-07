jest.mock("next/server", () => {
  const actual = jest.requireActual("next/server");
  return {
    ...actual,
    after: jest.fn((callback: () => Promise<void> | void) => callback()),
  };
});

jest.mock("@/config/env", () => ({
  env: {
    LIGHTSPEED_WEBHOOK_SIGNING_SECRET: "webhook-signing-secret",
  },
}));

jest.mock("@/lib/supabase/service-role", () => ({
  createSupabaseAdminClient: jest.fn(),
}));

jest.mock("@/repositories/lightspeed-settings-repo", () => ({
  LightspeedSettingsRepository: jest.fn(),
}));

jest.mock("@/repositories/lightspeed-webhook-events-repo", () => ({
  LightspeedWebhookEventsRepository: jest.fn(),
}));

jest.mock("@/services/lightspeed-sale-sync-service", () => ({
  LightspeedSaleSyncService: jest.fn(),
}));

jest.mock("@/services/lightspeed-webhook-service", () => ({
  LightspeedWebhookService: jest.fn(),
}));

import type { NextRequest } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { LightspeedSettingsRepository } from "@/repositories/lightspeed-settings-repo";
import { LightspeedWebhookEventsRepository } from "@/repositories/lightspeed-webhook-events-repo";
import { LightspeedSaleSyncService } from "@/services/lightspeed-sale-sync-service";
import { LightspeedWebhookService } from "@/services/lightspeed-webhook-service";

import { POST } from "../../app/api/webhooks/lightspeed/route";

const mockCreateSupabaseAdminClient = jest.mocked(createSupabaseAdminClient);
const mockLightspeedSettingsRepository = jest.mocked(LightspeedSettingsRepository);
const mockLightspeedWebhookEventsRepository = jest.mocked(
  LightspeedWebhookEventsRepository,
);
const mockLightspeedSaleSyncService = jest.mocked(LightspeedSaleSyncService);
const mockLightspeedWebhookService = jest.mocked(LightspeedWebhookService);

describe("/api/webhooks/lightspeed", () => {
  const mockIngestIncomingWebhook = jest.fn();
  const mockProcessPersistedEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateSupabaseAdminClient.mockReturnValue({ from: jest.fn() } as never);
    mockLightspeedSettingsRepository.mockImplementation(() => ({}) as never);
    mockLightspeedWebhookEventsRepository.mockImplementation(() => ({}) as never);
    mockLightspeedSaleSyncService.mockImplementation(() => ({}) as never);
    mockLightspeedWebhookService.mockImplementation(
      () =>
        ({
          ingestIncomingWebhook: mockIngestIncomingWebhook,
          processPersistedEvent: mockProcessPersistedEvent,
        }) as never,
    );
  });

  it("constructs the webhook service with the configured signing secret and acknowledges before background processing", async () => {
    mockIngestIncomingWebhook.mockResolvedValue({
      status: "accepted",
      topic: "product.update",
      tenantId: "tenant-1",
      event: {
        id: "event-1",
        tenant_id: "tenant-1",
        topic: "product.update",
        payload: {},
      },
    });
    mockProcessPersistedEvent.mockResolvedValue({
      status: "processed",
      topic: "product.update",
      tenantId: "tenant-1",
    });

    const response = await POST(
      new Request("http://localhost/api/webhooks/lightspeed", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "x-signature": "signature=test,algorithm=HMAC-SHA256",
          "x-request-id": "req-1",
        },
        body: "type=product.update&payload=%7B%7D",
      }) as NextRequest,
    );

    expect(mockLightspeedWebhookService).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "webhook-signing-secret",
    );
    expect(mockIngestIncomingWebhook).toHaveBeenCalledWith({
      rawBody: "type=product.update&payload=%7B%7D",
      signatureHeader: "signature=test,algorithm=HMAC-SHA256",
      contentType: "application/x-www-form-urlencoded",
    });
    expect(mockProcessPersistedEvent).toHaveBeenCalledWith({
      id: "event-1",
      tenant_id: "tenant-1",
      topic: "product.update",
      payload: {},
    });
    expect(response.status).toBe(200);
  });
});
