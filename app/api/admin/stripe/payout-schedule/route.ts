// app/api/admin/stripe/payout-schedule/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { canViewBank } from "@/config/constants/roles";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { StripeAdminService } from "@/services/stripe-admin-service";

const VALID_INTERVALS = ["manual", "daily", "weekly", "monthly"] as const;
const WEEKLY_ANCHORS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

type Interval = (typeof VALID_INTERVALS)[number];
type WeeklyAnchor = (typeof WEEKLY_ANCHORS)[number];

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

    const interval = body?.interval as Interval | undefined;
    if (!interval || !VALID_INTERVALS.includes(interval)) {
      return NextResponse.json(
        { error: "Invalid payout interval", requestId },
        { status: 400 },
      );
    }

    // Need the stripe account id (via summary lookup)
    const summary = await service.getStripeAccountSummary({ userId: session.user.id });
    if (!summary.account?.id) {
      return NextResponse.json(
        { error: "Stripe account not found", requestId },
        { status: 404 },
      );
    }

    const schedule: Stripe.AccountUpdateParams.Settings.Payouts.Schedule = { interval };

    if (interval === "weekly") {
      const weeklyAnchor = body?.weekly_anchor as WeeklyAnchor | undefined;
      if (!weeklyAnchor || !WEEKLY_ANCHORS.includes(weeklyAnchor)) {
        return NextResponse.json(
          { error: "Invalid weekly anchor", requestId },
          { status: 400 },
        );
      }
      schedule.weekly_anchor = weeklyAnchor;
    }

    if (interval === "monthly") {
      const monthlyAnchor = Number(body?.monthly_anchor);
      if (!Number.isInteger(monthlyAnchor) || monthlyAnchor < 1 || monthlyAnchor > 31) {
        return NextResponse.json(
          { error: "Invalid monthly anchor", requestId },
          { status: 400 },
        );
      }
      schedule.monthly_anchor = monthlyAnchor;
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
