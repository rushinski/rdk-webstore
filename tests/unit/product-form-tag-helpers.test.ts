import type { TagChip } from "@/components/inventory/TagInput";
import {
  appendUniqueCustomTag,
  buildAutoTags,
  filterExcludedTags,
  getTagKey,
  mergeUniqueTags,
  removeTagSelection,
} from "@/components/inventory/product-form/tagHelpers";
import type { VariantDraft } from "@/components/inventory/product-form/types";

describe("product form tag helpers", () => {
  it("builds auto tags from parsed data, inventory metadata, and in-stock sizes", () => {
    const variants: VariantDraft[] = [
      {
        draft_id: "v1",
        sku: "SKU-1",
        size_label: "10",
        salePrice: "210.00",
        unitCost: "120.00",
        stock: "2",
      },
      {
        draft_id: "v2",
        sku: "SKU-2",
        size_label: "10",
        salePrice: "220.00",
        unitCost: "130.00",
        stock: "0",
      },
      {
        draft_id: "v3",
        sku: "SKU-3",
        size_label: "11",
        salePrice: "230.00",
        unitCost: "140.00",
        stock: "1",
      },
    ];

    expect(
      buildAutoTags({
        parsedBrandLabel: "Rick Owens",
        parsedBrandGroup: "designer",
        parsedModelLabel: "Geobasket",
        category: "sneakers",
        condition: "used",
        sizeType: "shoe",
        variants,
      }),
    ).toEqual<TagChip[]>([
      { label: "Rick Owens", group_key: "brand", source: "auto" },
      { label: "Rick Owens", group_key: "designer_brand", source: "auto" },
      { label: "Geobasket", group_key: "model", source: "auto" },
      { label: "sneakers", group_key: "category", source: "auto" },
      { label: "used", group_key: "condition", source: "auto" },
      { label: "10", group_key: "size_shoe", source: "auto" },
      { label: "11", group_key: "size_shoe", source: "auto" },
    ]);
  });

  it("filters excluded auto tags and merges duplicate custom tags once", () => {
    const autoTags: TagChip[] = [
      { label: "Rick Owens", group_key: "brand", source: "auto" },
      { label: "sneakers", group_key: "category", source: "auto" },
    ];
    const customTags: TagChip[] = [
      { label: "Archive", group_key: "custom", source: "custom" },
      { label: "Archive", group_key: "custom", source: "custom" },
      { label: "Rick Owens", group_key: "brand", source: "custom" },
    ];

    const visibleAutoTags = filterExcludedTags(autoTags, [getTagKey(autoTags[0])]);

    expect(visibleAutoTags).toEqual<TagChip[]>([
      { label: "sneakers", group_key: "category", source: "auto" },
    ]);
    expect(mergeUniqueTags(visibleAutoTags, customTags)).toEqual<TagChip[]>([
      { label: "sneakers", group_key: "category", source: "auto" },
      { label: "Archive", group_key: "custom", source: "custom" },
      { label: "Rick Owens", group_key: "brand", source: "custom" },
    ]);
  });

  it("appends a trimmed custom tag only when it is unique", () => {
    const allTags: TagChip[] = [
      { label: "sneakers", group_key: "category", source: "auto" },
      { label: "Archive", group_key: "custom", source: "custom" },
    ];
    const customTags: TagChip[] = [
      { label: "Archive", group_key: "custom", source: "custom" },
    ];

    expect(appendUniqueCustomTag(customTags, allTags, "  Runway  ")).toEqual<TagChip[]>([
      { label: "Archive", group_key: "custom", source: "custom" },
      { label: "Runway", group_key: "custom", source: "custom" },
    ]);
    expect(appendUniqueCustomTag(customTags, allTags, " archive ")).toEqual(customTags);
    expect(appendUniqueCustomTag(customTags, allTags, "   ")).toEqual(customTags);
  });

  it("removes custom tags and excludes auto tags without duplicating exclusions", () => {
    const customTags: TagChip[] = [
      { label: "Archive", group_key: "custom", source: "custom" },
      { label: "Runway", group_key: "custom", source: "custom" },
    ];
    const autoTag: TagChip = { label: "sneakers", group_key: "category", source: "auto" };
    const customTag: TagChip = { label: "Runway", group_key: "custom", source: "custom" };

    expect(removeTagSelection(autoTag, customTags, [getTagKey(autoTag)])).toEqual({
      customTags,
      excludedAutoTagKeys: [getTagKey(autoTag)],
    });
    expect(removeTagSelection(customTag, customTags, [])).toEqual({
      customTags: [{ label: "Archive", group_key: "custom", source: "custom" }],
      excludedAutoTagKeys: [],
    });
  });
});
