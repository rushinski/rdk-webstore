// app/api/admin/stripe/bank-account-delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { canViewBank } from "@/config/constants/roles";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
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
    const service = new StripeAdminService(supabase);
    const body = await request.json().catch(() => null);
    const bankAccountId = body?.bank_account_id;

    if (!bankAccountId || typeof bankAccountId !== "string") {
      return NextResponse.json(
        { error: "Invalid bank account id", requestId },
        { status: 400 },
      );
    }

    const summary = await service.getStripeAccountSummary({ userId: session.user.id });
    if (!summary.account?.id) {
      return NextResponse.json(
        { error: "Stripe account not found", requestId },
        { status: 404 },
      );
    }

    // Client should prevent deleting the default unless another exists.
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
