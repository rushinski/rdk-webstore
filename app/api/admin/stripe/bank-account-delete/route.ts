// app/api/admin/stripe/bank-account-delete/route.ts (FIXED)
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { canViewBank } from "@/config/constants/roles";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { TenantContextService } from "@/services/tenant-context-service";
import { StripeAdminService } from "@/services/stripe-admin-service";
import { stripeBankAccountSchema } from "@/lib/validation/stripe";

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
    const parsed = stripeBankAccountSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const bankAccountId = parsed.data.bank_account_id;

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

    await service.deleteBankAccount({ accountId: summary.account.id, bankAccountId });

    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/stripe/bank-account-delete",
      message: "Failed to delete bank account",
    });

    return NextResponse.json(
      { error: "Failed to delete bank account.", requestId },
      { status: 500 },
    );
  }
}
