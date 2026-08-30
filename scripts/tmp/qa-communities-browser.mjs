/**
 * Standalone Communities browser QA.
 * NOT named verify-*.mjs — do not auto-pick in npm test.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 node scripts/tmp/qa-communities-browser.mjs
 *   BASE_URL=https://www.jimvio.com node scripts/tmp/qa-communities-browser.mjs
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const ROUTES = [
  "/communities",
  "/communities/explore",
  "/communities/news-desk",
  "/communities/entertainment-circle",
  "/communities/sports-room",
  "/communities/faith-and-inspiration",
  "/communities/news-desk/feed",
];
const VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1280", width: 1280, height: 800 },
  { name: "desktop-1024", width: 1024, height: 768 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-375", width: 375, height: 812 },
];
const THEMES = ["light", "dark"];

const EDITORIAL = [
  "News Desk",
  "Entertainment Circle",
  "Sports Room",
  "Faith & Inspiration",
];
const PRESERVED = ["forex-hub", "gcs-unity"];

function overflowReport(metrics) {
  const dx = metrics.scrollWidth - metrics.clientWidth;
  return {
    overflowX: dx > 2,
    extraPx: Math.max(0, dx),
  };
}

async function setTheme(page, theme) {
  await page.evaluate((mode) => {
    const root = document.documentElement;
    if (mode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    root.style.colorScheme = mode;
    try {
      localStorage.setItem("theme", mode);
    } catch {
      /* ignore */
    }
  }, theme);
}

async function pageMetrics(page) {
  return page.evaluate(() => {
    const el = document.documentElement;
    const headings = Array.from(document.querySelectorAll("h1, h2")).map((n) =>
      (n.textContent || "").trim().slice(0, 80)
    );
    const focusable = document.querySelectorAll(
      "a[href], button, input, textarea, select, [tabindex]:not([tabindex='-1'])"
    );
    const unlabeled = Array.from(
      document.querySelectorAll("button:not([aria-label]):not([title])")
    ).filter((btn) => !(btn.textContent || "").trim()).length;
    return {
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      title: document.title,
      headings,
      focusable: focusable.length,
      unlabeledIconButtons: unlabeled,
      hasTablist: Boolean(document.querySelector('[role="tablist"]')),
      hasAriaCurrent: Boolean(document.querySelector("[aria-current]")),
      bodyText: (document.body?.innerText || "").slice(0, 4000),
    };
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  const failures = [];

  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        colorScheme: theme,
      });
      const page = await context.newPage();
      page.setDefaultTimeout(25_000);

      for (const route of ROUTES) {
        const url = `${BASE}${route}`;
        const entry = {
          url,
          theme,
          viewport: vp.name,
          status: null,
          overflowX: null,
          extraPx: null,
          headings: [],
          notes: [],
        };
        try {
          const res = await page.goto(url, { waitUntil: "domcontentloaded" });
          entry.status = res?.status() ?? null;
          await setTheme(page, theme);
          await page.waitForTimeout(700);
          const metrics = await pageMetrics(page);
          const overflow = overflowReport(metrics);
          entry.overflowX = overflow.overflowX;
          entry.extraPx = overflow.extraPx;
          entry.headings = metrics.headings.slice(0, 8);
          if (entry.status && entry.status >= 400) {
            entry.notes.push(`HTTP ${entry.status}`);
            failures.push(entry);
          }
          if (overflow.overflowX) {
            entry.notes.push(`horizontal overflow ${overflow.extraPx}px`);
            failures.push(entry);
          }
          if (route === "/communities/explore") {
            const missing = EDITORIAL.filter((name) => !metrics.bodyText.includes(name));
            if (missing.length) {
              entry.notes.push(`explore missing: ${missing.join(", ")}`);
              failures.push(entry);
            }
            for (const slug of PRESERVED) {
              const present =
                metrics.bodyText.toLowerCase().includes(slug.replace("-", " ")) ||
                (await page.locator(`a[href*="${slug}"]`).count()) > 0;
              if (!present) {
                entry.notes.push(`preserved community not linked: ${slug}`);
                failures.push(entry);
              }
            }
          }
          if (route.endsWith("/feed") || route.includes("news-desk")) {
            const promo = await page.locator("text=From Jimvio").count();
            entry.notes.push(`From Jimvio count=${promo}`);
          }
          results.push(entry);
        } catch (err) {
          entry.notes.push(err instanceof Error ? err.message : String(err));
          failures.push(entry);
          results.push(entry);
        }
      }

      // Keyboard sample on Explore at this viewport/theme
      try {
        await page.goto(`${BASE}/communities/explore`, {
          waitUntil: "domcontentloaded",
        });
        await setTheme(page, theme);
        await page.waitForTimeout(400);
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        const focused = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el) return null;
          const style = getComputedStyle(el);
          return {
            tag: el.tagName,
            outline: style.outlineStyle,
            boxShadow: style.boxShadow,
            label:
              el.getAttribute("aria-label") ||
              (el.textContent || "").trim().slice(0, 40),
          };
        });
        results.push({
          url: `${BASE}/communities/explore#keyboard`,
          theme,
          viewport: vp.name,
          status: 200,
          overflowX: false,
          extraPx: 0,
          headings: [],
          notes: [
            focused
              ? `focus ${focused.tag} "${focused.label}" outline=${focused.outline}`
              : "no focus after Tab",
          ],
        });
      } catch (err) {
        failures.push({
          url: `${BASE}/communities/explore#keyboard`,
          theme,
          viewport: vp.name,
          notes: [err instanceof Error ? err.message : String(err)],
        });
      }

      await context.close();
    }
  }

  await browser.close();

  const outDir = path.join(process.cwd(), "scripts/tmp");
  const outFile = path.join(outDir, "qa-communities-browser-results.json");
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        base: BASE,
        at: new Date().toISOString(),
        failures: failures.length,
        results,
      },
      null,
      2
    )
  );

  const overflowFails = failures.filter((f) =>
    (f.notes || []).some((n) => String(n).includes("overflow"))
  );
  const httpFails = failures.filter((f) =>
    (f.notes || []).some((n) => String(n).startsWith("HTTP"))
  );
  console.log(
    `qa-communities-browser: ${results.length} checks, ${failures.length} issues (${overflowFails.length} overflow, ${httpFails.length} http)`
  );
  console.log(`wrote ${outFile}`);
  if (failures.length) {
    for (const f of failures.slice(0, 20)) {
      console.log(`- ${f.theme} ${f.viewport} ${f.url}: ${(f.notes || []).join("; ")}`);
    }
  }
  process.exit(failures.length ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
