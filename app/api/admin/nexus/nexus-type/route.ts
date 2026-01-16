// app/api/admin/nexus/nexus-type/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { NexusRepository } from "@/repositories/nexus-repo";
import { ProfileRepository } from "@/repositories/profile-repo";
import { z } from "zod";

const nexusTypeSchema = z.object({
  stateCode: z.string().length(2),
  nexusType: z.enum(['physical', 'economic']),
});

export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => null);
    const parsed = nexusTypeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400 }
      );
    }

    const { stateCode, nexusType } = parsed.data;

    const nexusRepo = new NexusRepository(supabase);
    
    // Get existing registration or create new one
    const existing = await nexusRepo.getRegistration(profile.tenant_id, stateCode);
    
    // Update just the nexus type, don't change registration status
    await nexusRepo.upsertRegistration({
      tenantId: profile.tenant_id,
      stateCode,
      registrationType: nexusType,
      isRegistered: existing?.is_registered ?? false,
      registeredAt: existing?.registered_at ?? null,
      stripeRegistrationId: existing?.stripe_registration_id ?? null,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/nexus/nexus-type",
    });

    return NextResponse.json(
      { error: "Failed to update nexus type", requestId },
      { status: 500 }
    );
  }
}