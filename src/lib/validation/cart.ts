// src/lib/validation/cart.ts
import { z } from "zod";

export const cartValidateSchema = z
  .object({
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          variantId: z.string().uuid(),
          quantity: z.number().int().positive(),
        })
      )
      .default([]),
  })
  .strict();

export const cartSnapshotSchema = z
  .object({
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          variantId: z.string().uuid(),
          sizeLabel: z.string().trim().min(1),
          brand: z.string().trim().min(1),
          name: z.string().trim().min(1),
          titleDisplay: z.string().trim().min(1),
          priceCents: z.number().int().nonnegative(),
          imageUrl: z.string().trim().min(1),
          quantity: z.number().int().positive(),
          maxStock: z.number().int().positive().optional(),
        })
      )
      .default([]),
  })
  .strict();
