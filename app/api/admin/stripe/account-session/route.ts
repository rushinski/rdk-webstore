// app/api/admin/stripe/account-session/route.ts (FIXED)
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { canViewBank } from "@/config/constants/roles";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { TenantContextService } from "@/services/tenant-context-service";
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
    
    // ✅ Get tenant context
    const contextService = new TenantContextService(supabase);
    const context = await contextService.getAdminContext(session.user.id);

    const service = new StripeAdminService(supabase);

    // Use the tenant's Stripe Connect account
    const { accountId } = await service.ensureExpressAccount({ 
      userId: session.user.id,
      tenantId: context.tenantId,
    });
    const { clientSecret } = await service.createAccountSession({ accountId });

    return NextResponse.json(
      { client_secret: clientSecret, account_id: accountId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/stripe/account-session",
      message: "Failed to create account session",
    });

    return NextResponse.json(
      { error: "Failed to create account session.", requestId },
      { status: 500 },
    );
  }
}