import { LightspeedLinksRepository } from "@/repositories/lightspeed-links-repo";
import { ProductRepository } from "@/repositories/product-repo";
import type { TypedSupabaseClient } from "@/lib/supabase/server";

type LightspeedProductPayload = {
  id?: string;
  active?: boolean;
  deleted_at?: string | null;
};

type LightspeedInventoryPayload = {
  product_id?: string;
  count?: number | string | null;
};

export class LightspeedSaleSyncService {
  private readonly linksRepo: LightspeedLinksRepository;
  private readonly productRepo: ProductRepository;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.linksRepo = new LightspeedLinksRepository(supabase);
    this.productRepo = new ProductRepository(supabase);
  }

  async handleProductUpdate(tenantId: string, payload: LightspeedProductPayload) {
    if (!payload.id) {
      return;
    }

    const links = await this.linksRepo.getByLightspeedProductId(tenantId, payload.id);
    const productIds = [
      ...new Set(
        links
          .map((link) => link.product_id)
          .filter((productId): productId is string => Boolean(productId)),
      ),
    ];

    if (productIds.length === 0) {
      return;
    }

    const shouldArchive = Boolean(payload.deleted_at) || payload.active === false;
    if (!shouldArchive) {
      return;
    }

    for (const productId of productIds) {
      await this.productRepo.archive(productId);
    }
  }

  async handleInventoryUpdate(tenantId: string, payload: LightspeedInventoryPayload) {
    if (!payload.product_id) {
      return;
    }

    const links = await this.linksRepo.getByLightspeedProductId(
      tenantId,
      payload.product_id,
    );
    if (links.length !== 1) {
      return;
    }

    const variantId = links[0].variant_id;
    if (!variantId) {
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
  }

  async handleSaleUpdate(_tenantId: string, _payload: Record<string, unknown>) {
    // Inventory webhooks are the authoritative stock signal for now.
  }
}
