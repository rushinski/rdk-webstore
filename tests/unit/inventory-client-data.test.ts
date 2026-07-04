import type { ProductWithDetails } from "@/types/domain/product";
import {
  buildInventoryBulkActionRequest,
  buildInventoryExportSearchParams,
  buildInventoryFetchSearchParams,
  getProductLiveState,
  getPrimaryImageUrl,
  getProductRawTitle,
  getProductTotalStock,
} from "@/modules/catalog/presentation/admin/inventory/inventoryClientData";

describe("inventoryClientData", () => {
  it("builds inventory fetch params from active filters", () => {
    const params = buildInventoryFetchSearchParams({
      pageSize: 100,
      filters: {
        q: "  jordan  ",
        category: "sneakers",
        condition: "new",
        stockStatus: "archived",
        page: 3,
      },
    });

    expect(params.toString()).toBe(
      "limit=100&page=3&includeOutOfStock=1&searchMode=inventory&q=jordan&category=sneakers&condition=new&stockStatus=archived",
    );
  });

  it("builds export params without inventory-only fetch defaults", () => {
    const params = buildInventoryExportSearchParams({
      q: "  dunk low  ",
      category: "sneakers",
      condition: "used",
      stockStatus: "in_stock",
    });

    expect(params.toString()).toBe(
      "q=dunk+low&category=sneakers&condition=used&stockStatus=in_stock",
    );
  });

  it("builds filtered bulk action requests for archive mode", () => {
    expect(
      buildInventoryBulkActionRequest({
        action: "archive",
        selectionMode: "filtered",
        filters: {
          q: "yeezy",
          category: "sneakers",
          condition: "new",
          stockStatus: "archived",
        },
      }),
    ).toEqual({
      action: "archive",
      selectionMode: "filtered",
      filters: {
        q: "yeezy",
        category: ["sneakers"],
        condition: ["new"],
        stockStatus: "all",
      },
    });
  });

  it("builds selected-id bulk action requests", () => {
    expect(
      buildInventoryBulkActionRequest({
        action: "delete",
        selectionMode: "ids",
        ids: ["a", "b"],
      }),
    ).toEqual({
      action: "delete",
      selectionMode: "ids",
      ids: ["a", "b"],
    });
  });

  it("derives presentational product details", () => {
    const product = createProduct({
      name: "  Air Max 95  ",
      images: [
        createImageRow({ url: "secondary.jpg", is_primary: false, sort_order: 1 }),
        createImageRow({ url: "primary.jpg", is_primary: true, sort_order: 0 }),
      ],
      variants: [createVariantRow({ stock: 2 }), createVariantRow({ stock: 3 })],
    });

    expect(getProductRawTitle(product)).toBe("Air Max 95");
    expect(getPrimaryImageUrl(product)).toBe("primary.jpg");
    expect(getProductTotalStock(product)).toBe(5);
  });

  it("marks archived and scheduled products in live state", () => {
    const archived = createProduct({
      archived_at: "2026-07-01T10:00:00.000Z",
      is_active: true,
      go_live_at: "",
    });

    expect(
      getProductLiveState(archived, { now: Date.parse("2026-07-01T12:00:00.000Z") }),
    ).toEqual({
      isLive: false,
      label: "Archived",
      detail: "Website only",
      detailTooltip: "Archived products are hidden from customers and read-only",
    });

    const scheduled = createProduct({
      archived_at: "",
      is_active: true,
      go_live_at: "2026-07-02T15:30:00.000Z",
    });

    const state = getProductLiveState(scheduled, {
      now: Date.parse("2026-07-01T12:00:00.000Z"),
      dateFormatter: {
        format: () => "Jul 2, 2026",
      } as Intl.DateTimeFormat,
      dateWithYearFormatter: {
        format: () => "Jul 2, 2026",
      } as Intl.DateTimeFormat,
      timeFormatter: {
        format: () => "3:30 PM",
      } as Intl.DateTimeFormat,
    });

    expect(state).toEqual({
      isLive: false,
      label: "Scheduled",
      detail: "Jul 2, 2026 | 3:30 PM",
      detailTooltip: "Jul 2, 2026, 3:30 PM",
    });
  });
});

function createProduct(overrides: Partial<ProductWithDetails>): ProductWithDetails {
  return {
    id: "product-1",
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
    go_live_at: null,
    is_active: true,
    archived_at: "",
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
    variants: [],
    images: [],
    tags: [],
    ...overrides,
  } as ProductWithDetails;
}

function createImageRow(
  overrides: Partial<ProductWithDetails["images"][number]>,
): ProductWithDetails["images"][number] {
  return {
    id: "image-1",
    product_id: "product-1",
    url: "image.jpg",
    is_primary: false,
    sort_order: 0,
    ...overrides,
  } as ProductWithDetails["images"][number];
}

function createVariantRow(
  overrides: Partial<ProductWithDetails["variants"][number]>,
): ProductWithDetails["variants"][number] {
  return {
    id: "variant-1",
    tenant_id: "tenant-1",
    product_id: "product-1",
    sku: "SKU-1",
    size_label: "10",
    sale_price_cents: 10000,
    unit_cost_cents: 5000,
    stock: 1,
    sort_order: 0,
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
    ...overrides,
  } as ProductWithDetails["variants"][number];
}
