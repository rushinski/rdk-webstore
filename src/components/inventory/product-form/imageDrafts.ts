import type { ImageDraft } from "./types";

export function normalizeImageDrafts(items: ImageDraft[]): ImageDraft[] {
  const hasPrimary = items.some((item) => item.is_primary);

  return items.map((item, index) => ({
    ...item,
    sort_order: index,
    is_primary: hasPrimary ? item.is_primary : index === 0,
  }));
}

export function appendImageDraft(items: ImageDraft[], url: string): ImageDraft[] {
  const trimmed = url.trim();
  if (!trimmed) {
    return items;
  }

  return normalizeImageDrafts([
    ...items,
    {
      url: trimmed,
      sort_order: items.length,
      is_primary: items.length === 0,
    },
  ]);
}

export function removeImageDraftAt(items: ImageDraft[], index: number): ImageDraft[] {
  return normalizeImageDrafts(items.filter((_, currentIndex) => currentIndex !== index));
}

export function setPrimaryImageDraftAt(items: ImageDraft[], index: number): ImageDraft[] {
  return normalizeImageDrafts(
    items.map((image, currentIndex) => ({
      ...image,
      is_primary: currentIndex === index,
    })),
  );
}
