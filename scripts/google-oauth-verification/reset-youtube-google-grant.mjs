#!/usr/bin/env node
/**
 * Safely reset ONLY YouTube Live Google authorization for verification demos.
 *
 * NEVER removes:
 * - "Sign in with Google" / "How Google helps you sign in to Jimvio"
 * - Anything that mentions supabase.co as the login integration
 * - "Delete all" / "Stop using Sign in with Google"
 *
 * Preferred path: Jimvio Live Destinations → Disconnect YouTube
 * (server calls oauth2.googleapis.com/revoke for the YouTube Live client only).
 *
 * Fallback: Google Account → Third-party access, only when the detail page
 * positively shows YouTube / youtube.force-ssl access (not Sign-in).
 *
 * Usage:
 *   DEMO_BASE_URL=https://www.jimvio.com node scripts/google-oauth-verification/reset-youtube-google-grant.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE = (process.env.DEMO_BASE_URL || "https://www.jimvio.com").replace(
  /\/$/,
  ""
);
const OUT_DIR = path.resolve(
  process.cwd(),
  process.env.DEMO_OUT_DIR || "tmp/google-oauth-verification"
);
const PROFILE = path.resolve(
  process.cwd(),
  process.env.DEMO_USER_DATA_DIR ||
    path.join(OUT_DIR, "chrome-profile")
);
const STORAGE = process.env.DEMO_STORAGE_STATE?.trim() || "";
const MANUAL_TIMEOUT_MS = Number(process.env.DEMO_MANUAL_TIMEOUT_MS || "0");

const LOGIN_MARKERS =
  /Sign in with Google|How Google helps you sign in|supabase\.co|Stop using Sign in with Google/i;
const YOUTUBE_MARKERS =
  /youtube\.force-ssl|Manage your YouTube account|YouTube Live|See, edit, and permanently delete your YouTube|YouTube videos/i;

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

async function dwell(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function waitManual(page, label, predicate) {
  console.log(`\nMANUAL ACTION REQUIRED — ${label}`);
  console.log("DO NOT CLOSE CHROME. DO NOT revoke Sign in with Google / Supabase login.\n");
  const started = Date.now();
  for (;;) {
    if (page.isClosed()) throw new Error("Browser was closed before OAuth demo completion.");
    if (await predicate().catch(() => false)) return;
    if (MANUAL_TIMEOUT_MS > 0 && Date.now() - started >= MANUAL_TIMEOUT_MS) {
      throw new Error(`Timeout waiting for: ${label}`);
    }
    await dwell(1500);
  }
}

async function isJimvioAuthed(page) {
  const url = page.url();
  if (/\/login/i.test(url)) return false;
  if (!/jimvio\.com/i.test(url)) return false;
  const body = await page.locator("body").innerText().catch(() => "");
  return /Live Studio|Live Destinations|Go Live|Streaming|Account|Settings/i.test(
    body
  );
}

async function disconnectYouTubeInJimvio(page) {
  await page.goto(`${BASE}/communities/live?open=settings`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  const yt = page.locator("li").filter({ hasText: /YouTube/i }).first();
  await yt.waitFor({ timeout: 60_000 }).catch(() => undefined);
  const btn = yt.getByRole("button", { name: /disconnect destination/i });
  if (!(await btn.isVisible().catch(() => false))) {
    console.log("Jimvio: YouTube already disconnected (or not visible).");
    return { disconnected: false, reason: "not_connected" };
  }
  await btn.click();
  await dwell(2500);
  console.log(
    "Jimvio: clicked Disconnect YouTube (server should revoke YouTube Live Google grant only)."
  );
  return { disconnected: true, reason: "jimvio_disconnect" };
}

/**
 * Inspect Google third-party permissions. Remove ONLY entries whose detail
 * page positively shows YouTube API access and does NOT look like Sign-in.
 */
async function maybeRevokeYouTubeOnlyInGoogleAccount(page) {
  console.log("\nOpening Google Account permissions (YouTube-only, high confidence)…");
  await page.goto("https://myaccount.google.com/permissions", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  if (/ServiceLogin|accounts\.google\.com\/v3\/signin|signin/i.test(page.url())) {
    await waitManual(
      page,
      "Google Account session for permissions page (NOT Jimvio Sign-in revoke)",
      async () => /myaccount\.google\.com\/permissions/i.test(page.url())
    );
  }

  await dwell(3000);
  const body = await page.locator("body").innerText().catch(() => "");
  if (!body) {
    return {
      revoked: false,
      blocker:
        "Google permissions page empty — cannot distinguish YouTube Live from Sign in with Google",
    };
  }

  // Candidate rows that mention Jimvio but we must open details before acting.
  const candidates = page
    .locator("a,button,[role='link'],[role='button']")
    .filter({ hasText: /Jimvio|jimvio/i });
  const count = await candidates.count().catch(() => 0);
  console.log(`Found ${count} Jimvio-named permission candidate(s).`);

  if (count === 0) {
    return {
      revoked: false,
      note: "No Jimvio-named third-party entry found — YouTube Live grant may already be absent",
    };
  }

  let revoked = 0;
  let skippedLogin = 0;
  let ambiguous = 0;

  for (let i = 0; i < count; i++) {
    const listPage = page;
    await listPage.goto("https://myaccount.google.com/permissions", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await dwell(1500);
    const item = listPage
      .locator("a,button,[role='link'],[role='button']")
      .filter({ hasText: /Jimvio|jimvio/i })
      .nth(i);
    if (!(await item.isVisible().catch(() => false))) continue;

    const label = ((await item.innerText().catch(() => "")) || "").trim();
    console.log(`Inspecting candidate ${i + 1}/${count}: ${label.slice(0, 80)}`);

    // Hard skip obvious Sign-in rows without opening destructive actions
    if (/Sign in with Google|How Google helps you sign in/i.test(label)) {
      skippedLogin += 1;
      console.log("  SKIP — Sign in with Google (preserve).");
      continue;
    }

    await item.click({ timeout: 10_000 }).catch(() => undefined);
    await dwell(2500);
    const detail = await listPage.locator("body").innerText().catch(() => "");

    if (LOGIN_MARKERS.test(detail) && !YOUTUBE_MARKERS.test(detail)) {
      skippedLogin += 1;
      console.log("  SKIP — detail looks like Sign in with Google / Supabase login.");
      // Navigate back without deleting
      await listPage.goBack().catch(() => undefined);
      continue;
    }

    if (!YOUTUBE_MARKERS.test(detail)) {
      ambiguous += 1;
      console.log(
        "  STOP candidate — cannot positively identify YouTube Live scopes. Leaving untouched."
      );
      await listPage.goBack().catch(() => undefined);
      continue;
    }

    // Positive YouTube identification — look for remove/delete access (not Delete all)
    const removeBtn = listPage
      .getByRole("button", {
        name: /Delete connections|Remove access|See details|Turn off|Delete/i,
      })
      .first();
    // Prefer explicit "Delete connections between …" style buttons; never "Delete all"
    const safeRemove = listPage
      .locator("button, [role='button']")
      .filter({ hasText: /Delete connections|Remove access|Turn off/i })
      .filter({ hasNotText: /Delete all|Stop using Sign in with Google/i })
      .first();

    const target = (await safeRemove.isVisible().catch(() => false))
      ? safeRemove
      : (await removeBtn.isVisible().catch(() => false)) &&
          !/Delete all|Stop using Sign in with Google/i.test(
            (await removeBtn.innerText().catch(() => "")) || ""
          )
        ? removeBtn
        : null;

    if (!target) {
      ambiguous += 1;
      console.log("  STOP — YouTube identified but no safe remove control found.");
      await listPage.goBack().catch(() => undefined);
      continue;
    }

    await target.click();
    await dwell(1000);
    // Confirm dialog if present
    const confirm = listPage
      .getByRole("button", { name: /Delete|Remove|Confirm|Turn off/i })
      .filter({ hasNotText: /Delete all|Cancel|Stop using Sign in with Google/i })
      .last();
    if (await confirm.isVisible().catch(() => false)) {
      const ctext = (await confirm.innerText().catch(() => "")) || "";
      if (/Delete all|Stop using Sign in with Google/i.test(ctext)) {
        console.log("  ABORT — confirm control looks like bulk Sign-in delete.");
        ambiguous += 1;
        continue;
      }
      await confirm.click();
    }
    revoked += 1;
    console.log("  REVOKED — YouTube Live-identified Google grant only.");
    await dwell(2000);
  }

  if (ambiguous && !revoked) {
    return {
      revoked: false,
      blocker:
        "Google permissions UI did not expose enough information to distinguish YouTube Live from Sign in with Google with high confidence. Left all entries untouched.",
      skippedLogin,
      ambiguous,
    };
  }

  return { revoked: revoked > 0, revoked, skippedLogin, ambiguous };
}

async function main() {
  loadEnvLocal();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(PROFILE, { recursive: true });

  console.log("YouTube Live Google-grant reset (safe)");
  console.log(`Base: ${BASE}`);
  console.log("Will NEVER revoke Sign in with Google / Supabase login.\n");

  const context = await chromium.launchPersistentContext(PROFILE, {
    channel: "chrome",
    headless: false,
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
    args: ["--disable-dev-shm-usage"],
    ...(STORAGE && fs.existsSync(STORAGE) ? { storageState: STORAGE } : {}),
  });
  const page = context.pages()[0] || (await context.newPage());

  const report = {
    jimvioDisconnect: null,
    googleUi: null,
    preservedLogin: true,
  };

  try {
    await page.goto(`${BASE}/communities/live?open=settings`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    if (!(await isJimvioAuthed(page))) {
      await waitManual(page, "Jimvio login (session only)", () =>
        isJimvioAuthed(page)
      );
      await page.goto(`${BASE}/communities/live?open=settings`, {
        waitUntil: "networkidle",
        timeout: 60_000,
      });
    }

    report.jimvioDisconnect = await disconnectYouTubeInJimvio(page);
    // Prefer server-side revoke via disconnect. Only use Google UI if needed.
    if (process.env.DEMO_FORCE_GOOGLE_UI_RESET === "1") {
      report.googleUi = await maybeRevokeYouTubeOnlyInGoogleAccount(page);
      if (report.googleUi.blocker) {
        console.error("BLOCKER:", report.googleUi.blocker);
        process.exitCode = 2;
      }
    } else {
      report.googleUi = {
        skipped: true,
        note: "Skipped Google UI by default after Jimvio disconnect (safer). Set DEMO_FORCE_GOOGLE_UI_RESET=1 only if consent still skips YouTube permission.",
      };
    }

    const savePath =
      process.env.DEMO_SAVE_STORAGE_STATE?.trim() ||
      path.join(process.cwd(), ".auth", "demo-jimvio.json");
    fs.mkdirSync(path.dirname(savePath), { recursive: true });
    await context.storageState({ path: savePath });
    console.log(`Saved storage → ${savePath}`);
  } finally {
    fs.writeFileSync(
      path.join(OUT_DIR, "reset-report.json"),
      JSON.stringify(report, null, 2)
    );
    await context.close();
  }

  console.log("\nReset report:", JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
