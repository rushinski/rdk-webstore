// app/api/admin/nexus/register/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { TenantContextService } from "@/services/tenant-context-service";
import { StripeTaxService } from "@/services/stripe-tax-service";

const registerSchema = z.object({
  stateCode: z.string().length(2),
  registrationType: z.enum(["physical", "economic"]),
  isRegistered: z.boolean(),
});

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();

    const contextService = new TenantContextService(supabase);
    const context = await contextService.getAdminContext(session.user.id);

    const body = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400 },
      );
    }

    const taxService = new StripeTaxService(supabase, context.stripeAccountId);

    if (parsed.data.isRegistered) {
      await taxService.registerState({
        tenantId: context.tenantId,
        stateCode: parsed.data.stateCode,
        registrationType: parsed.data.registrationType,
      });
    } else {
      await taxService.unregisterState({
        tenantId: context.tenantId,
        stateCode: parsed.data.stateCode,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logError(error, { layer: "api", requestId, route: "/api/admin/nexus/register" });
    return NextResponse.json(
      { error: error.message || "Failed to update registration", requestId },
      { status: 500 },
    );
  }
}
