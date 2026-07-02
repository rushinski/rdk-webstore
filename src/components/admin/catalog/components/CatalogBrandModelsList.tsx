"use client";

import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";

import type { Model } from "../types";

import { CatalogActionMenu } from "./CatalogActionMenu";

type CatalogBrandModelsListProps = {
  models: Model[];
  onDeleteModel: (model: Model) => void;
  onEditModel: (model: Model) => void;
  onToggleMenu: (key: string) => void;
  openMenuKey: string | null;
};

export function CatalogBrandModelsList({
  models,
  onDeleteModel,
  onEditModel,
  onToggleMenu,
  openMenuKey,
}: CatalogBrandModelsListProps) {
  if (models.length === 0) {
    return (
      <AdminEmptyState
        title="No Models Found"
        description="Add a model for this brand or widen the current filters."
      />
    );
  }

  return (
    <div className="space-y-2">
      {models.map((model) => (
        <div
          key={model.id}
          className="flex flex-col gap-3 border border-brand-border bg-brand-surface p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="truncate font-medium text-brand-text">
              {model.canonical_label}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AdminStatusBadge tone={model.is_active ? "success" : "neutral"}>
              {model.is_active ? "Active" : "Inactive"}
            </AdminStatusBadge>
            <AdminStatusBadge tone={model.is_verified ? "success" : "warning"}>
              {model.is_verified ? "Verified" : "Unverified"}
            </AdminStatusBadge>
            <CatalogActionMenu
              menuKey={`model-${model.id}`}
              openMenuKey={openMenuKey}
              onToggle={onToggleMenu}
              onEdit={() => onEditModel(model)}
              onDelete={() => onDeleteModel(model)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
