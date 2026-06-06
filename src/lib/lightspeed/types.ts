export type LightspeedProductCode = {
  code: string;
  type: "CUSTOM";
};

export type LightspeedVariantAttribute = {
  id: string;
  name: string;
};

export type LightspeedRemoteVariantOption = {
  name?: string | null;
  value?: string | null;
};

export type LightspeedRemoteInventoryLevel = {
  outlet_id?: string | null;
  current_amount?: number | null;
  current_inventory_level?: number | null;
};

export type LightspeedRemoteImage = {
  id?: string | null;
  url?: string | null;
  src?: string | null;
};

export type LightspeedRemoteProduct = {
  id: string;
  name?: string | null;
  updated_at?: string | null;
  variant_name?: string | null;
  description?: string | null;
  sku?: string | null;
  supply_price?: number | string | null;
  price_including_tax?: number | string | null;
  retail_price?: number | string | null;
  product_codes?: Array<{ code?: string | null; type?: string | null }> | null;
  brand_name?: string | null;
  product_category?: string | null;
  product_category_name?: string | null;
  active?: boolean | number | null;
  is_active?: boolean | null;
  deleted_at?: string | null;
  inventory?: LightspeedRemoteInventoryLevel[] | null;
  images?: LightspeedRemoteImage[] | null;
  variant_definitions?: LightspeedRemoteVariantOption[] | null;
  variant_option_one_name?: string | null;
  variant_option_one_value?: string | null;
  variant_option_two_name?: string | null;
  variant_option_two_value?: string | null;
  variant_option_three_name?: string | null;
  variant_option_three_value?: string | null;
  inventory_Main_Outlet?: number | string | null;
  variants?: LightspeedRemoteProduct[] | null;
};

export type LightspeedListResponse<T> = {
  data?: T[] | T | null;
  count?: number | null;
  pagination?: {
    page?: number | null;
    page_size?: number | null;
    next?: string | null;
    next_page?: number | null;
    previous?: string | null;
    previous_page?: number | null;
    total?: number | null;
    total_pages?: number | null;
  } | null;
  version?: {
    min?: number | null;
    max?: number | null;
  } | null;
};

export type NormalizedLightspeedProduct = {
  lightspeedProductId: string;
  externalSku: string;
  rawName: string;
  cleanName: string;
  description: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  condition: "new" | "used";
  sizeLabel: string;
  priceCents: number | null;
  costCents: number | null;
  stock: number;
  isActive: boolean;
  isDeleted: boolean;
  imageUrls: string[];
};

export type LightspeedVariantDefinition = {
  attribute_id: string;
  value: string;
};

export type LightspeedVariantDefinitionInput = {
  attributeId: string;
  name: string;
  value: string;
};

export type LightspeedProductVariantPayload = {
  name: string;
  sku: string;
  product_codes: LightspeedProductCode[];
  price_including_tax: number;
  is_active: boolean;
  variant_definitions: LightspeedVariantDefinition[];
};

export type LightspeedCreateProductPayload = {
  name: string;
  description?: string;
  is_active: boolean;
  sku?: string;
  product_codes?: LightspeedProductCode[];
  price_including_tax?: number;
  variants?: LightspeedProductVariantPayload[];
};

export type LightspeedUpdateProductPayload = {
  common?: {
    name?: string;
    description?: string;
    is_active?: boolean;
  };
  details?: {
    sku?: string;
    product_codes?: LightspeedProductCode[];
    price_including_tax?: number;
    is_active?: boolean;
    inventory?: Array<{
      current_amount: number;
      outlet_id?: string;
    }>;
  };
};

export type LightspeedProductResponse =
  | {
      data?: {
        id?: string;
      };
    }
  | {
      data?: string[];
    };

export type LightspeedVariantAttributeResponse = {
  data?: LightspeedVariantAttribute | LightspeedVariantAttribute[] | null;
};
