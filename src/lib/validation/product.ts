import { z } from "zod";

const CATEGORY_VALUES = ["sneakers", "clothing", "accessories", "electronics"] as const;
const CONDITION_VALUES = ["new", "used"] as const;

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
    url: z.string().trim().min(1),
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
  })
  .strict();
