import { defineConfig, devices } from '@playwright/test';

// E2E runs against `npm run dev` (Vite on :5173). Screens must match
// alldemos/ocdemo/ per agents/skills/demo-source-of-truth.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
