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

  async ensureProfile(userId: string, defaults?: Partial<Profile>) {
    const { error } = await this.supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          role: defaults?.role ?? "customer",
          twofa_enabled: defaults?.twofa_enabled ?? false,
        },
        { onConflict: "id" }
      );

    if (error) throw error;
  }

  async setTwoFASecret(userId: string, secret: string) {
    const { error } = await this.supabase
      .from("profiles")
      .update({ totp_secret: secret })
      .eq("id", userId);

    if (error) throw error;
  }

  async markTwoFAEnabled(userId: string) {
    const { error } = await this.supabase
      .from("profiles")
      .update({ twofa_enabled: true })
      .eq("id", userId);

    if (error) throw error;
  }
}
