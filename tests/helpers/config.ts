// tests/helpers/config.ts
import { loadTestEnv } from "./env/load-test-env";

loadTestEnv();

export const testConfig = {
  baseUrl: process.env.TEST_BASE_URL!,
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    dbUrl: process.env.SUPABASE_DB_URL!,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  },
} as const;
