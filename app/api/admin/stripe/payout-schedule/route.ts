// app/api/admin/stripe/payout-schedule/route.ts (FIXED)
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { canViewBank } from "@/config/constants/roles";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { TenantContextService } from "@/services/tenant-context-service";
import { StripeAdminService } from "@/services/stripe-admin-service";
import type {
  STRIPE_PAYOUT_INTERVALS,
  STRIPE_PAYOUT_WEEKLY_ANCHORS,
} from "@/config/constants/stripe";
import { stripePayoutScheduleSchema } from "@/lib/validation/stripe";

type Interval = (typeof STRIPE_PAYOUT_INTERVALS)[number];
type WeeklyAnchor = (typeof STRIPE_PAYOUT_WEEKLY_ANCHORS)[number];

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
    const parsed = stripePayoutScheduleSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const interval = parsed.data.interval as Interval;

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

    const schedule: Stripe.AccountUpdateParams.Settings.Payouts.Schedule = { interval };

    if (interval === "weekly") {
      schedule.weekly_anchor = parsed.data.weekly_anchor as WeeklyAnchor;
    }

    if (interval === "monthly") {
      schedule.monthly_anchor = parsed.data.monthly_anchor!;
    }

    await service.updatePayoutSchedule({ accountId: summary.account.id, schedule });

    return NextResponse.json({ schedule }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/stripe/payout-schedule",
      message: "Failed to update payout schedule",
    });

    return NextResponse.json(
      { error: "Failed to update payout schedule.", requestId },
      { status: 500 },
    );
  }
}
