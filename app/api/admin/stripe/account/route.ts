// app/api/admin/stripe/account/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { StripeAdminService } from "@/services/stripe-admin-service";

const service = new StripeAdminService();

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const summary = await service.getStripeAccountSummary({ userId: session.user.id });

    return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/stripe/account",
      message: "Failed to retrieve Stripe account details",
    });

    const errorMessage = error.raw?.message || "Failed to retrieve account details from Stripe.";

    return NextResponse.json({ error: errorMessage, requestId }, { status: 500 });
  }
}
