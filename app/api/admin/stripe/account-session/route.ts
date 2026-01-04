// app/api/admin/stripe/account-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { ProfileRepository } from "@/repositories/profile-repo";
import { env } from "@/config/env";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError, log } from "@/lib/log";

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

    // Create account if doesn't exist
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: profile.email ?? undefined,
        country: "US",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        // Set automatic payouts by default
        settings: {
          payouts: {
            schedule: {
              interval: 'daily', // Auto payout daily (free)
              // delay_days: 2 is default for standard payouts (no fees)
            },
          },
        },
      });

      stripeAccountId = account.id;
      await profileRepo.setStripeAccountId(session.user.id, stripeAccountId);

      log({
        level: "info",
        layer: "api",
        message: "stripe_account_created",
        requestId,
        accountId: stripeAccountId,
      });
    } else {
      // Ensure existing account has automatic payouts configured
      try {
        await stripe.accounts.update(stripeAccountId, {
          settings: {
            payouts: {
              schedule: {
                interval: 'daily', // Auto payout daily
              },
            },
          },
        });
      } catch (updateError: any) {
        // Log but don't fail - account might already be configured
        log({
          level: "warn",
          layer: "api",
          message: "stripe_account_update_settings_skipped",
          requestId,
          accountId: stripeAccountId,
          reason: updateError.message,
        });
      }
    }

    // Create Account Session with limited payout features
    const accountSession = await stripe.accountSessions.create({
      account: stripeAccountId,
      components: {
        account_onboarding: {
          enabled: true,
          features: {
            external_account_collection: true,
          },
        },
        account_management: {
          enabled: true,
          features: {
            external_account_collection: true,
          },
        },
        balances: {
          enabled: true,
          features: {
            // Allow bank account management
            external_account_collection: true,
            // Allow viewing payout schedule (but not instant payouts to avoid fees)
            edit_payout_schedule: true,
            instant_payouts: false, // Disable instant payouts (they have fees)
            standard_payouts: true, // Enable standard payouts (free)
          },
        },
        payouts: {
          enabled: true,
          features: {
            external_account_collection: true,
            edit_payout_schedule: true, // Can adjust daily/weekly/monthly
            instant_payouts: false,     // Disable instant payouts (1.5% fee)
            standard_payouts: true,     // Standard payouts only (free)
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
