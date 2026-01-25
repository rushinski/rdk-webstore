// app/api/admin/stripe/payout-create/route.ts (FIXED)
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { canViewBank } from "@/config/constants/roles";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";
import { TenantContextService } from "@/services/tenant-context-service";
import { StripeAdminService } from "@/services/stripe-admin-service";
import { stripePayoutCreateSchema } from "@/lib/validation/stripe";

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

    // ✅ Get tenant context
    const contextService = new TenantContextService(supabase);
    const context = await contextService.getAdminContext(session.user.id);

    const service = new StripeAdminService(supabase);
    const body = await request.json().catch(() => null);
    const parsed = stripePayoutCreateSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { amount, currency, method } = parsed.data;

    const summary = await service.getStripeAccountSummary({
      userId: session.user.id,
      tenantId: context.tenantId,
    });

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
  } catch (error: unknown) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/stripe/payout-create",
      message: "Failed to create payout",
    });

    const message =
      typeof error === "object" &&
      error !== null &&
      "raw" in error &&
      typeof (error as { raw?: { message?: string } }).raw?.message === "string"
        ? ((error as { raw?: { message?: string } }).raw?.message ??
          "Failed to create payout.")
        : error instanceof Error
          ? error.message
          : "Failed to create payout.";
    return NextResponse.json({ error: message, requestId }, { status: 500 });
  }
}
