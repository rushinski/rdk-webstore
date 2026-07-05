import type { Category, Condition, SizeType } from "@/types/domain/product";

import type { TagChip } from "../TagInput";

import type { VariantDraft } from "./types";

export const AUTO_TAG_GROUP_KEYS = new Set([
  "brand",
  "model",
  "category",
  "condition",
  "designer_brand",
  "size_shoe",
  "size_clothing",
  "size_custom",
]);

export const getTagKey = (tag: { label: string; group_key: string }) =>
  `${tag.group_key}:${tag.label}`;

const normalizeTagKey = (tag: { label: string; group_key: string }) =>
  `${tag.group_key}:${tag.label.trim().toLowerCase()}`;

interface BuildAutoTagsArgs {
  parsedBrandLabel: string;
  parsedBrandGroup: string | null;
  parsedModelLabel: string;
  category: Category;
  condition: Condition;
  sizeType: SizeType;
  variants: VariantDraft[];
}

export function buildAutoTags({
  parsedBrandLabel,
  parsedBrandGroup,
  parsedModelLabel,
  category,
  condition,
  sizeType,
  variants,
}: BuildAutoTagsArgs): TagChip[] {
  const tags: TagChip[] = [];
  const seen = new Set<string>();

  const addTag = (label: string, group_key: string) => {
    const trimmed = label.trim();
    if (!trimmed) {
      return;
    }
    const key = `${group_key}:${trimmed}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    tags.push({ label: trimmed, group_key, source: "auto" });
  };

  if (parsedBrandLabel) {
    addTag(parsedBrandLabel, "brand");
    if (parsedBrandGroup === "designer") {
      addTag(parsedBrandLabel, "designer_brand");
    }
  }

  if (parsedModelLabel && category === "sneakers") {
    addTag(parsedModelLabel, "model");
  }

  addTag(category, "category");
  addTag(condition, "condition");

  if (sizeType === "none") {
    return tags;
  }

  const groupKey =
    sizeType === "shoe"
      ? "size_shoe"
      : sizeType === "clothing"
        ? "size_clothing"
        : "size_custom";

  variants.forEach((variant) => {
    const stockCount = Number.parseInt(variant.stock, 10);
    if (!Number.isFinite(stockCount) || stockCount <= 0) {
      return;
    }

    addTag(variant.size_label, groupKey);
  });

  return tags;
}

export function filterExcludedTags(
  tags: TagChip[],
  excludedTagKeys: string[],
): TagChip[] {
  return tags.filter((tag) => !excludedTagKeys.includes(getTagKey(tag)));
}

export function mergeUniqueTags(...tagGroups: TagChip[][]): TagChip[] {
  const seen = new Set<string>();

  return tagGroups.flat().filter((tag) => {
    const key = getTagKey(tag);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function appendUniqueCustomTag(
  customTags: TagChip[],
  allTags: TagChip[],
  label: string,
): TagChip[] {
  const trimmed = label.trim();
  if (!trimmed) {
    return customTags;
  }

  const newTag: TagChip = {
    label: trimmed,
    group_key: "custom",
    source: "custom",
  };
  const existingKeys = new Set(allTags.map(normalizeTagKey));

  return existingKeys.has(normalizeTagKey(newTag)) ? customTags : [...customTags, newTag];
}

export function removeTagSelection(
  tag: TagChip,
  customTags: TagChip[],
  excludedAutoTagKeys: string[],
): {
  customTags: TagChip[];
  excludedAutoTagKeys: string[];
} {
  if (tag.source === "auto") {
    const key = getTagKey(tag);
    return {
      customTags,
      excludedAutoTagKeys: excludedAutoTagKeys.includes(key)
        ? excludedAutoTagKeys
        : [...excludedAutoTagKeys, key],
    };
  }

  return {
    customTags: customTags.filter((item) => getTagKey(item) !== getTagKey(tag)),
    excludedAutoTagKeys,
  };
}
