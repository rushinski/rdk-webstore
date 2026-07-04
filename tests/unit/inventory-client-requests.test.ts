import type { ProductWithDetails } from "@/types/domain/product";
import {
  buildInventoryExportUrl,
  buildInventoryProductsUrl,
  normalizeInventoryProductsResponse,
} from "@/modules/catalog/presentation/admin/inventory/inventoryClientRequests";

describe("inventoryClientRequests", () => {
  it("builds the inventory products url with filters", () => {
    expect(
      buildInventoryProductsUrl({
        pageSize: 100,
        filters: {
          q: "jordan",
          category: "sneakers",
          condition: "new",
          stockStatus: "archived",
          page: 2,
        },
      }),
    ).toBe(
      "/api/admin/products?limit=100&page=2&includeOutOfStock=1&searchMode=inventory&q=jordan&category=sneakers&condition=new&stockStatus=archived",
    );
  });

  it("builds the inventory export url from active filters", () => {
    expect(
      buildInventoryExportUrl({
        q: "dunk",
        category: "sneakers",
        condition: "used",
        stockStatus: "in_stock",
      }),
    ).toBe(
      "/api/admin/products/export?q=dunk&category=sneakers&condition=used&stockStatus=in_stock",
    );
  });

  it("normalizes product response counts and payload", () => {
    const product = { id: "product-1" } as ProductWithDetails;

    expect(
      normalizeInventoryProductsResponse({
        products: [product],
        total: "8",
        skuTotal: undefined,
        inventoryUnitTotal: "12",
      }),
    ).toEqual({
      products: [product],
      totalCount: 8,
      skuTotalCount: 8,
      inventoryUnitTotalCount: 12,
    });
  });
});
