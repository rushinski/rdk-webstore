// app/api/store/filters/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StorefrontService } from "@/services/storefront-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/log";

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const supabase = await createSupabaseServerClient();
    const service = new StorefrontService(supabase);
    const data = await service.listFilters();

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/store/filters",
    });
    return NextResponse.json(
      { error: "Failed to fetch filters", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
