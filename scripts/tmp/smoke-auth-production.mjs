/**
 * Authenticated production smoke — Community Owner account.
 * Run: node scripts/tmp/smoke-auth-production.mjs
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

const BASE = process.env.SMOKE_BASE_URL || "https://www.jimvio.com";
const EMAIL = process.env.LIVE_E2E_EMAIL;
const PASSWORD = process.env.LIVE_E2E_PASSWORD;
const SLUG = process.env.SMOKE_COMMUNITY_SLUG || "jimvio-community";
const VENDOR = process.env.SMOKE_VENDOR_SLUG || "jimvio";
const PRODUCT =
  process.env.SMOKE_PRODUCT_SLUG ||
  "26-english-letter-pendant-letter-necklace-cjlx1979613";

if (!EMAIL || !PASSWORD) {
  console.error("LIVE_E2E_EMAIL / LIVE_E2E_PASSWORD required");
  process.exit(1);
}

/** @type {{module:string,name:string,status:string,detail:string}[]} */
const results = [];
function record(module, name, status, detail = "") {
  results.push({ module, name, status, detail });
  const icon = { PASS: "✓", FAIL: "✗", WARN: "!", BLOCKED: "○" }[status] || "?";
  console.log(`${icon} [${module}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function safe(module, name, fn) {
  try {
    await fn();
    record(module, name, "PASS");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    record(module, name, "FAIL", msg.slice(0, 280));
  }
}

async function main() {
  console.log(`\nAuthenticated production smoke → ${BASE}`);
  console.log(`Account: ${EMAIL} | Community: ${SLUG} | Role: owner\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ["camera", "microphone"],
  });
  const page = await context.newPage();
  page.setDefaultTimeout(40_000);

  await safe("Auth", "Login", async () => {
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await page.locator('input[name="email"]').fill(EMAIL);
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 90_000,
    });
  });

  await safe("Auth", "Session cookie present", async () => {
    const cookies = await context.cookies();
    if (!cookies.some((c) => c.name.includes("sb-") || c.name.includes("auth"))) {
      throw new Error("No supabase/auth cookie");
    }
  });

  // ── Community Feed ────────────────────────────────────────────────────────
  await safe("Community", "Open owned community", async () => {
    await page.goto(`${BASE}/communities/${SLUG}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    if (page.url().includes("/login")) throw new Error("Redirected to login");
  });

  await safe("Community", "Feed composer visible", async () => {
    const box = page.getByPlaceholder(/share something|ask a question/i);
    await box.first().waitFor({ state: "visible", timeout: 30_000 });
  });

  const stamp = `Smoke ${Date.now()}`;
  await safe("Community", "Create post", async () => {
    const box = page.getByPlaceholder(/share something|ask a question/i).first();
    await box.click();
    await box.fill(stamp);
    await page.locator("button").filter({ hasText: /^Post$/ }).last().click();
    await page.waitForTimeout(3000);
    if (!(await page.getByText(stamp).first().isVisible().catch(() => false))) {
      throw new Error("Created post text not visible");
    }
  });

  await safe("Community", "Like post", async () => {
    const card = page.locator("article, div").filter({ hasText: stamp }).first();
    await card.locator("button").first().click({ timeout: 15_000 });
    await page.waitForTimeout(1000);
  });

  await safe("Community", "Comment on post", async () => {
    const commentBtn = page.getByLabel(/comment on post/i).first();
    await commentBtn.click({ timeout: 15_000 });
    await page.waitForTimeout(600);
    const input = page.getByPlaceholder(/add a comment/i).first();
    await input.waitFor({ state: "visible", timeout: 15_000 });
    const ctext = `Comment ${Date.now()}`;
    await input.fill(ctext);
    await input.press("Enter");
    await page.getByText(ctext).first().waitFor({ state: "visible", timeout: 15_000 });
  });

  await safe("Community", "Reply to comment", async () => {
    const reply = page.getByRole("button", { name: /^reply$/i }).first();
    await reply.waitFor({ state: "visible", timeout: 15_000 });
    await reply.click();
    const input = page.getByPlaceholder(/write a reply/i).first();
    await input.fill(`Reply ${Date.now()}`);
    await input.press("Enter");
    await page.waitForTimeout(1500);
  });

  await safe("Community", "Poll creation", async () => {
    await page.getByRole("button", { name: /^poll$/i }).first().click();
    await page.getByPlaceholder("Option 1").fill("Alpha");
    await page.getByPlaceholder("Option 2").fill("Beta");
    await page.locator("button").filter({ hasText: /^Post$/ }).last().click();
    await page.waitForTimeout(3000);
  });

  await safe("Community", "Poll voting", async () => {
    const opt = page.getByRole("button", { name: /^alpha$/i }).or(page.getByText(/^alpha$/i));
    await opt.first().click({ timeout: 15_000 });
    await page.waitForTimeout(1000);
  });

  await safe("Community", "AI assist", async () => {
    const ai = page.getByLabel(/ai assist/i).first();
    await ai.waitFor({ state: "visible", timeout: 15_000 });
    const box = page.getByPlaceholder(/share something|ask a question/i).first();
    await box.fill("Write a short welcome post");
    await ai.click();
    await page.waitForTimeout(4000);
  });

  await safe("Community", "Notifications", async () => {
    await page.goto(`${BASE}/dashboard/notifications`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    if (page.url().includes("/login")) throw new Error("Notifications redirected to login");
  });

  // ── Chat ──────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/communities/${SLUG}/chat`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  await safe("Chat", "Join General Chat", async () => {
    await page.getByPlaceholder(/type a message/i).waitFor({ state: "visible", timeout: 30_000 });
  });

  const chatMsg = `Smoke chat ${Date.now()}`;
  await safe("Chat", "Send message", async () => {
    await page.getByPlaceholder(/type a message/i).fill(chatMsg);
    await page.getByLabel(/send message/i).click();
    await page.waitForTimeout(2000);
    if (!(await page.getByText(chatMsg).first().isVisible().catch(() => false))) {
      throw new Error("Sent message not visible");
    }
  });

  await safe("Chat", "Emoji picker", async () => {
    await page.getByLabel(/emoji picker/i).click();
    await page.waitForTimeout(800);
    const tab = page.getByRole("tab", { name: /emoji/i });
    if (!(await tab.first().isVisible().catch(() => false))) {
      throw new Error("Emoji panel missing");
    }
    await page.keyboard.press("Escape");
  });

  await safe("Chat", "GIF tab", async () => {
    await page.getByLabel(/emoji picker/i).click();
    await page.getByRole("tab", { name: /gifs?/i }).click();
    await page.getByPlaceholder(/search gifs/i).waitFor({ state: "visible" });
    await page.keyboard.press("Escape");
  });

  await safe("Chat", "Typing indicator plumbing", async () => {
    const composer = page.getByPlaceholder(/type a message/i);
    await composer.click();
    await composer.type("typing", { delay: 30 });
    await page.waitForTimeout(500);
    await composer.fill("");
  });

  {
    const body = await page.locator("body").innerText();
    if (/online|live|presence|member/i.test(body)) {
      record("Chat", "Presence / online affordance", "PASS");
    } else {
      record("Chat", "Presence / online affordance", "WARN", "No explicit presence copy");
    }
  }

  await safe("Chat", "Search messages", async () => {
    const searchBtn = page.getByLabel(/search messages/i);
    await searchBtn.waitFor({ state: "visible", timeout: 15_000 });
    await searchBtn.click();
    await page.getByPlaceholder(/search messages/i).waitFor({ state: "visible" });
    await page.getByPlaceholder(/search messages/i).fill("Smoke");
    await page.waitForTimeout(800);
  });

  await safe("Chat", "Pin message (owner)", async () => {
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(400);
    // Hover actions are opacity-0 until group-hover
    const bubble = page.locator(".group").filter({ hasText: chatMsg }).last();
    await bubble.hover();
    await page.waitForTimeout(300);
    await bubble.getByLabel(/more options/i).click({ force: true, timeout: 10_000 });
    await page.waitForTimeout(400);
    await page.getByText(/pin message/i).first().click({ timeout: 10_000 });
    await page.waitForTimeout(1500);
  });

  // ── Live ──────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/communities/${SLUG}/live`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  let sessionId = null;
  await safe("Live", "Create Live Session", async () => {
    const goLive = page.getByRole("button", { name: /^go live$/i }).first();
    if (await goLive.isVisible().catch(() => false)) {
      await goLive.click();
    }
    await page.getByRole("toolbar", { name: /live session controls/i }).waitFor({
      timeout: 60_000,
    });
    await page.waitForTimeout(3000);
    // Prefer URL after host redirect to /communities/live/[id]
    const m = page.url().match(/\/live\/([a-f0-9-]{8,})/i);
    if (m) sessionId = m[1];
    if (!sessionId) {
      const res = await page.request.get(`${BASE}/api/c/live/sessions`);
      if (res.ok()) {
        const json = await res.json();
        const sessions = json.sessions || [];
        if (Array.isArray(sessions) && sessions[0]?.id) sessionId = sessions[0].id;
      }
    }
  });

  await safe("Live", "Join Live (host in session)", async () => {
    await page.getByRole("toolbar", { name: /live session controls/i }).waitFor();
  });

  await safe("Live", "Viewer join", async () => {
    await page.waitForTimeout(2000);
    const m = page.url().match(/\/live\/([a-f0-9-]{8,})/i);
    if (m) sessionId = m[1];
    if (!sessionId) {
      const res = await page.request.get(`${BASE}/api/c/live/sessions`);
      const text = await res.text();
      const id = text.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
      sessionId = id?.[0] || null;
    }
    if (!sessionId) throw new Error("Could not resolve live session id for viewer");
    const viewerCtx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      storageState: await context.storageState(),
    });
    const vpage = await viewerCtx.newPage();
    await vpage.goto(`${BASE}/communities/live/${sessionId}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await vpage.waitForTimeout(6000);
    const ok =
      (await vpage
        .getByRole("toolbar", { name: /live session controls/i })
        .isVisible()
        .catch(() => false)) ||
      (await vpage.getByLabel(/live chat|live media|speakers on stage/i).first().isVisible().catch(() => false)) ||
      /live|watching|viewer|studio/i.test(await vpage.locator("body").innerText());
    await viewerCtx.close();
    if (!ok) throw new Error("Viewer live UI not visible");
  });

  await safe("Live", "Co-host invite control", async () => {
    await page.getByLabel(/^invite$/i).first().click();
    await page.waitForTimeout(800);
  });

  await safe("Live", "Poll creation", async () => {
    const poll = page.getByLabel(/^poll$/i).first();
    if (await poll.isVisible().catch(() => false)) {
      await poll.click();
    } else {
      // keyboard shortcut works in live mode
      await page.keyboard.press("p");
    }
    await page.waitForTimeout(2500);
  });

  {
    const opt = page.getByText(/EUR\/USD|GBP\/USD|XAU\/USD/);
    if (await opt.first().isVisible().catch(() => false)) {
      try {
        await opt.first().click();
        await page.waitForTimeout(800);
        record("Live", "Poll voting", "PASS");
      } catch (e) {
        record(
          "Live",
          "Poll voting",
          "FAIL",
          e instanceof Error ? e.message.slice(0, 200) : String(e)
        );
      }
    } else {
      record("Live", "Poll voting", "WARN", "Poll options not visible in UI yet");
    }
  }

  await safe("Live", "Chat during live", async () => {
    // Open chat panel if needed
    const chatTab = page.getByRole("tab", { name: /chat/i }).or(page.getByText(/^chat$/i));
    if (await chatTab.first().isVisible().catch(() => false)) {
      await chatTab.first().click();
      await page.waitForTimeout(500);
    }
    const input = page.getByPlaceholder(/message/i).first();
    await input.waitFor({ state: "visible", timeout: 20_000 });
    await input.fill(`Live smoke ${Date.now()}`);
    const send = page.getByLabel(/send message/i).first();
    if (await send.isVisible().catch(() => false)) await send.click();
    else await page.keyboard.press("Enter");
    await page.waitForTimeout(1500);
  });

  await safe("Live", "End session", async () => {
    await page.getByLabel(/end live session/i).click();
    await page.waitForTimeout(2000);
    const confirm = page.getByRole("button", { name: /confirm|yes|end/i });
    if (await confirm.first().isVisible().catch(() => false)) {
      await confirm.first().click();
      await page.waitForTimeout(1500);
    }
  });

  // ── Marketplace ───────────────────────────────────────────────────────────
  await safe("Marketplace", "Product page", async () => {
    const res = await page.goto(`${BASE}/marketplace/${PRODUCT}`, {
      waitUntil: "domcontentloaded",
    });
    if (res && res.status() >= 500) throw new Error(`HTTP ${res.status()}`);
    await page.waitForTimeout(2000);
    if (await page.locator("#__next_error__").count()) throw new Error("Next error");
  });

  await safe("Marketplace", "Vendor page", async () => {
    const res = await page.goto(`${BASE}/vendors/${VENDOR}`, {
      waitUntil: "domcontentloaded",
    });
    if (res && res.status() >= 500) throw new Error(`HTTP ${res.status()}`);
    await page.waitForTimeout(2000);
    if (page.url().includes("/login")) throw new Error("Vendor redirected to login");
  });

  await safe("Marketplace", "Checkout flow entry", async () => {
    await page.goto(`${BASE}/marketplace/${PRODUCT}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const add = page.getByRole("button", { name: /add to cart|buy now|get access/i }).first();
    await add.click();
    await page.waitForTimeout(2500);
    await page.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const checkout = page
      .getByRole("link", { name: /checkout/i })
      .or(page.getByRole("button", { name: /checkout|proceed/i }));
    if (await checkout.first().isVisible().catch(() => false)) {
      await checkout.first().click();
      await page.waitForTimeout(2000);
    } else {
      await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
    }
    if (page.url().includes("/login")) throw new Error("Checkout requires re-login");
  });

  await safe("Marketplace", "Orders", async () => {
    const res = await page.goto(`${BASE}/orders`, { waitUntil: "domcontentloaded" });
    if (res && res.status() >= 500) throw new Error(`HTTP ${res.status()}`);
    await page.waitForTimeout(2000);
    if (page.url().includes("/login")) throw new Error("Orders redirected to login");
  });

  await safe("Marketplace", "Seller analytics", async () => {
    const res = await page.goto(`${BASE}/dashboard/vendor/analytics`, {
      waitUntil: "domcontentloaded",
    });
    if (res && res.status() >= 500) throw new Error(`HTTP ${res.status()}`);
    await page.waitForTimeout(2500);
    if (page.url().includes("/login")) throw new Error("Analytics redirected to login");
  });

  await browser.close();

  const counts = { PASS: 0, FAIL: 0, WARN: 0, BLOCKED: 0 };
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
  console.log("\n════════════════════════════════════════");
  console.log("SMOKE SUMMARY", counts);
  console.log("════════════════════════════════════════\n");

  fs.writeFileSync(
    path.join(ROOT, "scripts/tmp/smoke-auth-results.json"),
    JSON.stringify(
      {
        base: BASE,
        email: EMAIL,
        slug: SLUG,
        role: "owner",
        browser: "Chromium (Playwright)",
        counts,
        results,
      },
      null,
      2
    )
  );

  if (counts.FAIL > 0) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
