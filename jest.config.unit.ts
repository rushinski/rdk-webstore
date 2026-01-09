// jest.config.unit.js
module.exports = {
  ...require('./jest.config'),
  displayName: 'unit',
  testMatch: ['**/tests/unit/**/*.test.ts'],
  testTimeout: 10000,
};