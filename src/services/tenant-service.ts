import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { ServerSession } from "@/lib/auth/session";
import { ProfileRepository } from "@/repositories/profile-repo";
import { TenantRepository } from "@/repositories/tenant-repo";

const DEFAULT_TENANT_NAME = "Default Tenant";

export class TenantService {
  private profilesRepo: ProfileRepository;
  private tenantsRepo: TenantRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.profilesRepo = new ProfileRepository(supabase);
    this.tenantsRepo = new TenantRepository(supabase);
  }

  async ensureTenantId(session: ServerSession): Promise<string> {
    const existingId = session.profile?.tenant_id;
    if (existingId) return existingId;

    let tenantId = await this.tenantsRepo.getFirstTenantId();

    if (!tenantId) {
      const tenantName =
        session.profile?.full_name ||
        session.profile?.email ||
        session.user.email ||
        DEFAULT_TENANT_NAME;

      const created = await this.tenantsRepo.create(tenantName);
      tenantId = created.id;
    }

    await this.profilesRepo.setTenantId(session.user.id, tenantId);

    return tenantId;
  }
}
