// src/repositories/profile-repo.ts
import type { Database } from "@/types/db/database.types";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { ProfileRole } from "@/config/constants/roles";
import { ADMIN_ROLES } from "@/config/constants/roles";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type ProfileAuthView = Pick<
  Profile,
  "id" | "email" | "role" | "full_name" | "tenant_id"
>;

export class ProfileRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  // Keep if you truly need the full row elsewhere
  async getByUserId(userId: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  // ✅ New: minimal select for session/auth usage
  async getAuthViewByUserId(userId: string): Promise<ProfileAuthView | null> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("id, email, role, full_name, tenant_id")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async ensureProfile(userId: string, email: string, tenantId?: string) {
    const existing = await this.getByUserId(userId);
    if (existing) return existing;

    let assignedTenantId = tenantId;

    if (!assignedTenantId) {
      const { data: firstTenant, error } = await this.supabase
        .from("tenants")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(`Failed to query tenants: ${error.message}`);
      if (!firstTenant) throw new Error("No tenant found in database. Please run seed script.");

      assignedTenantId = firstTenant.id;
    }

    const { data, error } = await this.supabase
      .from("profiles")
      .insert({
        id: userId,
        email,
        role: "customer",
        tenant_id: assignedTenantId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
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
    },
  ) {
    const { error } = await this.supabase.from("profiles").update(input).eq("id", userId);
    if (error) throw error;
  }

  async listStaffProfiles() {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("id, email, role, chat_notifications_enabled, admin_order_notifications_enabled")
      // ✅ Use the constant so you never drift
      .in("role", ADMIN_ROLES as unknown as string[]);

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

  async setStripeAccountId(userId: string, stripeAccountId: string) {
    const { error } = await this.supabase
      .from("profiles")
      .update({ stripe_account_id: stripeAccountId })
      .eq("id", userId);
    if (error) throw error;
  }

  async setTenantId(userId: string, tenantId: string) {
    const { error } = await this.supabase.from("profiles").update({ tenant_id: tenantId }).eq("id", userId);
    if (error) throw error;
  }
}
