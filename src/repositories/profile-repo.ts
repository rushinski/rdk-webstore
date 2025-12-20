// src/repositories/profile-repo.ts
import type { Database } from "@/types/database.types";
import type { TypedSupabaseClient } from "@/lib/supabase/server";

export type ProfileRole = "customer" | "admin";
export const PROFILE_ROLES: readonly ProfileRole[] = ["customer", "admin"] as const;

export function isProfileRole(value: unknown): value is ProfileRole {
  return value === "customer" || value === "admin";
}

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
      role: "customer", // prevents null role for newly created profiles
    });

    if (error) throw error;
  }

  async setRole(userId: string, role: ProfileRole) {
    const { error } = await this.supabase.from("profiles").update({ role }).eq("id", userId);
    if (error) throw error;
  }
}
