import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const customJestConfig = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: [
    "<rootDir>/tests/integration/**/*.test.ts",
    "<rootDir>/tests/integration/**/*.spec.ts",
    "<rootDir>/tests/rls/**/*.test.ts",
    "<rootDir>/tests/rls/**/*.spec.ts",
  ],
  clearMocks: true,
  restoreMocks: true,
};

export default createJestConfig(customJestConfig);
