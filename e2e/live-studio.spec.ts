/**
 * Live Studio Playwright E2E — Production hardening
 *
 * Requires LIVE_E2E_STORAGE_STATE (from scripts/setup-live-e2e-auth.ts).
 * Fail hard if auth is missing — no skipped production gates.
 */

import { test, expect } from "@playwright/test";

const BASE = process.env.LIVE_E2E_BASE_URL || "http://localhost:3000";
const AUTH = process.env.LIVE_E2E_STORAGE_STATE;

test.beforeAll(() => {
  if (!AUTH) {
    throw new Error(
      "LIVE_E2E_STORAGE_STATE required. Run: node --experimental-strip-types scripts/setup-live-e2e-auth.ts"
    );
  }
});

test.use({ storageState: AUTH });

test.describe("Studio shell", () => {
  test("loads with control dock", async ({ page }) => {
    await page.goto(`${BASE}/communities/live`);
    await expect(page.getByRole("toolbar", { name: /live session controls/i })).toBeVisible({
      timeout: 60_000,
    });
  });

  test("command palette opens", async ({ page }) => {
    await page.goto(`${BASE}/communities/live`);
    await page.getByRole("toolbar", { name: /live session controls/i }).waitFor({ timeout: 60_000 });
    await page.keyboard.press("Meta+k");
    await expect(page.getByRole("dialog", { name: /command palette/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("end live control present", async ({ page }) => {
    await page.goto(`${BASE}/communities/live`);
    await expect(page.getByRole("button", { name: /end live session/i })).toBeVisible({
      timeout: 60_000,
    });
  });

  test("record control present", async ({ page }) => {
    await page.goto(`${BASE}/communities/live`);
    await page.getByRole("toolbar", { name: /live session controls/i }).waitFor({ timeout: 60_000 });
    await expect(
      page.getByRole("button", { name: /start recording|stop recording/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("screen share control present", async ({ page }) => {
    await page.goto(`${BASE}/communities/live`);
    await page.getByRole("toolbar", { name: /live session controls/i }).waitFor({ timeout: 60_000 });
    await expect(
      page.getByRole("button", { name: /screen|share/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Responsive", () => {
  test("mobile viewport — control dock", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/communities/live`);
    await expect(page.getByRole("toolbar", { name: /live session controls/i })).toBeVisible({
      timeout: 60_000,
    });
  });

  test("tablet viewport — studio shell", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${BASE}/communities/live`);
    await expect(page.getByRole("toolbar", { name: /live session controls/i })).toBeVisible({
      timeout: 60_000,
    });
  });

  test("desktop viewport — studio shell", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/communities/live`);
    await expect(page.getByRole("toolbar", { name: /live session controls/i })).toBeVisible({
      timeout: 60_000,
    });
  });
});

test.describe("Authenticated API", () => {
  test("token rejects missing sessionId", async ({ request }) => {
    const res = await request.post(`${BASE}/api/live/token`, { data: {} });
    expect([400, 404]).toContain(res.status());
  });

  test("recording rejects invalid session", async ({ request }) => {
    const res = await request.post(
      `${BASE}/api/live/sessions/00000000-0000-0000-0000-000000000000/recording`,
      { data: { action: "start" } }
    );
    expect([400, 404]).toContain(res.status());
  });

  test("sessions list reachable", async ({ request }) => {
    const res = await request.get(`${BASE}/api/c/live/sessions`);
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const body = (await res.json()) as { sessions?: unknown };
      expect(Array.isArray(body.sessions)).toBe(true);
    }
  });
});

test.describe("Security + health", () => {
  test("unauthenticated token denied", async ({ playwright }) => {
    const request = await playwright.request.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const res = await request.post(`${BASE}/api/live/token`, {
      data: { sessionId: "00000000-0000-0000-0000-000000000000" },
    });
    expect(res.status()).toBe(401);
    await request.dispose();
  });

  test("unauthenticated recording denied", async ({ playwright }) => {
    const request = await playwright.request.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const res = await request.post(
      `${BASE}/api/live/sessions/00000000-0000-0000-0000-000000000000/recording`,
      { data: { action: "start" } }
    );
    expect(res.status()).toBe(401);
    await request.dispose();
  });

  test("health returns ok", async ({ request }) => {
    const res = await request.get(`${BASE}/api/live/health`);
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok?: boolean };
    expect(body.ok).toBe(true);
  });
});
