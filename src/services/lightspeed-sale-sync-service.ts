import { LightspeedLinksRepository } from "@/repositories/lightspeed-links-repo";
import { ProductRepository } from "@/repositories/product-repo";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { LightspeedRemoteProduct } from "@/lib/lightspeed/types";
import { LightspeedInboundSyncService } from "@/services/lightspeed-inbound-sync-service";
import { LightspeedSettingsRepository } from "@/repositories/lightspeed-settings-repo";
import { LightspeedClient } from "@/lib/lightspeed/client";

type LightspeedProductPayload = {
  id?: string;
  name?: string;
  active?: boolean;
  is_active?: boolean;
  deleted_at?: string | null;
  updated_at?: string | null;
  variants?: LightspeedRemoteProduct[] | null;
};

type LightspeedInventoryPayload = {
  product_id?: string;
  count?: number | string | null;
  updated_at?: string | null;
};

export class LightspeedSaleSyncService {
  private readonly linksRepo: LightspeedLinksRepository;
  private readonly productRepo: ProductRepository;
  private readonly settingsRepo: LightspeedSettingsRepository;
  private readonly inboundSyncService: LightspeedInboundSyncService;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.linksRepo = new LightspeedLinksRepository(supabase);
    this.productRepo = new ProductRepository(supabase);
    this.settingsRepo = new LightspeedSettingsRepository(supabase);
    this.inboundSyncService = new LightspeedInboundSyncService(supabase);
  }

  async handleProductUpdate(tenantId: string, payload: LightspeedProductPayload) {
    if (!payload.id) {
      return;
    }
    const remoteModifiedAt = payload.updated_at ?? new Date().toISOString();
    const shouldDelete =
      Boolean(payload.deleted_at) ||
      payload.active === false ||
      payload.is_active === false;

    if (shouldDelete) {
      await this.inboundSyncService.applyDelete({
        tenantId,
        lightspeedFamilyId: payload.id,
        remoteModifiedAt,
      });
      return;
    }

    const connection = await this.settingsRepo.getConnectionByTenant(tenantId);
    if (!connection.domainPrefix || !connection.accessToken) {
      throw new Error(
        "Lightspeed sync is enabled but the store is not fully connected yet.",
      );
    }

    const client = new LightspeedClient({
      domainPrefix: connection.domainPrefix,
      accessToken: connection.accessToken,
    });
    const fullProduct = await client.getProduct(payload.id);
    if (!fullProduct) {
      return;
    }

    await this.inboundSyncService.applyProductPayload({
      tenantId,
      payload: fullProduct as LightspeedRemoteProduct,
      topic: "product.update",
      remoteModifiedAt: fullProduct.updated_at ?? remoteModifiedAt,
    });
  }

  async handleInventoryUpdate(tenantId: string, payload: LightspeedInventoryPayload) {
    if (!payload.product_id) {
      return;
    }

    const link =
      (await this.linksRepo.getByLightspeedVariantId(tenantId, payload.product_id)) ??
      (await this.linksRepo.getByLightspeedProductId(tenantId, payload.product_id))[0] ??
      null;
    const variantId = link?.variant_id;
    if (!variantId) {
      return;
    }

    const remoteModifiedAt = payload.updated_at ?? new Date().toISOString();
    if (
      link?.last_website_modified_at &&
      link.last_website_modified_at > remoteModifiedAt
    ) {
      return;
    }

    const numericCount =
      typeof payload.count === "string"
        ? Number.parseInt(payload.count, 10)
        : Number(payload.count ?? 0);

    if (!Number.isFinite(numericCount)) {
      return;
    }

    await this.productRepo.updateVariant(variantId, {
      stock: Math.max(0, numericCount),
    });

    await this.linksRepo.upsertLink({
      tenantId,
      productId: link?.product_id ?? null,
      variantId,
      externalSku: link?.external_sku ?? payload.product_id,
      lightspeedFamilyId:
        link?.lightspeed_family_id ?? link?.lightspeed_product_id ?? null,
      lightspeedProductId: link?.lightspeed_product_id ?? null,
      lightspeedVariantId: link?.lightspeed_variant_id ?? payload.product_id,
      lightspeedInventoryItemId: link?.lightspeed_inventory_item_id ?? null,
      syncState: "linked",
      lastLightspeedModifiedAt: remoteModifiedAt,
      lastSyncDirection: "lightspeed_to_website",
    });
  }

  async handleSaleUpdate(_tenantId: string, _payload: Record<string, unknown>) {
    // Inventory webhooks are the authoritative stock signal for now.
  }
}
