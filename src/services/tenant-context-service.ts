// src/services/tenant-context-service.ts
import { ProfileRepository } from "@/repositories/profile-repo";
import type { TypedSupabaseClient } from "@/lib/supabase/server";

export type TenantContext = {
  tenantId: string;
  stripeAccountId: string;
  userId: string;
};

export type TenantContextPartial = {
  tenantId: string;
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

    // Get the Stripe account for the tenant (not just the user's profile)
    const stripeAccountId = await profileRepo.getStripeAccountIdForTenant(profile.tenant_id);

    if (!stripeAccountId) {
      throw new Error("Stripe Connect account not configured");
    }

    return {
      tenantId: profile.tenant_id,
      stripeAccountId,
      userId,
    };
  }

  /**
   * Get tenant context for onboarding (no Stripe account required yet)
   * Use this when creating/setting up the Stripe account
   */
  async getAdminContextForOnboarding(userId: string): Promise<TenantContextPartial> {
    const profileRepo = new ProfileRepository(this.supabase);
    const profile = await profileRepo.getByUserId(userId);

    if (!profile?.tenant_id) {
      throw new Error("Tenant not found");
    }

    return {
      tenantId: profile.tenant_id,
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