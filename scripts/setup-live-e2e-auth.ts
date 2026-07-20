/**
 * Bootstrap Playwright storage state for Live Studio E2E.
 * Requires LIVE_E2E_EMAIL + LIVE_E2E_PASSWORD in .env.local (or env).
 *
 * Run: node --experimental-strip-types scripts/setup-live-e2e-auth.ts
 */

import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

function loadEnvLocal(): void {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (process.env[m[1]]) continue;
    process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

async function main() {
  loadEnvLocal();
  const email = process.env.LIVE_E2E_EMAIL?.trim();
  const password = process.env.LIVE_E2E_PASSWORD?.trim();
  const base = process.env.LIVE_E2E_BASE_URL?.trim() || "http://localhost:3000";

  if (!email || !password) {
    console.error("Set LIVE_E2E_EMAIL and LIVE_E2E_PASSWORD in .env.local");
    process.exit(1);
  }

  const outDir = path.join(process.cwd(), ".auth");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "live-host.json");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();

  // Wait for post-login navigation (communities hub, dashboard, or home)
  await page.waitForURL(
    (url) => {
      const p = url.pathname;
      return (
        !p.startsWith("/login") &&
        (p.includes("/communities") ||
          p.includes("/dashboard") ||
          p === "/" ||
          p.includes("/home") ||
          p.includes("/account"))
      );
    },
    { timeout: 90_000 }
  );

  // Confirm session cookie exists
  const cookies = await context.cookies();
  const hasAuth = cookies.some(
    (c) =>
      c.name.includes("auth") ||
      c.name.includes("sb-") ||
      c.name.includes("supabase")
  );
  if (!hasAuth) {
    console.warn("Warning: no obvious auth cookie found; saving state anyway");
  }

  await context.storageState({ path: outFile });
  await browser.close();

  console.log(`Saved storage state → ${outFile}`);
  console.log(
    `Export: LIVE_E2E_STORAGE_STATE=${outFile}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
