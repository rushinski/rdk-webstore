// jest.integration.config.ts
import type { Config } from "jest";
import baseConfig from "./jest.config";

const config: Config = {
  ...baseConfig,
  testMatch: ["**/tests/integration/**/*.test.ts"],
  setupFilesAfterEnv: [
    "<rootDir>/jest.setup.ts",
    "<rootDir>/tests/setup-integration.ts",
  ],
  testTimeout: 60000,
};

export default config;
