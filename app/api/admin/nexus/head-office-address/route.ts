// app/api/admin/nexus/head-office-address/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { TenantContextService } from "@/services/tenant-context-service";
import { StripeTaxService } from "@/services/stripe-tax-service";

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    
    const contextService = new TenantContextService(supabase);
    const context = await contextService.getAdminContext(session.user.id);

    const taxService = new StripeTaxService(supabase, context.stripeAccountId);
    const address = await taxService.getHeadOfficeAddress();

    return NextResponse.json({ address });
  } catch (error: any) {
    logError(error, { layer: "api", requestId, route: "/api/admin/nexus/head-office-address" });
    return NextResponse.json(
      { error: error.message || "Failed to fetch head office address", requestId },
      { status: error.message?.includes("not configured") ? 400 : 500 }
    );
  }
}