// tests/helpers/env.ts
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "path";

/**
 * Load test environment variables
 * This MUST be imported first in all test setup files
 */
export function loadTestEnv() {
  const root = process.cwd();
  const candidates = [".env.test.local", ".env.test"];
  const selected = candidates.find((candidate) => existsSync(resolve(root, candidate)));
  const result = selected ? config({ path: resolve(root, selected) }) : { error: null };
  
  if (!selected) {
    console.warn("Warning: Could not find .env.test.local or .env.test file.");
  } else if (result.error) {
    console.warn(`Warning: Could not load ${selected} file:`, result.error.message);
  }
  
  // Validate that critical test vars are present
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
    "TEST_BASE_URL",
    "SUPABASE_DB_URL",
    "NEXT_PUBLIC_SITE_URL",
  ];
  
  const missing = required.filter((key) => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required test environment variables: ${missing.join(", ")}\n` +
      "Make sure .env.test exists and contains all required variables."
    );
  }
  
  return process.env;
}

// Auto-load when this module is imported
loadTestEnv();
