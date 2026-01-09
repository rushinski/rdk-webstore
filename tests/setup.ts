// tests/setup.ts
import '@testing-library/jest-dom';
import './helpers/env';

// Global test setup
beforeAll(async () => {
  // Verify environment variables
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
});

// Global test teardown
afterAll(async () => {
  // Cleanup any hanging connections
});