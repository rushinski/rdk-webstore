// app/api/admin/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi } from "@/lib/auth/session";
import { AnalyticsService } from "@/services/analytics-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

const rangeSchema = z.enum(["today", "7d", "30d", "90d"]).default("30d");

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    await requireAdminApi();
    const supabase = await createSupabaseServerClient();
    const service = new AnalyticsService(supabase);

    const rangeParam = request.nextUrl.searchParams.get("range") ?? "30d";
    const parsed = rangeSchema.safeParse(rangeParam);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid range", issues: parsed.error.format(), requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const result = await service.getAdminAnalytics(parsed.data);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/admin/analytics",
    });
    return NextResponse.json(
      { error: "Failed to load analytics", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
