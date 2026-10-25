import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  // Playwright owns e2e/; keep Jest from trying to run those specs.
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/e2e/"],
};

export default createJestConfig(config);
