"use client";

import {
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";

import {
  buildInventoryPageSearchParams,
  type InventoryFilters,
} from "@/components/admin/inventory/inventoryClientData";
import type { InventoryToastState } from "@/components/admin/inventory/inventoryClientContracts";
import {
  buildInventoryExportUrl,
  buildInventoryProductsUrl,
  normalizeInventoryProductsResponse,
} from "@/components/admin/inventory/inventoryClientRequests";
import { getInventoryExportFileName } from "@/components/admin/inventory/inventoryClientView";
import type { ProductWithDetails } from "@/types/domain/product";
import { logError } from "@/lib/utils/log";

type UseInventoryClientDataArgs = {
  pageSize: number;
  filtersRef: MutableRefObject<InventoryFilters>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setProducts: Dispatch<SetStateAction<ProductWithDetails[]>>;
  setTotalCount: Dispatch<SetStateAction<number>>;
  setSkuTotalCount: Dispatch<SetStateAction<number>>;
  setInventoryUnitTotalCount: Dispatch<SetStateAction<number>>;
  setToast: Dispatch<SetStateAction<InventoryToastState>>;
};

export function useInventoryClientData({
  pageSize,
  filtersRef,
  setIsLoading,
  setProducts,
  setTotalCount,
  setSkuTotalCount,
  setInventoryUnitTotalCount,
  setToast,
}: UseInventoryClientDataArgs) {
  const router = useRouter();

  const showToast = (message: string, tone: "success" | "error" | "info" = "info") => {
    setToast({ message, tone });
  };

  const updateURL = useCallback(
    (filters: InventoryFilters) => {
      const query = buildInventoryPageSearchParams(filters).toString();
      router.replace(query ? `/admin/inventory?${query}` : "/admin/inventory", {
        scroll: false,
      });
    },
    [router],
  );

  const exportInventory = useCallback(async () => {
    try {
      const filters = filtersRef.current;
      const res = await fetch(buildInventoryExportUrl(filters));
      if (!res.ok) {
        showToast("Failed to export inventory.", "error");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = getInventoryExportFileName();

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
      showToast("Inventory exported.", "success");
    } catch {
      showToast("Error exporting inventory.", "error");
    }
  }, [filtersRef]);

  const loadProducts = useCallback(
    async (filters?: InventoryFilters, showLoading = true) => {
      if (showLoading) {
        setIsLoading(true);
      }

      try {
        const response = await fetch(
          buildInventoryProductsUrl({
            pageSize,
            filters: filters ?? {},
          }),
        );
        const data = await response.json();
        const normalized = normalizeInventoryProductsResponse(data);
        setProducts(normalized.products);
        setTotalCount(normalized.totalCount);
        setSkuTotalCount(normalized.skuTotalCount);
        setInventoryUnitTotalCount(normalized.inventoryUnitTotalCount);
        updateURL(filters || {});
      } catch (error) {
        logError(error, { layer: "frontend", event: "admin_load_inventory_products" });
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [
      pageSize,
      setInventoryUnitTotalCount,
      setIsLoading,
      setProducts,
      setSkuTotalCount,
      setTotalCount,
      updateURL,
    ],
  );

  return {
    exportInventory,
    loadProducts,
  };
}
