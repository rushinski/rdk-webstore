import {
  appendImageDraft,
  normalizeImageDrafts,
  removeImageDraftAt,
  setPrimaryImageDraftAt,
} from "@/modules/catalog/presentation/admin/inventory/product-form/imageDrafts";
import type { ImageDraft } from "@/modules/catalog/presentation/admin/inventory/product-form/types";

describe("product form image drafts", () => {
  it("normalizes sort order and falls back to the first image as primary", () => {
    const drafts: ImageDraft[] = [
      { url: "https://cdn.test/2.jpg", sort_order: 9, is_primary: false },
      { url: "https://cdn.test/1.jpg", sort_order: 4, is_primary: false },
    ];

    expect(normalizeImageDrafts(drafts)).toEqual<ImageDraft[]>([
      { url: "https://cdn.test/2.jpg", sort_order: 0, is_primary: true },
      { url: "https://cdn.test/1.jpg", sort_order: 1, is_primary: false },
    ]);
  });

  it("appends trimmed urls and ignores empty values", () => {
    const drafts: ImageDraft[] = [
      { url: "https://cdn.test/existing.jpg", sort_order: 0, is_primary: true },
    ];

    expect(appendImageDraft(drafts, "  https://cdn.test/new.jpg  ")).toEqual<
      ImageDraft[]
    >([
      { url: "https://cdn.test/existing.jpg", sort_order: 0, is_primary: true },
      { url: "https://cdn.test/new.jpg", sort_order: 1, is_primary: false },
    ]);
    expect(appendImageDraft(drafts, "   ")).toEqual(drafts);
  });

  it("removes images and can promote a new primary image", () => {
    const drafts: ImageDraft[] = [
      { url: "https://cdn.test/1.jpg", sort_order: 0, is_primary: true },
      { url: "https://cdn.test/2.jpg", sort_order: 1, is_primary: false },
      { url: "https://cdn.test/3.jpg", sort_order: 2, is_primary: false },
    ];

    expect(removeImageDraftAt(drafts, 0)).toEqual<ImageDraft[]>([
      { url: "https://cdn.test/2.jpg", sort_order: 0, is_primary: true },
      { url: "https://cdn.test/3.jpg", sort_order: 1, is_primary: false },
    ]);
    expect(setPrimaryImageDraftAt(drafts, 2)).toEqual<ImageDraft[]>([
      { url: "https://cdn.test/1.jpg", sort_order: 0, is_primary: false },
      { url: "https://cdn.test/2.jpg", sort_order: 1, is_primary: false },
      { url: "https://cdn.test/3.jpg", sort_order: 2, is_primary: true },
    ]);
  });
});
