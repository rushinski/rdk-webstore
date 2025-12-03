// src/repositories/profile-repo.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type ProfileRole = "customer" | "admin";

// Row type straight from Supabase schema
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export class ProfileRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async getByUserId(userId: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async ensureProfile(userId: string, email: string) {
    const existing = await this.getByUserId(userId);
    if (existing) return;

    const { error } = await this.supabase
      .from("profiles")
      .insert({ id: userId, email });

    if (error) throw error;
  }

  async setRole(userId: string, role: ProfileRole) {
    const { error } = await this.supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId);

    if (error) throw error;
  }
}
