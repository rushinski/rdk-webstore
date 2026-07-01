import { buildProductCreateInput } from "@/components/inventory/product-form/buildProductCreateInput";

describe("buildProductCreateInput", () => {
  it("builds a normalized payload for valid product drafts", () => {
    const result = buildProductCreateInput({
      titleRaw: "Jordan 1 Retro High",
      brandOverrideId: "brand-1",
      modelOverrideId: "model-1",
      category: "sneakers",
      condition: "new",
      sizeType: "shoe",
      description: "Clean pair",
      shippingPrice: "12.50",
      publishMode: "scheduled",
      scheduledGoLiveAt: "2026-07-02T10:30",
      variants: [
        {
          draft_id: "v1",
          sku: "SKU-1",
          size_label: "10",
          salePrice: "220.00",
          unitCost: "140.00",
          stock: "2",
        },
      ],
      images: [
        { url: " https://img/1.jpg ", sort_order: 3, is_primary: false },
        { url: "https://img/2.jpg", sort_order: 7, is_primary: true },
      ],
      allTags: [
        { label: "nike", group_key: "brand", source: "auto" },
        { label: "jordan 1", group_key: "model", source: "auto" },
      ],
      excludedAutoTagKeys: ["condition:used"],
      now: new Date("2026-07-01T09:00:00.000Z"),
    });

    expect(result).toEqual({
      name: "Jordan 1 Retro High",
      brand_override_id: "brand-1",
      model_override_id: "model-1",
      category: "sneakers",
      condition: "new",
      size_type: "shoe",
      description: "Clean pair",
      shipping_price_cents: 1250,
      go_live_at: "2026-07-02T14:30:00.000Z",
      variants: [
        {
          sku: "SKU-1",
          size_label: "10",
          sale_price_cents: 22000,
          unit_cost_cents: 14000,
          stock: 2,
          sort_order: 0,
        },
      ],
      images: [
        { url: "https://img/1.jpg", sort_order: 0, is_primary: false },
        { url: "https://img/2.jpg", sort_order: 1, is_primary: true },
      ],
      tags: [
        { label: "nike", group_key: "brand" },
        { label: "jordan 1", group_key: "model" },
      ],
      excluded_auto_tag_keys: ["condition:used"],
    });
  });

  it("rejects invalid variant and scheduling data", () => {
    expect(() =>
      buildProductCreateInput({
        titleRaw: "Jordan 1 Retro High",
        brandOverrideId: null,
        modelOverrideId: null,
        category: "sneakers",
        condition: "new",
        sizeType: "shoe",
        description: "",
        shippingPrice: "",
        publishMode: "scheduled",
        scheduledGoLiveAt: "2026-07-01T08:59",
        variants: [
          {
            draft_id: "v1",
            sku: "SKU-1",
            size_label: "10",
            salePrice: "220.00",
            unitCost: "140.00",
            stock: "1",
          },
          {
            draft_id: "v2",
            sku: "SKU-2",
            size_label: "10",
            salePrice: "200.00",
            unitCost: "120.00",
            stock: "1",
          },
        ],
        images: [],
        allTags: [],
        excludedAutoTagKeys: [],
        now: new Date("2026-07-01T09:00:00.000Z"),
      }),
    ).toThrow('Duplicate size "10" found in variants.');
  });
});
