// app/api/admin/stripe/payouts/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { ProfileRepository } from "@/repositories/profile-repo";
import { env } from "@/config/env";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const profileRepo = new ProfileRepository(supabase);

    const profile = await profileRepo.getByUserId(session.user.id);

    if (!profile?.stripe_account_id) {
      return NextResponse.json({ payouts: [] });
    }

    const stripeAccountId = profile.stripe_account_id;

    // Fetch payouts for the connected account
    const payouts = await stripe.payouts.list(
      {
        limit: 50,
      },
      {
        stripeAccount: stripeAccountId,
      }
    );

    return NextResponse.json({
      payouts: payouts.data.map((payout) => ({
        id: payout.id,
        amount: payout.amount,
        currency: payout.currency,
        arrival_date: payout.arrival_date,
        status: payout.status,
        method: payout.method,
        type: payout.type,
        created: payout.created,
      })),
    });

  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/stripe/payouts",
      message: "Failed to retrieve payouts",
    });

    return NextResponse.json(
      { error: "Failed to retrieve payouts.", requestId },
      { status: 500 }
    );
  }
}