import { env } from "@/config/env";
import type { TypedSupabaseClient } from "@/lib/supabase/server";

export type LightspeedSettings = {
  syncEnabled: boolean;
  domainPrefix: string | null;
  retailerId?: string | null;
};

type LightspeedSettingsRow = {
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  webhook_secret: string | null;
  sync_enabled: boolean | null;
  domain_prefix: string | null;
  account_id: string | null;
  retailer_id: string | null;
};

export type LightspeedConnection = LightspeedSettings & {
  accessToken: string | null;
  webhookSigningSecret: string | null;
};

export class LightspeedSettingsRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async getByTenant(tenantId: string): Promise<LightspeedSettings> {
    const row = await this.fetchRow(tenantId);
    const envSyncEnabled = this.isEnvBackedSyncEnabled();
    return {
      syncEnabled: envSyncEnabled || row?.sync_enabled === true,
      domainPrefix:
        row?.domain_prefix?.trim() || env.LIGHTSPEED_DOMAIN_PREFIX.trim() || null,
      retailerId: row?.retailer_id?.trim() || null,
    };
  }

  async getConnectionByTenant(tenantId: string): Promise<LightspeedConnection> {
    const row = await this.fetchRow(tenantId);
    const envSyncEnabled = this.isEnvBackedSyncEnabled();
    return {
      syncEnabled: envSyncEnabled || row?.sync_enabled === true,
      domainPrefix:
        row?.domain_prefix?.trim() || env.LIGHTSPEED_DOMAIN_PREFIX.trim() || null,
      accessToken: env.LIGHTSPEED_ACCESS_TOKEN.trim() || null,
      webhookSigningSecret: env.LIGHTSPEED_WEBHOOK_SIGNING_SECRET.trim() || null,
    };
  }

  async findTenantIdByRetailerOrDomainPrefix(input: {
    retailerId?: string | null;
    domainPrefix?: string | null;
  }): Promise<string | null> {
    if (input.retailerId?.trim()) {
      const { data, error } = await this.supabase
        .from("tenant_lightspeed_settings")
        .select("tenant_id")
        .eq("retailer_id", input.retailerId.trim())
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data?.tenant_id) {
        return data.tenant_id;
      }
    }

    if (!input.domainPrefix?.trim()) {
      return null;
    }

    const { data, error } = await this.supabase
      .from("tenant_lightspeed_settings")
      .select("tenant_id")
      .eq("domain_prefix", input.domainPrefix.trim())
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data?.tenant_id) {
      return data.tenant_id;
    }

    return this.getDefaultTenantId();
  }

  async saveRetailerIdForTenant(tenantId: string, retailerId: string): Promise<void> {
    const normalizedRetailerId = retailerId.trim();
    if (!normalizedRetailerId) {
      return;
    }

    const { error } = await this.supabase
      .from("tenant_lightspeed_settings")
      .update({
        retailer_id: normalizedRetailerId,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId);

    if (error) {
      throw error;
    }
  }

  private async fetchRow(tenantId: string): Promise<LightspeedSettingsRow | null> {
    const { data, error } = await this.supabase
      .from("tenant_lightspeed_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data ?? null) as LightspeedSettingsRow | null;
  }

  private async getDefaultTenantId(): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("tenants")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data?.id ?? null;
  }

  private isEnvBackedSyncEnabled(): boolean {
    return Boolean(
      env.LIGHTSPEED_ACCESS_TOKEN.trim() && env.LIGHTSPEED_DOMAIN_PREFIX.trim(),
    );
  }

  async upsert(tenantId: string, input: LightspeedSettings): Promise<LightspeedSettings> {
    const { data, error } = await this.supabase
      .from("tenant_lightspeed_settings")
      .upsert(
        {
          tenant_id: tenantId,
          sync_enabled: input.syncEnabled,
          domain_prefix: input.domainPrefix,
          retailer_id: input.retailerId ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id" },
      )
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    const row = data as LightspeedSettingsRow;
    return {
      syncEnabled: row.sync_enabled ?? false,
      domainPrefix: row.domain_prefix?.trim() || null,
      retailerId: row.retailer_id?.trim() || null,
    };
  }
}
