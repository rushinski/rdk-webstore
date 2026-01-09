// tests/setup-e2e.ts (for Playwright global setup)
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('Starting E2E test setup...');
  
  // Reset database before E2E tests
  const { resetDatabase, seedBaseData } = await import('./helpers/db');
  await resetDatabase();
  await seedBaseData();
  
  console.log('E2E test setup complete.');
}

export default globalSetup;