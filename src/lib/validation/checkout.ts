// src/lib/validation/checkout.ts
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

export const shippingAddressSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    phone: z.string().trim().min(1).max(30),
    line1: z.string().trim().min(1).max(200),
    line2: z.string().trim().max(200).optional().nullable(),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    postalCode: z.string().trim().min(1).max(20),
    country: z.string().trim().min(2).max(2),
  })
  .strict();

export const confirmPaymentSchema = z
  .object({
    orderId: z.string().uuid(),
    paymentIntentId: z.string().trim().min(1),
    fulfillment: z.enum(["ship", "pickup"]).optional(),
    shippingAddress: shippingAddressSchema.optional().nullable(),
  })
  .strict();

export const updateFulfillmentSchema = z
  .object({
    orderId: z.string().uuid(),
    fulfillment: z.enum(["ship", "pickup"]),
  })
  .strict();

export const calculateShippingSchema = z
  .object({
    productIds: z.array(z.string().uuid()).min(1),
  })
  .strict();