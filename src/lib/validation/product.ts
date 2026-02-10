// src/lib/validation/product.ts
import { z } from "zod";

const CATEGORY_VALUES = ["sneakers", "clothing", "accessories", "electronics"] as const;
const CONDITION_VALUES = ["new", "used"] as const;
const STOCK_STATUS_VALUES = ["in_stock", "out_of_stock", "all"] as const;

const variantSchema = z
  .object({
    size_type: z.string().trim().min(1),
    size_label: z.string().trim().min(1),
    price_cents: z.number().int().nonnegative(),
    stock: z.number().int().nonnegative(),
    cost_cents: z.number().int().nonnegative().optional().nullable(),
  })
  .strict();

const imageSchema = z
  .object({
    url: z
      .string()
      .trim()
      .url()
      .refine((v) => !v.toLowerCase().startsWith("data:"), {
        message:
          "Image URL must be a real URL (no data: base64). Upload images to Storage first.",
      }),
    sort_order: z.number().int().nonnegative(),
    is_primary: z.boolean(),
  })
  .strict();

const tagSchema = z
  .object({
    label: z.string().trim().min(1),
    group_key: z.string().trim().min(1),
  })
  .strict();

const includeOutOfStockSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true";
  }
  if (typeof value === "number") {
    return value === 1;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (value === undefined || value === null) {
    return true;
  }
  return Boolean(value);
}, z.boolean());

export const productCreateSchema = z
  .object({
    title_raw: z.string().trim().min(1),
    brand_override_id: z.string().uuid().nullable().optional(),
    model_override_id: z.string().uuid().nullable().optional(),
    category: z.enum(CATEGORY_VALUES),
    condition: z.enum(CONDITION_VALUES),
    condition_note: z.string().trim().min(1).nullable().optional(),
    description: z.string().trim().min(1).nullable().optional(),
    shipping_override_cents: z.number().int().nonnegative().optional(),
    variants: z.array(variantSchema).min(1),
    images: z.array(imageSchema).min(1),
    tags: z.array(tagSchema).optional(),
    excluded_auto_tag_keys: z.array(z.string()).optional(),
  })
  .strict();

export const adminProductsQuerySchema = z
  .object({
    q: z.string().trim().min(1).optional(),
    category: z.array(z.enum(CATEGORY_VALUES)).optional(),
    condition: z.array(z.enum(CONDITION_VALUES)).optional(),
    limit: z.coerce.number().int().min(1).max(500).default(100),
    page: z.coerce.number().int().min(1).default(1),
    includeOutOfStock: includeOutOfStockSchema,
    stockStatus: z.enum(STOCK_STATUS_VALUES).optional(),
    searchMode: z.enum(["storefront", "inventory"]).optional(),
  })
  .strict();
