import { z } from "zod";

const ciSchema = z.object({
  // Repo secrets
  VERCEL_TOKEN: z.string(),

  // Environment secrets
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),

  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  SUPABASE_DB_URL: z.string().url(),

  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),

  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string(),

  SENTRY_DSN: z.string(),
  POSTHOG_API_KEY: z.string(),
});

export const ciEnv = ciSchema.parse(process.env);
