// app/api/admin/nexus/setup-home/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";
import { TenantContextService } from "@/services/tenant-context-service";
import { StripeTaxService } from "@/services/stripe-tax-service";

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
  oldHomeAction: z
    .object({
      hasPhysicalNexus: z.boolean(),
      continueCollecting: z.boolean(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();

    const contextService = new TenantContextService(supabase);
    const context = await contextService.getAdminContext(session.user.id);

    const body = await request.json().catch(() => null);
    const parsed = setupHomeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400 },
      );
    }

    const taxService = new StripeTaxService(supabase, context.stripeAccountId);

    // Set head office for tenant's Stripe Connect account
    await taxService.setHeadOfficeAddress({
      tenantId: context.tenantId,
      stateCode: parsed.data.stateCode,
      businessName: parsed.data.businessName,
      address: parsed.data.address,
      skipAutoRegister: true,
    });

    // Handle old home state if changing
    if (parsed.data.oldHomeState && parsed.data.oldHomeAction) {
      const { oldHomeState, oldHomeAction } = parsed.data;
      const registrationType = oldHomeAction.hasPhysicalNexus ? "physical" : "economic";

      if (!oldHomeAction.continueCollecting) {
        await taxService.unregisterState({
          tenantId: context.tenantId,
          stateCode: oldHomeState,
          registrationType,
        });
      } else {
        await taxService.registerState({
          tenantId: context.tenantId,
          stateCode: oldHomeState,
          registrationType,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logError(error, { layer: "api", requestId, route: "/api/admin/nexus/setup-home" });
    const message = error instanceof Error ? error.message : "Failed to setup home state";
    return NextResponse.json({ error: message, requestId }, { status: 500 });
  }
}
