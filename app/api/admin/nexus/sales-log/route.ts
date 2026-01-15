// app/api/admin/nexus/sales-log/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { NexusRepository } from "@/repositories/nexus-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { z } from "zod";

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

    const profileRepo = new ProfileRepository(supabase);
    const profile = await profileRepo.getByUserId(session.user.id);

    if (!profile?.tenant_id) {
      return NextResponse.json(
        { error: "Tenant not found", requestId },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const parsed = salesLogSchema.safeParse({
      stateCode: searchParams.get('stateCode'),
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
      offset: searchParams.get('offset') ? Number(searchParams.get('offset')) : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", issues: parsed.error.format(), requestId },
        { status: 400 }
      );
    }

    const nexusRepo = new NexusRepository(supabase);
    const result = await nexusRepo.getStateSalesLog({
      tenantId: profile.tenant_id,
      stateCode: parsed.data.stateCode,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/nexus/sales-log",
    });

    return NextResponse.json(
      { error: "Failed to fetch sales log", requestId },
      { status: 500 }
    );
  }
}