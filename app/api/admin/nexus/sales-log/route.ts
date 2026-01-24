// app/api/admin/nexus/sales-log/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { TenantContextService } from "@/services/tenant-context-service";
import { NexusRepository } from "@/repositories/nexus-repo";

const salesLogSchema = z.object({
  stateCode: z.string().length(2),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();

    const contextService = new TenantContextService(supabase);
    const tenantId = await contextService.getTenantId(session.user.id);

    const searchParams = request.nextUrl.searchParams;
    const parsed = salesLogSchema.safeParse({
      stateCode: searchParams.get("stateCode"),
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
      offset: searchParams.get("offset") ? Number(searchParams.get("offset")) : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", issues: parsed.error.format(), requestId },
        { status: 400 },
      );
    }

    const nexusRepo = new NexusRepository(supabase);
    const result = await nexusRepo.getStateSalesLog({
      tenantId,
      stateCode: parsed.data.stateCode,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    logError(error, { layer: "api", requestId, route: "/api/admin/nexus/sales-log" });
    const message = error instanceof Error ? error.message : "Failed to fetch sales log";
    return NextResponse.json({ error: message, requestId }, { status: 500 });
  }
}
