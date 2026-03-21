// src/config/client-env.ts
"use client";

import { z } from "zod";

const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional().default(""),
  NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED: z.enum(["true", "false"]).default("true"),
  // PayRilla Hosted Tokenization script URL.
  // Sandbox: https://tokenization.sandbox.payrillagateway.com/tokenization/v0.3
  // Production: https://tokenization.payrillagateway.com/tokenization/v0.3
  NEXT_PUBLIC_PAYRILLA_TOKENIZATION_URL: z
    .string()
    .url()
    .default("https://tokenization.sandbox.payrillagateway.com/tokenization/v0.3"),
});

// We don't pass full process.env here.
// Next will inline these values at build time in the client bundle.
export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED: process.env.NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED,
  NEXT_PUBLIC_PAYRILLA_TOKENIZATION_URL: process.env.NEXT_PUBLIC_PAYRILLA_TOKENIZATION_URL,
});
