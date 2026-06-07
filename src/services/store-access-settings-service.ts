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

  isSiteLocked(
    settings: { siteLockEnabled: boolean; siteUnlockAt: string | null },
    now = new Date(),
  ): boolean {
    if (!settings.siteLockEnabled) {
      return false;
    }

    if (!settings.siteUnlockAt) {
      return true;
    }

    const unlockAt = new Date(settings.siteUnlockAt);
    if (Number.isNaN(unlockAt.getTime())) {
      return true;
    }

    return now.getTime() < unlockAt.getTime();
  }

  isCheckoutLocked(settings: { checkoutLockEnabled: boolean }): boolean {
    return settings.checkoutLockEnabled;
  }
}
