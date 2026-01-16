// app/api/admin/nexus/setup-home/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { StripeTaxService } from "@/services/stripe-tax-service";
import { NexusRepository } from "@/repositories/nexus-repo";
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
  oldHomeState: z.string().length(2).optional(),
  oldHomeAction: z.object({
    hasPhysicalNexus: z.boolean(),
    continueCollecting: z.boolean(),
  }).optional(),
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
    const nexusRepo = new NexusRepository(supabase);

    // Update head office address
    await taxService.setHeadOfficeAddress({
      tenantId: profile.tenant_id,
      stateCode: parsed.data.stateCode,
      businessName: parsed.data.businessName,
      address: parsed.data.address,
      skipAutoRegister: true,
    });

    // Handle old home state if provided
    if (parsed.data.oldHomeState && parsed.data.oldHomeAction) {
      const { oldHomeState, oldHomeAction } = parsed.data;

      const registrationType = oldHomeAction.hasPhysicalNexus ? "physical" : "economic";

      if (!oldHomeAction.continueCollecting) {
        // STOP collecting: must expire Stripe registration (and then clear DB)
        // Do NOT pre-clear DB here.
        await taxService.unregisterState({
          tenantId: profile.tenant_id,
          stateCode: oldHomeState,
          registrationType,
        });
      } else {
        // KEEP collecting: ensure Stripe registration is active.
        // registerState already writes the DB (isRegistered + stripeRegistrationId).
        await taxService.registerState({
          tenantId: profile.tenant_id,
          stateCode: oldHomeState,
          registrationType,
        });
      }
    }

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