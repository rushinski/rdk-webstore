import type { ProductCreateInput } from "@/services/product-service";
import type { ProductWithDetails } from "@/types/domain/product";

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

export type ProductFormSubmitInput = ProductCreateInput;
