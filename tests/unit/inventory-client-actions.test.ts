import type { ProductWithDetails } from "@/types/domain/product";
import {
  canArchiveInventorySelection,
  canDeleteInventorySelection,
  canEnableSelectAllMatching,
  canRestoreInventorySelection,
  createInventoryArchiveRequest,
  createInventoryDeleteRequest,
  createInventoryRestoreRequest,
} from "@/modules/catalog/presentation/admin/inventory/inventoryClientActions";

describe("inventoryClientActions", () => {
  it("builds a pending delete request from product data", () => {
    expect(createInventoryDeleteRequest(createProduct("product-1"), "Air Max")).toEqual({
      id: "product-1",
      label: "Air Max",
    });
  });

  it("builds single and bulk archive requests", () => {
    expect(
      createInventoryArchiveRequest({
        product: createProduct("product-1"),
        label: "Air Max",
      }),
    ).toEqual({
      mode: "single",
      id: "product-1",
      label: "Air Max",
    });

    expect(createInventoryArchiveRequest({ count: 4 })).toEqual({
      mode: "selected",
      count: 4,
    });
  });

  it("builds bulk restore requests", () => {
    expect(createInventoryRestoreRequest(3)).toEqual({
      mode: "selected",
      count: 3,
    });
  });

  it("gates mass actions and select-all affordances", () => {
    expect(canDeleteInventorySelection(1)).toBe(true);
    expect(canDeleteInventorySelection(0)).toBe(false);
    expect(canRestoreInventorySelection(1, "archived")).toBe(true);
    expect(canRestoreInventorySelection(1, "in_stock")).toBe(false);
    expect(canArchiveInventorySelection(1, "in_stock")).toBe(true);
    expect(canArchiveInventorySelection(1, "archived")).toBe(false);
    expect(canEnableSelectAllMatching(2)).toBe(true);
    expect(canEnableSelectAllMatching(0)).toBe(false);
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
