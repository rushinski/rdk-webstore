import type { Category, Condition } from "@/types/domain/product";
import { getInventoryProducts } from "@/modules/catalog/application/adminInventory";

import { InventoryClient } from "./InventoryClient";

type StockStatus = "in_stock" | "archived";

interface InventoryPageContentProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    condition?: string;
    stockStatus?: string;
    page?: string;
  }>;
}

export async function InventoryPageContent({
  searchParams,
}: InventoryPageContentProps) {
  const params = await searchParams;

  const filters = {
    q: params.q,
    category: (params.category as Category | "all") || "all",
    condition: (params.condition as Condition | "all") || "all",
    stockStatus: (params.stockStatus as StockStatus) || "in_stock",
    page: params.page ? parseInt(params.page, 10) : 1,
  };

  const result = await getInventoryProducts(filters);

  return (
    <InventoryClient
      initialProducts={result.products}
      initialTotal={result.total}
      initialSkuTotal={result.skuTotal ?? result.total}
      initialInventoryUnitTotal={result.inventoryUnitTotal ?? 0}
      initialFilters={filters}
    />
  );
}
