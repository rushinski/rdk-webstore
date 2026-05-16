import type { TypedSupabaseClient } from "@/lib/supabase/server";

type LightspeedLinkRow = {
  id: string;
  tenant_id: string;
  product_id: string | null;
  variant_id: string | null;
  lightspeed_product_id: string | null;
  lightspeed_variant_id: string | null;
  lightspeed_inventory_item_id: string | null;
  external_sku: string;
  sync_state: string;
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

  async upsertLink(input: {
    tenantId: string;
    productId?: string | null;
    variantId?: string | null;
    externalSku: string;
    lightspeedProductId?: string | null;
    lightspeedVariantId?: string | null;
    lightspeedInventoryItemId?: string | null;
    syncState?: string;
  }) {
    const { data, error } = await this.supabase
      .from("lightspeed_product_links")
      .upsert(
        {
          tenant_id: input.tenantId,
          product_id: input.productId ?? null,
          variant_id: input.variantId ?? null,
          external_sku: input.externalSku,
          lightspeed_product_id: input.lightspeedProductId ?? null,
          lightspeed_variant_id: input.lightspeedVariantId ?? null,
          lightspeed_inventory_item_id: input.lightspeedInventoryItemId ?? null,
          sync_state: input.syncState ?? "linked",
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
