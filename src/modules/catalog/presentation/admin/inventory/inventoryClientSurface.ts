import type {
  InventoryClientContentState,
  InventoryDialogsState,
  InventoryToolbarActions,
  InventoryToolbarFilters,
  InventoryToolbarSelection,
  InventoryToolbarSummary,
} from "@/modules/catalog/presentation/admin/inventory/inventoryClientContracts";
import type { InventoryProductListContractProps } from "@/modules/catalog/presentation/admin/inventory/inventoryClientContracts";

type BuildInventoryToolbarPropsArgs = InventoryToolbarSummary &
  InventoryToolbarFilters &
  InventoryToolbarSelection &
  InventoryToolbarActions;

export function buildInventoryToolbarProps(args: BuildInventoryToolbarPropsArgs) {
  return args;
}

type BuildInventoryContentPropsArgs = InventoryClientContentState &
  Omit<InventoryProductListContractProps, "products">;

export function buildInventoryContentProps(args: BuildInventoryContentPropsArgs) {
  return args;
}

type BuildInventoryPaginationPropsArgs = {
  page: number;
  totalPages: number;
  totalCount: number;
  showingStart: number;
  showingEnd: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
};

export function buildInventoryPaginationProps(args: BuildInventoryPaginationPropsArgs) {
  return args;
}

type BuildInventoryDialogsPropsArgs = InventoryDialogsState & {
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

export function buildInventoryDialogsProps(args: BuildInventoryDialogsPropsArgs) {
  return args;
}
