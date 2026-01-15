// app/api/admin/nexus/setup-home/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { StripeTaxService } from "@/services/stripe-tax-service";
import { ProfileRepository } from "@/repositories/profile-repo";
import { z } from "zod";

const setupHomeSchema = z.object({
  stateCode: z.string().length(2),
  businessName: z.string().optional(),
  address: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().length(2),
    postalCode: z.string().min(5),
    country: z.string().length(2),
  }),
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
    const parsed = setupHomeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400 }
      );
    }

    const taxService = new StripeTaxService(supabase);
    await taxService.setHeadOfficeAddress({
      tenantId: profile.tenant_id,
      stateCode: parsed.data.stateCode,
      businessName: parsed.data.businessName,
      address: parsed.data.address,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/nexus/setup-home",
    });

    return NextResponse.json(
      { error: error.message || "Failed to setup home state", requestId },
      { status: 500 }
    );
  }
}