import type { TypedSupabaseClient } from "@/lib/supabase/server";

type LightspeedLinkRow = {
  id: string;
  tenant_id: string;
  product_id: string | null;
  variant_id: string | null;
  lightspeed_family_id: string | null;
  lightspeed_product_id: string | null;
  lightspeed_variant_id: string | null;
  lightspeed_inventory_item_id: string | null;
  external_sku: string;
  sync_state: string;
  last_website_modified_at: string | null;
  last_lightspeed_modified_at: string | null;
  last_sync_direction: string | null;
  tombstoned_at: string | null;
  last_error: string | null;
  created_at?: string;
  updated_at?: string;
};

export type LightspeedLink = LightspeedLinkRow;

export class LightspeedLinksRepository {
  constructor(private readonly supabase: TypedSupabaseClient) {}

  async getByVariantId(tenantId: string, variantId: string) {
    const { data, error } = await this.supabase
      .from("lightspeed_product_links")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("variant_id", variantId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data ?? null) as LightspeedLinkRow | null;
  }

  async getByExternalSku(tenantId: string, externalSku: string) {
    const { data, error } = await this.supabase
      .from("lightspeed_product_links")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("external_sku", externalSku)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data ?? null) as LightspeedLinkRow | null;
  }

  async getByLightspeedProductId(tenantId: string, lightspeedProductId: string) {
    const { data, error } = await this.supabase
      .from("lightspeed_product_links")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("lightspeed_product_id", lightspeedProductId);

    if (error) {
      throw error;
    }

    return (data ?? []) as LightspeedLinkRow[];
  }

  async getByLightspeedVariantId(tenantId: string, lightspeedVariantId: string) {
    const { data, error } = await this.supabase
      .from("lightspeed_product_links")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("lightspeed_variant_id", lightspeedVariantId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data ?? null) as LightspeedLinkRow | null;
  }

  async listByProductId(tenantId: string, productId: string) {
    const { data, error } = await this.supabase
      .from("lightspeed_product_links")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("product_id", productId);

    if (error) {
      throw error;
    }

    return (data ?? []) as LightspeedLinkRow[];
  }

  async listByTenant(tenantId: string) {
    const { data, error } = await this.supabase
      .from("lightspeed_product_links")
      .select("*")
      .eq("tenant_id", tenantId);

    if (error) {
      throw error;
    }

    return (data ?? []) as LightspeedLinkRow[];
  }

  async updateLinkById(
    id: string,
    input: {
      productId?: string | null;
      variantId?: string | null;
      syncState?: string;
      lastWebsiteModifiedAt?: string | null;
      lastLightspeedModifiedAt?: string | null;
      lastSyncDirection?: string | null;
      tombstonedAt?: string | null;
      lastError?: string | null;
    },
  ) {
    const { data, error } = await this.supabase
      .from("lightspeed_product_links")
      .update({
        product_id: input.productId,
        variant_id: input.variantId,
        sync_state: input.syncState,
        last_website_modified_at: input.lastWebsiteModifiedAt,
        last_lightspeed_modified_at: input.lastLightspeedModifiedAt,
        last_sync_direction: input.lastSyncDirection,
        tombstoned_at: input.tombstonedAt,
        last_error: input.lastError,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as LightspeedLinkRow;
  }

  async upsertLink(input: {
    tenantId: string;
    productId?: string | null;
    variantId?: string | null;
    externalSku: string;
    lightspeedFamilyId?: string | null;
    lightspeedProductId?: string | null;
    lightspeedVariantId?: string | null;
    lightspeedInventoryItemId?: string | null;
    syncState?: string;
    lastWebsiteModifiedAt?: string | null;
    lastLightspeedModifiedAt?: string | null;
    lastSyncDirection?: string | null;
    tombstonedAt?: string | null;
    lastError?: string | null;
  }) {
    const { data, error } = await this.supabase
      .from("lightspeed_product_links")
      .upsert(
        {
          tenant_id: input.tenantId,
          product_id: input.productId ?? null,
          variant_id: input.variantId ?? null,
          external_sku: input.externalSku,
          lightspeed_family_id: input.lightspeedFamilyId ?? null,
          lightspeed_product_id: input.lightspeedProductId ?? null,
          lightspeed_variant_id: input.lightspeedVariantId ?? null,
          lightspeed_inventory_item_id: input.lightspeedInventoryItemId ?? null,
          sync_state: input.syncState ?? "linked",
          last_website_modified_at: input.lastWebsiteModifiedAt ?? null,
          last_lightspeed_modified_at: input.lastLightspeedModifiedAt ?? null,
          last_sync_direction: input.lastSyncDirection ?? null,
          tombstoned_at: input.tombstonedAt ?? null,
          last_error: input.lastError ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,variant_id" },
      )
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as LightspeedLinkRow;
  }
}
