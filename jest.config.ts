import nextJest from "next/jest.js";
import type { Config } from "jest";

const testEnvDefaults: Record<string, string> = {
  NEXT_PUBLIC_SITE_URL: "https://example.com",
  NEXT_PUBLIC_GUEST_CHECKOUT_ENABLED: "true",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
  SUPABASE_SECRET_KEY: "test-secret-key",
  SUPABASE_DB_URL: "postgresql://user:pass@localhost:5432/testdb",
  SHIPPO_API_TOKEN: "test-shippo-token",
  SHIPPO_WEBHOOK_TOKEN: "test-shippo-webhook-token",
  HERE_MAPS_API_KEY: "test-here-maps-key",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "test-upstash-token",
  ADMIN_SESSION_SECRET: "test-admin-session-secret",
  GOOGLE_CLIENT_ID: "test-google-client-id",
  GOOGLE_CLIENT_SECRET: "test-google-client-secret",
  SES_SMTP_HOST: "smtp.example.com",
  SES_SMTP_USER: "smtp-user",
  SES_SMTP_PASS: "smtp-pass",
  SES_FROM_EMAIL: "support@example.com",
  SES_FROM_NAME: "Example Support",
  SUPPORT_INBOX_EMAIL: "support@example.com",
  AWS_REGION: "us-east-1",
  AWS_ACCESS_KEY_ID: "test-access-key",
  AWS_SECRET_ACCESS_KEY: "test-secret-access-key",
  ORDER_ACCESS_TOKEN_SECRET: "1234567890abcdef",
  LIGHTSPEED_ACCESS_TOKEN: "test-lightspeed-access-token",
  LIGHTSPEED_DOMAIN_PREFIX: "test-lightspeed-domain",
  LIGHTSPEED_WEBHOOK_SIGNING_SECRET: "",
  PAYRILLA_API_URL: "https://api.payrillagateway.com/api/v2",
  NEXT_PUBLIC_PAYRILLA_TOKENIZATION_URL:
    "https://tokenization.sandbox.payrillagateway.com/tokenization/v0.3",
  ZIPTAX_API_KEY: "test-ziptax-key",
  NOFRAUD_API_KEY: "test-nofraud-key",
  NEXT_PUBLIC_NOFRAUD_CUSTOMER_CODE: "test-nofraud-customer-code",
  NODE_ENV: "test",
};

for (const [key, value] of Object.entries(testEnvDefaults)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  displayName: "unit",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
  testMatch: [
    "<rootDir>/tests/unit/**/*.test.ts",
    "<rootDir>/tests/unit/**/*.test.tsx",
    "<rootDir>/src/**/*.test.ts",
    "<rootDir>/src/**/*.test.tsx",
  ],
};

export default createJestConfig(config);
