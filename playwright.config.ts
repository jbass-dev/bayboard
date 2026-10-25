import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests drive the real app in a real browser against the
 * Firebase Emulator Suite (Auth + Firestore), so they never touch the live
 * project and need no secrets. Playwright starts both servers itself:
 *
 *   npm run test:e2e        headless run
 *   npm run test:e2e:ui     Playwright's interactive UI mode
 *
 * The emulators need Java 21+ on the machine (CI installs it).
 */
const PORT = 3100;
const PROJECT_ID = "demo-bayboard"; // "demo-" ids are emulator-only, no real project needed
const baseURL = `http://127.0.0.1:${PORT}`;

// Process env wins over .env.local, so these point the app at the emulators
// even on a machine that has the real Firebase config, and keep EmailJS
// reminders switched off.
const appEnv = {
  NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "true",
  NEXT_PUBLIC_FIREBASE_API_KEY: "demo-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${PROJECT_ID}.firebaseapp.com`,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "",
  NEXT_PUBLIC_FIREBASE_APP_ID: "demo-app",
  NEXT_PUBLIC_EMAILJS_SERVICE_ID: "",
  NEXT_PUBLIC_EMAILJS_TEMPLATE_ID: "",
  NEXT_PUBLIC_EMAILJS_PUBLIC_KEY: "",
};

export default defineConfig({
  testDir: "./e2e",
  // Every spec shares one emulator database and wipes it first, so run serially.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `npx firebase emulators:start --only auth,firestore --project ${PROJECT_ID}`,
      url: "http://127.0.0.1:8080", // Firestore emulator answers "Ok" once ready
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      // CI tests the production build; locally the dev server is faster to start.
      command: process.env.CI
        ? `npx next build && npx next start -p ${PORT}`
        : `npx next dev -p ${PORT}`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: appEnv,
    },
  ],
});
