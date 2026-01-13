// tests/helpers/env/load-test-env.ts
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

let loaded = false;

export function loadTestEnv() {
  if (loaded) return process.env;

  // Never allow tests to run in production by accident
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run tests with NODE_ENV=production.");
  }

  // Prefer a local-only file that is gitignored
  const envPath = resolve(process.cwd(), ".env.test.local");
  const result = dotenvConfig({ path: envPath });

  if (result.error) {
    // Allow CI to provide env via GitHub/Vercel secrets without a file.
    // But on dev machines, the file is strongly recommended.
    // eslint-disable-next-line no-console
    console.warn(
      `Warning: Could not load ${envPath}. If you're local, create it from .env.test.example.`
    );
  }

  // Back-compat: migrate PUBLISHABLE_KEY -> ANON_KEY name
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  }

  // Back-compat: mirror public Supabase envs to server-style names for tests
  if (!process.env.SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  }

  if (!process.env.SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    process.env.SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }

  // Normalize base URL across all test types
  if (!process.env.TEST_BASE_URL) {
    process.env.TEST_BASE_URL = "http://localhost:3100";
  }

  const required = [
    "TEST_BASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_DB_URL",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
  ];

  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `Missing required test env vars: ${missing.join(", ")}\n` +
        "Create .env.test.local from .env.test.example OR provide them via CI secrets."
    );
  }

  loaded = true;
  return process.env;
}