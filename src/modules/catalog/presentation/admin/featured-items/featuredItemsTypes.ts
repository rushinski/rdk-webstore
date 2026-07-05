export type FeaturedItem = {
  id: string;
  product_id: string;
  sort_order: number;
  product: {
    id: string;
    name: string;
    brand: string;
    model: string | null;
    category: string;
    is_active: boolean;
    is_out_of_stock: boolean;
    images?: Array<{
      url: string;
      is_primary: boolean;
      sort_order: number;
    }>;
    variants?: Array<{
      id: string;
      sale_price_cents: number;
      stock: number;
    }>;
  };
};

export type FeaturedItemsProduct = {
  id: string;
  name: string;
  brand: string;
  category: string;
  images: Array<{ url: string }>;
  variants: Array<{ sale_price_cents: number }>;
};

export type FeaturedItemsToastState = {
  message: string;
  tone: "success" | "error" | "info";
} | null;
