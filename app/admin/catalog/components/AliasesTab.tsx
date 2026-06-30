"use client";

import type { Dispatch, SetStateAction } from "react";

import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { AdminStatusBadge } from "@/components/admin/ui/AdminStatusBadge";
import { adminButtonStyles } from "@/components/admin/ui/adminButtonStyles";
import { adminFormStyles } from "@/components/admin/ui/adminFormStyles";
import { RdkSelect } from "@/components/ui/Select";

import type { Alias, Brand, Model } from "../types";

import { CatalogActionMenu } from "./CatalogActionMenu";
import { catalogStyles } from "./catalogStyles";

type NewAliasDraft = {
  entityType: "brand" | "model";
  entityId: string;
  label: string;
  priority: string;
};

type AliasesTabProps = {
  isLoading: boolean;
  aliases: Alias[];
  brands: Brand[];
  models: Model[];
  newAlias: NewAliasDraft;
  openMenuKey: string | null;
  onToggleMenu: (key: string) => void;
  onNewAliasChange: Dispatch<SetStateAction<NewAliasDraft>>;
  onCreateAlias: () => void;
  onEditAlias: (alias: Alias) => void;
  onDeleteAlias: (alias: Alias) => void;
  resolveBrandLabel: (brandId?: string | null) => string;
  resolveModelLabel: (modelId?: string | null) => string;
};

export function AliasesTab({
  isLoading,
  aliases,
  brands,
  models,
  newAlias,
  openMenuKey,
  onToggleMenu,
  onNewAliasChange,
  onCreateAlias,
  onEditAlias,
  onDeleteAlias,
  resolveBrandLabel,
  resolveModelLabel,
}: AliasesTabProps) {
  return (
    <AdminSectionCard title="Aliases">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-brand-text">Alias Mapping</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Alternate spellings and shorthand that map back to canonical brands and models.
        </p>
      </div>

      <div className={`${catalogStyles.inlinePanel} mb-4`}>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)_160px_auto]">
          <RdkSelect
            value={newAlias.entityType}
            onChange={(value) =>
              onNewAliasChange((current) => ({
                ...current,
                entityType: value as "brand" | "model",
                entityId: "",
              }))
            }
            options={[
              { value: "brand", label: "Brand" },
              { value: "model", label: "Model" },
            ]}
          />
          <RdkSelect
            value={newAlias.entityId}
            onChange={(value) =>
              onNewAliasChange((current) => ({ ...current, entityId: value }))
            }
            options={[
              {
                value: "",
                label: `Select ${newAlias.entityType}`,
                disabled: true,
              },
              ...(newAlias.entityType === "brand"
                ? brands.map((brand) => ({
                    value: brand.id,
                    label: brand.canonical_label,
                  }))
                : models.map((model) => ({
                    value: model.id,
                    label: model.canonical_label,
                  }))),
            ]}
            placeholder={`Select ${newAlias.entityType}`}
          />
          <input
            value={newAlias.label}
            onChange={(event) =>
              onNewAliasChange((current) => ({ ...current, label: event.target.value }))
            }
            placeholder="Alias label"
            className={adminFormStyles.input}
          />
          <input
            value={newAlias.priority}
            onChange={(event) =>
              onNewAliasChange((current) => ({
                ...current,
                priority: event.target.value,
              }))
            }
            placeholder="Priority"
            className={adminFormStyles.input}
          />
          <button
            type="button"
            onClick={onCreateAlias}
            className={adminButtonStyles.primary}
          >
            Add Alias
          </button>
        </div>
      </div>

      {isLoading ? (
        <AdminEmptyState
          title="Loading Aliases"
          description="Pulling alias mappings now."
        />
      ) : aliases.length === 0 ? (
        <AdminEmptyState
          title="No Aliases Found"
          description="Create an alias to support alternate spellings and shorthand."
        />
      ) : (
        <div className={catalogStyles.tableWrap}>
          <table className="w-full text-sm">
            <thead>
              <tr className={catalogStyles.tableHeadRow}>
                <th className={catalogStyles.tableHeadCell}>Alias</th>
                <th className={`${catalogStyles.tableHeadCell} hidden sm:table-cell`}>
                  Type
                </th>
                <th className={`${catalogStyles.tableHeadCell} hidden sm:table-cell`}>
                  Priority
                </th>
                <th className={`${catalogStyles.tableHeadCell} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {aliases.map((alias) => (
                <tr key={alias.id} className={catalogStyles.tableRow}>
                  <td className={catalogStyles.tableCell}>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold text-brand-text">
                        {alias.alias_label}
                      </div>
                      <AdminStatusBadge tone={alias.is_active ? "success" : "neutral"}>
                        {alias.is_active ? "Active" : "Inactive"}
                      </AdminStatusBadge>
                    </div>
                    <div className="mt-1 text-xs text-brand-muted">
                      {alias.entity_type === "brand"
                        ? resolveBrandLabel(alias.brand_id)
                        : resolveModelLabel(alias.model_id)}
                    </div>
                    <div className="mt-1 text-xs text-brand-muted sm:hidden">
                      {alias.entity_type} | Priority {alias.priority ?? 0}
                    </div>
                  </td>
                  <td
                    className={`${catalogStyles.tableCell} hidden uppercase text-brand-muted sm:table-cell`}
                  >
                    {alias.entity_type}
                  </td>
                  <td
                    className={`${catalogStyles.tableCell} hidden text-brand-muted sm:table-cell`}
                  >
                    {alias.priority ?? 0}
                  </td>
                  <td className={`${catalogStyles.tableCell} text-right`}>
                    <div className="flex justify-end">
                      <CatalogActionMenu
                        menuKey={`alias-${alias.id}`}
                        openMenuKey={openMenuKey}
                        onToggle={onToggleMenu}
                        onEdit={() => onEditAlias(alias)}
                        onDelete={() => onDeleteAlias(alias)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminSectionCard>
  );
}
