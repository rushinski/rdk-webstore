// src/repositories/profile-repo.ts
import type { Database } from "@/types/database.types";
import type { TypedSupabaseClient } from "@/lib/supabase/server";

export type ProfileRole = "customer" | "admin" | "super_admin" | "dev";
export const PROFILE_ROLES: readonly ProfileRole[] = [
  "customer",
  "admin",
  "super_admin",
  "dev",
] as const;

export function isProfileRole(value: unknown): value is ProfileRole {
  return PROFILE_ROLES.includes(value as ProfileRole);
}

export function isAdminRole(role: ProfileRole): boolean {
  return role === "admin" || role === "super_admin" || role === "dev";
}

export function isSuperAdminRole(role: ProfileRole): boolean {
  return role === "super_admin" || role === "dev";
}

export function isDevRole(role: ProfileRole): boolean {
  return role === "dev";
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

  async updateNotificationPreferences(
    userId: string,
    input: {
      chat_notifications_enabled?: boolean;
      admin_order_notifications_enabled?: boolean;
    }
  ) {
    const { error } = await this.supabase
      .from("profiles")
      .update(input)
      .eq("id", userId);

    if (error) throw error;
  }

  async listStaffProfiles() {
    const { data, error } = await this.supabase
      .from("profiles")
      .select(
        "id, email, role, chat_notifications_enabled, admin_order_notifications_enabled"
      )
      .in("role", ["admin", "super_admin", "dev"]);

    if (error) throw error;
    return data ?? [];
  }

  async setStripeCustomerId(userId: string, stripeCustomerId: string) {
    const { error } = await this.supabase
      .from("profiles")
      .update({ stripe_customer_id: stripeCustomerId })
      .eq("id", userId);

    if (error) throw error;
  }

  async setTenantId(userId: string, tenantId: string) {
    const { error } = await this.supabase
      .from("profiles")
      .update({ tenant_id: tenantId })
      .eq("id", userId);

    if (error) throw error;
  }
}
