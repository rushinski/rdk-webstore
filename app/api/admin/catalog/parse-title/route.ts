import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { ensureTenantId } from "@/lib/auth/tenant";
import { ProductTitleParserService } from "@/services/product-title-parser-service";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const tenantId = await ensureTenantId(session, supabase);
    const payload = await request.json();

    if (!payload?.titleRaw || !payload?.category) {
      return NextResponse.json(
        { error: "Title and category are required." },
        { status: 400 }
      );
    }

    const parser = new ProductTitleParserService(supabase);
    const parsed = await parser.parseTitle({
      titleRaw: payload.titleRaw,
      category: payload.category,
      brandOverrideId: payload.brandOverrideId ?? null,
      modelOverrideId: payload.modelOverrideId ?? null,
      tenantId,
    });

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Admin parse title error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to parse title";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
