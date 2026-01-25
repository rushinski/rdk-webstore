// app/api/admin/nexus/home-state/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";
import { TenantContextService } from "@/services/tenant-context-service";
import { StripeTaxService } from "@/services/stripe-tax-service";

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
        { status: 400 },
      );
    }

    const taxService = new StripeTaxService(supabase);
    await taxService.setHomeState({
      tenantId,
      stateCode: parsed.data.stateCode,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logError(error, { layer: "api", requestId, route: "/api/admin/nexus/home-state" });
    const message =
      error instanceof Error ? error.message : "Failed to update home state";
    return NextResponse.json({ error: message, requestId }, { status: 500 });
  }
}
