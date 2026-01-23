// app/api/admin/nexus/tax-documents/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { TenantContextService } from "@/services/tenant-context-service";
import { StripeTaxService } from "@/services/stripe-tax-service";

const taxDocsSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12).optional(),
});

export async function POST(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();

    const contextService = new TenantContextService(supabase);
    const context = await contextService.getAdminContext(session.user.id);

    const body = await request.json().catch(() => null);
    const parsed = taxDocsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.format(), requestId },
        { status: 400 },
      );
    }

    const taxService = new StripeTaxService(supabase, context.stripeAccountId);
    const result = await taxService.downloadTaxDocuments({
      year: parsed.data.year,
      month: parsed.data.month,
    });

    if (!result) {
      return NextResponse.json({
        message:
          "Tax documents are automatically available in your Stripe Dashboard under Tax > Reports",
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    logError(error, { layer: "api", requestId, route: "/api/admin/nexus/tax-documents" });
    return NextResponse.json(
      { error: error.message || "Failed to download tax documents", requestId },
      { status: 500 },
    );
  }
}
