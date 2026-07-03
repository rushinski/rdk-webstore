// src/config/env.ts
import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED: z.enum(["true", "false"]).default("true"),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string(),
  SUPABASE_SECRET_KEY: z.string(),
  SUPABASE_DB_URL: z.string(),

  SHIPPO_API_TOKEN: z.string(),
  SHIPPO_WEBHOOK_TOKEN: z.string(),

  HERE_MAPS_API_KEY: z.string().min(1),

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

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .optional()
    .default("development"),
});

export const env = schema.parse(process.env);
