import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"], // Looks at our jest setup config to check any rules

  moduleNameMapper: {
    "^@/lib/(.*)$": "<rootDir>/src/lib/$1",
    "^@/proxy/(.*)$": "<rootDir>/src/proxy/$1",
    "^@/(.*)$": "<rootDir>/src/$1",
  }
};

export default config;
