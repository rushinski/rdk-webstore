// app/api/store/catalog/brand-groups/route.ts

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const NAVBAR_GROUP_KEYS = new Set([
  "nike",
  "jordan",
  "new_balance",
  "asics",
  "yeezy",
  "designer",
]);

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("catalog_brand_groups")
      .select("id, key, label")
      .eq("is_active", true);

    if (error) throw error;

    const groups = (data ?? []).filter((group) =>
      NAVBAR_GROUP_KEYS.has(group.key)
    );

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Store brand groups error:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand groups" },
      { status: 500 }
    );
  }
}
