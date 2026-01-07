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
