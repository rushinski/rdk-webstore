// src/repositories/profile-repo.ts
import type { Database } from "@/types/database.types";
import type { TypedSupabaseClient } from "@/lib/supabase/server";

export type ProfileRole = "customer" | "admin";
export const PROFILE_ROLES: readonly ProfileRole[] = ["customer", "admin"] as const;

export function isProfileRole(value: unknown): value is ProfileRole {
  return value === "customer" || value === "admin";
}

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

  async ensureProfile(userId: string, email: string) {
    const existing = await this.getByUserId(userId);
    if (existing) return;

    const { error } = await this.supabase.from("profiles").insert({
      id: userId,
      email,
      role: "customer",
    });

    if (error) throw error;
  }

  async setRole(userId: string, role: ProfileRole) {
    const { error } = await this.supabase.from("profiles").update({ role }).eq("id", userId);
    if (error) throw error;
  }
}
