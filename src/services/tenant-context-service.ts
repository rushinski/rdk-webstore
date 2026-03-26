// src/services/tenant-context-service.ts
import { ProfileRepository } from "@/repositories/profile-repo";
import type { TypedSupabaseClient } from "@/lib/supabase/server";

export type TenantContext = {
  tenantId: string;
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
   */
  async getAdminContext(userId: string): Promise<TenantContext> {
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
   * Get tenant context for onboarding
   */
  async getAdminContextForOnboarding(userId: string): Promise<TenantContextPartial> {
    return this.getAdminContext(userId);
  }

  /**
   * Get tenant ID for a user
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
