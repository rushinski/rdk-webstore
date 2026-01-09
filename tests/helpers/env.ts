// tests/helpers/env.ts
import { config } from "dotenv";
import { resolve } from "path";

/**
 * Load test environment variables
 * This MUST be imported first in all test setup files
 */
export function loadTestEnv() {
  // Load .env.test from root
  const result = config({ path: resolve(process.cwd(), ".env.test") });
  
  if (result.error) {
    console.warn("Warning: Could not load .env.test file:", result.error.message);
  }
  
  // Validate that critical test vars are present
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
    "TEST_BASE_URL",
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