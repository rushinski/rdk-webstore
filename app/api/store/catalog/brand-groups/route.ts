// app/api/store/catalog/brand-groups/route.ts

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StorefrontService } from "@/services/storefront-service";
import { getRequestIdFromHeaders } from "@/lib/http/request-id";
import { logError } from "@/lib/utils/log";

const NAVBAR_GROUP_KEYS = new Set(["nike", "jordan", "asics", "designer"]);

export async function GET(request: NextRequest) {
  const requestId = getRequestIdFromHeaders(request.headers);

  try {
    const supabase = await createSupabaseServerClient();
    const service = new StorefrontService(supabase);
    const groups = await service.listBrandGroupsByKeys(NAVBAR_GROUP_KEYS);

    return NextResponse.json({ groups }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logError(error, {
      layer: "api",
      requestId,
      route: "/api/store/catalog/brand-groups",
    });
    return NextResponse.json(
      { error: "Failed to fetch brand groups", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
