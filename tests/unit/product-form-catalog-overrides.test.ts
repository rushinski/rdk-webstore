import {
  applyBrandOverrideOption,
  applyCatalogSuggestion,
  applyModelOverrideOption,
  resolveBrandOverrideChange,
  resolveEffectiveBrandId,
  resolveModelOverrideChange,
} from "@/modules/catalog/presentation/admin/inventory/product-form/catalogOverrides";
import type { CatalogOption } from "@/modules/catalog/presentation/admin/inventory/product-form/types";

const brandOptions: CatalogOption[] = [
  { id: "brand-1", label: "Nike" },
  { id: "brand-2", label: "Jordan", groupKey: "designer" },
];

const modelOptions: CatalogOption[] = [
  { id: "model-1", label: "Air Force 1" },
  { id: "model-2", label: "Dunk Low" },
];

describe("product form catalog overrides", () => {
  it("applies a brand override and clears dependent model state", () => {
    expect(applyBrandOverrideOption(brandOptions[1])).toEqual({
      brandOverrideId: "brand-2",
      brandOverrideInput: "Jordan",
      modelOverrideId: null,
      modelOverrideInput: "",
    });
  });

  it("matches brand override input case-insensitively and clears model state on miss", () => {
    expect(
      resolveBrandOverrideChange({
        value: "  nike ",
        brandOptions,
      }),
    ).toEqual({
      brandOverrideId: "brand-1",
      brandOverrideInput: "Nike",
      modelOverrideId: null,
      modelOverrideInput: "",
    });

    expect(
      resolveBrandOverrideChange({
        value: "Unknown",
        brandOptions,
      }),
    ).toEqual({
      brandOverrideId: null,
      brandOverrideInput: "Unknown",
      modelOverrideId: null,
      modelOverrideInput: "",
    });
  });

  it("matches model override input case-insensitively and keeps typed input on miss", () => {
    expect(
      resolveModelOverrideChange({
        value: " dunk low ",
        modelOptions,
      }),
    ).toEqual({
      modelOverrideId: "model-2",
      modelOverrideInput: "Dunk Low",
    });

    expect(
      resolveModelOverrideChange({
        value: "Unknown",
        modelOptions,
      }),
    ).toEqual({
      modelOverrideId: null,
      modelOverrideInput: "Unknown",
    });
  });

  it("applies catalog suggestions by id when an option exists", () => {
    expect(
      applyCatalogSuggestion("brand-1", brandOptions, applyBrandOverrideOption),
    ).toEqual({
      brandOverrideId: "brand-1",
      brandOverrideInput: "Nike",
      modelOverrideId: null,
      modelOverrideInput: "",
    });
    expect(
      applyCatalogSuggestion("missing", modelOptions, applyModelOverrideOption),
    ).toBeNull();
  });

  it("prefers explicit brand override over parsed brand id", () => {
    expect(resolveEffectiveBrandId("brand-1", "parsed-1")).toBe("brand-1");
    expect(resolveEffectiveBrandId(null, "parsed-1")).toBe("parsed-1");
    expect(resolveEffectiveBrandId(null, null)).toBeNull();
  });
});
