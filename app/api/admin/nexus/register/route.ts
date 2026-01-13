// app/api/admin/nexus/register/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { StripeTaxService } from "@/services/stripe-tax-service";
import { ProfileRepository } from "@/repositories/profile-repo";
import { z } from "zod";

const registerSchema = z.object({
  stateCode: z.string().length(2),
  registrationType: z.enum(['physical', 'economic']),
  isRegistered: z.boolean(),
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
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400 }
      );
    }

    const { stateCode, registrationType, isRegistered } = parsed.data;

    const taxService = new StripeTaxService(supabase);

    if (isRegistered) {
      await taxService.registerState({
        tenantId: profile.tenant_id,
        stateCode,
        registrationType,
      });
    } else {
      await taxService.unregisterState({
        tenantId: profile.tenant_id,
        stateCode,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/nexus/register",
    });

    return NextResponse.json(
      { error: "Failed to update registration", requestId },
      { status: 500 }
    );
  }
}