"use client";

import { MoreVertical } from "lucide-react";

import { catalogStyles } from "./catalogStyles";

type CatalogActionMenuProps = {
  menuKey: string;
  openMenuKey: string | null;
  onToggle: (key: string) => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function CatalogActionMenu({
  menuKey,
  openMenuKey,
  onToggle,
  onEdit,
  onDelete,
}: CatalogActionMenuProps) {
  return (
    <div
      className="relative"
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <button
        type="button"
        onClick={() => onToggle(menuKey)}
        className="p-1 text-brand-muted transition-colors hover:text-brand-text"
        aria-label="Open actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {openMenuKey === menuKey ? (
        <div className={catalogStyles.menuPanel}>
          <button
            type="button"
            onClick={() => {
              onToggle(menuKey);
              onEdit();
            }}
            className="w-full px-3 py-2 text-left text-sm text-brand-text transition hover:bg-brand-page"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              onToggle(menuKey);
              onDelete();
            }}
            className="w-full px-3 py-2 text-left text-sm text-red-700 transition hover:bg-brand-page"
          >
            Disable
          </button>
        </div>
      ) : null}
    </div>
  );
}
