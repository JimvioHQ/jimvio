import { defineConfig, devices } from "@playwright/test";
import os from "node:os";

const AUTH = process.env.LIVE_E2E_STORAGE_STATE;
const isMac12 = os.release().startsWith("21."); // Darwin 21 = macOS 12 Monterey

/**
 * Production hardening matrix:
 * Chrome (chromium), Firefox, Edge-profile (chromium), Mobile, Tablet.
 * WebKit/Safari blocked on macOS 12 (Playwright unsupported).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.LIVE_E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    ...(AUTH ? { storageState: AUTH } : {}),
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "edge", use: { ...devices["Desktop Edge"] } },
    { name: "Mobile Chrome", use: { ...devices["Pixel 5"] } },
    { name: "Tablet", use: { ...devices["iPad Pro"] } },
    ...(!isMac12
      ? [
          { name: "webkit", use: { ...devices["Desktop Safari"] } },
          { name: "Mobile Safari", use: { ...devices["iPhone 13"] } },
        ]
      : []),
  ],
});
