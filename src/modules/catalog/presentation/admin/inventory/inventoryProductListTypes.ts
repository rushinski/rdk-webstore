import type { InventoryLiveState } from "@/modules/catalog/presentation/admin/inventory/inventoryProductListView";
import type { ProductVariantRow, ProductWithDetails } from "@/types/domain/product";

export type InventoryProductListProps = {
  products: ProductWithDetails[];
  expandedVariants: Record<string, boolean>;
  selectedIds: string[];
  openMenuId: string | null;
  currentPageAllSelected: boolean;
  onToggleCurrentPage: (checked: boolean) => void;
  onToggleSelection: (productId: string) => void;
  onToggleVariants: (productId: string) => void;
  onToggleMenu: (productId: string) => void;
  onRestoreProduct: (productId: string) => void;
  onDuplicateProduct: (productId: string) => void;
  onRequestArchive: (product: ProductWithDetails) => void;
  onRequestDelete: (product: ProductWithDetails) => void;
  onOpenDetails: (product: ProductWithDetails, variant: ProductVariantRow) => void;
  getProductRawTitle: (product: ProductWithDetails) => string;
  getPrimaryImageUrl: (product: ProductWithDetails) => string | null;
  getProductTotalStock: (product: ProductWithDetails) => number;
  getProductLiveState: (product: ProductWithDetails) => InventoryLiveState;
};
