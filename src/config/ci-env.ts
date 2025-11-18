import { z } from "zod";

const ciSchema = z.object({
  SUPABASE_ACCESS_TOKEN: z.string(),
  VERCEL_TOKEN: z.string(),

  SUPABASE_STAGING_PROJECT_ID: z.string().optional(),
  SUPABASE_STAGING_DB_URL: z.string().url().optional(),
  STAGING_BASE_URL: z.string().url().optional(),

  SUPABASE_PROD_PROJECT_ID: z.string().optional(),
  SUPABASE_PROD_DB_URL: z.string().url().optional(),
  PROD_BASE_URL: z.string().url().optional(),
});

export const ciEnv = ciSchema.parse(process.env);
