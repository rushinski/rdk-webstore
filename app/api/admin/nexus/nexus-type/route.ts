// app/api/admin/nexus/nexus-type/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { TenantContextService } from "@/services/tenant-context-service";
import { NexusRepository } from "@/repositories/nexus-repo";

const nexusTypeSchema = z.object({
  stateCode: z.string().length(2),
  nexusType: z.enum(["physical", "economic"]),
});

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();

    const contextService = new TenantContextService(supabase);
    const tenantId = await contextService.getTenantId(session.user.id);

    const body = await request.json().catch(() => null);
    const parsed = nexusTypeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400 },
      );
    }

    const nexusRepo = new NexusRepository(supabase);
    const existing = await nexusRepo.getRegistration(tenantId, parsed.data.stateCode);

    await nexusRepo.upsertRegistration({
      tenantId,
      stateCode: parsed.data.stateCode,
      registrationType: parsed.data.nexusType,
      isRegistered: existing?.is_registered ?? false,
      registeredAt: existing?.registered_at ?? null,
      stripeRegistrationId: existing?.stripe_registration_id ?? null,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logError(error, { layer: "api", requestId, route: "/api/admin/nexus/nexus-type" });
    const message =
      error instanceof Error ? error.message : "Failed to update nexus type";
    return NextResponse.json({ error: message, requestId }, { status: 500 });
  }
}
