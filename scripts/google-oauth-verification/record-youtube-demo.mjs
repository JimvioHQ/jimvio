#!/usr/bin/env node
/**
 * Google OAuth verification demo — REAL browser recording (Playwright).
 *
 * Records the production Jimvio → YouTube Live Destinations OAuth flow,
 * including the REAL Google OAuth consent screen. Never mocks Google.
 *
 * Usage:
 *   node scripts/google-oauth-verification/record-youtube-demo.mjs
 *
 * Optional env:
 *   DEMO_BASE_URL=https://www.jimvio.com
 *   DEMO_STORAGE_STATE=.auth/live-host.json   # Jimvio session (optional)
 *   DEMO_OUT_DIR=tmp/google-oauth-verification
 *   DEMO_HEADED=1                             # default headed
 *   DEMO_SKIP_GO_LIVE=0                       # set 1 to skip Live Studio fan-out
 *
 * When Google consent appears, the script prints:
 *   MANUAL ACTION REQUIRED — Google authentication/consent
 * Complete login/MFA/Allow in the opened Chrome window. Recording continues
 * after redirect back to Jimvio.
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
const STORAGE = process.env.DEMO_STORAGE_STATE?.trim() || "";
const SKIP_GO_LIVE = process.env.DEMO_SKIP_GO_LIVE === "1";
const EXPECTED_SCOPE = "https://www.googleapis.com/auth/youtube.force-ssl";

const checklist = {
  jimvioHomepage: false,
  jimvioBranding: false,
  authenticatedApp: false,
  settings: false,
  liveDestinations: false,
  connectYouTube: false,
  realGoogleOauthPage: false,
  completeConsentScreen: false,
  englishConsent: false,
  youtubePermissionVisible: false,
  authorizationAction: false,
  callback: false,
  youtubeConnected: false,
  liveStudio: false,
  youtubeDestination: false,
  youtubeFunctionality: false,
  youtubeResult: false,
  disconnect: false,
  secretsVisible: false,
  notes: [],
  blockers: [],
  timestamps: {},
};

function stamp(key) {
  checklist.timestamps[key] = new Date().toISOString();
}

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

async function setBanner(page, text) {
  const url = page.url();
  if (/accounts\.google\.com|google\.com\/(?:o\/)?oauth|myaccount\.google/i.test(url)) {
    await page.evaluate(() => {
      document.getElementById("jimvio-demo-banner")?.remove();
    }).catch(() => undefined);
    return;
  }
  await page
    .evaluate((label) => {
      let el = document.getElementById("jimvio-demo-banner");
      if (!el) {
        el = document.createElement("div");
        el.id = "jimvio-demo-banner";
        el.setAttribute("data-demo-annotation", "true");
        Object.assign(el.style, {
          position: "fixed",
          top: "12px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: "2147483646",
          background: "rgba(22,21,18,0.92)",
          color: "#fff",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          fontSize: "13px",
          fontWeight: "600",
          letterSpacing: "0.02em",
          padding: "8px 14px",
          borderRadius: "999px",
          pointerEvents: "none",
          maxWidth: "90vw",
          textAlign: "center",
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        });
        document.documentElement.appendChild(el);
      }
      el.textContent = label;
    }, text)
    .catch(() => undefined);
}

async function clearBanner(page) {
  await page
    .evaluate(() => document.getElementById("jimvio-demo-banner")?.remove())
    .catch(() => undefined);
}

async function shot(page, name) {
  const file = path.join(OUT_DIR, "frames", `${name}.png`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function dwell(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

function writeChecklist() {
  fs.writeFileSync(
    path.join(OUT_DIR, "checklist.json"),
    JSON.stringify(checklist, null, 2)
  );
}

async function waitManual(page, reason, untilUrl) {
  console.log("\n========================================");
  console.log(`MANUAL ACTION REQUIRED — ${reason}`);
  console.log("Complete the step in the opened Chrome window.");
  console.log("Recording continues automatically after success.");
  console.log("========================================\n");
  checklist.notes.push(`Manual pause: ${reason}`);
  stamp(`manual_${reason.replace(/\W+/g, "_").toLowerCase()}`);
  writeChecklist();

  await page.waitForURL(untilUrl, { timeout: 15 * 60 * 1000 });
}

async function main() {
  loadEnvLocal();
  fs.mkdirSync(path.join(OUT_DIR, "frames"), { recursive: true });
  fs.mkdirSync(path.join(OUT_DIR, "video"), { recursive: true });

  const reportPath = path.join(OUT_DIR, "run-report.json");
  const startedAt = new Date().toISOString();

  console.log("Google OAuth verification recorder");
  console.log(`Base URL: ${BASE}`);
  console.log(`Output:   ${OUT_DIR}`);
  console.log(`Expected YouTube scope: ${EXPECTED_SCOPE}`);
  console.log(
    "OAuth clients: (1) Supabase Google Login ≠ (2) YouTube Live YOUTUBE_CLIENT_ID"
  );

  const browser = await chromium.launch({
    channel: "chrome",
    headless: false,
    slowMo: 120,
    args: ["--window-size=1440,900"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    recordVideo: {
      dir: path.join(OUT_DIR, "video"),
      size: { width: 1440, height: 900 },
    },
    ...(STORAGE && fs.existsSync(STORAGE) ? { storageState: STORAGE } : {}),
    permissions: ["camera", "microphone"],
  });

  const page = await context.newPage();

  try {
    // ——— SECTION 1: Homepage ———
    stamp("homepage_start");
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await setBanner(page, "Step 1 — Open Jimvio");
    await dwell(4000);
    const homeText = await page.locator("body").innerText().catch(() => "");
    if (/jimvio/i.test(homeText) || /jimvio/i.test(await page.title())) {
      checklist.jimvioHomepage = true;
      checklist.jimvioBranding = true;
    }
    await shot(page, "01-homepage");
    stamp("homepage_end");

    // ——— SECTION 2: Login ———
    stamp("login_start");
    await page.goto(`${BASE}/communities/live?open=settings`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    if (/\/login/i.test(page.url())) {
      await setBanner(page, "Step 2 — Jimvio login (session only)");
      await shot(page, "02-login");
      await waitManual(
        page,
        "Jimvio authentication (email/password or Google Login for session only — this is NOT YouTube Live OAuth)",
        (url) =>
          /\/communities\/live/i.test(url) && !/\/login/i.test(url)
      );
      await page.goto(`${BASE}/communities/live?open=settings`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
    }
    checklist.authenticatedApp = true;
    stamp("login_end");

    // ——— SECTION 3: Live Destinations ———
    stamp("destinations_start");
    await page.goto(`${BASE}/communities/live?open=settings`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await setBanner(page, "Step 2 — Open Live Destinations");
    // Live Destinations panel is embedded in Live Settings (left drawer).
    await page.getByText(/Live Settings|Live Destinations|Streaming/i).first().waitFor({ timeout: 60_000 });
    checklist.settings = true;
    checklist.liveDestinations = true;
    await dwell(3500);
    await shot(page, "03-live-destinations");
    stamp("destinations_end");

    // Disconnect existing YouTube if present (clean consent demo)
    const disconnectYoutube = page
      .locator("li")
      .filter({ hasText: /youtube/i })
      .getByRole("button", { name: /disconnect/i })
      .first();
    if (await disconnectYoutube.isVisible().catch(() => false)) {
      checklist.notes.push("Pre-existing YouTube connection found — disconnecting for clean consent demo");
      await disconnectYoutube.click();
      await dwell(2000);
      await page.reload({ waitUntil: "networkidle" });
    }

    // ——— SECTION 4: Connect YouTube ———
    stamp("connect_start");
    await setBanner(page, "Step 3 — Connect YouTube");
    const connectBtn = page
      .locator("li")
      .filter({ hasText: /^YouTube|YouTube/i })
      .getByRole("button", { name: /^Connect$/i })
      .first();

    if (!(await connectBtn.isVisible().catch(() => false))) {
      // Fallback: any Connect near YouTube label
      const alt = page.getByRole("button", { name: /^Connect$/i }).first();
      if (!(await alt.isVisible().catch(() => false))) {
        checklist.blockers.push(
          "Connect YouTube button not visible — check YOUTUBE_CLIENT_ID/SECRET on production and catalog readiness"
        );
        writeChecklist();
        throw new Error(checklist.blockers[checklist.blockers.length - 1]);
      }
      await alt.click();
    } else {
      await connectBtn.click();
    }
    checklist.connectYouTube = true;
    stamp("connect_clicked");

    // ——— SECTION 5: REAL Google OAuth ———
    // Do NOT cut; wait for Google hosts.
    await page.waitForURL(
      /accounts\.google\.com|google\.com\/(?:o\/)?oauth|googleapis\.com/i,
      { timeout: 120_000 }
    );
    checklist.realGoogleOauthPage = true;
    await clearBanner(page);
    await dwell(2500);
    await shot(page, "04-google-oauth");

    const googleText = await page.locator("body").innerText().catch(() => "");
    if (/english|en\b|Sign in|Choose an account|Continue|Allow|Cancel/i.test(googleText)) {
      checklist.englishConsent = true;
    }
    // Human-readable YouTube permission OR raw scope (Google often shows prose)
    if (
      /youtube/i.test(googleText) ||
      /force-ssl/i.test(googleText) ||
      /manage your youtube/i.test(googleText) ||
      /see, edit, and permanently delete your youtube/i.test(googleText)
    ) {
      checklist.youtubePermissionVisible = true;
    }
    if (
      /consent|Allow|Continue|YouTube|unverified|Google hasn't verified|hasn.t verified/i.test(
        googleText
      )
    ) {
      checklist.completeConsentScreen = true;
    }
    writeChecklist();

    await waitManual(
      page,
      "Google authentication/consent — select account, complete MFA if prompted, review REAL consent screen (including unverified warning if shown), then click Allow/Continue. Do NOT use a fake consent UI.",
      (url) =>
        /jimvio\.com/i.test(url) &&
        !/accounts\.google\.com/i.test(url)
    );
    checklist.authorizationAction = true;
    stamp("google_done");

    // ——— SECTION 6: Callback / Connected ———
    stamp("callback_start");
    await page.goto(`${BASE}/communities/live?open=settings`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await setBanner(page, "Step 5 — OAuth callback · YouTube connected");
    await dwell(3000);
    const destBody = await page.locator("body").innerText().catch(() => "");
    if (/connected|enabled|disconnect/i.test(destBody) && /youtube/i.test(destBody)) {
      checklist.callback = true;
      checklist.youtubeConnected = true;
    } else if (/dest_error|authorization failed|cancelled/i.test(destBody)) {
      checklist.blockers.push(
        `OAuth returned error state on Live Destinations: ${destBody.slice(0, 200)}`
      );
    } else {
      checklist.notes.push(
        "Post-callback UI did not clearly show Connected — inspect frames/video"
      );
    }
    await shot(page, "05-youtube-connected");
    stamp("callback_end");

    // Enable YouTube for fan-out if Enable button present
    const enableBtn = page
      .locator("li")
      .filter({ hasText: /youtube/i })
      .getByRole("button", { name: /^Enable$/i })
      .first();
    if (await enableBtn.isVisible().catch(() => false)) {
      await enableBtn.click();
      await dwell(1000);
    }

    // ——— SECTION 7–8: Live Studio functionality ———
    if (!SKIP_GO_LIVE && checklist.youtubeConnected) {
      stamp("studio_start");
      await page.goto(`${BASE}/communities/live`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await setBanner(page, "Step 7 — YouTube Live functionality");
      await dwell(3000);
      checklist.liveStudio = true;
      await shot(page, "06-live-studio");

      // Prefer Go Live on prepare stage
      const goLive = page.getByRole("button", { name: /^Go Live$/i }).first();
      if (await goLive.isVisible().catch(() => false)) {
        await goLive.click();
        checklist.youtubeFunctionality = true;
        checklist.youtubeDestination = true;
        await dwell(8000);
        await shot(page, "07-go-live-destinations");
        // Destination status may appear as Connecting / Ready / LIVE / Failed
        const studioText = await page.locator("body").innerText().catch(() => "");
        if (/youtube|destination|live|connecting|ready|failed/i.test(studioText)) {
          checklist.notes.push("Live Studio showed destination-related UI after Go Live");
        }
      } else {
        checklist.notes.push(
          "Go Live button not visible (may already be in a session) — opened Live Studio for functionality context"
        );
        checklist.youtubeDestination = true;
        // Try open destinations link / settings streaming panel
        const destLink = page.getByRole("link", { name: /Live Destinations/i }).first();
        if (await destLink.isVisible().catch(() => false)) {
          await destLink.click();
          await dwell(2000);
        }
      }

      // Optional: YouTube Studio result tab (real account UI — still not fabricated)
      try {
        const yt = await context.newPage();
        await yt.goto("https://studio.youtube.com/", {
          waitUntil: "domcontentloaded",
          timeout: 60_000,
        });
        await dwell(5000);
        const ytText = await yt.locator("body").innerText().catch(() => "");
        if (/live|stream|broadcast|content/i.test(ytText)) {
          checklist.youtubeResult = true;
          await yt.screenshot({
            path: path.join(OUT_DIR, "frames", "08-youtube-studio.png"),
          });
        } else {
          checklist.notes.push(
            "YouTube Studio opened but live result not clearly visible — may need manual navigation to Live content"
          );
        }
        await yt.close();
      } catch (e) {
        checklist.notes.push(
          `YouTube Studio open skipped/failed: ${e instanceof Error ? e.message : String(e)}`
        );
      }
      stamp("studio_end");
    } else if (SKIP_GO_LIVE) {
      checklist.notes.push("DEMO_SKIP_GO_LIVE=1 — functionality section skipped by operator");
    }

    // ——— SECTION 9: Disconnect ———
    stamp("disconnect_start");
    await page.goto(`${BASE}/communities/live?open=settings`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await setBanner(page, "Step 8 — Disconnect YouTube");
    await dwell(2000);
    const unplug = page
      .locator("li")
      .filter({ hasText: /youtube/i })
      .getByRole("button", { name: /disconnect/i })
      .first();
    if (await unplug.isVisible().catch(() => false)) {
      await unplug.click();
      await dwell(2500);
      checklist.disconnect = true;
      await shot(page, "09-disconnect");
    } else {
      checklist.notes.push("Disconnect control not found after demo (may already be disconnected)");
    }
    stamp("disconnect_end");

    await setBanner(page, "Demo complete — Jimvio YouTube Live Destinations");
    await dwell(3000);
    await clearBanner(page);
  } catch (err) {
    checklist.blockers.push(err instanceof Error ? err.message : String(err));
    await shot(page, "99-error").catch(() => undefined);
    console.error("Recording error:", err);
  } finally {
    const videoPath = await page.video()?.path();
    await context.close();
    await browser.close();

    let finalVideo = null;
    if (videoPath && fs.existsSync(videoPath)) {
      finalVideo = path.join(OUT_DIR, "jimvio-youtube-oauth-verification.webm");
      fs.renameSync(videoPath, finalVideo);
    }

    const endedAt = new Date().toISOString();
    const report = {
      startedAt,
      endedAt,
      baseUrl: BASE,
      expectedScope: EXPECTED_SCOPE,
      oauthClients: {
        jimvioLogin: "Supabase Google OAuth (signInWithGoogle) — NOT YouTube Live",
        youtubeLive:
          "YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET → /api/integrations/youtube/start|callback",
        youtubeScope: EXPECTED_SCOPE,
        redirectUri: `${BASE}/api/integrations/youtube/callback`,
      },
      videoPath: finalVideo,
      checklist,
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    writeChecklist();

    console.log("\n—— Recording finished ——");
    console.log(`Report: ${reportPath}`);
    console.log(`Video:  ${finalVideo || "(none)"}`);
    console.log(
      `Checklist pass hints: consent=${checklist.completeConsentScreen} connected=${checklist.youtubeConnected} functionality=${checklist.youtubeFunctionality}`
    );
    if (checklist.blockers.length) {
      console.log("BLOCKERS:");
      for (const b of checklist.blockers) console.log(` - ${b}`);
      process.exitCode = 2;
    }
  }
}

async function expectVisible(page, pattern) {
  await page.getByText(pattern).first().waitFor({ timeout: 30_000 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
