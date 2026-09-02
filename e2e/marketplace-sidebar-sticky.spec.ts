import { expect, test } from "@playwright/test";

test.describe("Marketplace left sidebar sticky", () => {
  test("desktop sidebar stays in viewport while main content scrolls", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/marketplace", { waitUntil: "domcontentloaded" });

    const sidebar = page.locator("[data-marketplace-sidebar]");
    await expect(sidebar).toBeVisible({ timeout: 30_000 });

    const before = await sidebar.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        top: rect.top,
        left: rect.left,
        stickyTop: Number.parseFloat(cs.top) || 0,
      };
    });

    expect(before.top).toBeGreaterThan(60);
    expect(before.left).toBeGreaterThanOrEqual(0);

    await page.evaluate(() => {
      document.documentElement.scrollTo({ top: 1600, behavior: "instant" });
      window.scrollTo({ top: 1600, behavior: "instant" });
    });
    await page.waitForTimeout(250);

    const after = await sidebar.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { top: rect.top, left: rect.left };
    });
    const scrollY = await page.evaluate(
      () => window.scrollY || document.documentElement.scrollTop,
    );

    expect(scrollY).toBeGreaterThan(400);
    expect(after.top).toBeGreaterThan(60);
    expect(Math.abs(after.top - before.stickyTop)).toBeLessThan(8);
    expect(Math.abs(after.left - before.left)).toBeLessThan(2);

    const nearEnd = await page.evaluate(() => {
      const main = document.getElementById("main-content");
      const mainBottom = main?.getBoundingClientRect().bottom ?? 0;
      const y = window.scrollY + mainBottom - window.innerHeight - 80;
      document.documentElement.scrollTo({ top: Math.max(0, y), behavior: "instant" });
      window.scrollTo({ top: Math.max(0, y), behavior: "instant" });
      return window.scrollY || document.documentElement.scrollTop;
    });
    await page.waitForTimeout(250);

    expect(nearEnd).toBeGreaterThan(400);
    expect(await sidebar.isVisible()).toBe(true);
    const nearFooter = await sidebar.evaluate((el) => el.getBoundingClientRect().top);
    expect(nearFooter).toBeGreaterThan(40);
  });

  test("mobile keeps the sidebar out of the document flow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/marketplace", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-marketplace-sidebar]")).toBeHidden();
  });

  test("tablet below lg keeps the collapsed marketplace layout", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/marketplace", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-marketplace-sidebar]")).toBeHidden();
  });
});
