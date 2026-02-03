// app/api/admin/featured-items/reorder/route.ts
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi, AuthError } from "@/lib/auth/session";
import { FeaturedItemsService } from "@/services/featured-items-service";
import { logError } from "@/lib/utils/log";

export async function POST(request: Request) {
  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();

    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: "Updates must be an array" }, { status: 400 });
    }

    for (const update of updates) {
      if (!update.id || typeof update.sortOrder !== "number") {
        return NextResponse.json(
          { error: "Each update must have id and sortOrder" },
          { status: 400 },
        );
      }
    }

    const service = new FeaturedItemsService(supabase);
    await service.reorderFeaturedItems(updates, undefined, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    logError(error, { layer: "api", endpoint: "POST /api/admin/featured-items/reorder" });

    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to reorder featured items",
      },
      { status: 500 },
    );
  }
}
