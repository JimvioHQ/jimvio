/**
 * Measured public UGC viewport QA. Does not claim VoiceOver/NVDA.
 * Usage: node scripts/tmp/measure-ugc-viewports.mjs
 */
import { chromium } from "@playwright/test";

const BASE = process.env.UGC_VIEWPORT_BASE || "https://www.jimvio.com";
const WIDTHS = [375, 390, 768, 1024, 1280, 1440];
const PATHS = process.env.UGC_VIEWPORT_PATHS
  ? process.env.UGC_VIEWPORT_PATHS.split(",").map((p) => p.trim()).filter(Boolean)
  : ["/ugc"];

function overflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollW = Math.max(doc.scrollWidth, body?.scrollWidth ?? 0);
    const clientW = doc.clientWidth;
    return {
      scrollWidth: scrollW,
      clientWidth: clientW,
      overflowPx: Math.max(0, scrollW - clientW),
      title: document.title,
    };
  });
}

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const width of WIDTHS) {
    const page = await browser.newPage({
      viewport: { width, height: 844 },
    });
    for (const path of PATHS) {
      const url = `${BASE}${path}`;
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(1200);
      const metrics = await overflow(page);
      const status = res?.status() ?? 0;
      results.push({ width, path, status, ...metrics });
      if (metrics.overflowPx > 8) {
        console.error(
          `OVERFLOW ${width}px ${path} +${metrics.overflowPx}px (scroll=${metrics.scrollWidth} client=${metrics.clientWidth})`,
        );
      } else {
        console.log(
          `ok ${width}px ${path} status=${status} overflow=${metrics.overflowPx}px title=${JSON.stringify(metrics.title)}`,
        );
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => r.overflowPx > 8 || r.status >= 400);
if (failed.length) {
  console.error("measure-ugc-viewports: FAIL", JSON.stringify(failed, null, 2));
  process.exit(1);
}
console.log("measure-ugc-viewports: ok", results.length, "checks");
