import type { ProductWithDetails, ProductVariantRow } from "@/types/domain/product";
import {
  createInventoryDetailsSelection,
  filterInventorySelectionAfterRestore,
  toggleInventoryExpandedVariantState,
  toggleInventoryOpenMenuId,
} from "@/modules/catalog/presentation/admin/inventory/inventoryClientUiState";

describe("inventoryClientUiState", () => {
  it("creates a details selection payload", () => {
    const product = createProduct("product-1");
    const variant = createVariant("variant-1");

    expect(createInventoryDetailsSelection(product, variant)).toEqual({
      product,
      variant,
    });
  });

  it("toggles expanded variant state by product id", () => {
    expect(toggleInventoryExpandedVariantState({}, "product-1")).toEqual({
      "product-1": true,
    });
    expect(
      toggleInventoryExpandedVariantState({ "product-1": true }, "product-1"),
    ).toEqual({
      "product-1": false,
    });
  });

  it("toggles the active action menu id", () => {
    expect(toggleInventoryOpenMenuId(null, "product-1")).toBe("product-1");
    expect(toggleInventoryOpenMenuId("product-1", "product-1")).toBeNull();
  });

  it("removes a restored product from selected ids", () => {
    expect(filterInventorySelectionAfterRestore(["a", "b"], "a")).toEqual(["b"]);
  });
});

function createProduct(id: string): ProductWithDetails {
  return { id } as ProductWithDetails;
}

function createVariant(id: string): ProductVariantRow {
  return { id } as ProductVariantRow;
}
