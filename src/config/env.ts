// src/config/env.ts
import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string(), // Added for Connect.js

  SUPABASE_SECRET_KEY: z.string(),
  SUPABASE_DB_URL: z.string(),

  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),

  EASYPOST_API_KEY: z.string(),

  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string(),

  SENTRY_DSN: z.string(),
  POSTHOG_API_KEY: z.string(),

  ADMIN_SESSION_SECRET: z.string(),
  
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),

  FACEBOOK_CLIENT_ID: z.string(),
  FACEBOOK_CLIENT_SECRET: z.string(),

  SES_SMTP_HOST: z.string(),
  SES_SMTP_PORT: z.string(),
  SES_SMTP_USER: z.string(),
  SES_SMTP_PASS: z.string(),
  SES_FROM_EMAIL: z.string(),
  SES_FROM_NAME: z.string(),

  NODE_ENV: z.enum(["development", "test", "production"]),
});

export const env = schema.parse(process.env);