import type {
  AliasEditDraft,
  BrandEditDraft,
  EditDraft,
  EditTarget,
  ModelEditDraft,
} from "@/components/admin/catalog/types";

export function buildCatalogEditDraft(editTarget: EditTarget | null): EditDraft | null {
  if (!editTarget) {
    return null;
  }

  if (editTarget.type === "brand") {
    const draft: BrandEditDraft = {
      canonical_label: editTarget.item.canonical_label,
      is_active: editTarget.item.is_active,
      is_verified: editTarget.item.is_verified,
    };
    return draft;
  }

  if (editTarget.type === "model") {
    const draft: ModelEditDraft = {
      canonical_label: editTarget.item.canonical_label,
      brand_id: editTarget.item.brand_id,
      is_active: editTarget.item.is_active,
      is_verified: editTarget.item.is_verified,
    };
    return draft;
  }

  const draft: AliasEditDraft = {
    alias_label: editTarget.item.alias_label,
    priority: editTarget.item.priority ?? 0,
    is_active: editTarget.item.is_active,
  };
  return draft;
}
