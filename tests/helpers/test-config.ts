// tests/helpers/test-config.ts
import "./env"; // Load env first

/**
 * Central test configuration
 * Import this instead of accessing process.env directly in tests
 */
export const testConfig = {
  baseUrl: process.env.TEST_BASE_URL || "http://localhost:3100",
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    serviceRoleKey: process.env.SUPABASE_SECRET_KEY!,
    dbUrl: process.env.SUPABASE_DB_URL!,
  },
  stripe: {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  },
  timeouts: {
    unit: 10000,
    integration: 60000,
    e2e: 120000,
  },
} as const;