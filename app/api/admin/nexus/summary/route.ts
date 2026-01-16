// app/api/admin/nexus/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { NexusRepository } from "@/repositories/nexus-repo";
import { TaxSettingsRepository } from "@/repositories/tax-settings-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { StripeTaxService } from "@/services/stripe-tax-service";
import { NexusSummaryService } from "@/services/nexus-service";

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();

    const profileRepo = new ProfileRepository(supabase);
    const profile = await profileRepo.getByUserId(session.user.id);

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: "Tenant not found", requestId }, { status: 404 });
    }

    const nexusRepo = new NexusRepository(supabase);
    const taxSettingsRepo = new TaxSettingsRepository(supabase);
    const stripeTax = new StripeTaxService(supabase);

    const svc = new NexusSummaryService(nexusRepo, taxSettingsRepo, stripeTax);
    const summary = await svc.buildSummary(profile.tenant_id);

    return NextResponse.json(summary);
  } catch (error: any) {
    logError(error, { layer: "api", requestId, route: "/api/admin/nexus/summary" });
    return NextResponse.json({ error: "Failed to fetch nexus summary", requestId }, { status: 500 });
  }
}
