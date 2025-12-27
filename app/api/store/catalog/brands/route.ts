// app/api/store/catalog/brands/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const groupKey = request.nextUrl.searchParams.get("groupKey") || null;

    let query = supabase
      .from("catalog_brands")
      .select("id, canonical_label, group:catalog_brand_groups(id, key, label)")
      .eq("is_active", true);

    if (groupKey) {
      query = query.eq("catalog_brand_groups.key", groupKey);
    }

    const { data, error } = await query;
    if (error) throw error;

    const brands = (data ?? [])
      .map((brand) => brand.canonical_label)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ brands });
  } catch (error) {
    console.error("Store brands error:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}
