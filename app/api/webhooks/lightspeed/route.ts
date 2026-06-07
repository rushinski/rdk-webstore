import type { NextRequest } from "next/server";
import { after, NextResponse } from "next/server";

import { env } from "@/config/env";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { log, logError } from "@/lib/utils/log";
import { LightspeedSettingsRepository } from "@/repositories/lightspeed-settings-repo";
import { LightspeedWebhookEventsRepository } from "@/repositories/lightspeed-webhook-events-repo";
import { LightspeedSaleSyncService } from "@/services/lightspeed-sale-sync-service";
import { LightspeedWebhookService } from "@/services/lightspeed-webhook-service";

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const rawBody = await request.text();
    const supabase = createSupabaseAdminClient();
    const service = new LightspeedWebhookService(
      new LightspeedSettingsRepository(supabase),
      new LightspeedWebhookEventsRepository(supabase),
      new LightspeedSaleSyncService(supabase),
      env.LIGHTSPEED_WEBHOOK_SIGNING_SECRET || null,
    );

    const accepted = await service.ingestIncomingWebhook({
      rawBody,
      signatureHeader: request.headers.get("x-signature"),
      contentType: request.headers.get("content-type"),
    });

    after(async () => {
      if (accepted.status !== "accepted") {
        return;
      }

      try {
        await service.processPersistedEvent(accepted.event);
      } catch (error) {
        logError(error, {
          layer: "job",
          requestId,
          route: "/api/webhooks/lightspeed",
          message: "lightspeed_webhook_background_processing_failed",
          topic: accepted.topic,
          tenantId: accepted.tenantId,
          eventId: accepted.event.id,
        });
      }
    });

    log({
      level: "info",
      layer: "api",
      message: "lightspeed_webhook_accepted",
      requestId,
      route: "/api/webhooks/lightspeed",
      method: "POST",
      topic: accepted.topic,
      tenantId: accepted.tenantId,
      ingestStatus: accepted.status,
      eventId: accepted.event?.id ?? null,
    });

    return NextResponse.json({ ok: true, requestId }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    const status = message === "Invalid Lightspeed webhook signature." ? 401 : 500;

    logError(error, {
      layer: "api",
      requestId,
      route: "/api/webhooks/lightspeed",
    });

    return NextResponse.json({ error: message, requestId }, { status });
  }
}
