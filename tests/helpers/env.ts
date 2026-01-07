import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.test");

if (existsSync(envPath)) {
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const defaults: Record<string, string> = {
  NODE_ENV: "test",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-anon-key",
  SUPABASE_SECRET_KEY: "test-service-role-key",
  SUPABASE_DB_URL: "postgres://postgres:postgres@127.0.0.1:54322/postgres",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_placeholder",
  STRIPE_SECRET_KEY: "sk_test_placeholder",
  STRIPE_WEBHOOK_SECRET: "whsec_test_placeholder",
  SHIPPO_API_TOKEN: "shippo_test_placeholder",
  SHIPPO_WEBHOOK_TOKEN: "shippo_webhook_test_placeholder",
  UPSTASH_REDIS_REST_URL: "https://example.com/redis",
  UPSTASH_REDIS_REST_TOKEN: "test-redis-token",
  ADMIN_SESSION_SECRET: "test-admin-session-secret",
  GOOGLE_CLIENT_ID: "test-google-client-id",
  GOOGLE_CLIENT_SECRET: "test-google-client-secret",
  FACEBOOK_CLIENT_ID: "test-facebook-client-id",
  FACEBOOK_CLIENT_SECRET: "test-facebook-client-secret",
  SES_SMTP_HOST: "smtp.test",
  SES_SMTP_USER: "smtp-user",
  SES_SMTP_PASS: "smtp-pass",
  SES_FROM_EMAIL: "no-reply@example.com",
  SES_FROM_NAME: "RDK Test",
  AWS_REGION: "us-east-1",
  AWS_ACCESS_KEY_ID: "test-aws-access-key",
  AWS_SECRET_ACCESS_KEY: "test-aws-secret-key",
};

for (const [key, value] of Object.entries(defaults)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}
