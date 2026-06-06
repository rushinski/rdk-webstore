import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "@/config/env";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { logError } from "@/lib/utils/log";
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

    await service.processIncomingWebhook({
      rawBody,
      signatureHeader: request.headers.get("x-signature"),
      contentType: request.headers.get("content-type"),
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
