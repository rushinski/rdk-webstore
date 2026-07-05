import type { DragEndEvent } from "@dnd-kit/core";

import type { SizeType } from "@/types/domain/product";

import type { VariantDraft } from "./types";

interface CreateEmptyVariantDraftArgs {
  sizeType: SizeType;
  createVariantDraftId: () => string;
  createDraftSku: () => string;
}

export function createEmptyVariantDraft({
  sizeType,
  createVariantDraftId,
  createDraftSku,
}: CreateEmptyVariantDraftArgs): VariantDraft {
  return {
    draft_id: createVariantDraftId(),
    sku: createDraftSku(),
    size_label: sizeType === "none" ? "N/A" : "",
    salePrice: "",
    unitCost: "",
    stock: "1",
  };
}

export function resetVariantsForSizeType(
  variants: VariantDraft[],
  sizeType: SizeType,
): VariantDraft[] {
  return variants.map((variant) => {
    if (sizeType === "none") {
      return { ...variant, size_label: "N/A" };
    }
    if (sizeType === "custom") {
      return variant.size_label === "N/A" ? { ...variant, size_label: "" } : variant;
    }
    return { ...variant, size_label: "" };
  });
}

export function updateVariantFieldAt(
  variants: VariantDraft[],
  index: number,
  field: keyof VariantDraft,
  value: string,
): VariantDraft[] {
  return variants.map((variant, currentIndex) =>
    currentIndex === index ? { ...variant, [field]: value } : variant,
  );
}

export function reorderVariantsByDraftId(
  variants: VariantDraft[],
  activeId: string,
  overId: string,
  reorder: (items: VariantDraft[], oldIndex: number, newIndex: number) => VariantDraft[],
): VariantDraft[] {
  const oldIndex = variants.findIndex((variant) => variant.draft_id === activeId);
  const newIndex = variants.findIndex((variant) => variant.draft_id === overId);

  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
    return variants;
  }

  return reorder(variants, oldIndex, newIndex);
}

export function buildVariantSizeOptions(
  sizes: readonly string[],
  selectedValue: string,
): { value: string; label: string }[] {
  const trimmedValue = selectedValue.trim();
  const base = sizes.map((size) => ({ value: size, label: size }));
  const hasValue = trimmedValue.length > 0;
  const inList = hasValue && sizes.includes(trimmedValue);
  const withSelected =
    !hasValue || inList ? base : [{ value: trimmedValue, label: trimmedValue }, ...base];

  return [{ value: "", label: "Select..." }, ...withSelected];
}

export function shouldHandleVariantDrag(
  event: DragEndEvent,
): event is DragEndEvent & { over: NonNullable<DragEndEvent["over"]> } {
  return Boolean(event.over) && event.active.id !== event.over?.id;
}
