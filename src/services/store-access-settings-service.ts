import type { TypedSupabaseClient } from "@/lib/supabase/server";
import {
  StoreAccessSettingsRepository,
  type StoreAccessSettings,
} from "@/repositories/store-access-settings-repo";

export class StoreAccessSettingsService {
  private readonly repo: StoreAccessSettingsRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.repo = new StoreAccessSettingsRepository(supabase);
  }

  async getSettings(tenantId: string): Promise<StoreAccessSettings> {
    return this.repo.getByTenant(tenantId);
  }

  async saveSettings(
    tenantId: string,
    input: StoreAccessSettings,
  ): Promise<StoreAccessSettings> {
    return this.repo.upsert(tenantId, input);
  }

  isCheckoutLocked(settings: { checkoutLockEnabled: boolean }): boolean {
    return settings.checkoutLockEnabled;
  }
}
