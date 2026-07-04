import Link from "next/link";
import { Archive, MoreVertical, RotateCcw } from "lucide-react";

import type { ProductWithDetails } from "@/types/domain/product";

type InventoryProductActionMenuProps = {
  isOpen: boolean;
  onDuplicateProduct: (productId: string) => void;
  onRequestArchive: (product: ProductWithDetails) => void;
  onRequestDelete: (product: ProductWithDetails) => void;
  onRestoreProduct: (productId: string) => void;
  onToggleMenu: (productId: string) => void;
  product: ProductWithDetails;
};

export function InventoryProductActionMenu({
  isOpen,
  onDuplicateProduct,
  onRequestArchive,
  onRequestDelete,
  onRestoreProduct,
  onToggleMenu,
  product,
}: InventoryProductActionMenuProps) {
  return (
    <div className="relative" data-menu-id={product.id}>
      <button
        type="button"
        onClick={() => onToggleMenu(product.id)}
        className="cursor-pointer p-1.5 text-brand-muted transition hover:bg-brand-page hover:text-brand-text"
        aria-label="Open actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-30 mt-2 w-44 overflow-hidden border border-brand-border bg-brand-surface shadow-xl">
          <Link
            href={`/admin/inventory/${product.id}/edit`}
            onClick={() => onToggleMenu(product.id)}
            className="block px-3 py-2 text-sm text-brand-text transition hover:bg-brand-page"
          >
            {product.archived_at ? "View" : "Edit"}
          </Link>
          {product.archived_at ? (
            <button
              type="button"
              onClick={() => onRestoreProduct(product.id)}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-emerald-700 transition hover:bg-brand-page"
            >
              <RotateCcw className="h-4 w-4" />
              Restore
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onDuplicateProduct(product.id)}
                className="w-full cursor-pointer px-3 py-2 text-left text-sm text-brand-text transition hover:bg-brand-page"
              >
                Duplicate
              </button>
              <button
                type="button"
                onClick={() => onRequestArchive(product)}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-amber-700 transition hover:bg-brand-page"
              >
                <Archive className="h-4 w-4" />
                Archive
              </button>
              <div className="h-px bg-brand-border" />
              <button
                type="button"
                onClick={() => onRequestDelete(product)}
                className="w-full cursor-pointer px-3 py-2 text-left text-sm text-red-700 transition hover:bg-brand-page"
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
