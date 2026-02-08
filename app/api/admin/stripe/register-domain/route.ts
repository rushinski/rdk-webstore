// app/api/admin/stripe/register-domain/route.ts
//
// Registers the platform domain as a payment method domain on the Connect
// account. Required for Apple Pay / Google Pay to appear via
// ExpressCheckoutElement when using direct charges.
//
// Idempotent — safe to call repeatedly (Stripe returns the existing domain).

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TenantContextService } from "@/services/tenant-context-service";
import { StripeDirectChargeService } from "@/services/stripe-direct-charge-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";
import { env } from "@/config/env";

const directCharge = new StripeDirectChargeService();

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();

    const supabase = await createSupabaseServerClient();
    const contextService = new TenantContextService(supabase);
    const context = await contextService.getAdminContext(session.user.id);

    const domain = new URL(env.NEXT_PUBLIC_SITE_URL).hostname;

    await directCharge.registerPaymentMethodDomain(context.stripeAccountId, domain);

    return NextResponse.json(
      { success: true, domain, requestId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/stripe/register-domain",
      message: "Failed to register payment method domain",
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to register domain.",
        requestId,
      },
      { status: 500 },
    );
  }
}
