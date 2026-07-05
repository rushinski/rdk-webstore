"use client";

import type {
  Alias,
  AliasEditDraft,
  Brand,
  BrandEditDraft,
  EditDraft,
  EditTarget,
  Model,
  ModelEditDraft,
  NewAliasDraft,
} from "@/modules/catalog/presentation/admin/catalog/types";

export function validateCreateBrand({
  brands,
  defaultGroupId,
  label,
  normalizeLabel,
  toTitleCase,
}: {
  brands: Brand[];
  defaultGroupId: string | null;
  label: string;
  normalizeLabel: (value: string) => string;
  toTitleCase: (value: string) => string;
}) {
  if (!label.trim()) {
    return { error: "Brand label is required." };
  }
  if (!defaultGroupId) {
    return { error: "Unable to create brand: missing default configuration." };
  }

  const formattedLabel = toTitleCase(label);
  const normalized = normalizeLabel(formattedLabel);
  const isDuplicate = brands.some(
    (brand) => normalizeLabel(brand.canonical_label) === normalized,
  );

  if (isDuplicate) {
    return { error: "Brand already exists." };
  }

  return { formattedLabel };
}

export function validateCreateModel({
  brandId,
  label,
  models,
  normalizeLabel,
  toTitleCase,
}: {
  brandId: string;
  label: string;
  models: Model[];
  normalizeLabel: (value: string) => string;
  toTitleCase: (value: string) => string;
}) {
  if (!brandId || !label.trim()) {
    return { error: "Brand and model label are required." };
  }

  const formattedLabel = toTitleCase(label);
  const normalized = normalizeLabel(formattedLabel);
  const isDuplicate = models.some(
    (model) =>
      model.brand_id === brandId && normalizeLabel(model.canonical_label) === normalized,
  );

  if (isDuplicate) {
    return { error: "Model already exists for this brand." };
  }

  return { formattedLabel };
}

export function validateCreateAlias({
  aliases,
  newAlias,
  normalizeLabel,
}: {
  aliases: Alias[];
  newAlias: NewAliasDraft;
  normalizeLabel: (value: string) => string;
}) {
  if (!newAlias.label.trim() || !newAlias.entityId) {
    return { error: "Alias label and entity are required." };
  }

  const normalized = normalizeLabel(newAlias.label);
  const isDuplicate = aliases.some((alias) => {
    const targetId = alias.entity_type === "brand" ? alias.brand_id : alias.model_id;

    return (
      alias.entity_type === newAlias.entityType &&
      targetId === newAlias.entityId &&
      normalizeLabel(alias.alias_label) === normalized
    );
  });

  if (isDuplicate) {
    return { error: "Alias already exists for that item." };
  }

  return { normalized };
}

export function validateCatalogEdit({
  aliases,
  brands,
  editDraft,
  editTarget,
  models,
  normalizeLabel,
}: {
  aliases: Alias[];
  brands: Brand[];
  editDraft: EditDraft | null;
  editTarget: EditTarget | null;
  models: Model[];
  normalizeLabel: (value: string) => string;
}) {
  if (!editTarget || !editDraft) {
    return { error: null };
  }

  if (editTarget.type === "brand") {
    const draft = editDraft as BrandEditDraft;
    const normalized = normalizeLabel(draft.canonical_label ?? "");

    if (!normalized) {
      return { error: "Brand label is required." };
    }

    const isDuplicate = brands.some(
      (brand) =>
        brand.id !== editTarget.item.id &&
        normalizeLabel(brand.canonical_label) === normalized,
    );

    if (isDuplicate) {
      return { error: "Brand already exists." };
    }
  }

  if (editTarget.type === "model") {
    const draft = editDraft as ModelEditDraft;
    const normalized = normalizeLabel(draft.canonical_label ?? "");

    if (!normalized || !draft.brand_id) {
      return { error: "Brand and model label are required." };
    }

    const isDuplicate = models.some(
      (model) =>
        model.id !== editTarget.item.id &&
        model.brand_id === draft.brand_id &&
        normalizeLabel(model.canonical_label) === normalized,
    );

    if (isDuplicate) {
      return { error: "Model already exists for this brand." };
    }
  }

  if (editTarget.type === "alias") {
    const draft = editDraft as AliasEditDraft;
    const normalized = normalizeLabel(draft.alias_label ?? "");

    if (!normalized) {
      return { error: "Alias label is required." };
    }

    const targetId =
      editTarget.item.entity_type === "brand"
        ? editTarget.item.brand_id
        : editTarget.item.model_id;
    const isDuplicate = aliases.some((alias) => {
      const aliasTargetId =
        alias.entity_type === "brand" ? alias.brand_id : alias.model_id;

      return (
        alias.id !== editTarget.item.id &&
        alias.entity_type === editTarget.item.entity_type &&
        aliasTargetId === targetId &&
        normalizeLabel(alias.alias_label) === normalized
      );
    });

    if (isDuplicate) {
      return { error: "Alias already exists for that item." };
    }
  }

  return { error: null };
}
