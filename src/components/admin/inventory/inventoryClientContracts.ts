import type {
  InventoryFilters,
  StockStatus,
} from "@/components/admin/inventory/inventoryClientData";
import type { InventoryProductListProps } from "@/components/admin/inventory/InventoryProductList";
import type {
  Category,
  Condition,
  ProductVariantRow,
  ProductWithDetails,
} from "@/types/domain/product";

export type InventoryDetailsSelection = {
  product: ProductWithDetails;
  variant: ProductVariantRow;
} | null;

export type InventoryDeleteRequestState = {
  id: string;
  label: string;
} | null;

export type InventoryArchiveRequestState = {
  mode: "single" | "selected";
  id?: string;
  label?: string;
  count?: number;
} | null;

export type InventoryRestoreRequestState = {
  mode: "selected";
  count?: number;
} | null;

export type InventoryToastState = {
  message: string;
  tone: "success" | "error" | "info";
} | null;

export type InventoryToolbarFilters = {
  stockStatusFilter: StockStatus;
  searchQuery: string;
  categoryFilter: Category | "all";
  conditionFilter: Condition | "all";
};

export type InventoryToolbarSelection = {
  selectedCount: number;
  selectedIdsCount: number;
  selectAllMatching: boolean;
  currentPageAllSelected: boolean;
};

export type InventoryToolbarSummary = {
  totalCount: number;
  showingStart: number;
  showingEnd: number;
};

export type InventoryToolbarActions = {
  onStockStatusFilterChange: (value: StockStatus) => void;
  onSearchQueryChange: (value: string) => void;
  onCategoryFilterChange: (value: Category | "all") => void;
  onConditionFilterChange: (value: Condition | "all") => void;
  onSelectAllMatching: () => void;
  onClearSelection: () => void;
  onMassRestore: () => void;
  onMassArchive: () => void;
  onMassDelete: () => void;
};

export type InventoryClientContentState = {
  isLoading: boolean;
  products: ProductWithDetails[];
};

export type InventoryProductListContractProps = InventoryProductListProps;

export type InventoryDialogsState = {
  detailsSelection: InventoryDetailsSelection;
  pendingDelete: InventoryDeleteRequestState;
  pendingMassDelete: boolean;
  pendingArchive: InventoryArchiveRequestState;
  pendingRestore: InventoryRestoreRequestState;
  selectedCount: number;
  toast: InventoryToastState;
};

export type InventoryDialogsActions = {
  onCloseDetails: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onConfirmMassDelete: () => void;
  onCancelMassDelete: () => void;
  onConfirmArchive: () => void;
  onCancelArchive: () => void;
  onConfirmRestore: () => void;
  onCancelRestore: () => void;
  onCloseToast: () => void;
};

export type InventoryClientMutationHookState = {
  selectedIds: string[];
  selectedCount: number;
  selectAllMatching: boolean;
  searchQuery: string;
  categoryFilter: Category | "all";
  conditionFilter: Condition | "all";
  stockStatusFilter: StockStatus;
  currentFilters: InventoryFilters;
  pendingDelete: InventoryDeleteRequestState;
  pendingArchive: InventoryArchiveRequestState;
  pendingRestore: InventoryRestoreRequestState;
};
