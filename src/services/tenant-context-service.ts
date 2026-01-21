// src/services/tenant-context-service.ts
import { ProfileRepository } from "@/repositories/profile-repo";
import type { TypedSupabaseClient } from "@/lib/supabase/server";

export type TenantContext = {
  tenantId: string;
  stripeAccountId: string;
  userId: string;
};

export class TenantContextService {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  /**
   * Get tenant context for an admin user
   * Validates that the user has a tenant and Stripe Connect account
   */
  async getAdminContext(userId: string): Promise<TenantContext> {
    const profileRepo = new ProfileRepository(this.supabase);
    const profile = await profileRepo.getByUserId(userId);

    if (!profile?.tenant_id) {
      throw new Error("Tenant not found");
    }

    if (!profile.stripe_account_id) {
      throw new Error("Stripe Connect account not configured");
    }

    return {
      tenantId: profile.tenant_id,
      stripeAccountId: profile.stripe_account_id,
      userId,
    };
  }

  /**
   * Get tenant ID for a user (no Stripe requirement)
   */
  async getTenantId(userId: string): Promise<string> {
    const profileRepo = new ProfileRepository(this.supabase);
    const profile = await profileRepo.getByUserId(userId);

    if (!profile?.tenant_id) {
      throw new Error("Tenant not found");
    }

    return profile.tenant_id;
  }
}