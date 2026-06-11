import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { LightspeedRemoteProduct } from "@/lib/lightspeed/types";
import { LightspeedLinksRepository } from "@/repositories/lightspeed-links-repo";
import { ProductRepository } from "@/repositories/product-repo";
import { LightspeedMappingService } from "@/services/lightspeed-mapping-service";
import { ProductTitleParserService } from "@/services/product-title-parser-service";
import { normalizeLabel } from "@/services/product-title-parser";
import { buildAutoProductTags, upsertTags } from "@/services/tag-service";
import type { Category, SizeType } from "@/types/domain/product";

export class LightspeedInboundSyncService {
  private readonly productRepo: ProductRepository;
  private readonly linksRepo: LightspeedLinksRepository;
  private readonly mappingService: LightspeedMappingService;
  private readonly parserService: ProductTitleParserService;

  constructor(private readonly supabase: TypedSupabaseClient) {
    this.productRepo = new ProductRepository(supabase);
    this.linksRepo = new LightspeedLinksRepository(supabase);
    this.mappingService = new LightspeedMappingService();
    this.parserService = new ProductTitleParserService(supabase);
  }

  async applyProductPayload(input: {
    tenantId: string;
    payload: LightspeedRemoteProduct;
    topic: "product.update";
    remoteModifiedAt: string;
  }) {
    const normalized = this.mappingService.normalizeRemoteProducts([input.payload]);
    const first = normalized[0];

    if (!first) {
      return { status: "skipped" as const, reason: "empty_payload" as const };
    }

    const existingLinks = await Promise.all(
      normalized.map(async (remote) => {
        const byVariantId = await this.linksRepo.getByLightspeedVariantId(
          input.tenantId,
          remote.lightspeedProductId,
        );
        if (byVariantId) {
          return byVariantId;
        }

        return this.linksRepo.getByExternalSku(input.tenantId, remote.externalSku);
      }),
    );

    const firstLink = existingLinks.find((link) => Boolean(link)) ?? null;
    if (
      firstLink?.last_website_modified_at &&
      firstLink.last_website_modified_at > input.remoteModifiedAt
    ) {
      return { status: "skipped" as const, reason: "stale_remote_write" as const };
    }

    const familyId =
      Array.isArray(input.payload.variants) && input.payload.variants.length > 0
        ? input.payload.id
        : first.lightspeedProductId;
    const category = this.toWebsiteCategory(first.category);
    const sizeType = this.inferSizeType(normalized.map((item) => item.sizeLabel));
    const parsed = await this.parserService.parseTitle({
      titleRaw: this.buildParserTitle(first.cleanName, first.brand),
      category,
      tenantId: input.tenantId,
    });
    const resolvedBrand = parsed.brand.label?.trim() || first.brand?.trim() || "Unknown";
    const resolvedModel = parsed.model.label?.trim() || null;
    const resolvedTags = buildAutoProductTags({
      brandLabel: resolvedBrand,
      brandGroupKey: parsed.brand.groupKey ?? null,
      modelLabel: resolvedModel,
      category,
      condition: first.condition,
      sizeType,
      variants: normalized.map((item) => ({
        size_label: item.sizeLabel,
        stock: item.stock,
      })),
    });

    const linkedProductId = firstLink?.product_id ?? null;
    if (!linkedProductId) {
      const createdProduct = await this.productRepo.create({
        tenant_id: input.tenantId,
        name: first.cleanName,
        brand: resolvedBrand,
        model: resolvedModel,
        category,
        condition: first.condition,
        size_type: sizeType,
        description: first.description,
        shipping_price_cents: null,
        is_active: first.isActive && !first.isDeleted,
        is_out_of_stock: normalized.every((item) => item.stock <= 0),
        excluded_auto_tag_keys: [],
        go_live_at: new Date().toISOString(),
        product_created_at: input.payload.created_at ?? new Date().toISOString(),
        product_updated_at:
          input.payload.updated_at ?? input.remoteModifiedAt ?? new Date().toISOString(),
      });

      for (const [index, remote] of normalized.entries()) {
        const createdVariant = await this.productRepo.createVariant({
          tenant_id: input.tenantId,
          product_id: createdProduct.id,
          sku: remote.externalSku,
          size_label: remote.sizeLabel,
          sale_price_cents: remote.priceCents ?? 0,
          unit_cost_cents: remote.costCents ?? 0,
          stock: remote.stock,
          sort_order: index,
        });

        await this.linksRepo.upsertLink({
          tenantId: input.tenantId,
          productId: createdProduct.id,
          variantId: createdVariant.id,
          externalSku: remote.externalSku,
          lightspeedFamilyId: familyId,
          lightspeedProductId: familyId,
          lightspeedVariantId: remote.lightspeedProductId,
          syncState: "linked",
          lastLightspeedModifiedAt: input.remoteModifiedAt,
          lastSyncDirection: "lightspeed_to_website",
        });
      }

      for (const [index, imageUrl] of first.imageUrls.entries()) {
        await this.productRepo.createImage({
          product_id: createdProduct.id,
          url: imageUrl,
          sort_order: index,
          is_primary: index === 0,
        });
      }

      await this.syncProductTags(createdProduct.id, input.tenantId, resolvedTags);

      return { status: "applied" as const, productId: createdProduct.id };
    }

    await this.productRepo.update(linkedProductId, {
      name: first.cleanName,
      brand: resolvedBrand,
      model: resolvedModel,
      category,
      condition: first.condition,
      size_type: sizeType,
      description: first.description,
      is_active: first.isActive && !first.isDeleted,
      is_out_of_stock: normalized.every((item) => item.stock <= 0),
      product_created_at: input.payload.created_at ?? undefined,
      product_updated_at:
        input.payload.updated_at ?? input.remoteModifiedAt ?? new Date().toISOString(),
    });

    await this.productRepo.deleteImagesByProduct(linkedProductId);
    for (const [index, imageUrl] of first.imageUrls.entries()) {
      await this.productRepo.createImage({
        product_id: linkedProductId,
        url: imageUrl,
        sort_order: index,
        is_primary: index === 0,
      });
    }

    const persistedLinks = await this.linksRepo.listByProductId(
      input.tenantId,
      linkedProductId,
    );
    const incomingSkus = new Set(normalized.map((remote) => remote.externalSku));

    for (const link of persistedLinks) {
      if (!incomingSkus.has(link.external_sku)) {
        await this.linksRepo.updateLinkById(link.id, {
          productId: linkedProductId,
          variantId: null,
          syncState: "deleted",
          lastLightspeedModifiedAt: input.remoteModifiedAt,
          lastSyncDirection: "lightspeed_to_website",
          tombstonedAt: input.remoteModifiedAt,
          lastError: null,
        });

        if (link.variant_id) {
          await this.productRepo.deleteVariant(link.variant_id);
        }
      }
    }

    for (const [index, remote] of normalized.entries()) {
      const existingLink =
        existingLinks[index] ??
        persistedLinks.find((link) => link.external_sku === remote.externalSku) ??
        null;

      if (existingLink?.variant_id) {
        await this.productRepo.updateVariant(existingLink.variant_id, {
          sku: remote.externalSku,
          size_label: remote.sizeLabel,
          sale_price_cents: remote.priceCents ?? 0,
          unit_cost_cents: remote.costCents ?? 0,
          stock: remote.stock,
          sort_order: index,
        });

        await this.linksRepo.upsertLink({
          tenantId: input.tenantId,
          productId: linkedProductId,
          variantId: existingLink.variant_id,
          externalSku: remote.externalSku,
          lightspeedFamilyId: familyId,
          lightspeedProductId: familyId,
          lightspeedVariantId: remote.lightspeedProductId,
          syncState: "linked",
          lastLightspeedModifiedAt: input.remoteModifiedAt,
          lastSyncDirection: "lightspeed_to_website",
          tombstonedAt: null,
          lastError: null,
        });
        continue;
      }

      const createdVariant = await this.productRepo.createVariant({
        tenant_id: input.tenantId,
        product_id: linkedProductId,
        sku: remote.externalSku,
        size_label: remote.sizeLabel,
        sale_price_cents: remote.priceCents ?? 0,
        unit_cost_cents: remote.costCents ?? 0,
        stock: remote.stock,
        sort_order: index,
      });

      await this.linksRepo.upsertLink({
        tenantId: input.tenantId,
        productId: linkedProductId,
        variantId: createdVariant.id,
        externalSku: remote.externalSku,
        lightspeedFamilyId: familyId,
        lightspeedProductId: familyId,
        lightspeedVariantId: remote.lightspeedProductId,
        syncState: "linked",
        lastLightspeedModifiedAt: input.remoteModifiedAt,
        lastSyncDirection: "lightspeed_to_website",
        tombstonedAt: null,
        lastError: null,
      });
    }

    await this.syncProductTags(linkedProductId, input.tenantId, resolvedTags);

    return { status: "applied" as const, productId: linkedProductId };
  }

  async applyDelete(input: {
    tenantId: string;
    lightspeedFamilyId: string;
    remoteModifiedAt: string;
  }) {
    const links = await this.linksRepo.getByLightspeedProductId(
      input.tenantId,
      input.lightspeedFamilyId,
    );

    const blockingLink = links.find(
      (link) =>
        link.last_website_modified_at &&
        link.last_website_modified_at > input.remoteModifiedAt,
    );

    if (blockingLink) {
      return { status: "skipped" as const, reason: "stale_remote_write" as const };
    }

    const deletedProductIds = [
      ...new Set(
        links
          .map((link) => link.product_id)
          .filter((productId): productId is string => typeof productId === "string"),
      ),
    ];

    for (const link of links) {
      await this.linksRepo.updateLinkById(link.id, {
        productId: null,
        variantId: null,
        syncState: "deleted",
        lastLightspeedModifiedAt: input.remoteModifiedAt,
        lastSyncDirection: "lightspeed_to_website",
        tombstonedAt: input.remoteModifiedAt,
        lastError: null,
      });
    }

    for (const productId of deletedProductIds) {
      await this.productRepo.delete(productId);
    }

    return { status: "applied" as const, deletedProductIds };
  }

  private toWebsiteCategory(category: string | null): Category {
    const normalized = category?.trim().toLowerCase() ?? "";
    if (normalized === "clothing") {
      return "clothing";
    }
    if (normalized === "accessories") {
      return "accessories";
    }
    if (normalized === "electronics") {
      return "electronics";
    }
    return "sneakers";
  }

  private inferSizeType(sizeLabels: string[]): SizeType {
    const normalized = sizeLabels.map((label) => label.trim().toUpperCase());

    if (
      normalized.some(
        (label) => /^\d/.test(label) || label.includes("M") || label.endsWith("W"),
      )
    ) {
      return "shoe";
    }

    if (
      normalized.some((label) =>
        ["XS", "S", "SMALL", "M", "MEDIUM", "L", "LARGE", "XL", "XXL"].includes(label),
      )
    ) {
      return "clothing";
    }

    return "custom";
  }

  private buildParserTitle(cleanName: string, brandHint: string | null) {
    const trimmedName = cleanName.trim();
    const trimmedBrand = brandHint?.trim() || null;

    if (!trimmedBrand) {
      return trimmedName;
    }

    const normalizedName = normalizeLabel(trimmedName);
    const normalizedBrand = normalizeLabel(trimmedBrand);
    if (!normalizedBrand) {
      return trimmedName;
    }

    if (
      normalizedName === normalizedBrand ||
      normalizedName.startsWith(`${normalizedBrand} `)
    ) {
      return trimmedName;
    }

    return `${trimmedBrand} ${trimmedName}`.trim();
  }

  private async syncProductTags(
    productId: string,
    tenantId: string,
    tags: Array<{ label: string; group_key: string }>,
  ) {
    await this.productRepo.unlinkProductTags(productId);
    const persistedTags = await upsertTags(this.supabase, { tenantId, tags });

    for (const tag of persistedTags) {
      await this.productRepo.linkProductTag(productId, tag.id);
    }
  }
}
