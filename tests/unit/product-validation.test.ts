import { productCreateSchema } from "@/lib/validation/product";

describe("productCreateSchema", () => {
  it("accepts a product payload with no images", () => {
    const result = productCreateSchema.safeParse({
      name: "Jordan 3 Retro",
      category: "sneakers",
      condition: "used",
      size_type: "shoe",
      description: "No photos yet",
      shipping_price_cents: 1500,
      variants: [
        {
          sku: "123456",
          size_label: "10M / 11.5W",
          sale_price_cents: 25000,
          stock: 1,
          unit_cost_cents: 12000,
        },
      ],
      images: [],
      tags: [],
      excluded_auto_tag_keys: [],
    });

    expect(result.success).toBe(true);
  });
});
