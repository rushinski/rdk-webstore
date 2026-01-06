// app/api/admin/stripe/payouts/route.ts
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

    if (!summary.account?.id) {
      return NextResponse.json({ payouts: [] }, { headers: { "Cache-Control": "no-store" } });
    }

    const payouts = await service.listPayouts({ accountId: summary.account.id });
    return NextResponse.json({ payouts }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/stripe/payouts",
      message: "Failed to retrieve payouts",
    });

    return NextResponse.json({ error: "Failed to retrieve payouts.", requestId }, { status: 500 });
  }
}
