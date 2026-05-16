export type LightspeedProductCode = {
  code: string;
  type: "CUSTOM";
};

export type LightspeedVariantDefinition = {
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
  common: {
    name?: string;
    description?: string;
    is_active?: boolean;
  };
  details?: {
    sku?: string;
    product_codes?: LightspeedProductCode[];
    price_including_tax?: number;
    is_active?: boolean;
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
