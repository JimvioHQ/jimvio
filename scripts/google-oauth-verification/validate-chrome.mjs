#!/usr/bin/env node
/**
 * Pre-flight: prove the OAuth demo can use installed Google Chrome over CDP
 * without --no-sandbox / Playwright Chromium launch.
 *
 * Usage:
 *   npm run demo:youtube-oauth-validate-chrome
 */

import fs from "node:fs";
import path from "node:path";
import {
  launchSupportedChrome,
  resolveChromeExecutable,
  assertNoUnsupportedFlags,
} from "./supported-chrome.mjs";

const OUT_DIR = path.resolve(
  process.cwd(),
  process.env.DEMO_OUT_DIR || "tmp/google-oauth-verification"
);
const PROFILE = path.resolve(
  OUT_DIR,
  "chrome-profile-supported-validate"
);

async function main() {
  const executable = resolveChromeExecutable();
  console.log("Resolved Google Chrome:", executable);

  const launchArgsPreview = [
    "--remote-debugging-port=*",
    `--user-data-dir=${PROFILE}`,
    "--window-size=1920,1080",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-sync",
  ];
  const bad = assertNoUnsupportedFlags(launchArgsPreview);
  if (bad.length) {
    throw new Error(`Unsupported flags in launch plan: ${bad.join(", ")}`);
  }
  console.log("Launch plan has no --no-sandbox / AutomationControlled flags.");

  fs.mkdirSync(PROFILE, { recursive: true });
  const session = await launchSupportedChrome({
    profileDir: PROFILE,
    viewport: { width: 1920, height: 1080 },
  });

  console.log("CDP attached:", session.endpoint);
  console.log("Browser:", session.browserVersion);

  const page = session.page;
  await page.goto("https://accounts.google.com/", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await new Promise((r) => setTimeout(r, 2500));
  const text = await page.locator("body").innerText().catch(() => "");
  const blocked = /This browser or app may not be secure/i.test(text);
  const title = await page.title().catch(() => "");

  console.log("Google accounts title:", title || "(none)");
  console.log(
    "Insecure-browser rejection on landing:",
    blocked ? "YES (blocked)" : "no"
  );

  const shot = path.join(OUT_DIR, "frames", "chrome-validate-accounts.png");
  fs.mkdirSync(path.dirname(shot), { recursive: true });
  await page.screenshot({ path: shot, fullPage: false });
  console.log("Screenshot:", shot);

  await session.close();

  if (blocked) {
    console.error(
      "\nFAIL: Google already shows the insecure-browser message on accounts landing."
    );
    console.error(
      "Ensure stable Google Chrome is installed and DEMO_CHROME_EXECUTABLE points to it."
    );
    process.exit(2);
  }

  console.log("\nPASS: Installed Google Chrome launched over CDP without --no-sandbox.");
  console.log(
    "Next: run DEMO_BASE_URL=https://www.jimvio.com npm run demo:youtube-oauth-record"
  );
  console.log(
    "If Google asks for account password during OAuth, complete it manually in Chrome."
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
