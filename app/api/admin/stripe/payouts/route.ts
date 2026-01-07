// app/api/admin/stripe/payouts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { canViewBank } from "@/config/constants/roles";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { StripeAdminService } from "@/services/stripe-admin-service";

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();

    if (!canViewBank(session.role)) {
      return NextResponse.json(
        { error: "Forbidden", requestId },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }

    const supabase = await createSupabaseServerClient();
    const service = new StripeAdminService(supabase);
    const summary = await service.getStripeAccountSummary({ userId: session.user.id });

    if (!summary.account?.id) {
      return NextResponse.json(
        { payouts: [] },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    // Get limit from query params (default to 50)
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 100) : 50;

    const payouts = await service.listPayouts({
      accountId: summary.account.id,
      limit,
    });

    return NextResponse.json({ payouts }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/stripe/payouts",
      message: "Failed to retrieve payouts",
    });

    return NextResponse.json(
      { error: "Failed to retrieve payouts.", requestId },
      { status: 500 },
    );
  }
}
