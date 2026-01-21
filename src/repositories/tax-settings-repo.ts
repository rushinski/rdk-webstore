// src/repositories/tax-settings-repo.ts
import type { TypedSupabaseClient } from "@/lib/supabase/server";

export type TenantTaxSettings = {
  id: string;
  tenant_id: string;
  home_state: string;
  business_name: string | null;
  tax_id_number: string | null;
  stripe_tax_settings_id: string | null;
  tax_enabled: boolean;
  tax_code_overrides: Record<string, string> | null;
  created_at: string;
  updated_at: string;
};

export class TaxSettingsRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async getByTenant(tenantId: string): Promise<TenantTaxSettings | null> {
    const { data, error } = await this.supabase
      .from('tenant_tax_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async upsert(settings: {
    tenantId: string;
    homeState: string;
    businessName?: string | null;
    taxIdNumber?: string | null;
    stripeTaxSettingsId?: string | null;
    taxEnabled?: boolean;
    taxCodeOverrides?: Record<string, string> | null;
  }): Promise<TenantTaxSettings> {
    const { data, error } = await this.supabase
      .from('tenant_tax_settings')
      .upsert({
        tenant_id: settings.tenantId,
        home_state: settings.homeState,
        business_name: settings.businessName ?? null,
        tax_id_number: settings.taxIdNumber ?? null,
        stripe_tax_settings_id: settings.stripeTaxSettingsId ?? null,
        tax_enabled: settings.taxEnabled ?? true,
        tax_code_overrides: settings.taxCodeOverrides ?? {},
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'tenant_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
