// app/api/admin/nexus/summary/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { TenantContextService } from "@/services/tenant-context-service";
import { NexusRepository } from "@/repositories/nexus-repo";
import { TaxSettingsRepository } from "@/repositories/tax-settings-repo";
import { StripeTaxService } from "@/services/stripe-tax-service";
import { NexusSummaryService } from "@/services/nexus-service";

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();

    const contextService = new TenantContextService(supabase);
    const context = await contextService.getAdminContext(session.user.id);

    const nexusRepo = new NexusRepository(supabase);
    const taxSettingsRepo = new TaxSettingsRepository(supabase);
    const stripeTax = new StripeTaxService(supabase, context.stripeAccountId);

    const summaryService = new NexusSummaryService(nexusRepo, taxSettingsRepo, stripeTax);
    const summary = await summaryService.buildSummary(context.tenantId);

    return NextResponse.json(summary);
  } catch (error: unknown) {
    logError(error, { layer: "api", requestId, route: "/api/admin/nexus/summary" });
    const message =
      error instanceof Error ? error.message : "Failed to fetch nexus summary";
    return NextResponse.json(
      { error: message, requestId },
      { status: message.includes("not found") ? 404 : 500 },
    );
  }
}
