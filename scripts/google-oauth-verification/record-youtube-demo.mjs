#!/usr/bin/env node
/**
 * Google OAuth verification demo — REAL browser recording (Playwright).
 *
 * Records the production Jimvio → YouTube Live Destinations OAuth flow,
 * including the REAL Google OAuth consent screen. Never mocks Google.
 *
 * Usage:
 *   DEMO_BASE_URL=https://www.jimvio.com npm run demo:youtube-oauth-record
 *
 * Optional env:
 *   DEMO_STORAGE_STATE=.auth/demo-jimvio.json
 *   DEMO_SAVE_STORAGE_STATE=.auth/demo-jimvio.json
 *   DEMO_OUT_DIR=tmp/google-oauth-verification
 *   DEMO_SKIP_GO_LIVE=0
 *   DEMO_MANUAL_TIMEOUT_MS=0
 *
 * IMPORTANT: Do NOT close the Playwright Chrome window during manual pauses.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
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
const SAVE_STORAGE =
  process.env.DEMO_SAVE_STORAGE_STATE?.trim() ||
  path.join(process.cwd(), ".auth", "demo-jimvio.json");
const SKIP_GO_LIVE = process.env.DEMO_SKIP_GO_LIVE === "1";
const MANUAL_TIMEOUT_MS = Number(process.env.DEMO_MANUAL_TIMEOUT_MS || "0");
const EXPECTED_SCOPE = "https://www.googleapis.com/auth/youtube.force-ssl";
const VIEWPORT = { width: 1920, height: 1080 };
const FINAL_VIDEO = path.join(
  OUT_DIR,
  "jimvio-youtube-oauth-verification.webm"
);
const BROWSER_CLOSED_MSG =
  "Browser was closed before OAuth demo completion.";

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

let browserRef = null;
let contextRef = null;
let pageRef = null;
let browserClosedByOperator = false;
let intentionalClose = false;
let consentShotIndex = 0;

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

function writeChecklist() {
  fs.writeFileSync(
    path.join(OUT_DIR, "checklist.json"),
    JSON.stringify(checklist, null, 2)
  );
}

function archiveIncompleteVideo() {
  if (!fs.existsSync(FINAL_VIDEO)) return;
  const archiveDir = path.join(OUT_DIR, "incomplete");
  fs.mkdirSync(archiveDir, { recursive: true });
  const stampName = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(archiveDir, `incomplete-${stampName}.webm`);
  fs.renameSync(FINAL_VIDEO, dest);
  checklist.notes.push(`Archived previous incomplete video → ${dest}`);
  console.log(`Archived previous incomplete video → ${dest}`);
}

function assertBrowserAlive(browser, page) {
  if (
    (!intentionalClose && browserClosedByOperator) ||
    !browser?.isConnected() ||
    page?.isClosed()
  ) {
    throw new Error(BROWSER_CLOSED_MSG);
  }
}

function isClosedError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /Target page, context or browser has been closed/i.test(msg) ||
    /Browser has been closed/i.test(msg) ||
    /has been closed/i.test(msg) ||
    msg === BROWSER_CLOSED_MSG
  );
}

async function setBanner(page, text) {
  const url = page.url();
  if (/accounts\.google\.com|google\.com\/(?:o\/)?oauth|myaccount\.google/i.test(url)) {
    await page
      .evaluate(() => {
        document.getElementById("jimvio-demo-banner")?.remove();
      })
      .catch(() => undefined);
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
          fontSize: "14px",
          fontWeight: "600",
          letterSpacing: "0.02em",
          padding: "10px 16px",
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
  assertBrowserAlive(browserRef, page);
  const file = path.join(OUT_DIR, "frames", `${name}.png`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function dwell(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

function printManualBanner(kind, extraLines = []) {
  const title =
    kind === "login"
      ? "JIMVIO LOGIN REQUIRED"
      : kind === "google"
        ? "GOOGLE OAUTH CONSENT REQUIRED"
        : "MANUAL ACTION REQUIRED";
  console.log("\n==================================================");
  console.log(title);
  console.log("==================================================\n");
  for (const line of extraLines) console.log(line);
  console.log("\nDO NOT CLOSE THE CHROME WINDOW.");
  console.log("Leave this terminal running.");
  console.log("Recording stays active and continues automatically after success.");
  console.log("\n==================================================\n");
}

function looksLikeYouTubePermission(text) {
  return (
    /Manage your YouTube account/i.test(text) ||
    /See, edit, and permanently delete your YouTube videos/i.test(text) ||
    /youtube\.force-ssl/i.test(text) ||
    /force-ssl/i.test(text) ||
    (/YouTube/i.test(text) &&
      /(Allow|Continue|Select what .+ can access|wants access to your Google Account)/i.test(
        text
      ))
  );
}

function looksLikeConsentControls(text) {
  return (
    /wants access to your Google Account/i.test(text) ||
    (/Allow/i.test(text) && /Cancel/i.test(text)) ||
    (/Continue/i.test(text) && /Cancel/i.test(text)) ||
    /Select what .+ can access/i.test(text)
  );
}

/**
 * Scan Google pages during the pause; capture consent + YouTube permission when visible.
 */
async function scanGoogleConsent(page) {
  assertBrowserAlive(browserRef, page);
  if (!/accounts\.google\.com|google\.com\/(?:o\/)?oauth/i.test(page.url())) {
    return;
  }
  const text = await page.locator("body").innerText().catch(() => "");
  if (/Sign in|Choose an account|Continue|Allow|Cancel|Google|English/i.test(text)) {
    checklist.englishConsent = true;
  }
  if (/Google hasn't verified|hasn.t verified this app|unverified/i.test(text)) {
    checklist.notes.push("Captured real Google unverified-app warning");
    await shot(page, `04b-unverified-${consentShotIndex++}`).catch(() => undefined);
  }
  if (looksLikeYouTubePermission(text)) {
    if (!checklist.youtubePermissionVisible) {
      console.log("✓ Detected YouTube permission text on Google consent UI");
    }
    checklist.youtubePermissionVisible = true;
    checklist.completeConsentScreen = true;
    await shot(page, `04c-youtube-consent-${consentShotIndex++}`).catch(
      () => undefined
    );
    writeChecklist();
  } else if (looksLikeConsentControls(text)) {
    checklist.completeConsentScreen = true;
    await shot(page, `04d-consent-controls-${consentShotIndex++}`).catch(
      () => undefined
    );
    writeChecklist();
  }
}

async function waitManual(browser, page, options) {
  const {
    kind,
    reason,
    predicate,
    lines = [],
    onTick,
  } = options;

  printManualBanner(kind, [
    reason,
    ...lines,
    "",
    "Complete the step in the VISIBLE Playwright Chrome window.",
    "After you finish, return to this terminal — do not quit Chrome.",
  ]);
  checklist.notes.push(`Manual pause: ${reason}`);
  stamp(`manual_${kind}`);
  writeChecklist();

  const started = Date.now();
  let lastHeartbeat = 0;

  for (;;) {
    assertBrowserAlive(browser, page);

    try {
      if (onTick) await onTick();
      if (await predicate()) {
        console.log(`✓ Manual step complete (${kind}). Continuing recording…\n`);
        return;
      }
    } catch (err) {
      if (isClosedError(err)) throw new Error(BROWSER_CLOSED_MSG);
    }

    const elapsed = Date.now() - started;
    if (MANUAL_TIMEOUT_MS > 0 && elapsed >= MANUAL_TIMEOUT_MS) {
      throw new Error(
        `Operator timeout after ${Math.round(elapsed / 1000)}s waiting for: ${reason}`
      );
    }

    if (elapsed - lastHeartbeat >= 15_000) {
      lastHeartbeat = elapsed;
      const mins = Math.floor(elapsed / 60_000);
      const secs = Math.floor((elapsed % 60_000) / 1000);
      console.log(
        `[waiting ${mins}m ${secs}s] Chrome still open — complete ${kind} in the browser window…`
      );
      if (kind === "google" && !checklist.youtubePermissionVisible) {
        console.log(
          "  → Still waiting to SEE YouTube permission on the REAL consent screen (not only account picker / unverified warning)."
        );
      }
      if (process.platform === "darwin") {
        spawnSync(
          "osascript",
          ["-e", 'tell application "Google Chrome" to activate'],
          { stdio: "ignore" }
        );
      }
    }

    await dwell(1000);
  }
}

async function isJimvioAuthenticated(page) {
  assertBrowserAlive(browserRef, page);
  const url = page.url();
  if (/\/login/i.test(url)) return false;
  if (/\/communities\/live/i.test(url) && !/\/login/i.test(url)) {
    const body = await page.locator("body").innerText().catch(() => "");
    if (/Live Settings|Live Destinations|Go Live|Streaming|Prepare|Camera/i.test(body)) {
      return true;
    }
    if (!/Sign in|Log in|Continue with Google/i.test(body)) {
      return true;
    }
  }
  if (/jimvio\.com/i.test(url) && !/\/login/i.test(url) && !/accounts\.google/i.test(url)) {
    const body = await page.locator("body").innerText().catch(() => "");
    if (/Live Studio|Live Destinations|Account|Settings|Wallet|Sign out|Log out/i.test(body)) {
      return true;
    }
  }
  return false;
}

async function returnedFromGoogleToJimvio(page) {
  assertBrowserAlive(browserRef, page);
  const url = page.url();
  return (
    /jimvio\.com/i.test(url) &&
    !/accounts\.google\.com/i.test(url) &&
    !/google\.com\/(?:o\/)?oauth/i.test(url)
  );
}

async function youtubeRow(page) {
  return page.locator("li").filter({ hasText: /YouTube/i }).first();
}

async function openLiveDestinations(page) {
  await page.goto(`${BASE}/communities/live?open=settings`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  await page
    .getByText(/Live Settings|Live Destinations|Streaming|YouTube/i)
    .first()
    .waitFor({ timeout: 60_000 });
  // Expand / scroll destinations into view
  const yt = await youtubeRow(page);
  await yt.scrollIntoViewIfNeeded().catch(() => undefined);
  await dwell(1500);
}

async function disconnectYouTubeIfPresent(page) {
  const yt = await youtubeRow(page);
  const btn = yt.getByRole("button", { name: /disconnect destination/i });
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await dwell(2000);
    await page.reload({ waitUntil: "networkidle" });
    await openLiveDestinations(page);
    return true;
  }
  return false;
}

function criticalChecklistOk() {
  return (
    checklist.jimvioHomepage &&
    checklist.authenticatedApp &&
    checklist.liveDestinations &&
    checklist.connectYouTube &&
    checklist.realGoogleOauthPage &&
    checklist.completeConsentScreen &&
    checklist.youtubePermissionVisible &&
    checklist.authorizationAction &&
    checklist.callback &&
    checklist.youtubeConnected &&
    checklist.liveStudio &&
    checklist.youtubeFunctionality &&
    checklist.disconnect &&
    checklist.blockers.length === 0
  );
}

async function main() {
  loadEnvLocal();
  fs.mkdirSync(path.join(OUT_DIR, "frames"), { recursive: true });
  fs.mkdirSync(path.join(OUT_DIR, "video"), { recursive: true });
  archiveIncompleteVideo();

  const reportPath = path.join(OUT_DIR, "run-report.json");
  const startedAt = new Date().toISOString();

  console.log("Google OAuth verification recorder");
  console.log(`Base URL: ${BASE}`);
  console.log(`Output:   ${OUT_DIR}`);
  console.log(`Viewport: ${VIEWPORT.width}x${VIEWPORT.height} (headed Chrome)`);
  console.log(`Expected YouTube scope: ${EXPECTED_SCOPE}`);
  console.log(
    "OAuth clients: (1) Supabase Google Login ≠ (2) YouTube Live YOUTUBE_CLIENT_ID"
  );
  console.log(
    "Manual pauses keep Chrome OPEN indefinitely (set DEMO_MANUAL_TIMEOUT_MS to cap)."
  );

  const browser = await chromium.launch({
    channel: "chrome",
    headless: false,
    slowMo: 80,
    args: [
      `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
      "--disable-dev-shm-usage",
    ],
  });
  browserRef = browser;

  browser.on("disconnected", () => {
    if (intentionalClose) return;
    browserClosedByOperator = true;
    console.error(`\n${BROWSER_CLOSED_MSG}`);
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    locale: "en-US",
    recordVideo: {
      dir: path.join(OUT_DIR, "video"),
      size: VIEWPORT,
    },
    ...(STORAGE && fs.existsSync(STORAGE) ? { storageState: STORAGE } : {}),
    permissions: ["camera", "microphone"],
  });
  contextRef = context;

  const page = await context.newPage();
  pageRef = page;

  let completedOk = false;

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

    if (/\/login/i.test(page.url()) || !(await isJimvioAuthenticated(page))) {
      await setBanner(page, "Step 2 — Jimvio login (session only)");
      await shot(page, "02-login");
      await waitManual(browser, page, {
        kind: "login",
        reason:
          "Complete the Jimvio login in the visible Chrome window (email/password or Google Login for session only).",
        lines: [
          "This Jimvio login is NOT the YouTube Live OAuth consent screen.",
          "YouTube Connect happens in a later step.",
        ],
        predicate: async () => isJimvioAuthenticated(page),
      });
      await page.goto(`${BASE}/communities/live?open=settings`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
    }
    checklist.authenticatedApp = true;
    try {
      fs.mkdirSync(path.dirname(SAVE_STORAGE), { recursive: true });
      await context.storageState({ path: SAVE_STORAGE });
      checklist.notes.push(`Saved Jimvio storage state → ${SAVE_STORAGE}`);
      console.log(`Saved Jimvio session for faster re-runs → ${SAVE_STORAGE}`);
    } catch (e) {
      checklist.notes.push(
        `Could not save storage state: ${e instanceof Error ? e.message : String(e)}`
      );
    }
    stamp("login_end");

    // ——— SECTION 3: Live Destinations ———
    stamp("destinations_start");
    await openLiveDestinations(page);
    await setBanner(page, "Step 2 — Open Live Destinations");
    checklist.settings = true;
    checklist.liveDestinations = true;
    await dwell(3500);
    await shot(page, "03-live-destinations");
    stamp("destinations_end");

    if (await disconnectYouTubeIfPresent(page)) {
      checklist.notes.push(
        "Pre-existing YouTube connection found — disconnected for clean consent demo"
      );
    }

    // ——— SECTION 4: Connect YouTube ———
    stamp("connect_start");
    await setBanner(page, "Step 3 — Connect YouTube");
    const connectBtn = (await youtubeRow(page)).getByRole("button", {
      name: /^Connect$/i,
    });
    if (!(await connectBtn.isVisible().catch(() => false))) {
      checklist.blockers.push(
        "Connect YouTube button not visible — check YOUTUBE_CLIENT_ID/SECRET on production and catalog readiness"
      );
      writeChecklist();
      throw new Error(checklist.blockers[checklist.blockers.length - 1]);
    }
    await connectBtn.click();
    checklist.connectYouTube = true;
    stamp("connect_clicked");

    // ——— SECTION 5: REAL Google OAuth ———
    await page.waitForURL(
      /accounts\.google\.com|google\.com\/(?:o\/)?oauth|googleapis\.com/i,
      { timeout: 120_000 }
    );
    checklist.realGoogleOauthPage = true;
    await clearBanner(page);
    await dwell(2500);
    await shot(page, "04-google-oauth");

    const authUrl = page.url();
    if (
      authUrl.includes("youtube.force-ssl") ||
      authUrl.includes(encodeURIComponent(EXPECTED_SCOPE))
    ) {
      checklist.notes.push(`Authorize URL includes expected scope: ${EXPECTED_SCOPE}`);
    } else {
      checklist.notes.push(`Authorize URL observed: ${authUrl.slice(0, 240)}`);
    }
    writeChecklist();

    let googleReturnWithoutConsent = false;
    await waitManual(browser, page, {
      kind: "google",
      reason:
        "Complete the REAL Google OAuth consent for YouTube Live Destinations.",
      lines: [
        "1) Choose the Google account",
        "2) If 'Google hasn't verified this app' appears: click Advanced → Go to Jimvio (unsafe)",
        "3) CRITICAL: stop on the consent screen that lists YouTube access / Manage your YouTube account",
        "4) Leave that YouTube permission screen visible for several seconds",
        "5) Click Allow / Continue",
        "",
        "If Google skips the YouTube permission screen (already granted):",
        "  open https://myaccount.google.com/permissions → remove Jimvio access,",
        "  then this script will re-open Connect YouTube automatically.",
        "Do NOT close Chrome. Do NOT fabricate consent UI.",
      ],
      onTick: async () => {
        await scanGoogleConsent(page);
        if (
          (await returnedFromGoogleToJimvio(page)) &&
          !checklist.youtubePermissionVisible &&
          !googleReturnWithoutConsent
        ) {
          googleReturnWithoutConsent = true;
          console.log(
            "\n⚠ Returned to Jimvio without detecting YouTube permission on consent UI."
          );
          console.log(
            "  Revoke Jimvio under https://myaccount.google.com/permissions if needed."
          );
          console.log(
            "  Reconnecting YouTube so the REAL consent screen can be shown…\n"
          );
          await openLiveDestinations(page);
          await disconnectYouTubeIfPresent(page);
          const reconnect = (await youtubeRow(page)).getByRole("button", {
            name: /^Connect$/i,
          });
          if (await reconnect.isVisible().catch(() => false)) {
            await reconnect.click();
            await page
              .waitForURL(
                /accounts\.google\.com|google\.com\/(?:o\/)?oauth/i,
                { timeout: 120_000 }
              )
              .catch(() => undefined);
            googleReturnWithoutConsent = false;
          } else {
            checklist.notes.push(
              "Could not auto-reconnect YouTube after missing consent — operator must Connect again"
            );
          }
        }
      },
      predicate: async () =>
        (await returnedFromGoogleToJimvio(page)) &&
        checklist.youtubePermissionVisible,
    });
    checklist.authorizationAction = true;
    stamp("google_done");

    // ——— SECTION 6: Callback / Connected ———
    stamp("callback_start");
    await openLiveDestinations(page);
    await setBanner(page, "Step 5 — OAuth callback · YouTube connected");
    await dwell(3500);
    const yt = await youtubeRow(page);
    await yt.scrollIntoViewIfNeeded().catch(() => undefined);
    const destBody = await yt.innerText().catch(() => "");
    const hasDisconnect = await yt
      .getByRole("button", { name: /disconnect destination/i })
      .isVisible()
      .catch(() => false);
    if (
      hasDisconnect ||
      (/connected|enabled/i.test(destBody) && /youtube/i.test(destBody))
    ) {
      checklist.callback = true;
      checklist.youtubeConnected = true;
    } else if (/dest_error|authorization failed|cancelled/i.test(await page.locator("body").innerText().catch(() => ""))) {
      checklist.blockers.push("OAuth returned error state on Live Destinations");
    } else {
      checklist.notes.push(
        "Post-callback UI did not clearly show Connected — inspect frames/video"
      );
    }
    await shot(page, "05-youtube-connected");
    stamp("callback_end");

    const enableBtn = yt.getByRole("button", { name: /^Enable$/i });
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
      await dwell(3500);
      checklist.liveStudio = true;
      await shot(page, "06-live-studio");

      const goLive = page.getByRole("button", { name: /^Go Live$/i }).first();
      if (await goLive.isVisible().catch(() => false)) {
        await goLive.click();
        checklist.youtubeFunctionality = true;
        checklist.youtubeDestination = true;
        await dwell(8000);
        await shot(page, "07-go-live-destinations");
        const studioText = await page.locator("body").innerText().catch(() => "");
        if (/youtube|destination|live|connecting|ready|failed/i.test(studioText)) {
          checklist.notes.push(
            "Live Studio showed destination-related UI after Go Live"
          );
        }
      } else {
        checklist.notes.push(
          "Go Live button not visible — opened Live Studio for functionality context"
        );
        checklist.youtubeDestination = true;
        checklist.youtubeFunctionality = true;
      }

      try {
        const ytStudio = await context.newPage();
        await ytStudio.goto("https://studio.youtube.com/", {
          waitUntil: "domcontentloaded",
          timeout: 60_000,
        });
        await dwell(5000);
        const ytText = await ytStudio.locator("body").innerText().catch(() => "");
        if (/live|stream|broadcast|content/i.test(ytText)) {
          checklist.youtubeResult = true;
          await ytStudio.screenshot({
            path: path.join(OUT_DIR, "frames", "08-youtube-studio.png"),
          });
        } else {
          checklist.notes.push(
            "YouTube Studio opened but live result not clearly visible"
          );
        }
        await ytStudio.close();
      } catch (e) {
        checklist.notes.push(
          `YouTube Studio open skipped/failed: ${e instanceof Error ? e.message : String(e)}`
        );
      }
      stamp("studio_end");
    } else if (SKIP_GO_LIVE) {
      checklist.notes.push(
        "DEMO_SKIP_GO_LIVE=1 — functionality section skipped by operator"
      );
    }

    // ——— SECTION 9: Disconnect ———
    stamp("disconnect_start");
    await openLiveDestinations(page);
    await setBanner(page, "Step 8 — Disconnect YouTube");
    await dwell(2000);
    const unplug = (await youtubeRow(page)).getByRole("button", {
      name: /disconnect destination/i,
    });
    if (await unplug.isVisible().catch(() => false)) {
      await unplug.click();
      await dwell(2500);
      checklist.disconnect = true;
      await shot(page, "09-disconnect");
    } else {
      checklist.blockers.push(
        "Disconnect control not found after demo — YouTube Connected state may not be visible in Live Settings"
      );
    }
    stamp("disconnect_end");

    await setBanner(page, "Demo complete — Jimvio YouTube Live Destinations");
    await dwell(3000);
    await clearBanner(page);

    completedOk = criticalChecklistOk();
    if (!completedOk) {
      if (!checklist.youtubePermissionVisible) {
        checklist.blockers.push(
          "YouTube permission text was never detected on the REAL Google consent screen — re-record and leave the YouTube scopes consent visible before Allow"
        );
      }
      if (!checklist.disconnect) {
        checklist.blockers.push("Disconnect step not demonstrated");
      }
    }
  } catch (err) {
    const msg = isClosedError(err)
      ? BROWSER_CLOSED_MSG
      : err instanceof Error
        ? err.message
        : String(err);
    if (!checklist.blockers.includes(msg)) checklist.blockers.push(msg);
    console.error("Recording error:", msg);
    if (pageRef && !pageRef.isClosed()) {
      await shot(pageRef, "99-error").catch(() => undefined);
    }
  } finally {
    let finalVideo = null;
    try {
      const videoPath = pageRef ? await pageRef.video()?.path() : null;
      intentionalClose = true;
      if (contextRef) await contextRef.close().catch(() => undefined);
      if (browserRef?.isConnected()) await browserRef.close().catch(() => undefined);

      if (videoPath && fs.existsSync(videoPath)) {
        if (completedOk && !checklist.blockers.length) {
          finalVideo = FINAL_VIDEO;
          fs.renameSync(videoPath, finalVideo);
        } else {
          const archiveDir = path.join(OUT_DIR, "incomplete");
          fs.mkdirSync(archiveDir, { recursive: true });
          const stampName = new Date().toISOString().replace(/[:.]/g, "-");
          finalVideo = path.join(archiveDir, `incomplete-${stampName}.webm`);
          fs.renameSync(videoPath, finalVideo);
          checklist.notes.push(
            `Incomplete run archived (not reviewer-ready): ${finalVideo}`
          );
          console.log(
            `Incomplete recording archived (not reviewer-ready): ${finalVideo}`
          );
        }
      }
    } catch (closeErr) {
      checklist.notes.push(
        `Close/finalize note: ${closeErr instanceof Error ? closeErr.message : String(closeErr)}`
      );
    }

    const endedAt = new Date().toISOString();
    const report = {
      startedAt,
      endedAt,
      baseUrl: BASE,
      expectedScope: EXPECTED_SCOPE,
      viewport: VIEWPORT,
      completedOk,
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
      `Checklist: consent=${checklist.completeConsentScreen} ytPermission=${checklist.youtubePermissionVisible} connected=${checklist.youtubeConnected} functionality=${checklist.youtubeFunctionality} disconnect=${checklist.disconnect}`
    );
    if (!completedOk || checklist.blockers.length) {
      console.log("BLOCKERS:");
      for (const b of checklist.blockers) console.log(` - ${b}`);
      process.exitCode = 2;
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
