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

export const billingAddressSchema = z
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

// Shipping label schema with required phone (Shippo requires phone for complete address)
export const shippingLabelAddressSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    phone: z.string().trim().min(10, "Phone number required for shipping labels").max(30),
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

// ---------- create-checkout (PayRilla) ----------
// The frontend tokenizes the card via PayRilla Hosted Tokenization and sends
// the nonce + card metadata here. The server completes the charge in one step.

export const createCheckoutSchema = z
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
    billingAddress: billingAddressSchema.optional().nullable(),
    // --- Card payment (PayRilla Hosted Tokenization) ---
    nonce: z.string().trim().min(1).optional().nullable(),
    expiryMonth: z.number().int().min(1).max(12).optional().nullable(),
    expiryYear: z.number().int().min(new Date().getFullYear()).max(9999).optional().nullable(),
    avsZip: z.string().trim().optional().nullable(),
    cardholderName: z.string().trim().max(255).optional().nullable(),
    // Device fingerprint token from NoFraud JS snippet cookie (optional but improves accuracy)
    nfToken: z.string().trim().optional().nullable(),
    // Card metadata from PayRilla tokenization result (used for NoFraud payment object)
    last4: z.string().trim().length(4).optional().nullable(),
    cardType: z.string().trim().max(30).optional().nullable(),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (d.nonce == null || d.expiryMonth == null || d.expiryYear == null) {
      ctx.addIssue({
        code: "custom",
        path: ["nonce"],
        message: "Card nonce and expiry are required",
      });
    }
  });

// ---------- confirm-payment ----------

export const confirmPaymentSchema = z
  .object({
    orderId: z.string().uuid(),
    paymentIntentId: z.string().trim().min(1),
    fulfillment: z.enum(["ship", "pickup"]).optional(),
    guestEmail: z.string().email().optional().nullable(), // <--- Added this
    shippingAddress: shippingAddressSchema.optional().nullable(),
    billingAddress: billingAddressSchema.optional().nullable(),
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
