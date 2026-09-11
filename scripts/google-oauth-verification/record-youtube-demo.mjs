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
 *   DEMO_BASE_URL=https://www.jimvio.com
 *   DEMO_STORAGE_STATE=.auth/live-host.json   # Jimvio session (optional)
 *   DEMO_OUT_DIR=tmp/google-oauth-verification
 *   DEMO_SKIP_GO_LIVE=0
 *   DEMO_MANUAL_TIMEOUT_MS=0                 # 0 = wait indefinitely for operator
 *
 * IMPORTANT: Do NOT close the Playwright Chrome window during manual pauses.
 * The script keeps the browser open and continues after detecting success.
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
  const dest = path.join(
    archiveDir,
    `incomplete-${stampName}.webm`
  );
  fs.renameSync(FINAL_VIDEO, dest);
  checklist.notes.push(`Archived previous incomplete video → ${dest}`);
  console.log(`Archived previous incomplete video → ${dest}`);
}

function assertBrowserAlive(browser, page) {
  if (browserClosedByOperator || !browser?.isConnected() || page?.isClosed()) {
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

/**
 * Keep browser open and poll until predicate succeeds.
 * Never closes Chrome. Never treats waiting itself as failure.
 */
async function waitManual(browser, page, options) {
  const {
    kind,
    reason,
    predicate,
    lines = [],
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
      if (await predicate()) {
        console.log(`✓ Manual step complete (${kind}). Continuing recording…\n`);
        return;
      }
    } catch (err) {
      if (isClosedError(err)) throw new Error(BROWSER_CLOSED_MSG);
      // Transient navigation/evaluate errors during redirects are expected.
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
      // Best-effort: bring Chrome to front on macOS so the operator finds the window.
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
  // Live Studio / settings after auth (production may land on live or redirect)
  if (/\/communities\/live/i.test(url) && !/\/login/i.test(url)) {
    // Confirm Live UI rather than a soft redirect loop
    const body = await page.locator("body").innerText().catch(() => "");
    if (/Live Settings|Live Destinations|Go Live|Streaming|Prepare|Camera/i.test(body)) {
      return true;
    }
    // Authenticated shell without full panel text yet
    if (!/Sign in|Log in|Continue with Google/i.test(body)) {
      return true;
    }
  }
  // Any non-login Jimvio app route with session chrome
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
    stamp("login_end");

    // ——— SECTION 3: Live Destinations ———
    stamp("destinations_start");
    await page.goto(`${BASE}/communities/live?open=settings`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await setBanner(page, "Step 2 — Open Live Destinations");
    await page
      .getByText(/Live Settings|Live Destinations|Streaming/i)
      .first()
      .waitFor({ timeout: 60_000 });
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
      checklist.notes.push(
        "Pre-existing YouTube connection found — disconnecting for clean consent demo"
      );
      await disconnectYoutube.click();
      await dwell(2000);
      await page.reload({ waitUntil: "networkidle" });
    }

    // ——— SECTION 4: Connect YouTube ———
    stamp("connect_start");
    await setBanner(page, "Step 3 — Connect YouTube");
    const connectBtn = page
      .locator("li")
      .filter({ hasText: /YouTube/i })
      .getByRole("button", { name: /^Connect$/i })
      .first();

    if (!(await connectBtn.isVisible().catch(() => false))) {
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
    await page.waitForURL(
      /accounts\.google\.com|google\.com\/(?:o\/)?oauth|googleapis\.com/i,
      { timeout: 120_000 }
    );
    checklist.realGoogleOauthPage = true;
    await clearBanner(page);
    await dwell(3000);
    await shot(page, "04-google-oauth");

    // Capture authorize URL scope if present on the address bar / page
    const authUrl = page.url();
    if (authUrl.includes("youtube.force-ssl") || authUrl.includes(encodeURIComponent(EXPECTED_SCOPE))) {
      checklist.notes.push(`Authorize URL includes expected scope: ${EXPECTED_SCOPE}`);
    } else {
      checklist.notes.push(`Authorize URL observed: ${authUrl.slice(0, 240)}`);
    }

    const googleText = await page.locator("body").innerText().catch(() => "");
    if (/Sign in|Choose an account|Continue|Allow|Cancel|Google/i.test(googleText)) {
      checklist.englishConsent = true;
    }
    if (
      /youtube/i.test(googleText) ||
      /force-ssl/i.test(googleText) ||
      /manage your youtube/i.test(googleText) ||
      /see, edit, and permanently delete your youtube/i.test(googleText) ||
      /Manage your YouTube account/i.test(googleText)
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

    await waitManual(browser, page, {
      kind: "google",
      reason:
        "Complete the REAL Google OAuth consent for YouTube Live Destinations.",
      lines: [
        "Select account → complete MFA if prompted → review consent (including unverified-app warning if shown).",
        "Confirm YouTube permission matching youtube.force-ssl, then click Allow / Continue.",
        "Do NOT close Chrome. Do NOT fabricate consent UI.",
      ],
      predicate: async () => returnedFromGoogleToJimvio(page),
    });
    checklist.authorizationAction = true;
    stamp("google_done");

    // ——— SECTION 6: Callback / Connected ———
    stamp("callback_start");
    await page.goto(`${BASE}/communities/live?open=settings`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await setBanner(page, "Step 5 — OAuth callback · YouTube connected");
    await dwell(3500);
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
          "Go Live button not visible (may already be in a session) — opened Live Studio for functionality context"
        );
        checklist.youtubeDestination = true;
        const destLink = page
          .getByRole("link", { name: /Live Destinations/i })
          .first();
        if (await destLink.isVisible().catch(() => false)) {
          await destLink.click();
          await dwell(2000);
        }
      }

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
      checklist.notes.push(
        "DEMO_SKIP_GO_LIVE=1 — functionality section skipped by operator"
      );
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
      checklist.notes.push(
        "Disconnect control not found after demo (may already be disconnected)"
      );
    }
    stamp("disconnect_end");

    await setBanner(page, "Demo complete — Jimvio YouTube Live Destinations");
    await dwell(3000);
    await clearBanner(page);
    completedOk = true;
  } catch (err) {
    const msg = isClosedError(err) ? BROWSER_CLOSED_MSG : err instanceof Error ? err.message : String(err);
    if (!checklist.blockers.includes(msg)) checklist.blockers.push(msg);
    console.error("Recording error:", msg);
    if (pageRef && !pageRef.isClosed()) {
      await shot(pageRef, "99-error").catch(() => undefined);
    }
  } finally {
    let finalVideo = null;
    try {
      const videoPath = pageRef ? await pageRef.video()?.path() : null;
      // Close context first so Playwright flushes the video file.
      // Only close here after the flow finishes or a real failure — never during waitManual.
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
      `Checklist pass hints: consent=${checklist.completeConsentScreen} connected=${checklist.youtubeConnected} functionality=${checklist.youtubeFunctionality}`
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
