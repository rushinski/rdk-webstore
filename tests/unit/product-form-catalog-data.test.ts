import {
  buildShippingDefaultsMap,
  buildTitleParseRequest,
  isAbortLikeError,
  mapBrandCatalogOptions,
  mapModelCatalogOptions,
  shouldClearInvalidModelOverride,
} from "@/modules/catalog/presentation/admin/inventory/product-form/catalogData";
import type { CatalogOption } from "@/modules/catalog/presentation/admin/inventory/product-form/types";

describe("product form catalog data helpers", () => {
  it("builds shipping defaults from mixed cents fields", () => {
    expect(
      buildShippingDefaultsMap([
        { category: "sneakers", shipping_cost_cents: 1499 },
        { category: "clothing", default_price_cents: 2500 },
        { category: "accessories", default_price: 399 },
      ]),
    ).toEqual({
      sneakers: 14.99,
      clothing: 25,
      accessories: 3.99,
    });
  });

  it("maps brand and model catalog entries into catalog options", () => {
    expect(
      mapBrandCatalogOptions([
        {
          id: "brand-1",
          canonical_label: "Nike",
          group: { key: "sportswear" },
        },
      ]),
    ).toEqual<CatalogOption[]>([
      { id: "brand-1", label: "Nike", groupKey: "sportswear" },
    ]);

    expect(
      mapModelCatalogOptions([{ id: "model-1", canonical_label: "Air Max 1" }]),
    ).toEqual<CatalogOption[]>([{ id: "model-1", label: "Air Max 1" }]);
  });

  it("builds the title parse request payload and clears invalid model overrides", () => {
    expect(
      buildTitleParseRequest({
        titleRaw: "Nike Air Max 1",
        category: "sneakers",
        brandOverrideId: "brand-1",
        modelOverrideId: "model-1",
      }),
    ).toEqual({
      titleRaw: "Nike Air Max 1",
      category: "sneakers",
      brandOverrideId: "brand-1",
      modelOverrideId: "model-1",
    });

    expect(
      shouldClearInvalidModelOverride("model-2", [{ id: "model-1", label: "Air Max 1" }]),
    ).toBe(true);
    expect(
      shouldClearInvalidModelOverride("model-1", [{ id: "model-1", label: "Air Max 1" }]),
    ).toBe(false);
    expect(shouldClearInvalidModelOverride(null, [])).toBe(false);
  });

  it("detects abort-like errors from browser abort flows", () => {
    expect(isAbortLikeError({ name: "AbortError" })).toBe(true);
    expect(isAbortLikeError(new Error("nope"))).toBe(false);
  });
});
