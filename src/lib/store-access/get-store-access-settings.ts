import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TenantRepository } from "@/repositories/tenant-repo";
import { StoreAccessSettingsService } from "@/services/store-access-settings-service";

export async function getStoreAccessSettings() {
  const supabase = await createSupabaseServerClient();
  const tenantRepo = new TenantRepository(supabase);
  const tenantId = await tenantRepo.getFirstTenantId();

  if (!tenantId) {
    return null;
  }

  const service = new StoreAccessSettingsService(supabase);
  const settings = await service.getSettings(tenantId);

  return {
    tenantId,
    settings,
  };
}
