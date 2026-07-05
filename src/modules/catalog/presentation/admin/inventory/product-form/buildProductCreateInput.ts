import type { Category, Condition, SizeType } from "@/types/domain/product";

import type { TagChip } from "../TagInput";
import type { ProductFormSubmitInput } from "../productEditorTypes";

import type { ImageDraft, PublishMode, VariantDraft } from "./types";

interface BuildProductCreateInputArgs {
  titleRaw: string;
  brandOverrideId: string | null;
  modelOverrideId: string | null;
  category: Category;
  condition: Condition;
  sizeType: SizeType;
  description: string;
  shippingPrice: string;
  publishMode: PublishMode;
  scheduledGoLiveAt: string;
  variants: VariantDraft[];
  images: ImageDraft[];
  allTags: TagChip[];
  excludedAutoTagKeys: string[];
  now?: Date;
}

const normalizeImages = (items: ImageDraft[]) => {
  const hasPrimary = items.some((item) => item.is_primary);
  return items.map((item, index) => ({
    ...item,
    sort_order: index,
    is_primary: hasPrimary ? item.is_primary : index === 0,
  }));
};

const parseMoneyToCents = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.round(parsed * 100);
};

const parseStockCount = (value: string) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.max(parsed, 0);
};

export function buildProductCreateInput({
  titleRaw,
  brandOverrideId,
  modelOverrideId,
  category,
  condition,
  sizeType,
  description,
  shippingPrice,
  publishMode,
  scheduledGoLiveAt,
  variants,
  images,
  allTags,
  excludedAutoTagKeys,
  now = new Date(),
}: BuildProductCreateInputArgs): ProductFormSubmitInput {
  const trimmedTitle = titleRaw.trim();
  if (!trimmedTitle) {
    throw new Error("Full title is required.");
  }

  const trimmedShipping = shippingPrice.trim();
  const shippingCents = trimmedShipping ? parseMoneyToCents(trimmedShipping) : null;
  if (trimmedShipping && shippingCents === null) {
    throw new Error("Please enter a valid shipping price.");
  }

  const seenSizeKeys = new Set<string>();
  const preparedVariants = variants.map((variant, index) => {
    const priceCents = parseMoneyToCents(variant.salePrice);
    if (priceCents === null) {
      throw new Error(`Variant ${index + 1} price is invalid.`);
    }

    const costCents = parseMoneyToCents(variant.unitCost);
    if (costCents === null) {
      throw new Error(`Variant ${index + 1} cost is invalid.`);
    }

    const stockCount = parseStockCount(variant.stock);
    if (stockCount === null) {
      throw new Error(`Variant ${index + 1} stock is invalid.`);
    }

    const sizeLabel = sizeType === "none" ? "N/A" : variant.size_label.trim();
    if (sizeType !== "none" && !sizeLabel) {
      throw new Error(`Variant ${index + 1} size is required.`);
    }

    const sizeKey = `${sizeType}:${sizeLabel.toLowerCase()}`;
    if (seenSizeKeys.has(sizeKey)) {
      throw new Error(`Duplicate size "${sizeLabel}" found in variants.`);
    }
    seenSizeKeys.add(sizeKey);

    return {
      ...(variant.id ? { id: variant.id } : {}),
      sku: variant.sku,
      size_label: sizeLabel,
      sale_price_cents: priceCents,
      unit_cost_cents: costCents,
      stock: stockCount,
      sort_order: index,
    };
  });

  const preparedImages = normalizeImages(images)
    .map((image) => ({
      url: image.url.trim(),
      sort_order: image.sort_order,
      is_primary: image.is_primary,
    }))
    .filter((image) => image.url);

  let goLiveAt = now.toISOString();
  if (publishMode === "scheduled") {
    const value = scheduledGoLiveAt.trim();
    if (!value) {
      throw new Error("Please choose a go-live date and time.");
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Go-live date/time is invalid.");
    }
    const nowMinute = new Date(now);
    nowMinute.setSeconds(0, 0);
    if (parsed.getTime() < nowMinute.getTime()) {
      throw new Error("Go-live date/time cannot be in the past.");
    }
    goLiveAt = parsed.toISOString();
  }

  return {
    name: trimmedTitle,
    brand_override_id: brandOverrideId ?? undefined,
    model_override_id: modelOverrideId ?? undefined,
    category,
    condition,
    size_type: sizeType,
    description: description || undefined,
    shipping_price_cents: shippingCents,
    go_live_at: goLiveAt,
    variants: preparedVariants,
    images: preparedImages,
    tags: allTags.map((tag) => ({ label: tag.label, group_key: tag.group_key })),
    excluded_auto_tag_keys: excludedAutoTagKeys,
  };
}
