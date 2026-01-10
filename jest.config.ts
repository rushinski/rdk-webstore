// jest.config.ts
import type { Config } from "jest";

const base: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.tsx",
    "!src/**/__tests__/**",
    "!src/types/**",
  ],
};

const config: Config = {
  projects: [
    {
      ...base,
      displayName: "unit",
      testMatch: ["<rootDir>/tests/unit/**/*.test.ts"],
      testTimeout: 15000,
    },
    {
      ...base,
      displayName: "integration",
      testMatch: ["<rootDir>/tests/integration/**/*.test.ts"],
      testTimeout: 60000,
      // Integration tests often touch DB + API routes and are more fragile in parallel
      maxWorkers: 1,
    },
    {
      ...base,
      displayName: "rls",
      testMatch: ["<rootDir>/tests/rls/**/*.test.ts"],
      testTimeout: 60000,
      maxWorkers: 1,
    },
    {
      ...base,
      displayName: "security",
      testMatch: ["<rootDir>/tests/security/**/*.test.ts"],
      testTimeout: 60000,
      maxWorkers: 1,
    },
  ],
};

export default config;
