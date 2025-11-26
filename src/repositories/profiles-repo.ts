import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepo } from "./_base-repo";

export class ProfilesRepo extends BaseRepo {
  constructor(opts: {
    supabase: SupabaseClient<Database>;
    requestId?: string;
    userId?: string | null;
    tenantId?: string | null;
  }) {
    super(opts);
  }

  async getById(id: string) {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getByEmail(email: string) {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async update(
    id: string,
    updates: Database["public"]["Tables"]["profiles"]["Update"],
  ) {
    const { data, error } = await this.supabase
      .from("profiles")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  async isAdmin(id: string): Promise<boolean> {
    const profile = await this.getById(id);
    return profile?.role === "admin";
  }
}
