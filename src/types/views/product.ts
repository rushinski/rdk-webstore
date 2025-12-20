// src/types/views/product.ts
import type { Tables } from "@/types/database.types";

export type ProductRow = Tables<"products">;
export type ProductVariantRow = Tables<"product_variants">;
export type ProductImageRow = Tables<"product_images">;
export type TagRow = Tables<"tags">;

// Column-derived aliases (these will be `string` unless your DB types are enums)
export type Category = ProductRow["category"];
export type Condition = ProductRow["condition"];
export type SizeType = ProductVariantRow["size_type"];
export type TagGroupKey = TagRow["group_key"];

export type ProductWithDetails = ProductRow & {
  variants: ProductVariantRow[];
  images: ProductImageRow[];
  tags: TagRow[];
};
