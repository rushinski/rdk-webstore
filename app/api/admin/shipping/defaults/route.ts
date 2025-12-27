import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { ShippingDefaultsRepository } from "@/repositories/shipping-defaults-repo";

export async function GET() {
  try {
    const session = await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const repo = new ShippingDefaultsRepository(supabase);

    const defaults = await repo.list(session.profile?.tenant_id ?? null);
    return NextResponse.json({ defaults });
  } catch (error) {
    console.error("Admin shipping defaults error:", error);
    return NextResponse.json({ error: "Failed to fetch shipping defaults" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const supabase = await createSupabaseServerClient();
    const repo = new ShippingDefaultsRepository(supabase);

    const body = await request.json();
    const defaults = Array.isArray(body?.defaults) ? body.defaults : [];

    const normalized = defaults
      .filter((entry: any) => typeof entry?.category === "string")
      .map((entry: any) => ({
        category: entry.category,
        default_price: Number(entry.default_price ?? 0),
      }));

    const saved = await repo.upsertDefaults(session.profile?.tenant_id ?? null, normalized);
    return NextResponse.json({ defaults: saved });
  } catch (error) {
    console.error("Admin shipping defaults update error:", error);
    return NextResponse.json({ error: "Failed to save shipping defaults" }, { status: 500 });
  }
}
