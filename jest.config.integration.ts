// jest.config.integration.js
module.exports = {
  ...require('./jest.config'),
  displayName: 'integration',
  testMatch: ['**/tests/integration/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts', '<rootDir>/tests/setup-integration.ts'],
  testTimeout: 60000,
};
