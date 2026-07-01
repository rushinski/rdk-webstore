import type { ProductWithDetails } from "@/types/domain/product";
import {
  clearInventorySelection,
  getInventorySelectionState,
  toggleInventoryCurrentPageSelection,
  toggleInventorySelection,
} from "@/components/admin/inventory/inventoryClientSelection";

describe("inventoryClientSelection", () => {
  it("derives current page and aggregate selection state", () => {
    const state = getInventorySelectionState({
      products: [createProduct("a"), createProduct("b")],
      selectedIds: ["a"],
      selectAllMatching: false,
      totalCount: 12,
    });

    expect(state).toEqual({
      currentPageIds: ["a", "b"],
      currentPageAllSelected: false,
      selectedCount: 1,
    });
  });

  it("prefers total count when all matching products are selected", () => {
    const state = getInventorySelectionState({
      products: [createProduct("a"), createProduct("b")],
      selectedIds: ["a"],
      selectAllMatching: true,
      totalCount: 12,
    });

    expect(state.selectedCount).toBe(12);
  });

  it("toggles a single id on and off", () => {
    expect(toggleInventorySelection(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleInventorySelection(["a", "b"], "a")).toEqual(["b"]);
  });

  it("toggles the full current page", () => {
    expect(toggleInventoryCurrentPageSelection(["a", "b"], true)).toEqual(["a", "b"]);
    expect(toggleInventoryCurrentPageSelection(["a", "b"], false)).toEqual([]);
  });

  it("clears selection state", () => {
    expect(clearInventorySelection()).toEqual({
      selectedIds: [],
      selectAllMatching: false,
    });
  });
});

function createProduct(id: string): ProductWithDetails {
  return {
    id,
    tenant_id: "tenant-1",
    brand: "",
    model: "",
    name: "Item",
    description: "",
    category: "sneakers",
    size_type: "shoe",
    condition: "new",
    status: "draft",
    base_price_cents: 0,
    default_variant_id: null,
    shipping_profile_id: null,
    shipping_price_cents: null,
    return_policy: "",
    seo_title: "",
    seo_description: "",
    go_live_at: "",
    is_active: true,
    is_out_of_stock: false,
    archived_at: "",
    excluded_auto_tag_keys: [],
    product_created_at: "2026-07-01T00:00:00.000Z",
    product_updated_at: "2026-07-01T00:00:00.000Z",
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
    variants: [],
    images: [],
    tags: [],
  } as unknown as ProductWithDetails;
}
