// app/admin/inventory/page.tsx (SERVER-SIDE VERSION)

import type { Category, Condition } from "@/types/domain/product";

import { getInventoryProducts } from "./actions";
import { InventoryClient } from "./client";

type StockStatus = "in_stock" | "out_of_stock";

interface InventoryPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    condition?: string;
    stockStatus?: string;
    page?: string;
  }>;
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const params = await searchParams;

  // Parse search params
  const filters = {
    q: params.q,
    category: (params.category as Category | "all") || "all",
    condition: (params.condition as Condition | "all") || "all",
    stockStatus: (params.stockStatus as StockStatus) || "in_stock",
    page: params.page ? parseInt(params.page, 10) : 1,
  };

  // SERVER-SIDE: Load products before rendering
  const result = await getInventoryProducts(filters);

  return (
    <InventoryClient
      initialProducts={result.products}
      initialTotal={result.total}
      initialFilters={filters}
    />
  );
}
