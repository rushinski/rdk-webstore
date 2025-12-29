import { z } from "zod";

export const checkoutSessionSchema = z
  .object({
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          variantId: z.string().uuid(),
          quantity: z.number().int().positive(),
        })
      )
      .min(1),
    fulfillment: z.enum(["ship", "pickup"]),
    idempotencyKey: z.string().uuid(),
  })
  .strict();
