import { LightspeedClient } from "@/lib/lightspeed/client";
import type {
  LightspeedCreateProductPayload,
  LightspeedUpdateProductPayload,
} from "@/lib/lightspeed/types";
import { ProductRepository } from "@/repositories/product-repo";
import { LightspeedLinksRepository } from "@/repositories/lightspeed-links-repo";
import { LightspeedSettingsRepository } from "@/repositories/lightspeed-settings-repo";
import { DeletedProductRecoveryRepository } from "@/repositories/deleted-product-recovery-repo";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { LightspeedMappingService } from "@/services/lightspeed-mapping-service";
import { LightspeedSkuService } from "@/services/lightspeed-sku-service";

type WebsiteProduct = Exclude<Awaited<ReturnType<ProductRepository["getById"]>>, null>;
type ResolvedVariant = {
  externalSku: string;
  variant: {
    size_label: string;
    sale_price_cents: number;
    unit_cost_cents?: number;
    stock?: number;
  };
};

export class LightspeedProductSyncService {
  private readonly productRepo: ProductRepository;
  private readonly settingsRepo: LightspeedSettingsRepository;
  private readonly linksRepo: LightspeedLinksRepository;
  private readonly deletedProductRecoveryRepo: DeletedProductRecoveryRepository;
  private readonly mappingService: LightspeedMappingService;
  private readonly skuService: LightspeedSkuService;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.productRepo = new ProductRepository(supabase);
    this.settingsRepo = new LightspeedSettingsRepository(supabase);
    this.linksRepo = new LightspeedLinksRepository(supabase);
    this.deletedProductRecoveryRepo = new DeletedProductRecoveryRepository(supabase);
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
      archivedStatus: "all",
    });

    if (!product) {
      throw new Error("Product not found for Lightspeed sync.");
    }

    if (product.archived_at) {
      return { status: "skipped" as const, reason: "product_archived" as const };
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
          variant.sku?.trim() ??
          this.buildVariantExternalSku(variant.sku, {
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
    let lightspeedFamilyId =
      primaryLink?.lightspeed_family_id ?? primaryLink?.lightspeed_product_id ?? null;
    const syncTimestamp = new Date().toISOString();

    if (lightspeedFamilyId) {
      const attributeIds = await this.ensureVariantAttributeIds(client);
      const defaultOutletId = await this.resolveDefaultOutletId(client);
      await this.updateProductWithDuplicateNameRetry({
        client,
        product,
        lightspeedFamilyId,
        resolvedVariants,
        attributeIds,
        defaultOutletId,
      });
    } else {
      const attributeIds = await this.ensureVariantAttributeIds(client);
      const defaultOutletId = await this.resolveDefaultOutletId(client);
      const payload = this.buildCreatePayload(
        product,
        resolvedVariants,
        attributeIds,
        defaultOutletId,
      );
      const response = await this.createProductWithDuplicateNameRetry({
        client,
        product,
        resolvedVariants,
        attributeIds,
        defaultOutletId,
        payload,
      });
      const ids = Array.isArray(response.data)
        ? response.data
        : response.data?.id
          ? [response.data.id]
          : [];
      lightspeedFamilyId = ids[0] ?? null;

      resolvedVariants.forEach((entry, index) => {
        entry.existingLink = entry.existingLink
          ? {
              ...entry.existingLink,
              lightspeed_variant_id: ids[index + 1] ?? null,
            }
          : {
              id: "",
              tenant_id: options.tenantId,
              product_id: product.id,
              variant_id: entry.variant.id,
              lightspeed_family_id: lightspeedFamilyId,
              lightspeed_product_id: lightspeedFamilyId,
              lightspeed_variant_id: ids[index + 1] ?? null,
              lightspeed_inventory_item_id: null,
              external_sku: entry.externalSku,
              sync_state: "linked",
              last_website_modified_at: null,
              last_lightspeed_modified_at: null,
              last_sync_direction: null,
              tombstoned_at: null,
              last_error: null,
            };
      });
    }

    for (const entry of resolvedVariants) {
      await this.linksRepo.upsertLink({
        tenantId: options.tenantId,
        productId: product.id,
        variantId: entry.variant.id,
        externalSku: entry.externalSku,
        lightspeedFamilyId,
        lightspeedProductId: lightspeedFamilyId,
        lightspeedVariantId: entry.existingLink?.lightspeed_variant_id ?? null,
        syncState: "linked",
        lastWebsiteModifiedAt: syncTimestamp,
        lastSyncDirection: "website_to_lightspeed",
        tombstonedAt: null,
        lastError: null,
      });
    }

    return {
      status: "synced" as const,
      lightspeedFamilyId,
      variantCount: resolvedVariants.length,
    };
  }

  async syncVariantInventory(input: {
    tenantId: string;
    variantId: string;
    stock: number;
    websiteModifiedAt: string;
  }) {
    const connection = await this.settingsRepo.getConnectionByTenant(input.tenantId);
    if (!connection.syncEnabled) {
      return { status: "skipped" as const, reason: "sync_disabled" as const };
    }

    if (!connection.domainPrefix || !connection.accessToken) {
      throw new Error(
        "Lightspeed sync is enabled but the store is not fully connected yet.",
      );
    }

    const link = await this.linksRepo.getByVariantId(input.tenantId, input.variantId);
    if (!link?.lightspeed_variant_id && !link?.lightspeed_product_id) {
      return { status: "skipped" as const, reason: "missing_remote_link" as const };
    }

    if (
      link.last_lightspeed_modified_at &&
      link.last_lightspeed_modified_at > input.websiteModifiedAt
    ) {
      return { status: "skipped" as const, reason: "stale_website_write" as const };
    }

    const client = new LightspeedClient({
      domainPrefix: connection.domainPrefix,
      accessToken: connection.accessToken,
    });

    await client.updateProduct(
      link.lightspeed_variant_id ?? link.lightspeed_product_id!,
      {
        details: {
          inventory: [{ current_amount: Math.max(0, input.stock) }],
        },
      },
    );

    await this.linksRepo.upsertLink({
      tenantId: input.tenantId,
      productId: link.product_id,
      variantId: link.variant_id,
      externalSku: link.external_sku,
      lightspeedFamilyId: link.lightspeed_family_id,
      lightspeedProductId: link.lightspeed_product_id,
      lightspeedVariantId: link.lightspeed_variant_id,
      lightspeedInventoryItemId: link.lightspeed_inventory_item_id,
      syncState: "linked",
      lastWebsiteModifiedAt: input.websiteModifiedAt,
      lastSyncDirection: "website_to_lightspeed",
      tombstonedAt: null,
      lastError: null,
    });

    return { status: "synced" as const };
  }

  async deleteWebsiteProduct(input: {
    tenantId: string;
    productId: string;
    websiteModifiedAt?: string;
    deletedByUserId?: string;
  }) {
    const connection = await this.settingsRepo.getConnectionByTenant(input.tenantId);
    if (!connection.syncEnabled) {
      return { status: "skipped" as const, reason: "sync_disabled" as const };
    }

    if (!connection.domainPrefix || !connection.accessToken) {
      throw new Error(
        "Lightspeed sync is enabled but the store is not fully connected yet.",
      );
    }

    const links = await this.linksRepo.listByProductId(input.tenantId, input.productId);
    if (links.length === 0) {
      return { status: "skipped" as const, reason: "missing_remote_link" as const };
    }

    const product = await this.productRepo.getById(input.productId, {
      tenantId: input.tenantId,
      includeOutOfStock: true,
      includeUnpublished: true,
      archivedStatus: "all",
    });
    if (!product) {
      throw new Error("Product snapshot could not be loaded before delete.");
    }

    const client = new LightspeedClient({
      domainPrefix: connection.domainPrefix,
      accessToken: connection.accessToken,
    });

    const familyIds = [
      ...new Set(
        links
          .map((link) => link.lightspeed_family_id ?? link.lightspeed_product_id)
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const remoteIds =
      familyIds.length > 0
        ? familyIds
        : [
            ...new Set(
              links
                .map((link) => link.lightspeed_variant_id)
                .filter((value): value is string => Boolean(value)),
            ),
          ];

    const lightspeedProductSnapshots = await Promise.all(
      remoteIds.map(async (remoteId) => ({
        remoteId,
        payload: await client.getProduct(remoteId),
      })),
    );
    if (lightspeedProductSnapshots.some((snapshot) => !snapshot.payload)) {
      throw new Error("Lightspeed product snapshot could not be loaded before delete.");
    }

    const syncTimestamp = input.websiteModifiedAt ?? new Date().toISOString();
    await this.deletedProductRecoveryRepo.recordDeletion({
      tenantId: input.tenantId,
      productId: product.id,
      deletedByUserId: input.deletedByUserId ?? null,
      deletedAt: syncTimestamp,
      localProductSnapshot: product,
      lightspeedProductSnapshots,
      links,
      metadata: {
        domainPrefix: connection.domainPrefix,
        deletedRemoteIds: remoteIds,
        syncDirection: "website_to_lightspeed",
      },
    });

    for (const remoteId of remoteIds) {
      await client.deleteProduct(remoteId);
    }

    for (const link of links) {
      await this.linksRepo.updateLinkById(link.id, {
        syncState: "deleted",
        lastWebsiteModifiedAt: syncTimestamp,
        lastSyncDirection: "website_to_lightspeed",
        tombstonedAt: syncTimestamp,
        lastError: null,
      });
    }

    return {
      status: "synced" as const,
      deletedRemoteIds: remoteIds,
    };
  }

  private buildCreatePayload(
    product: WebsiteProduct,
    resolvedVariants: ResolvedVariant[],
    attributeIds: { conditionAttributeId: string; sizeAttributeId: string },
    defaultOutletId: string,
    nameOverride?: string | null,
  ): LightspeedCreateProductPayload {
    const titleDisplay = nameOverride?.trim() || product.name.trim();

    return {
      name: titleDisplay,
      description: product.description ?? undefined,
      is_active: product.is_active,
      variants: resolvedVariants.map((entry) => ({
        name: titleDisplay,
        sku: entry.externalSku,
        product_codes: [{ code: entry.externalSku, type: "CUSTOM" }],
        price_excluding_tax: entry.variant.sale_price_cents / 100,
        supply_price:
          entry.variant.unit_cost_cents !== undefined
            ? entry.variant.unit_cost_cents / 100
            : undefined,
        is_active: product.is_active,
        inventory: [
          {
            current_amount: Math.max(0, entry.variant.stock ?? 0),
            outlet_id: defaultOutletId,
          },
        ],
        variant_definitions: this.mappingService.buildVariantDefinitions([
          {
            attributeId: attributeIds.conditionAttributeId,
            name: "Condition",
            value: this.toLightspeedConditionVariantValue(product.condition),
          },
          {
            attributeId: attributeIds.sizeAttributeId,
            name: "Size",
            value: entry.variant.size_label,
          },
        ]),
      })),
    };
  }

  private async ensureVariantAttributeIds(client: LightspeedClient) {
    const [conditionAttributeId, sizeAttributeId] = await Promise.all([
      this.ensureVariantAttributeId(client, "Condition"),
      this.ensureVariantAttributeId(client, "Size"),
    ]);

    return { conditionAttributeId, sizeAttributeId };
  }

  private async resolveDefaultOutletId(client: LightspeedClient) {
    const outlets = await client.listOutlets();
    const outlet =
      outlets.find((entry) => entry.is_default === true || entry.default === true) ??
      outlets[0];

    const outletId = outlet?.id?.trim();
    if (!outletId) {
      throw new Error("Lightspeed outlet lookup returned no usable outlet id.");
    }

    return outletId;
  }

  private async ensureVariantAttributeId(client: LightspeedClient, name: string) {
    const normalizedName = name.trim().toLowerCase();
    const existing = (await client.listVariantAttributes()).find(
      (attribute) => attribute.name.trim().toLowerCase() === normalizedName,
    );

    if (existing) {
      return existing.id;
    }

    return (await client.createVariantAttribute(name)).id;
  }

  private toLightspeedConditionVariantValue(condition: "new" | "used") {
    return condition === "used" ? "Preowned" : "New";
  }

  private buildUpdateCommonPayload(
    product: WebsiteProduct,
    nameOverride?: string | null,
  ): LightspeedUpdateProductPayload {
    const titleDisplay = nameOverride?.trim() || product.name.trim();

    return {
      common: {
        name: titleDisplay,
        description: product.description ?? undefined,
        track_inventory: true,
      },
    };
  }

  private buildVariantUpdatePayload(
    product: WebsiteProduct,
    resolvedVariant: ResolvedVariant,
    attributeIds: { conditionAttributeId: string; sizeAttributeId: string },
    defaultOutletId: string,
  ): LightspeedUpdateProductPayload {
    return {
      details: {
        product_codes: [{ code: resolvedVariant.externalSku, type: "CUSTOM" }],
        inventory: [
          {
            current_amount: Math.max(0, resolvedVariant.variant.stock ?? 0),
            outlet_id: defaultOutletId,
          },
        ],
        is_active: product.is_active,
        variant_attribute_values: [
          {
            attribute_id: attributeIds.conditionAttributeId,
            attribute_value: this.toLightspeedConditionVariantValue(product.condition),
          },
          {
            attribute_id: attributeIds.sizeAttributeId,
            attribute_value: resolvedVariant.variant.size_label,
          },
        ],
      },
    };
  }

  private isDuplicateNameError(error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : JSON.stringify(error);

    const normalized = message.toLowerCase();
    return (
      normalized.includes("name already exists") ||
      normalized.includes("product with this name already exists")
    );
  }

  private buildFallbackLightspeedName(productName: string, sku: string | null) {
    const cleanName = productName.trim();
    const cleanSku = sku?.trim() || null;
    if (!cleanSku) {
      return null;
    }

    return `${cleanName} - ${cleanSku}`;
  }

  private async createProductWithDuplicateNameRetry(input: {
    client: LightspeedClient;
    product: WebsiteProduct;
    resolvedVariants: ResolvedVariant[];
    attributeIds: { conditionAttributeId: string; sizeAttributeId: string };
    defaultOutletId: string;
    payload: LightspeedCreateProductPayload;
  }) {
    try {
      return await input.client.createProduct(input.payload);
    } catch (error) {
      const fallbackSku = input.resolvedVariants[0]?.externalSku ?? null;
      const fallbackName =
        input.product.condition === "used"
          ? this.buildFallbackLightspeedName(input.product.name, fallbackSku)
          : null;

      if (!fallbackName || !this.isDuplicateNameError(error)) {
        throw error;
      }

      return input.client.createProduct(
        this.buildCreatePayload(
          input.product,
          input.resolvedVariants,
          input.attributeIds,
          input.defaultOutletId,
          fallbackName,
        ),
      );
    }
  }

  private async updateProductWithDuplicateNameRetry(input: {
    client: LightspeedClient;
    product: WebsiteProduct;
    lightspeedFamilyId: string;
    resolvedVariants: Array<
      ResolvedVariant & {
        existingLink?: {
          lightspeed_variant_id?: string | null;
          lightspeed_product_id?: string | null;
        } | null;
      }
    >;
    attributeIds: { conditionAttributeId: string; sizeAttributeId: string };
    defaultOutletId: string;
  }) {
    const primarySku = input.resolvedVariants[0]?.externalSku ?? null;
    const payload = this.buildUpdateCommonPayload(input.product);

    try {
      await input.client.updateProduct(input.lightspeedFamilyId, payload);
    } catch (error) {
      const fallbackName =
        input.product.condition === "used"
          ? this.buildFallbackLightspeedName(input.product.name, primarySku)
          : null;

      if (!fallbackName || !this.isDuplicateNameError(error)) {
        throw error;
      }

      await input.client.updateProduct(
        input.lightspeedFamilyId,
        this.buildUpdateCommonPayload(input.product, fallbackName),
      );
    }

    for (const resolvedVariant of input.resolvedVariants) {
      const targetProductId =
        resolvedVariant.existingLink?.lightspeed_variant_id ??
        resolvedVariant.existingLink?.lightspeed_product_id ??
        input.lightspeedFamilyId;

      await input.client.updateProduct(
        targetProductId,
        this.buildVariantUpdatePayload(
          input.product,
          resolvedVariant,
          input.attributeIds,
          input.defaultOutletId,
        ),
      );
    }
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
