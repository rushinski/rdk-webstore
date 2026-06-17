import type { Category, SizeType } from "@/types/domain/product";

export type SyncOverrideCategory =
  | "sneakers"
  | "clothing"
  | "accessories"
  | "electronics";

export type LightspeedResolvedCategory =
  | {
      status: "resolved";
      category: Category;
      sizeType: SizeType;
    }
  | {
      status: "missing";
    };

export function resolveWebsiteCategoryAndSizeType(
  rawCategory: string | null | undefined,
): LightspeedResolvedCategory {
  const normalized = rawCategory?.trim().toLowerCase() ?? "";

  if (normalized === "clothing") {
    return { status: "resolved", category: "clothing", sizeType: "clothing" };
  }
  if (normalized === "sneakers") {
    return { status: "resolved", category: "sneakers", sizeType: "shoe" };
  }
  if (normalized === "accessories") {
    return { status: "resolved", category: "accessories", sizeType: "custom" };
  }
  if (normalized === "electronics") {
    return { status: "resolved", category: "electronics", sizeType: "custom" };
  }

  return { status: "missing" };
}
