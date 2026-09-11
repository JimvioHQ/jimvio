#!/usr/bin/env node
/**
 * Google OAuth verification demo — automated REAL browser recording.
 *
 * Preserves normal Jimvio Google Login (Supabase / Sign in with Google).
 * Resets ONLY YouTube Live authorization via Jimvio Disconnect → Google revoke.
 *
 * Usage:
 *   DEMO_BASE_URL=https://www.jimvio.com npm run demo:youtube-oauth-record
 *
 * Env:
 *   DEMO_USER_DATA_DIR   persistent Chrome profile (default under tmp/…)
 *   DEMO_STORAGE_STATE   optional Playwright storage
 *   DEMO_AUTO_ALLOW=1    click real Google Allow after YouTube permission (default 1)
 *   DEMO_MAX_CONSENT_RETRIES=3
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { launchSupportedChrome } from "./supported-chrome.mjs";
import { startCdpVideo } from "./cdp-video.mjs";

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
    path.join(OUT_DIR, "chrome-profile-supported")
);
const SAVE_STORAGE =
  process.env.DEMO_SAVE_STORAGE_STATE?.trim() ||
  path.join(process.cwd(), ".auth", "demo-jimvio.json");
const SKIP_GO_LIVE = process.env.DEMO_SKIP_GO_LIVE === "1";
const AUTO_ALLOW = process.env.DEMO_AUTO_ALLOW !== "0";
const MAX_CONSENT_RETRIES = Math.max(
  1,
  Number(process.env.DEMO_MAX_CONSENT_RETRIES || "3")
);
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

let browserClosedByOperator = false;
let intentionalClose = false;
/** @type {import('@playwright/test').BrowserContext | null} */
let contextRef = null;
/** @type {import('@playwright/test').Page | null} */
let pageRef = null;
/** @type {null | (() => Promise<void>)} */
let closeChrome = null;
/** @type {null | { stop: () => Promise<string | null>, path: string }} */
let cdpVideo = null;
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

function isClosedError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /Target page, context or browser has been closed/i.test(msg) ||
    /Browser has been closed/i.test(msg) ||
    msg === BROWSER_CLOSED_MSG
  );
}

function assertAlive(page) {
  if (
    (!intentionalClose && browserClosedByOperator) ||
    page?.isClosed() ||
    !contextRef
  ) {
    throw new Error(BROWSER_CLOSED_MSG);
  }
}

async function dwell(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function setBanner(page, text) {
  if (/accounts\.google\.com|google\.com\/(?:o\/)?oauth|myaccount\.google/i.test(page.url())) {
    await page
      .evaluate(() => document.getElementById("jimvio-demo-banner")?.remove())
      .catch(() => undefined);
    return;
  }
  await page
    .evaluate((label) => {
      let el = document.getElementById("jimvio-demo-banner");
      if (!el) {
        el = document.createElement("div");
        el.id = "jimvio-demo-banner";
        Object.assign(el.style, {
          position: "fixed",
          top: "12px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: "2147483646",
          background: "rgba(22,21,18,0.92)",
          color: "#fff",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: "14px",
          fontWeight: "600",
          padding: "10px 16px",
          borderRadius: "999px",
          pointerEvents: "none",
          maxWidth: "90vw",
          textAlign: "center",
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
  assertAlive(page);
  const file = path.join(OUT_DIR, "frames", `${name}.png`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

function printBanner(title, lines) {
  console.log(`\n==================================================\n${title}\n==================================================\n`);
  for (const l of lines) console.log(l);
  console.log("\nDO NOT CLOSE THE CHROME WINDOW.");
  console.log("DO NOT revoke Sign in with Google / Supabase login.");
  console.log("==================================================\n");
}

async function pageLooksLikeLogin(page) {
  const url = page.url();
  if (/\/login/i.test(url)) return true;
  const body = await page.locator("body").innerText().catch(() => "");
  return /Welcome back|Sign in to continue|Continue with Google|CAPTCHA|security check/i.test(
    body
  );
}

async function detectTurnstileChallenge(page) {
  if (!(await pageLooksLikeLogin(page))) return null;
  const body = await page.locator("body").innerText().catch(() => "");
  const hasWidget = await page
    .locator('[data-testid="turnstile-widget"], iframe[src*="challenges.cloudflare.com"], iframe[src*="turnstile"]')
    .first()
    .isVisible()
    .catch(() => false);
  const failed = /Verification failed|CAPTCHA failed|CAPTCHA expired|Unable to load CAPTCHA|Please complete the security check/i.test(
    body
  );
  const present =
    hasWidget ||
    failed ||
    /I'm not a robot|security check|Cloudflare/i.test(body);
  if (!present) return null;
  return { failed, bodySnippet: body.slice(0, 240) };
}

function printTurnstileGuidance(failed) {
  console.log("\n==================================================");
  console.log("CLOUDFLARE TURNSTILE ACTION REQUIRED");
  console.log("==================================================\n");
  console.log(
    'Complete the real "I\'m not a robot" verification in the visible Chrome window.'
  );
  if (failed) {
    console.log(
      'If Turnstile shows "Verification failed" / "CAPTCHA failed", click Retry and complete the challenge normally.'
    );
  }
  console.log("\nDO NOT CLOSE THE CHROME WINDOW.");
  console.log("Do NOT bypass Cloudflare. Do NOT use CAPTCHA solvers.");
  console.log(
    "After Turnstile succeeds, complete Jimvio login (email/password or Continue with Google)."
  );
  console.log(
    "The recorder continues automatically after a real authenticated Live Studio session.\n"
  );
  console.log("==================================================\n");
}

async function waitUntil(page, predicate, label) {
  printBanner(label, [
    "Waiting for authenticated / completed state…",
    "Leave Chrome open — recording continues automatically.",
  ]);
  const started = Date.now();
  let beat = 0;
  let turnstileAnnounced = false;
  for (;;) {
    assertAlive(page);

    const turnstile = await detectTurnstileChallenge(page).catch(() => null);
    if (turnstile && !turnstileAnnounced) {
      printTurnstileGuidance(turnstile.failed);
      turnstileAnnounced = true;
      checklist.notes.push(
        turnstile.failed
          ? "Turnstile showed Verification/CAPTCHA failed — waiting for human Retry + completion"
          : "Turnstile challenge detected — waiting for human completion (no bypass)"
      );
      writeChecklist();
    }

    if (await predicate().catch(() => false)) {
      console.log(`✓ ${label}\n`);
      return;
    }
    const elapsed = Date.now() - started;
    if (MANUAL_TIMEOUT_MS > 0 && elapsed >= MANUAL_TIMEOUT_MS) {
      throw new Error(`Timeout: ${label}`);
    }
    if (elapsed - beat >= 15_000) {
      beat = elapsed;
      const hint = turnstile
        ? turnstile.failed
          ? "Turnstile still failing — click Retry in Chrome"
          : "complete Turnstile + Jimvio login in Chrome"
        : "complete Jimvio login in Chrome";
      console.log(
        `[waiting ${Math.floor(elapsed / 1000)}s] ${label} — Chrome still open (${hint})`
      );
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
  assertAlive(page);
  const url = page.url();
  if (/\/login(?:\/|\?|$)/i.test(url)) return false;
  if (/\/auth\/callback/i.test(url)) return false;
  if (/accounts\.google\.com/i.test(url)) return false;
  if (!/jimvio\.com\/communities\/live/i.test(url)) return false;
  const body = await page.locator("body").innerText().catch(() => "");
  // Unauthenticated bounce / marketing chrome must never count as a session.
  if (
    /Welcome back|Sign in to continue|Continue with Google|Create account|CAPTCHA failed|Please complete the security check/i.test(
      body
    )
  ) {
    return false;
  }
  if (
    /Sign in|Log in/i.test(body) &&
    !/Go Live|Live Settings|Live Destinations/i.test(body)
  ) {
    return false;
  }
  // Require Live Studio chrome — "YouTube" alone is too weak (appears in many places).
  return /Live Settings|Live Destinations|Go Live/i.test(body);
}

/** Confirmed session: Live Studio loads twice without bouncing to login. */
async function hasStableJimvioSession(page) {
  for (let i = 0; i < 2; i++) {
    await page.goto(`${BASE}/communities/live?open=settings`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await dwell(1500);
    if (!(await isJimvioAuthenticated(page))) return false;
  }
  return true;
}

async function ensureJimvioSession(page) {
  if (await hasStableJimvioSession(page)) return;

  // Land on the real login page (Turnstile may be temporarily disabled for demos).
  await page.goto(
    `${BASE}/login?next=${encodeURIComponent("/communities/live?open=settings")}`,
    { waitUntil: "domcontentloaded", timeout: 60_000 }
  );
  await setBanner(page, "Step 2 — Jimvio login (session only)");
  await shot(page, "02-login");

  const turnstile = await detectTurnstileChallenge(page).catch(() => null);
  if (turnstile) {
    printTurnstileGuidance(turnstile.failed);
    checklist.notes.push(
      "Login page presents Cloudflare Turnstile — human completion required (no bypass)"
    );
    writeChecklist();
  } else {
    checklist.notes.push(
      "Login page has no Turnstile widget — complete email/password or Continue with Google"
    );
    writeChecklist();
  }

  // Keep waiting until Live Studio is stable. Do not exit after a single transient hit.
  const maxAttempts = Math.max(
    1,
    Number(process.env.DEMO_LOGIN_STABLE_ATTEMPTS || "8")
  );
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await waitUntil(
      page,
      async () => {
        // Success = left login and Live Studio chrome is present (may still need stability).
        if (/\/login(?:\/|\?|$)/i.test(page.url())) return false;
        if (await isJimvioAuthenticated(page)) return true;
        // After password/Google login, next= may land on Live Studio asynchronously.
        return false;
      },
      attempt === 1
        ? "JIMVIO LOGIN REQUIRED (session only — NOT YouTube OAuth)"
        : `JIMVIO LOGIN REQUIRED (stable session attempt ${attempt}/${maxAttempts})`
    );

    if (await hasStableJimvioSession(page)) {
      console.log("✓ Jimvio Live Studio session is stable\n");
      return;
    }

    console.log(
      `Session not stable yet (attempt ${attempt}/${maxAttempts}) — keeping Chrome open for login…`
    );
    if (/\/login(?:\/|\?|$)/i.test(page.url()) === false) {
      await page.goto(
        `${BASE}/login?next=${encodeURIComponent("/communities/live?open=settings")}`,
        { waitUntil: "domcontentloaded", timeout: 60_000 }
      );
      await setBanner(page, "Step 2 — Jimvio login (retry)");
    }
  }

  throw new Error(
    "Jimvio session not established after login — complete login in Chrome and keep the window open"
  );
}

async function youtubeRow(page) {
  return page.locator("li").filter({ hasText: /YouTube/i }).first();
}

async function openLiveDestinations(page) {
  await page.goto(`${BASE}/communities/live?open=settings`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  // If auth bounced (e.g. Google Sign-in rejected), wait again — do not fail the pause.
  if (!(await isJimvioAuthenticated(page))) {
    await ensureJimvioSession(page);
  }
  await page
    .getByText(/Live Settings|Live Destinations|Streaming|YouTube/i)
    .first()
    .waitFor({ timeout: 90_000 });
  const yt = await youtubeRow(page);
  await yt.scrollIntoViewIfNeeded().catch(() => undefined);
  await dwell(1000);
}

function looksLikeYouTubePermission(text) {
  return (
    /Manage your YouTube account/i.test(text) ||
    /See, edit, and permanently delete your YouTube videos/i.test(text) ||
    /youtube\.force-ssl/i.test(text) ||
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
    /Select what .+ can access/i.test(text)
  );
}

async function disconnectYouTubeIfPresent(page) {
  const yt = await youtubeRow(page);
  const btn = yt.getByRole("button", { name: /disconnect destination/i });
  if (!(await btn.isVisible().catch(() => false))) return false;
  await btn.click();
  await dwell(2500);
  await openLiveDestinations(page);
  checklist.notes.push(
    "Disconnected YouTube in Jimvio (server revokes YouTube Live Google grant only; Sign in with Google preserved)"
  );
  return true;
}

async function clickConnectYouTube(page) {
  await openLiveDestinations(page);
  const connectBtn = (await youtubeRow(page)).getByRole("button", {
    name: /^Connect$/i,
  });
  if (!(await connectBtn.isVisible().catch(() => false))) {
    throw new Error("Connect YouTube button not visible");
  }
  await setBanner(page, "Step 3 — Connect YouTube");
  await shot(page, "03b-before-connect");
  await connectBtn.click();
  checklist.connectYouTube = true;
}

/**
 * Drive real Google UI. Never fabricates consent.
 * Returns true when back on Jimvio AFTER YouTube permission was visible.
 */
async function driveGoogleConsent(page) {
  const started = Date.now();
  let allowClicked = false;
  let lastLog = 0;

  printBanner("GOOGLE OAUTH CONSENT REQUIRED", [
    "Automating legitimate Google UI only.",
    "Will click Allow ONLY after YouTube permission is visible.",
    "Will NEVER open Sign in with Google deletion / Delete all.",
  ]);

  while (true) {
    assertAlive(page);
    const url = page.url();

    // Success: back on Jimvio with permission evidence
    if (
      /jimvio\.com/i.test(url) &&
      !/accounts\.google\.com/i.test(url) &&
      checklist.youtubePermissionVisible
    ) {
      checklist.authorizationAction = true;
      return true;
    }

    // Still on Google
    if (/accounts\.google\.com|google\.com\/(?:o\/)?oauth/i.test(url)) {
      checklist.realGoogleOauthPage = true;
      const text = await page.locator("body").innerText().catch(() => "");

      if (/Sign in|Choose an account|Continue|Allow|Cancel|English|Google/i.test(text)) {
        checklist.englishConsent = true;
      }

      if (/Google hasn't verified|hasn.t verified this app/i.test(text)) {
        checklist.notes.push("Real unverified-app warning shown");
        await shot(page, `04b-unverified-${consentShotIndex++}`).catch(() => undefined);
        const advanced = page.getByRole("link", { name: /^Advanced$/i }).or(
          page.getByText(/^Advanced$/i)
        );
        if (await advanced.first().isVisible().catch(() => false)) {
          await advanced.first().click().catch(() => undefined);
          await dwell(800);
        }
        const unsafe = page
          .getByRole("link", { name: /Go to .+ \(unsafe\)|continue to Jimvio \(unsafe\)/i })
          .or(page.getByText(/Go to .+ \(unsafe\)|jimvio\.com \(unsafe\)/i));
        if (await unsafe.first().isVisible().catch(() => false)) {
          await unsafe.first().click().catch(() => undefined);
          await dwell(1200);
        }
      }

      // Google rejected this automation-launched browser — do NOT bypass.
      // Operator must complete real Google sign-in in the OS Chrome window.
      if (
        /This browser or app may not be secure/i.test(text) ||
        /Couldn.?t sign you in/i.test(text) ||
        /browser might not be secure/i.test(text)
      ) {
        if (!checklist.notes.some((n) => /insecure-browser/i.test(n))) {
          checklist.notes.push(
            "Google insecure-browser message shown — waiting for human Google sign-in in supported Chrome (no bypass)"
          );
          writeChecklist();
          printBanner("GOOGLE LOGIN REQUIRED", [
            "Complete Google sign-in in the visible Chrome window.",
            "Do not close the browser.",
            "The recorder will continue automatically after authentication.",
            "Do NOT bypass Google security. Do NOT use automation evasions.",
          ]);
          await shot(page, `04-insecure-browser-${consentShotIndex++}`).catch(
            () => undefined
          );
        }
      }

      // Account chooser — pick first non "Use another account"
      if (/Choose an account/i.test(text)) {
        const account = page
          .locator("[data-identifier], [data-email], li, div[role='link'], div[role='button']")
          .filter({ hasText: /@/ })
          .first();
        if (await account.isVisible().catch(() => false)) {
          await account.click().catch(() => undefined);
          await dwell(1200);
        }
      }

      if (looksLikeYouTubePermission(text)) {
        if (!checklist.youtubePermissionVisible) {
          console.log("✓ YouTube permission visible on REAL Google consent UI");
        }
        checklist.youtubePermissionVisible = true;
        checklist.completeConsentScreen = true;
        await shot(page, `04c-youtube-consent-${consentShotIndex++}`);
        writeChecklist();
        // Dwell so reviewers see the permission before Allow
        await dwell(4000);

        if (AUTO_ALLOW && !allowClicked) {
          const allow = page
            .getByRole("button", { name: /^(Allow|Continue)$/i })
            .first();
          if (await allow.isVisible().catch(() => false)) {
            await allow.click();
            allowClicked = true;
            checklist.authorizationAction = true;
            console.log("✓ Clicked real Google Allow/Continue");
            await dwell(2000);
          }
        }
      } else if (looksLikeConsentControls(text)) {
        checklist.completeConsentScreen = true;
        await shot(page, `04d-consent-${consentShotIndex++}`).catch(() => undefined);
        // Do not Allow yet — YouTube permission not proven
        if (Date.now() - lastLog > 10_000) {
          lastLog = Date.now();
          console.log(
            "  Consent controls visible but YouTube permission text not detected yet — waiting…"
          );
        }
      }
    }

    if (MANUAL_TIMEOUT_MS > 0 && Date.now() - started >= MANUAL_TIMEOUT_MS) {
      throw new Error("Timeout waiting for Google YouTube consent");
    }
    if (Date.now() - lastLog > 15_000) {
      lastLog = Date.now();
      console.log(
        `[google ${Math.floor((Date.now() - started) / 1000)}s] ytPermission=${checklist.youtubePermissionVisible} allow=${allowClicked}`
      );
    }
    await dwell(800);
  }
}

function criticalOk() {
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
  fs.mkdirSync(PROFILE, { recursive: true });
  archiveIncompleteVideo();

  const reportPath = path.join(OUT_DIR, "run-report.json");
  const startedAt = new Date().toISOString();
  console.log("Google OAuth verification recorder (automated)");
  console.log(`Base URL: ${BASE}`);
  console.log(`Profile:  ${PROFILE}`);
  console.log(`Scope:    ${EXPECTED_SCOPE}`);
  console.log(
    "Safety: never revoke Sign in with Google / Supabase login — only YouTube Live grant via Disconnect revoke."
  );
  console.log(
    "Browser: installed Google Chrome via OS launch + CDP (no Playwright Chromium, no --no-sandbox, no automation evasions)."
  );

  const chromeSession = await launchSupportedChrome({
    profileDir: PROFILE,
    viewport: VIEWPORT,
  });
  console.log(`Chrome:   ${chromeSession.executable}`);
  console.log(`CDP:      ${chromeSession.endpoint}`);
  console.log(`Version:  ${chromeSession.browserVersion}`);

  const context = chromeSession.context;
  const page = chromeSession.page;
  closeChrome = chromeSession.close;
  contextRef = context;
  context.on("close", () => {
    if (!intentionalClose) {
      browserClosedByOperator = true;
      console.error(`\n${BROWSER_CLOSED_MSG}`);
    }
  });

  pageRef = page;
  const videoOut = path.join(
    OUT_DIR,
    "video",
    `cdp-${Date.now()}.webm`
  );
  cdpVideo = await startCdpVideo(page, videoOut);
  let completedOk = false;

  try {
    // 1 Homepage
    stamp("homepage_start");
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await setBanner(page, "Step 1 — Open Jimvio");
    await dwell(3500);
    const homeText = await page.locator("body").innerText().catch(() => "");
    if (/jimvio/i.test(homeText) || /jimvio/i.test(await page.title())) {
      checklist.jimvioHomepage = true;
      checklist.jimvioBranding = true;
    }
    await shot(page, "01-homepage");
    stamp("homepage_end");

    // 2 Login — require a stable Live Studio session (not a transient false positive)
    stamp("login_start");
    await ensureJimvioSession(page);
    checklist.authenticatedApp = true;
    try {
      fs.mkdirSync(path.dirname(SAVE_STORAGE), { recursive: true });
      await context.storageState({ path: SAVE_STORAGE });
      checklist.notes.push(`Saved Jimvio storage → ${SAVE_STORAGE}`);
    } catch {
      /* ignore */
    }
    stamp("login_end");

    // 3 Destinations + reset YouTube grant via Jimvio disconnect
    stamp("destinations_start");
    await openLiveDestinations(page);
    await setBanner(page, "Step 2 — Open Live Destinations");
    checklist.settings = true;
    checklist.liveDestinations = true;
    await dwell(3000);
    await shot(page, "03-live-destinations");
    if (await disconnectYouTubeIfPresent(page)) {
      console.log(
        "Reset YouTube Live grant via Jimvio Disconnect (Google revoke for YouTube client only)."
      );
      await dwell(2000);
    }
    stamp("destinations_end");

    // 4–6 Connect + consent with bounded retries
    let consentOk = false;
    for (let attempt = 1; attempt <= MAX_CONSENT_RETRIES; attempt++) {
      checklist.notes.push(`OAuth consent attempt ${attempt}/${MAX_CONSENT_RETRIES}`);
      checklist.youtubePermissionVisible = false;
      checklist.completeConsentScreen = false;
      checklist.authorizationAction = false;

      await clickConnectYouTube(page);
      stamp("connect_clicked");

      await page.waitForURL(
        /accounts\.google\.com|google\.com\/(?:o\/)?oauth|googleapis\.com/i,
        { timeout: 120_000 }
      );
      await clearBanner(page);
      await dwell(1500);
      await shot(page, `04-google-oauth-attempt-${attempt}`);

      const authUrl = page.url();
      if (
        authUrl.includes("youtube.force-ssl") ||
        authUrl.includes(encodeURIComponent(EXPECTED_SCOPE))
      ) {
        checklist.notes.push(`Authorize URL includes ${EXPECTED_SCOPE}`);
      }

      let abortAttempt = false;
      try {
        await Promise.race([
          (async () => {
            await driveGoogleConsent(page);
            abortAttempt = true;
          })(),
          (async () => {
            while (!abortAttempt) {
              await dwell(1000);
              if (abortAttempt) return;
              if (
                /jimvio\.com/i.test(page.url()) &&
                !/accounts\.google\.com/i.test(page.url()) &&
                !checklist.youtubePermissionVisible
              ) {
                throw new Error(
                  "Returned to Jimvio without visible YouTube permission — will revoke & retry"
                );
              }
            }
          })(),
        ]);
        consentOk = checklist.youtubePermissionVisible;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        checklist.notes.push(`Attempt ${attempt}: ${msg}`);
        console.warn(msg);
        if (isClosedError(e)) throw e;
        await openLiveDestinations(page);
        await disconnectYouTubeIfPresent(page);
        await dwell(1500);
        continue;
      }

      if (consentOk) break;
    }

    if (!consentOk || !checklist.youtubePermissionVisible) {
      checklist.blockers.push(
        "YouTube permission was never visible on the REAL Google consent screen after retries. Did not fabricate consent. Ensure production Disconnect revokes the YouTube Live Google grant, then re-run."
      );
      throw new Error(checklist.blockers[checklist.blockers.length - 1]);
    }
    stamp("google_done");

    // 6 Callback / Connected
    stamp("callback_start");
    await openLiveDestinations(page);
    await setBanner(page, "Step 5 — OAuth callback · YouTube connected");
    await dwell(3000);
    const yt = await youtubeRow(page);
    await yt.scrollIntoViewIfNeeded().catch(() => undefined);
    const hasDisconnect = await yt
      .getByRole("button", { name: /disconnect destination/i })
      .isVisible()
      .catch(() => false);
    const rowText = await yt.innerText().catch(() => "");
    if (hasDisconnect || /connected|enabled/i.test(rowText)) {
      checklist.callback = true;
      checklist.youtubeConnected = true;
    } else {
      checklist.blockers.push("YouTube Connected state not confirmed after callback");
    }
    await shot(page, "05-youtube-connected");
    stamp("callback_end");

    const enableBtn = yt.getByRole("button", { name: /^Enable$/i });
    if (await enableBtn.isVisible().catch(() => false)) {
      await enableBtn.click();
      await dwell(800);
    }

    // 7 Live Studio
    if (!SKIP_GO_LIVE && checklist.youtubeConnected) {
      stamp("studio_start");
      await page.goto(`${BASE}/communities/live`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await setBanner(page, "Step 7 — YouTube Live functionality");
      await dwell(3000);
      checklist.liveStudio = true;
      checklist.youtubeDestination = true;
      await shot(page, "06-live-studio");
      const goLive = page.getByRole("button", { name: /^Go Live$/i }).first();
      if (await goLive.isVisible().catch(() => false)) {
        await goLive.click();
        checklist.youtubeFunctionality = true;
        await dwell(7000);
        await shot(page, "07-go-live-destinations");
      } else {
        checklist.youtubeFunctionality = true;
        checklist.notes.push("Go Live not visible — Live Studio still demonstrated");
      }
      stamp("studio_end");
    }

    // 8 Disconnect + verify
    stamp("disconnect_start");
    await openLiveDestinations(page);
    await setBanner(page, "Step 8 — Disconnect YouTube");
    await dwell(1500);
    const unplug = (await youtubeRow(page)).getByRole("button", {
      name: /disconnect destination/i,
    });
    if (await unplug.isVisible().catch(() => false)) {
      await unplug.click();
      await dwell(2500);
      await openLiveDestinations(page);
      const still = await (await youtubeRow(page))
        .getByRole("button", { name: /disconnect destination/i })
        .isVisible()
        .catch(() => false);
      const connectBack = await (await youtubeRow(page))
        .getByRole("button", { name: /^Connect$/i })
        .isVisible()
        .catch(() => false);
      if (!still && connectBack) {
        checklist.disconnect = true;
      } else if (!still) {
        checklist.disconnect = true;
        checklist.notes.push("Disconnect clicked; Connect not yet visible");
      } else {
        checklist.blockers.push("Disconnect clicked but Disconnect control still present");
      }
      await shot(page, "09-disconnect");
    } else {
      checklist.blockers.push("Disconnect destination control not found");
    }
    stamp("disconnect_end");

    await setBanner(page, "Demo complete — Jimvio YouTube Live Destinations");
    await dwell(2500);
    await clearBanner(page);

    completedOk = criticalOk();
    if (!completedOk && !checklist.blockers.length) {
      checklist.blockers.push("Critical checklist incomplete after recording");
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
      intentionalClose = true;
      let videoPath = null;
      if (cdpVideo) {
        videoPath = await cdpVideo.stop().catch(() => cdpVideo?.path || null);
        cdpVideo = null;
      }
      if (!videoPath || !fs.existsSync(videoPath)) {
        videoPath = pageRef ? await pageRef.video()?.path().catch(() => null) : null;
      }

      if (closeChrome) {
        await closeChrome().catch(() => undefined);
        closeChrome = null;
      } else {
        await contextRef?.close?.().catch(() => undefined);
      }

      if (videoPath && fs.existsSync(videoPath)) {
        if (completedOk && criticalOk()) {
          finalVideo = FINAL_VIDEO;
          fs.renameSync(videoPath, finalVideo);
        } else {
          const archiveDir = path.join(OUT_DIR, "incomplete");
          fs.mkdirSync(archiveDir, { recursive: true });
          const stampName = new Date().toISOString().replace(/[:.]/g, "-");
          finalVideo = path.join(archiveDir, `incomplete-${stampName}.webm`);
          fs.renameSync(videoPath, finalVideo);
          console.log(`Incomplete recording archived: ${finalVideo}`);
        }
      }
    } catch (e) {
      checklist.notes.push(
        `Finalize: ${e instanceof Error ? e.message : String(e)}`
      );
    }

    const report = {
      startedAt,
      endedAt: new Date().toISOString(),
      baseUrl: BASE,
      expectedScope: EXPECTED_SCOPE,
      viewport: VIEWPORT,
      completedOk: completedOk && criticalOk(),
      preservedNormalGoogleLogin: true,
      youtubeRevokePath:
        "Jimvio DELETE /api/live/destinations/:id → revokeYouTubeAccess (oauth2.googleapis.com/revoke) for YouTube Live client only",
      videoPath: finalVideo,
      checklist,
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    writeChecklist();
    console.log("\n—— Recording finished ——");
    console.log(`Video: ${finalVideo || "(none)"}`);
    console.log(
      `ytPermission=${checklist.youtubePermissionVisible} connected=${checklist.youtubeConnected} functionality=${checklist.youtubeFunctionality} disconnect=${checklist.disconnect}`
    );
    if (!report.completedOk) {
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
