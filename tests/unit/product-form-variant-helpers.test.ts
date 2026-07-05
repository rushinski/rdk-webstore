import {
  buildVariantSizeOptions,
  createEmptyVariantDraft,
  reorderVariantsByDraftId,
  resetVariantsForSizeType,
  updateVariantFieldAt,
} from "@/modules/catalog/presentation/admin/inventory/product-form/variantHelpers";
import type { VariantDraft } from "@/modules/catalog/presentation/admin/inventory/product-form/types";

describe("product form variant helpers", () => {
  it("creates a new empty variant using the active size type", () => {
    expect(
      createEmptyVariantDraft({
        sizeType: "none",
        createVariantDraftId: () => "variant-1",
        createDraftSku: () => "sku-1",
      }),
    ).toEqual<VariantDraft>({
      draft_id: "variant-1",
      sku: "sku-1",
      size_label: "N/A",
      salePrice: "",
      unitCost: "",
      stock: "1",
    });
  });

  it("resets variant labels when the size type changes", () => {
    const variants: VariantDraft[] = [
      {
        draft_id: "variant-1",
        sku: "sku-1",
        size_label: "N/A",
        salePrice: "100.00",
        unitCost: "50.00",
        stock: "1",
      },
      {
        draft_id: "variant-2",
        sku: "sku-2",
        size_label: "10",
        salePrice: "120.00",
        unitCost: "60.00",
        stock: "2",
      },
    ];

    expect(resetVariantsForSizeType(variants, "none")).toEqual<VariantDraft[]>([
      { ...variants[0], size_label: "N/A" },
      { ...variants[1], size_label: "N/A" },
    ]);
    expect(resetVariantsForSizeType(variants, "custom")).toEqual<VariantDraft[]>([
      { ...variants[0], size_label: "" },
      { ...variants[1], size_label: "10" },
    ]);
    expect(resetVariantsForSizeType(variants, "shoe")).toEqual<VariantDraft[]>([
      { ...variants[0], size_label: "" },
      { ...variants[1], size_label: "" },
    ]);
  });

  it("updates and reorders variants safely", () => {
    const variants: VariantDraft[] = [
      {
        draft_id: "variant-1",
        sku: "sku-1",
        size_label: "8",
        salePrice: "100.00",
        unitCost: "50.00",
        stock: "1",
      },
      {
        draft_id: "variant-2",
        sku: "sku-2",
        size_label: "9",
        salePrice: "120.00",
        unitCost: "60.00",
        stock: "2",
      },
    ];

    expect(updateVariantFieldAt(variants, 1, "stock", "5")).toEqual<VariantDraft[]>([
      variants[0],
      { ...variants[1], stock: "5" },
    ]);
    expect(
      reorderVariantsByDraftId(
        variants,
        "variant-1",
        "variant-2",
        (items, oldIndex, newIndex) => {
          const copy = [...items];
          const [moved] = copy.splice(oldIndex, 1);
          copy.splice(newIndex, 0, moved);
          return copy;
        },
      ),
    ).toEqual<VariantDraft[]>([variants[1], variants[0]]);
  });

  it("builds size options with the selected custom value included once", () => {
    expect(buildVariantSizeOptions(["8", "9"], "10")).toEqual([
      { value: "", label: "Select..." },
      { value: "10", label: "10" },
      { value: "8", label: "8" },
      { value: "9", label: "9" },
    ]);
    expect(buildVariantSizeOptions(["8", "9"], " 9 ")).toEqual([
      { value: "", label: "Select..." },
      { value: "8", label: "8" },
      { value: "9", label: "9" },
    ]);
  });
});
