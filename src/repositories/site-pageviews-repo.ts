import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/database.types";

type SitePageviewInsert = TablesInsert<"site_pageviews">;

export class SitePageviewsRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async insert(payload: SitePageviewInsert) {
    const { error } = await this.supabase.from("site_pageviews").insert(payload);
    if (error) throw error;
  }

  async listSince(startDateIso: string) {
    const { data, error } = await this.supabase
      .from("site_pageviews")
      .select("created_at, visitor_id, session_id")
      .gte("created_at", startDateIso);

    if (error) throw error;
    return data ?? [];
  }
}
