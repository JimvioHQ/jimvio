import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  DEMO_STATS_DAILY_RANGE,
  DEMO_STATS_LABEL,
  DEMO_STATS_START,
  demoDailyIncrement,
  formatDemoStatLine,
  getDemoPlatformStats,
} from "./demo-platform-stats.ts";

const anchor = new Date("2026-10-09T12:00:00.000Z");
const nextDay = new Date("2026-10-10T00:30:00.000Z");

describe("demo platform stats", () => {
  it("starts at the configured values on the anchor day", () => {
    const stats = getDemoPlatformStats(anchor);
    assert.deepEqual(stats, {
      users: 18211,
      businesses: 23412,
      products: 1134112,
      countries: 195,
    });
  });

  it("formats labels without compact abbreviations", () => {
    const stats = getDemoPlatformStats(anchor);
    assert.equal(formatDemoStatLine("users", stats.users), "18,211 Users");
    assert.equal(formatDemoStatLine("businesses", stats.businesses), "23,412 Businesses");
    assert.equal(formatDemoStatLine("products", stats.products), "1,134,112 Products");
    assert.equal(formatDemoStatLine("countries", stats.countries), "195 Countries");
    assert.equal(DEMO_STATS_LABEL, "Illustrative platform figures");
  });

  it("uses the same figures for repeated reads on one day", () => {
    const morning = getDemoPlatformStats(new Date("2026-10-12T01:00:00.000Z"));
    const evening = getDemoPlatformStats(new Date("2026-10-12T22:00:00.000Z"));
    assert.deepEqual(morning, evening);
  });

  it("advances once on the next UTC day and keeps countries fixed", () => {
    const start = getDemoPlatformStats(anchor);
    const later = getDemoPlatformStats(nextDay);
    const userDelta = later.users - start.users;
    const businessDelta = later.businesses - start.businesses;
    const productDelta = later.products - start.products;
    assert.ok(userDelta >= DEMO_STATS_DAILY_RANGE.users.min && userDelta <= DEMO_STATS_DAILY_RANGE.users.max);
    assert.ok(
      businessDelta >= DEMO_STATS_DAILY_RANGE.businesses.min &&
        businessDelta <= DEMO_STATS_DAILY_RANGE.businesses.max,
    );
    assert.ok(
      productDelta >= DEMO_STATS_DAILY_RANGE.products.min &&
        productDelta <= DEMO_STATS_DAILY_RANGE.products.max,
    );
    assert.equal(later.countries, 195);
    assert.equal(demoDailyIncrement(1, "users"), userDelta);
  });

  it("does not change the live platform stats service", () => {
    const source = readFileSync(new URL("../services/platform.ts", import.meta.url), "utf8");
    assert.match(source, /export const getPlatformStats = unstable_cache\(fetchPlatformStats/);
    assert.equal(source.includes("DEMO_STATS_START"), false);
    assert.equal(DEMO_STATS_START.countries, 195);
  });
});
