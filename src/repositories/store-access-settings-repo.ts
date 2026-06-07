import type { TypedSupabaseClient } from "@/lib/supabase/server";

export const DEFAULT_CHECKOUT_LOCK_MESSAGE =
  "sorry we currently can not accept payments please message @realdealkickzsc on instagram the items you would like to purchase.";

export type StoreAccessSettings = {
  siteLockEnabled: boolean;
  siteUnlockAt: string | null;
  checkoutLockEnabled: boolean;
  checkoutLockMessage: string;
};

type StoreAccessSettingsRow = {
  site_lock_enabled: boolean | null;
  site_unlock_at: string | null;
  checkout_lock_enabled: boolean | null;
  checkout_lock_message: string | null;
};

export class StoreAccessSettingsRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async getByTenant(tenantId: string): Promise<StoreAccessSettings> {
    const { data, error } = await this.supabase
      .from("tenant_store_access_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const row = (data ?? null) as StoreAccessSettingsRow | null;
    return {
      siteLockEnabled: row?.site_lock_enabled ?? false,
      siteUnlockAt: row?.site_unlock_at ?? null,
      checkoutLockEnabled: row?.checkout_lock_enabled ?? false,
      checkoutLockMessage:
        row?.checkout_lock_message?.trim() || DEFAULT_CHECKOUT_LOCK_MESSAGE,
    };
  }

  async upsert(
    tenantId: string,
    settings: StoreAccessSettings,
  ): Promise<StoreAccessSettings> {
    const { data, error } = await this.supabase
      .from("tenant_store_access_settings")
      .upsert(
        {
          tenant_id: tenantId,
          site_lock_enabled: settings.siteLockEnabled,
          site_unlock_at: settings.siteUnlockAt,
          checkout_lock_enabled: settings.checkoutLockEnabled,
          checkout_lock_message: settings.checkoutLockMessage,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id" },
      )
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    const row = data as StoreAccessSettingsRow;
    return {
      siteLockEnabled: row.site_lock_enabled ?? false,
      siteUnlockAt: row.site_unlock_at ?? null,
      checkoutLockEnabled: row.checkout_lock_enabled ?? false,
      checkoutLockMessage:
        row.checkout_lock_message?.trim() || DEFAULT_CHECKOUT_LOCK_MESSAGE,
    };
  }
}
