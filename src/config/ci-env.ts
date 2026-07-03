// src/config/ci-env.ts
import { z } from "zod";

const ciSchema = z.object({
  // Repo secrets
  VERCEL_TOKEN: z.string(),

  // Environment secrets
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string(),

  SUPABASE_SECRET_KEY: z.string(),
  SUPABASE_DB_URL: z.string().url(),

  SENTRY_DSN: z.string(),
  POSTHOG_API_KEY: z.string(),
});

export const ciEnv = ciSchema.parse(process.env);
