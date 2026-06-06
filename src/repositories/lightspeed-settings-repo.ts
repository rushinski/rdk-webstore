import { env } from "@/config/env";
import type { TypedSupabaseClient } from "@/lib/supabase/server";

export type LightspeedSettings = {
  syncEnabled: boolean;
  domainPrefix: string | null;
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
    return {
      syncEnabled: row?.sync_enabled ?? false,
      domainPrefix: row?.domain_prefix?.trim() || null,
    };
  }

  async getConnectionByTenant(tenantId: string): Promise<LightspeedConnection> {
    const row = await this.fetchRow(tenantId);
    return {
      syncEnabled: row?.sync_enabled ?? false,
      domainPrefix:
        row?.domain_prefix?.trim() || env.LIGHTSPEED_DOMAIN_PREFIX.trim() || null,
      accessToken: env.LIGHTSPEED_ACCESS_TOKEN.trim() || null,
      webhookSigningSecret: env.LIGHTSPEED_WEBHOOK_SIGNING_SECRET.trim() || null,
    };
  }

  async findTenantIdByRetailerOrDomainPrefix(input: {
    domainPrefix?: string | null;
  }): Promise<string | null> {
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

    return data?.tenant_id ?? null;
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

  async upsert(tenantId: string, input: LightspeedSettings): Promise<LightspeedSettings> {
    const { data, error } = await this.supabase
      .from("tenant_lightspeed_settings")
      .upsert(
        {
          tenant_id: tenantId,
          sync_enabled: input.syncEnabled,
          domain_prefix: input.domainPrefix,
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
    };
  }
}
