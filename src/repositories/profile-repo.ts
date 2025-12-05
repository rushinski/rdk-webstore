// src/repositories/profile-repo.ts
import type { Database } from "@/types/database.types";
import type { TypedSupabaseClient } from "@/lib/supabase/server";

export type ProfileRole = "customer" | "admin";

// Row type straight from Supabase schema
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export class ProfileRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async getByUserId(userId: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async ensureProfile(userId: string, email: string, updatesOptIn: boolean) {
    const existing = await this.getByUserId(userId);
    if (existing) return;

    const { error } = await this.supabase.from("profiles").insert({
      id: userId,
      email,
      updates_opt_in: updatesOptIn,
    });

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
