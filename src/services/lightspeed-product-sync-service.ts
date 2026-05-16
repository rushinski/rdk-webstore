import { LightspeedClient } from "@/lib/lightspeed/client";
import type {
  LightspeedCreateProductPayload,
  LightspeedUpdateProductPayload,
} from "@/lib/lightspeed/types";
import { ProductRepository } from "@/repositories/product-repo";
import { LightspeedLinksRepository } from "@/repositories/lightspeed-links-repo";
import { LightspeedSettingsRepository } from "@/repositories/lightspeed-settings-repo";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { LightspeedMappingService } from "@/services/lightspeed-mapping-service";
import { LightspeedSkuService } from "@/services/lightspeed-sku-service";

export class LightspeedProductSyncService {
  private readonly productRepo: ProductRepository;
  private readonly settingsRepo: LightspeedSettingsRepository;
  private readonly linksRepo: LightspeedLinksRepository;
  private readonly mappingService: LightspeedMappingService;
  private readonly skuService: LightspeedSkuService;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.productRepo = new ProductRepository(supabase);
    this.settingsRepo = new LightspeedSettingsRepository(supabase);
    this.linksRepo = new LightspeedLinksRepository(supabase);
    this.mappingService = new LightspeedMappingService();
    this.skuService = new LightspeedSkuService();
  }

  async syncWebsiteProduct(
    productId: string,
    options: { tenantId: string; source: "create" | "update" },
  ) {
    const connection = await this.settingsRepo.getConnectionByTenant(options.tenantId);
    if (!connection.syncEnabled) {
      return { status: "skipped" as const, reason: "sync_disabled" as const };
    }

    if (!connection.domainPrefix || !connection.accessToken) {
      throw new Error(
        "Lightspeed sync is enabled but the store is not fully connected yet.",
      );
    }

    const product = await this.productRepo.getById(productId, {
      tenantId: options.tenantId,
      includeOutOfStock: true,
      includeUnpublished: true,
    });

    if (!product) {
      throw new Error("Product not found for Lightspeed sync.");
    }

    const variantLinks = await Promise.all(
      product.variants.map((variant) =>
        this.linksRepo.getByVariantId(options.tenantId, variant.id),
      ),
    );

    const resolvedVariants = await Promise.all(
      product.variants.map(async (variant, index) => {
        const existingLink = variantLinks[index];
        const externalSku =
          existingLink?.external_sku ??
          this.buildVariantExternalSku(product.sku, {
            condition: product.condition,
            brand: product.brand,
            model: product.model ?? product.name,
            sizeLabel: variant.size_label,
            variantIndex: index,
          });

        const conflictingLink = await this.linksRepo.getByExternalSku(
          options.tenantId,
          externalSku,
        );
        if (conflictingLink && conflictingLink.variant_id !== variant.id) {
          throw new Error(
            `Lightspeed sync conflict: SKU ${externalSku} is already linked to another variant.`,
          );
        }

        return {
          variant,
          existingLink,
          externalSku,
        };
      }),
    );

    const client = new LightspeedClient({
      domainPrefix: connection.domainPrefix,
      accessToken: connection.accessToken,
    });

    const primaryLink = resolvedVariants.find(
      (entry) => entry.existingLink,
    )?.existingLink;
    let lightspeedProductId = primaryLink?.lightspeed_product_id ?? null;

    if (lightspeedProductId) {
      const payload = this.buildUpdatePayload(
        product,
        resolvedVariants[0]?.externalSku ?? null,
      );
      await client.updateProduct(lightspeedProductId, payload);
    } else {
      const payload = this.buildCreatePayload(product, resolvedVariants);
      const response = await client.createProduct(payload);
      const ids = Array.isArray(response.data)
        ? response.data
        : response.data?.id
          ? [response.data.id]
          : [];
      lightspeedProductId = ids[0] ?? null;
    }

    for (const entry of resolvedVariants) {
      await this.linksRepo.upsertLink({
        tenantId: options.tenantId,
        productId: product.id,
        variantId: entry.variant.id,
        externalSku: entry.externalSku,
        lightspeedProductId,
        lightspeedVariantId: entry.existingLink?.lightspeed_variant_id ?? null,
        syncState: "linked",
      });
    }

    return {
      status: "synced" as const,
      lightspeedProductId,
      variantCount: resolvedVariants.length,
    };
  }

  private buildCreatePayload(
    product: Awaited<ReturnType<ProductRepository["getById"]>> extends infer T
      ? Exclude<T, null>
      : never,
    resolvedVariants: Array<{
      externalSku: string;
      variant: { size_label: string; price_cents: number };
    }>,
  ): LightspeedCreateProductPayload {
    const titleDisplay =
      product.title_display?.trim() || `${product.brand} ${product.name}`.trim();
    const isUniqueUnit = product.condition === "used" || resolvedVariants.length === 1;

    if (resolvedVariants.length === 1) {
      return {
        name: this.mappingService.buildLightspeedName({
          titleDisplay,
          sku: resolvedVariants[0].externalSku,
          condition: product.condition,
          sizeLabel: resolvedVariants[0].variant.size_label,
          isUniqueUnit,
        }),
        description: product.description ?? undefined,
        is_active: product.is_active,
        sku: resolvedVariants[0].externalSku,
        product_codes: [{ code: resolvedVariants[0].externalSku, type: "CUSTOM" }],
        price_including_tax: resolvedVariants[0].variant.price_cents / 100,
      };
    }

    return {
      name: titleDisplay,
      description: product.description ?? undefined,
      is_active: product.is_active,
      variants: resolvedVariants.map((entry) => ({
        name: titleDisplay,
        sku: entry.externalSku,
        product_codes: [{ code: entry.externalSku, type: "CUSTOM" }],
        price_including_tax: entry.variant.price_cents / 100,
        is_active: product.is_active,
        variant_definitions: [
          {
            name: "Size",
            value: entry.variant.size_label,
          },
        ],
      })),
    };
  }

  private buildUpdatePayload(
    product: Awaited<ReturnType<ProductRepository["getById"]>> extends infer T
      ? Exclude<T, null>
      : never,
    sku: string | null,
  ): LightspeedUpdateProductPayload {
    const titleDisplay =
      product.title_display?.trim() || `${product.brand} ${product.name}`.trim();

    return {
      common: {
        name: titleDisplay,
        description: product.description ?? undefined,
        is_active: product.is_active,
      },
      details: sku
        ? {
            sku,
            product_codes: [{ code: sku, type: "CUSTOM" }],
          }
        : undefined,
    };
  }

  private buildVariantExternalSku(
    productSku: string,
    input: {
      condition: string;
      brand: string;
      model: string;
      sizeLabel: string;
      variantIndex: number;
    },
  ) {
    const parts = productSku.split("-");
    const conditionCode =
      parts[0] ||
      this.mappingService.toSkuConditionCode(input.condition as "new" | "used");
    const brandCode = parts[1] || this.mappingService.toCode(input.brand, 3);
    const modelCode = parts[2] || this.mappingService.toCode(input.model, 3);
    const sizeCode = this.mappingService.toSizeCode(input.sizeLabel);
    const baseSequence = Number.parseInt(parts[4] ?? "1", 10);

    return this.skuService.buildSku({
      conditionCode,
      brandCode,
      modelCode,
      sizeCode,
      sequence: baseSequence + input.variantIndex,
    });
  }
}
