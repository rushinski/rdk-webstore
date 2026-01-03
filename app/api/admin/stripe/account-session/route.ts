// app/api/admin/stripe/account-session/route.ts
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

    const profile = await profileRepo.getByUserId(session.user.id);
    if (!profile) throw new Error("Admin profile not found.");

    let stripeAccountId = profile.stripe_account_id;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: profile.email ?? undefined,
        country: "US",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      stripeAccountId = account.id;
      await profileRepo.setStripeAccountId(session.user.id, stripeAccountId);
    }

    const accountSession = await stripe.accountSessions.create({
      account: stripeAccountId,
      components: {
        account_onboarding: {
          enabled: true,
          features: {
            // Allow bank collection during onboarding flow
            external_account_collection: true,
          },
        },
        account_management: {
          enabled: true,
          features: {
            // Enables add/switch payout bank account inside component
            external_account_collection: true,
          },
        },
        balances: {
          enabled: true,
          features: {
            external_account_collection: true,
            edit_payout_schedule: true,
            instant_payouts: true,
            standard_payouts: true,
          },
        },
        payouts: {
          enabled: true,
          features: {
            external_account_collection: true,
            edit_payout_schedule: true,
            instant_payouts: true,
            standard_payouts: true,
          },
        },
      },
    });

    return NextResponse.json({
      client_secret: accountSession.client_secret,
      account_id: stripeAccountId,
    });
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/stripe/account-session",
      message: "Failed to create account session",
    });

    return NextResponse.json(
      { error: "Failed to create account session.", requestId },
      { status: 500 }
    );
  }
}
