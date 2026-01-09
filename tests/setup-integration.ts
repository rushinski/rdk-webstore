// tests/setup-integration.ts
import { resetDatabase, seedBaseData } from './helpers/db';

// Integration test setup
beforeAll(async () => {
  console.log('Setting up integration tests...');
  await resetDatabase();
  await seedBaseData();
  console.log('Integration test setup complete.');
}, 60000);