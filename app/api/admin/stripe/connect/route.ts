// app/api/admin/stripe/connect/route.ts
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

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const profileRepo = new ProfileRepository(supabase);

    let profile = await profileRepo.getByUserId(session.user.id);

    if (!profile) {
      // This should ideally not happen for an authenticated admin
      throw new Error("Admin profile not found.");
    }

    let stripeAccountId = profile.stripe_account_id;

    // 1. Create a new Stripe Connect account if one doesn't exist
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: profile.email ?? undefined,
        business_type: "individual",
        country: "US", // Defaulting to US, adjust if needed
      });

      stripeAccountId = account.id;

      // 2. Save the new account ID to the user's profile
      await profileRepo.setStripeAccountId(session.user.id, stripeAccountId);
    }

    // 3. Create a Stripe Account Link
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${env.NEXT_PUBLIC_SITE_URL}/admin/bank`,
      return_url: `${env.NEXT_PUBLIC_SITE_URL}/admin/bank`,
      type: "account_onboarding",
    });

    // 4. Return the Account Link URL to the frontend
    return NextResponse.json({ url: accountLink.url });

  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/stripe/connect",
      message: "Failed to create Stripe Connect onboarding link",
      errorMessage: error.message, // Add specific error message
    });

    return NextResponse.json(
      { error: "Failed to create Stripe Connect onboarding link.", detailedError: error.message, requestId },
      { status: 500 }
    );
  }
}
