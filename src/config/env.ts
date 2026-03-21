// src/config/env.ts
import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string(),
  SUPABASE_SECRET_KEY: z.string(),
  SUPABASE_DB_URL: z.string(),

  // Stripe (keep during transition — remove once PayRilla is fully live)
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional().default(""),
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),

  // PayRilla (payment processor)
  PAYRILLA_WEBHOOK_SECRET: z.string().optional().default(""),
  // Defaults to production. Set to https://api.sandbox.payrillagateway.com/api/v2 for testing.
  PAYRILLA_API_URL: z.string().url().optional().default("https://api.payrillagateway.com/api/v2"),

  // ZipTax (sales tax rate lookup — free tier: 100 req/month, mitigated by 30-day cache)
  ZIPTAX_API_KEY: z.string().min(1),

  // NoFraud (fraud screening — free tier: 100 orders/month)
  NOFRAUD_API_KEY: z.string().min(1),
  // Customer code embedded in the device JS snippet URL (e.g. 53926).
  // Used to load services.nofraud.com/js/{code}/customer_code.js on checkout pages.
  NEXT_PUBLIC_NOFRAUD_CUSTOMER_CODE: z.string().min(1),

  SHIPPO_API_TOKEN: z.string(),
  SHIPPO_WEBHOOK_TOKEN: z.string(),

  HERE_MAPS_API_KEY: z.string().min(1),

  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string(),

  ADMIN_SESSION_SECRET: z.string(),

  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),

  SES_SMTP_HOST: z.string(),
  SES_SMTP_USER: z.string(),
  SES_SMTP_PASS: z.string(),
  SES_FROM_EMAIL: z.string(),
  SES_FROM_NAME: z.string(),
  SUPPORT_INBOX_EMAIL: z.string().email(),

  AWS_REGION: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),

  ORDER_ACCESS_TOKEN_SECRET: z.string().min(16),
  NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED: z.enum(["true", "false"]).default("true"),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .optional()
    .default("development"),
});

export const env = schema.parse(process.env);
