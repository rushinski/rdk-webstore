import { LIGHTSPEED_CONDITION_MAP } from "@/config/constants/lightspeed";
import type {
  LightspeedRemoteProduct,
  NormalizedLightspeedProduct,
  LightspeedVariantDefinition,
  LightspeedVariantDefinitionInput,
} from "@/lib/lightspeed/types";
import type { Condition } from "@/types/domain/product";

export class LightspeedMappingService {
  toLightspeedCondition(condition: Condition) {
    return condition === "used"
      ? LIGHTSPEED_CONDITION_MAP.used
      : LIGHTSPEED_CONDITION_MAP.new;
  }

  toWebsiteCondition(condition: string): NormalizedLightspeedProduct["condition"] {
    return condition.toLowerCase() === "preowned" ? "used" : "new";
  }

  toSkuConditionCode(condition: Condition) {
    return condition === "used" ? "P" : "N";
  }

  toCode(value: string, length: number) {
    const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!normalized) {
      return "X".repeat(length);
    }

    return normalized.slice(0, length).padEnd(length, "X");
  }

  toSizeCode(sizeLabel: string) {
    const normalized = sizeLabel.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!normalized) {
      return "NA";
    }

    if (/^[0-9]+$/.test(normalized)) {
      return normalized.padStart(2, "0").slice(-2);
    }

    return normalized.slice(0, 2).padEnd(2, "X");
  }

  toRepresentativeSizeCode(sizeLabels: string[]) {
    const distinct = [...new Set(sizeLabels.map((size) => size.trim()).filter(Boolean))];
    if (distinct.length !== 1) {
      return "MV";
    }

    return this.toSizeCode(distinct[0]);
  }

  buildLightspeedName(input: {
    titleDisplay: string;
    sku: string;
    condition: Condition;
    sizeLabel: string;
    isUniqueUnit: boolean;
  }) {
    if (!input.isUniqueUnit) {
      return input.titleDisplay;
    }

    return `${input.titleDisplay} - ${input.sku}`;
  }

  cleanWebsiteName(rawName: string) {
    return rawName.replace(/\s+-\s+[A-Z]-[A-Z0-9-]+$/i, "").trim();
  }

  extractExternalSku(
    record?: Pick<LightspeedRemoteProduct, "id" | "sku" | "product_codes"> | null,
  ) {
    if (!record) {
      return null;
    }

    const directSku = record.sku?.trim();
    if (directSku) {
      return directSku;
    }

    const customCode = record.product_codes?.find(
      (code) => code.type?.trim().toUpperCase() === "CUSTOM" && code.code?.trim(),
    );

    if (customCode?.code?.trim()) {
      return customCode.code.trim();
    }

    const firstCode = record.product_codes?.find((code) => code.code?.trim());
    return firstCode?.code?.trim() || null;
  }

  buildVariantDefinitions(
    definitions: LightspeedVariantDefinitionInput[],
  ): LightspeedVariantDefinition[] {
    return definitions.map((definition) => ({
      attribute_id: definition.attributeId,
      value: definition.value,
    }));
  }

  normalizeRemoteProducts(
    records: LightspeedRemoteProduct[],
  ): NormalizedLightspeedProduct[] {
    return records.flatMap((record) => {
      const nested = Array.isArray(record.variants) ? record.variants : [];
      if (nested.length > 0) {
        return nested.map((variant) => this.normalizeRemoteProduct(variant, record));
      }

      return [this.normalizeRemoteProduct(record)];
    });
  }

  private normalizeRemoteProduct(
    record: LightspeedRemoteProduct,
    parent?: LightspeedRemoteProduct,
  ): NormalizedLightspeedProduct {
    const externalSku =
      this.extractExternalSku(record) ??
      this.extractExternalSku(parent) ??
      record.id;
    const rawName = record.name?.trim() || parent?.name?.trim() || externalSku;
    const condition: NormalizedLightspeedProduct["condition"] = this.extractCondition(
      record,
      parent,
      externalSku,
    );
    const category = this.normalizeCategory(
      record.product_category ??
        record.product_category_name ??
        parent?.product_category ??
        parent?.product_category_name ??
        null,
    );

    return {
      lightspeedProductId: record.id,
      externalSku,
      rawName,
      cleanName: this.cleanWebsiteName(rawName),
      description: record.description?.trim() || parent?.description?.trim() || null,
      brand: record.brand_name?.trim() || parent?.brand_name?.trim() || null,
      model: null,
      category,
      condition,
      sizeLabel: this.extractSizeLabel(record, parent),
      priceCents: this.extractPriceCents(record, parent),
      costCents: this.extractCostCents(record, parent),
      stock: this.extractStock(record, parent),
      isActive: this.toBoolean(
        record.is_active ?? record.active ?? parent?.is_active ?? parent?.active,
      ),
      isDeleted: Boolean(record.deleted_at ?? parent?.deleted_at),
      imageUrls: this.extractImages(record, parent),
    };
  }

  private extractCondition(
    record: LightspeedRemoteProduct,
    parent: LightspeedRemoteProduct | undefined,
    externalSku: string,
  ): NormalizedLightspeedProduct["condition"] {
    const value =
      this.findVariantOptionValue(record, "condition") ??
      this.findVariantOptionValue(parent, "condition");

    if (value) {
      return this.toWebsiteCondition(value);
    }

    return externalSku.toUpperCase().startsWith("P-") ? "used" : "new";
  }

  private extractSizeLabel(
    record: LightspeedRemoteProduct,
    parent?: LightspeedRemoteProduct,
  ) {
    return (
      this.findVariantOptionValue(record, "size") ??
      this.findVariantOptionValue(parent, "size") ??
      "One Size"
    );
  }

  private extractStock(
    record: LightspeedRemoteProduct,
    parent?: LightspeedRemoteProduct,
  ) {
    const direct = this.toNumber(record.inventory_Main_Outlet);
    if (direct !== null) {
      return direct;
    }

    const recordInventory = this.sumInventory(record.inventory);
    if (recordInventory !== null) {
      return recordInventory;
    }

    const parentDirect = this.toNumber(parent?.inventory_Main_Outlet);
    if (parentDirect !== null) {
      return parentDirect;
    }

    const parentInventory = this.sumInventory(parent?.inventory);
    return parentInventory ?? 0;
  }

  private extractPriceCents(
    record: LightspeedRemoteProduct,
    parent?: LightspeedRemoteProduct,
  ) {
    return (
      this.extractMoneyCents(record.price_including_tax) ??
      this.extractMoneyCents(record.retail_price) ??
      this.extractMoneyCents(parent?.price_including_tax) ??
      this.extractMoneyCents(parent?.retail_price)
    );
  }

  private extractCostCents(
    record: LightspeedRemoteProduct,
    parent?: LightspeedRemoteProduct,
  ) {
    return (
      this.extractMoneyCents(record.supply_price) ??
      this.extractMoneyCents(parent?.supply_price)
    );
  }

  private extractImages(
    record: LightspeedRemoteProduct,
    parent?: LightspeedRemoteProduct,
  ) {
    const images = record.images?.length ? record.images : (parent?.images ?? []);
    return images
      .map((image) => image.url?.trim() || image.src?.trim() || null)
      .filter((value): value is string => Boolean(value));
  }

  private findVariantOptionValue(
    record: LightspeedRemoteProduct | undefined,
    optionName: string,
  ) {
    if (!record) {
      return null;
    }

    const optionPairs = [
      [record.variant_option_one_name, record.variant_option_one_value],
      [record.variant_option_two_name, record.variant_option_two_value],
      [record.variant_option_three_name, record.variant_option_three_value],
    ] as const;

    for (const [name, value] of optionPairs) {
      if (name?.trim().toLowerCase() === optionName && value?.trim()) {
        return value.trim();
      }
    }

    const variantDefinition = record.variant_definitions?.find(
      (definition) => definition.name?.trim().toLowerCase() === optionName,
    );

    return variantDefinition?.value?.trim() || null;
  }

  private normalizeCategory(category: unknown) {
    const resolved = this.extractCategoryString(category);
    if (!resolved) {
      return null;
    }

    return resolved.toLowerCase();
  }

  private extractCategoryString(category: unknown): string | null {
    if (typeof category === "string") {
      const trimmed = category.trim();
      return trimmed || null;
    }

    if (Array.isArray(category)) {
      for (const value of category) {
        const extracted = this.extractCategoryString(value);
        if (extracted) {
          return extracted;
        }
      }
      return null;
    }

    if (category && typeof category === "object") {
      const record = category as Record<string, unknown>;
      return (
        this.extractCategoryString(record.name) ??
        this.extractCategoryString(record.label) ??
        this.extractCategoryString(record.value) ??
        null
      );
    }

    return null;
  }

  private toBoolean(value: boolean | number | null | undefined) {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      return value !== 0;
    }
    return false;
  }

  private toNumber(value: number | string | null | undefined) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private extractMoneyCents(value: number | string | null | undefined) {
    const amount = this.toNumber(value);
    return amount === null ? null : Math.round(amount * 100);
  }

  private sumInventory(
    levels:
      | Array<{ current_amount?: number | null; current_inventory_level?: number | null }>
      | null
      | undefined,
  ) {
    if (!levels?.length) {
      return null;
    }

    return levels.reduce((total, level) => {
      const amount = level.current_inventory_level ?? level.current_amount ?? 0;
      return total + amount;
    }, 0);
  }
}
