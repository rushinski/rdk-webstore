// app/api/admin/stripe/account-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { StripeAdminService } from "@/services/stripe-admin-service";

const service = new StripeAdminService();

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();

    const { accountId } = await service.ensureExpressAccount({ userId: session.user.id });
    const { clientSecret } = await service.createAccountSession({ accountId });

    return NextResponse.json(
      { client_secret: clientSecret, account_id: accountId },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/stripe/account-session",
      message: "Failed to create account session",
    });

    return NextResponse.json({ error: "Failed to create account session.", requestId }, { status: 500 });
  }
}
