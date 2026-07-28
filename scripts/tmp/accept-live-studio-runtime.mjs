/**
 * Authenticated Live Studio runtime acceptance — real browser, not harness.
 *
 * Env (from .env.local or process):
 *   LIVE_E2E_EMAIL / LIVE_E2E_PASSWORD  (required unless storage state works)
 *   LIVE_ACCEPT_BASE_URL                (default http://localhost:3010)
 *   LIVE_ACCEPT_SESSION_ID              (optional existing session)
 *   LIVE_E2E_STORAGE_STATE              (optional Playwright storage JSON)
 *
 * Exit 0 only when no React #185 / "Live Studio failed to load" across the matrix.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();

function loadEnvLocal() {
  const p = path.join(ROOT, ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
}
loadEnvLocal();

const BASE = (process.env.LIVE_ACCEPT_BASE_URL || "http://localhost:3010").replace(/\/$/, "");
const EMAIL = process.env.LIVE_E2E_EMAIL;
const PASSWORD = process.env.LIVE_E2E_PASSWORD;
const SESSION_HINT = process.env.LIVE_ACCEPT_SESSION_ID || "ec32594c-6a94-44bc-adea-76a5515cfb7c";
const STORAGE =
  process.env.LIVE_E2E_STORAGE_STATE ||
  (BASE.includes("jimvio.com")
    ? path.join(ROOT, ".auth/prod-qa.json")
    : path.join(ROOT, ".auth/live-host.json"));

/** @type {{name:string,status:string,detail:string}[]} */
const results = [];
function record(name, status, detail = "") {
  results.push({ name, status, detail });
  const icon = { PASS: "✓", FAIL: "✗", WARN: "!", SKIP: "○" }[status] || "?";
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ""}`);
}

function isFail(body, pageErrors, consoles) {
  const text = `${body}\n${pageErrors.join("\n")}\n${consoles.join("\n")}`;
  if (/Live Studio failed to load/i.test(text)) return "Live Studio failed to load";
  if (/Maximum update depth exceeded/i.test(text)) return "Maximum update depth exceeded";
  if (/Minified React error #185/i.test(text)) return "Minified React error #185";
  return null;
}

async function ensureAuth(page, context) {
  await page.goto(`${BASE}/communities/live`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  if (!page.url().includes("/login")) return true;
  if (!EMAIL || !PASSWORD) return false;
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(EMAIL);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 90_000 });
  const outDir = path.join(ROOT, ".auth");
  fs.mkdirSync(outDir, { recursive: true });
  await context.storageState({ path: STORAGE });
  return true;
}

async function openLive(page, sessionId) {
  const pageErrors = [];
  const consoles = [];
  const onErr = (err) => pageErrors.push(err.stack || err.message);
  const onConsole = (msg) => {
    if (msg.type() === "error") consoles.push(msg.text());
  };
  page.on("pageerror", onErr);
  page.on("console", onConsole);

  const url = sessionId
    ? `${BASE}/communities/live/${sessionId}`
    : `${BASE}/communities/live`;
  let lastNavErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
      lastNavErr = null;
      break;
    } catch (e) {
      lastNavErr = e instanceof Error ? e.message : String(e);
      await page.waitForTimeout(1500);
    }
  }
  if (lastNavErr) {
    page.off("pageerror", onErr);
    page.off("console", onConsole);
    return {
      sid: sessionId,
      body: "",
      pageErrors: [...pageErrors, lastNavErr],
      consoles,
      fail: lastNavErr,
      url: page.url(),
    };
  }
  await page.waitForTimeout(8000);

  // Capture session id from redirect if any
  let sid = sessionId;
  const m = page.url().match(/\/live\/([a-f0-9-]{36})/i);
  if (m) sid = m[1];

  const body = await page.locator("body").innerText().catch(() => "");
  const fail = isFail(body, pageErrors, consoles);
  page.off("pageerror", onErr);
  page.off("console", onConsole);
  return { sid, body, pageErrors, consoles, fail, url: page.url() };
}

async function switchDrawerTabs(page) {
  const tabs = [
    "Chat",
    "Q&A",
    "Polls",
    "Tasks",
    "Shop",
    "AI",
    "Replay",
    "Tools",
    "Analytics",
    "People",
  ];
  const pageErrors = [];
  const consoles = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoles.push(msg.text());
  });

  for (const label of tabs) {
    // Prefer nav / tab buttons
    const candidates = [
      page.getByRole("tab", { name: new RegExp(`^${label}$`, "i") }),
      page.getByRole("button", { name: new RegExp(`^${label}$`, "i") }),
      page.getByText(new RegExp(`^${label}$`, "i")),
    ];
    let clicked = false;
    for (const loc of candidates) {
      if (await loc.first().isVisible().catch(() => false)) {
        await loc.first().click({ timeout: 5_000 }).catch(() => undefined);
        clicked = true;
        break;
      }
    }
    // People is a left tool (not a right tab)
    if (!clicked && /people|participants/i.test(label)) {
      const people = page
        .getByRole("button", { name: /people|participants/i })
        .or(page.getByLabel(/people|participants/i));
      if (await people.first().isVisible().catch(() => false)) {
        await people.first().click().catch(() => undefined);
        clicked = true;
      } else {
        // Programmatic open via drawer persistence (validates panel mount without chrome)
        await page.evaluate(() => {
          const raw = localStorage.getItem("jimvio-live-drawer-state");
          let parsed = {};
          try {
            parsed = raw ? JSON.parse(raw) : {};
          } catch {
            parsed = {};
          }
          localStorage.setItem(
            "jimvio-live-drawer-state",
            JSON.stringify({
              ...parsed,
              version: 2,
              leftPanel: "people",
              rightOpen: true,
            })
          );
        });
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForTimeout(5000);
        clicked = true;
      }
    }
    await page.waitForTimeout(1500);
    const body = await page.locator("body").innerText().catch(() => "");
    const fail = isFail(body, pageErrors, consoles);
    if (fail) {
      return { fail, tab: label, pageErrors, consoles };
    }
    record(`Drawer tab: ${label}`, clicked ? "PASS" : "WARN", clicked ? "" : "control not found");
  }
  return { fail: null, pageErrors, consoles };
}

async function main() {
  console.log(`\nLive Studio runtime acceptance → ${BASE}`);
  console.log(`Storage: ${STORAGE}`);
  console.log(`Session hint: ${SESSION_HINT}\n`);

  const launchOpts = {
    headless: true,
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--auto-select-desktop-capture-source=Entire screen",
    ],
  };
  let browser;
  try {
    browser = await chromium.launch({ ...launchOpts, channel: "chrome" });
  } catch {
    browser = await chromium.launch(launchOpts);
  }

  const contextOpts = {
    viewport: { width: 1440, height: 900 },
    permissions: ["camera", "microphone"],
  };
  if (fs.existsSync(STORAGE)) {
    contextOpts.storageState = STORAGE;
  }
  const context = await browser.newContext(contextOpts);
  const page = await context.newPage();
  page.setDefaultTimeout(45_000);

  // Auth
  const authed = await ensureAuth(page, context);
  if (!authed) {
    record("Auth", "FAIL", "No storage state and no LIVE_E2E credentials");
    await browser.close();
    process.exit(2);
  }
  record("Auth", "PASS");

  // Persisted drawer: corrupt / invalid / tasks (historical crash path)
  await page.goto(`${BASE}/communities/live`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.setItem(
      "jimvio-live-drawer-state",
      JSON.stringify({
        version: 1,
        rightTab: "tasks",
        rightOpen: true,
        leftPanel: "bogus",
        rightWidth: 9999,
        chatScroll: -1,
      })
    );
  });
  let open = await openLive(page, SESSION_HINT);
  if (open.fail) {
    record("Persisted tasks drawer + session open", "FAIL", open.fail);
  } else {
    record("Persisted tasks drawer + session open", "PASS", open.sid || open.url);
  }

  // Invalid JSON
  await page.evaluate(() => {
    localStorage.setItem("jimvio-live-drawer-state", "{not-json");
  });
  open = await openLive(page, open.sid || SESSION_HINT);
  if (open.fail) {
    record("Invalid drawer JSON reset", "FAIL", open.fail);
  } else {
    record("Invalid drawer JSON reset", "PASS");
  }

  // Fresh defaults
  await page.evaluate(() => {
    localStorage.removeItem("jimvio-live-drawer-state");
    localStorage.removeItem("jimvio-live-studio-mode");
  });
  open = await openLive(page, open.sid || SESSION_HINT);
  if (open.fail) {
    record("Fresh drawer + session open", "FAIL", open.fail);
  } else {
    record("Fresh drawer + session open", "PASS", open.sid || "");
  }

  const sessionId = open.sid || SESSION_HINT;

  // Studio shell visible
  const dock =
    (await page.getByRole("toolbar", { name: /live session controls/i }).isVisible().catch(() => false)) ||
    (await page.getByLabel(/live chat|speakers on stage|microphone|camera/i).first().isVisible().catch(() => false));
  record("Studio shell visible", dock ? "PASS" : "FAIL", page.url());

  // Drawer tabs
  const tabResult = await switchDrawerTabs(page);
  if (tabResult.fail) {
    record("Drawer tab matrix", "FAIL", `${tabResult.tab}: ${tabResult.fail}`);
  } else {
    record("Drawer tab matrix (no #185)", "PASS");
  }

  // Close left people drawer so ControlDock is clickable
  await page.evaluate(() => {
    const raw = localStorage.getItem("jimvio-live-drawer-state");
    let parsed = {};
    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch {
      parsed = {};
    }
    localStorage.setItem(
      "jimvio-live-drawer-state",
      JSON.stringify({ ...parsed, version: 2, leftPanel: "none", rightOpen: true, rightTab: "chat" })
    );
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  {
    const body = await page.locator("body").innerText().catch(() => "");
    const fail = isFail(body, [], []);
    record("Reset drawers after tab matrix", fail ? "FAIL" : "PASS", fail || "");
  }

  // Mic / Cam toggles (fake media) — force click to avoid overlay flake
  for (const [label, re] of [
    ["Microphone toggle", /unmute|mute|microphone/i],
    ["Camera toggle", /start video|stop video|camera/i],
  ]) {
    try {
      const btn = page.getByRole("button", { name: re }).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click({ force: true });
        await page.waitForTimeout(800);
        await btn.click({ force: true });
        await page.waitForTimeout(800);
        const body = await page.locator("body").innerText();
        const fail = isFail(body, [], []);
        record(label, fail ? "FAIL" : "PASS", fail || "");
      } else {
        record(label, "WARN", "button not found");
      }
    } catch (e) {
      record(label, "FAIL", e instanceof Error ? e.message : String(e));
    }
  }

  // Screen share (fake UI) — use dock label, not header "Share live link"
  try {
    const share = page.getByRole("button", { name: /^(share screen|stop share|screen share)$/i }).first();
    if (await share.isVisible().catch(() => false)) {
      await share.click({ force: true });
      await page.waitForTimeout(2500);
      const body = await page.locator("body").innerText();
      const fail = isFail(body, [], []);
      const stop = page.getByRole("button", { name: /^stop share$/i }).first();
      if (await stop.isVisible().catch(() => false)) {
        await stop.click({ force: true });
        await page.waitForTimeout(1000);
      } else {
        await share.click({ force: true }).catch(() => undefined);
        await page.waitForTimeout(1000);
      }
      record("Screen share cycle", fail ? "FAIL" : "PASS", fail || "");
    } else {
      // Keyboard shortcut fallback (S)
      await page.keyboard.press("s");
      await page.waitForTimeout(2000);
      const body = await page.locator("body").innerText();
      const fail = isFail(body, [], []);
      await page.keyboard.press("s");
      await page.waitForTimeout(1000);
      record("Screen share cycle", fail ? "FAIL" : "PASS", fail || "via keyboard");
    }
  } catch (e) {
    record("Screen share cycle", "FAIL", e instanceof Error ? e.message : String(e));
  }

  // Chat send
  try {
    const chatTab = page.getByRole("tab", { name: /^chat$/i }).or(page.getByText(/^chat$/i));
    if (await chatTab.first().isVisible().catch(() => false)) {
      await chatTab.first().click();
      await page.waitForTimeout(500);
    }
    const input = page.getByPlaceholder(/message/i).first();
    await input.waitFor({ state: "visible", timeout: 20_000 });
    const msg = `Accept ${Date.now()}`;
    await input.fill(msg);
    const send = page.getByLabel(/send message/i).first();
    if (await send.isVisible().catch(() => false)) await send.click();
    else await page.keyboard.press("Enter");
    await page.waitForTimeout(2000);
    const body = await page.locator("body").innerText();
    const fail = isFail(body, [], []);
    record("Chat send", fail ? "FAIL" : "PASS", fail || msg);
  } catch (e) {
    record("Chat send", "FAIL", e instanceof Error ? e.message : String(e));
  }

  // Refresh / rejoin
  open = await openLive(page, sessionId);
  record(
    "Refresh / rejoin session",
    open.fail ? "FAIL" : "PASS",
    open.fail || open.sid || ""
  );

  // Leave (best-effort)
  try {
    const leave = page.getByRole("button", { name: /leave|end live/i }).first();
    if (await leave.isVisible().catch(() => false)) {
      await leave.click();
      await page.waitForTimeout(1500);
      const confirm = page.getByRole("button", { name: /confirm|yes|leave|end/i });
      if (await confirm.first().isVisible().catch(() => false)) {
        await confirm.first().click();
        await page.waitForTimeout(1500);
      }
      record("Leave control", "PASS");
    } else {
      record("Leave control", "WARN", "not visible");
    }
  } catch (e) {
    record("Leave control", "WARN", e instanceof Error ? e.message : String(e));
  }

  // Re-open after leave
  open = await openLive(page, sessionId);
  record(
    "Reopen after leave",
    open.fail ? "FAIL" : "PASS",
    open.fail || open.url
  );

  await browser.close();

  const counts = { PASS: 0, FAIL: 0, WARN: 0, SKIP: 0 };
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;

  const out = {
    base: BASE,
    sessionId,
    counts,
    results,
    acceptance: {
      reactDevHarness: "see scripts/tmp/repro-live-tasks-185.mjs",
      productionLive: counts.FAIL === 0 ? "PASS" : "FAIL",
      noMaxUpdateDepth: results.every((r) => !/Maximum update depth|#185|failed to load/i.test(r.detail)),
    },
  };
  fs.writeFileSync(
    path.join(ROOT, "scripts/tmp/accept-live-studio-results.json"),
    JSON.stringify(out, null, 2)
  );

  console.log("\n════════════════════════════════════════");
  console.log("ACCEPTANCE SUMMARY", counts);
  console.log("Production Live:", out.acceptance.productionLive);
  console.log("════════════════════════════════════════\n");

  if (counts.FAIL > 0) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
