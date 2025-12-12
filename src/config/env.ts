// src/config/env.ts
import { z } from "zod";

// describes the shape of what the real secrets should look like. Does not actually contain the secrets
const schema = z.object({
  // .url() being deprecated just means the developers plan to remove it in the future
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(), // must be a string + valid URL. NEXT_PUBLIC_ = publicly exposed to client-side code
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string(), // must be a string. NEXT_PUBLIC_ = publicly exposed to client-side code

  SUPABASE_SECRET_KEY: z.string(), // secret must be a string
  SUPABASE_DB_URL: z.string(),

  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),

  UPSTASH_REDIS_REST_URL: z.string().url(), // secret must be a string + valid URL
  UPSTASH_REDIS_REST_TOKEN: z.string(),

  SENTRY_DSN: z.string(), // secret is allowed to be undefined
  POSTHOG_API_KEY: z.string(),

  ADMIN_SESSION_SECRET: z.string(),
  
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),

  FACEBOOK_CLIENT_ID: z.string(),
  FACEBOOK_CLIENT_SECRET: z.string(),
});

// process.env is loaded dependant on how it is being ran. Local vs Vercel vs GitHub Actions
// schema contains the blueprint of what our env should look like. parse compares that blueprint to the actual built env
export const env = schema.parse(process.env);
