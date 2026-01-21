// app/api/admin/nexus/home-state/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { TenantContextService } from "@/services/tenant-context-service";
import { StripeTaxService } from "@/services/stripe-tax-service";
import { z } from "zod";

const homeStateSchema = z.object({
  stateCode: z.string().length(2),
});

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    
    const contextService = new TenantContextService(supabase);
    const tenantId = await contextService.getTenantId(session.user.id);

    const body = await request.json().catch(() => null);
    const parsed = homeStateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400 }
      );
    }

    const taxService = new StripeTaxService(supabase);
    await taxService.setHomeState({
      tenantId,
      stateCode: parsed.data.stateCode,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logError(error, { layer: "api", requestId, route: "/api/admin/nexus/home-state" });
    return NextResponse.json(
      { error: error.message || "Failed to update home state", requestId },
      { status: 500 }
    );
  }
}