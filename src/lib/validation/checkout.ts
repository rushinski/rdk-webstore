// src/lib/validation/checkout.ts
import { z } from "zod";

// ---------- Shared ----------

export const checkoutItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
  quantity: z.number().int().positive().max(20),
});

export const shippingAddressSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    phone: z.string().trim().max(30).optional().nullable(),
    line1: z.string().trim().min(1).max(200),
    line2: z.string().trim().max(200).optional().nullable(),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().length(2),
    postal_code: z.string().trim().min(3).max(20),
    country: z.string().trim().length(2).default("US"),
  })
  .strict();

// ---------- create-payment-intent ----------

export const createPaymentIntentSchema = z
  .object({
    items: z.array(checkoutItemSchema).min(1).max(50),
    fulfillment: z.enum(["ship", "pickup"]),
    idempotencyKey: z.string().uuid(),
    guestEmail: z
      .string()
      .email()
      .optional()
      .nullable()
      .transform((v) => v || null),
    shippingAddress: shippingAddressSchema.optional().nullable(),
  })
  .strict();

// ---------- confirm-payment ----------

export const confirmPaymentSchema = z
  .object({
    orderId: z.string().uuid(),
    paymentIntentId: z.string().trim().min(1),
    fulfillment: z.enum(["ship", "pickup"]).optional(),
    guestEmail: z.string().email().optional().nullable(), // <--- Added this
    shippingAddress: shippingAddressSchema.optional().nullable(),
  })
  .strict();

// ---------- update-fulfillment ----------

export const updateFulfillmentSchema = z
  .object({
    orderId: z.string().uuid(),
    fulfillment: z.enum(["ship", "pickup"]),
    shippingAddress: shippingAddressSchema.optional().nullable(),
  })
  .strict();

// ---------- calculate-shipping ----------

export const calculateShippingSchema = z
  .object({
    productIds: z.array(z.string().uuid()).min(1),
  })
  .strict();
