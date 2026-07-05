import type { ProductWithDetails } from "@/types/domain/product";
import type { Category, Condition, ProductRow } from "@/types/domain/product";

export type ProductFormShippingDefault = {
  category: string;
  shipping_cost_cents?: number;
  default_price_cents?: number;
  default_price?: number;
};

export type ProductFormBrandOption = {
  id: string;
  label: string;
  groupKey?: string | null;
};

export type CreateProductFormInitialData = {
  shippingDefaults: ProductFormShippingDefault[];
  brands: ProductFormBrandOption[];
};

export type EditProductFormInitialData = CreateProductFormInitialData & {
  product: ProductWithDetails | null;
};

export type ProductFormVariantInput = {
  id?: string;
  sku: string;
  size_label: string;
  sale_price_cents: number;
  unit_cost_cents: number;
  stock: number;
  sort_order: number;
};

export type ProductFormImageInput = {
  url: string;
  sort_order: number;
  is_primary: boolean;
};

export type ProductFormTagInput = {
  label: string;
  group_key?: string | null;
};

export type ProductFormSubmitInput = {
  name: string;
  brand_override_id?: string | null;
  model_override_id?: string | null;
  category: Category;
  condition: Condition;
  size_type: ProductRow["size_type"];
  description?: string | null;
  shipping_price_cents?: number | null;
  go_live_at?: string;
  variants: ProductFormVariantInput[];
  images: ProductFormImageInput[];
  tags?: ProductFormTagInput[];
  excluded_auto_tag_keys?: string[];
};
