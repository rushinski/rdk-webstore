// app/api/checkout/apple-pay-session/route.ts
//
// Proxies Apple Pay merchant validation to PayRilla.
//
// Apple Pay flow:
//   1. Browser fires ApplePaySession's `onvalidatemerchant` event
//   2. Frontend POSTs { validationURL } here
//   3. We forward to PayRilla's /apple-pay/session endpoint with our credentials
//   4. PayRilla returns a merchant session object — we pass it back to the browser
//   5. Frontend calls session.completeMerchantValidation(merchantSession)

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/service-role";
import { PayrillaChargeService } from "@/services/payrilla-charge-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";
import { env } from "@/config/env";

const schema = z.object({
  validationURL: z.string().url(),
});

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body ?? {});
    if (!parsed.success) {
      return json({ error: "Invalid payload", requestId }, 400);
    }

    const { validationURL } = parsed.data;

    // Only allow Apple's own validation domains
    const allowed = new URL(validationURL);
    if (!allowed.hostname.endsWith(".apple.com")) {
      return json({ error: "Invalid validation URL", requestId }, 400);
    }

    const adminSupabase = createSupabaseAdminClient();
    // Use a placeholder tenantId — credentials aren't tenant-scoped yet
    const tenantId = env.PAYRILLA_SOURCE_KEY ? "default" : "";
    const payrillaService = new PayrillaChargeService(adminSupabase, tenantId);

    const credentials = await payrillaService.getCredentials();
    if (!credentials) {
      return json({ error: "Payment credentials not configured", requestId }, 500);
    }

    const baseUrl = env.PAYRILLA_API_URL ?? "https://api.payrillagateway.com/api/v2";
    const apiKey = credentials.apiKey;
    const authHeader = `Basic ${Buffer.from(apiKey).toString("base64")}`;

    const sessionResponse = await fetch(`${baseUrl}/apple-pay/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        "User-Agent": "SneakerEco/1.0",
      },
      body: JSON.stringify({ validation_url: validationURL }),
    });

    if (!sessionResponse.ok) {
      const text = await sessionResponse.text().catch(() => "");
      logError(
        new Error(`PayRilla Apple Pay session error ${sessionResponse.status}: ${text}`),
        {
          layer: "api",
          requestId,
          route: "/api/checkout/apple-pay-session",
        },
      );
      return json({ error: "Merchant validation failed", requestId }, 502);
    }

    const merchantSession = await sessionResponse.json();
    return NextResponse.json(merchantSession, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/checkout/apple-pay-session",
    });
    return json({ error: "Internal server error", requestId }, 500);
  }
}

function json(data: Record<string, unknown>, status: number) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
