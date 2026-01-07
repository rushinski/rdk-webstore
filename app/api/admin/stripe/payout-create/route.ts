// app/api/admin/stripe/payout-create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { canViewBank } from "@/config/constants/roles";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { StripeAdminService } from "@/services/stripe-admin-service";

export async function POST(request: NextRequest) {
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
    const body = await request.json().catch(() => null);

    const amount = Number(body?.amount);
    const currency = (body?.currency ?? "usd").toString().toLowerCase();
    const method = body?.method === "instant" ? "instant" : "standard";

    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount", requestId }, { status: 400 });
    }

    const summary = await service.getStripeAccountSummary({ userId: session.user.id });
    if (!summary.account?.id) {
      return NextResponse.json(
        { error: "Stripe account not found", requestId },
        { status: 404 },
      );
    }

    const payout = await service.createManualPayout({
      accountId: summary.account.id,
      amount,
      currency,
      method,
    });

    return NextResponse.json({ payout }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/stripe/payout-create",
      message: "Failed to create payout",
    });

    // If instant payout isn't eligible, Stripe will throw a message; frontend shows it.
    const message = error?.raw?.message || error?.message || "Failed to create payout.";
    return NextResponse.json({ error: message, requestId }, { status: 500 });
  }
}
