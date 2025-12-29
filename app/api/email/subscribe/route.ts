// app/api/email/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmailSubscriptionService } from "@/services/email-subscription-service";
import { emailSubscribeSchema } from "@/lib/validation/email";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromHeaders(req.headers);

  try {
    const body = await req.json().catch(() => null);
    const parsed = emailSubscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const supabase = await createSupabaseServerClient();
    const service = new EmailSubscriptionService(supabase);

    await service.subscribe(parsed.data.email, parsed.data.source ?? "website");

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/email/subscribe",
    });
    return NextResponse.json(
      { ok: false, error: "Subscription failed", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
