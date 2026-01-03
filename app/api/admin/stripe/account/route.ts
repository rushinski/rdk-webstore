// app/api/admin/stripe/account/route.ts
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
      return NextResponse.json({ account: null, balance: null });
    }

    const stripeAccountId = profile.stripe_account_id;

    // Retrieve account details and balance in parallel
    const [account, balance] = await Promise.all([
      stripe.accounts.retrieve(stripeAccountId),
      stripe.balance.retrieve(
        {}, // params
        { stripeAccount: stripeAccountId } // request options
      ),
    ]);

    // Return a subset of account and balance information
    return NextResponse.json({
      account: {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        email: account.email,
      },
      balance: {
        available: balance.available,
        pending: balance.pending,
      },
    });

  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/stripe/account",
      message: "Failed to retrieve Stripe account details",
    });

    const errorMessage = error.raw?.message || "Failed to retrieve account details from Stripe.";

    return NextResponse.json(
      { error: errorMessage, requestId },
      { status: 500 }
    );
  }
}
