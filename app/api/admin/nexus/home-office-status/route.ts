// app/api/admin/nexus/home-office-status/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";
import { StripeTaxService } from "@/services/stripe-tax-service";

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    await requireAdminApi();
    const supabase = await createSupabaseServerClient();

    const taxService = new StripeTaxService(supabase);
    const isConfigured = await taxService.isHeadOfficeConfigured();

    return NextResponse.json({ configured: isConfigured });
  } catch (error: any) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/nexus/home-office-status",
    });

    return NextResponse.json(
      { error: "Failed to check home office status", requestId },
      { status: 500 }
    );
  }
}