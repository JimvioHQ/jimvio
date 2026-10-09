/**
 * Public illustrative platform figures.
 *
 * These numbers are not live database counts. They start at a fixed anchor
 * and grow by a deterministic daily amount. They must not be written back
 * to users, businesses, products, or analytics.
 *
 * Anchor day (UTC) shows the starting values exactly. Each later UTC day
 * adds one stable increment per metric. Countries never change.
 */
export const DEMO_STATS_ANCHOR_UTC = "2026-10-09";

export const DEMO_STATS_LABEL = "Illustrative platform figures";

export const DEMO_STATS_START = {
  users: 18_211,
  businesses: 23_412,
  products: 1_134_112,
  countries: 195,
} as const;

export const DEMO_STATS_DAILY_RANGE = {
  users: { min: 7, max: 10 },
  businesses: { min: 4, max: 8 },
  products: { min: 10, max: 20 },
} as const;

export type DemoStatKey = keyof typeof DEMO_STATS_START;

export type DemoPlatformStats = {
  users: number;
  businesses: number;
  products: number;
  countries: number;
};

const ANCHOR_UTC_MS = Date.UTC(2026, 9, 9);

function utcDayIndex(now: Date): number {
  const day = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((day - ANCHOR_UTC_MS) / 86_400_000);
}

/** Stable integer in [min, max] for a metric on a given day index. Not Math.random. */
export function demoDailyIncrement(
  dayIndex: number,
  key: keyof typeof DEMO_STATS_DAILY_RANGE,
): number {
  const { min, max } = DEMO_STATS_DAILY_RANGE[key];
  let hash = 2_166_136_261;
  const seed = `${DEMO_STATS_ANCHOR_UTC}:${key}:${dayIndex}`;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 1_677_761_9);
  }
  const span = max - min + 1;
  return min + ((hash >>> 0) % span);
}

export function getDemoPlatformStats(now: Date = new Date()): DemoPlatformStats {
  const days = Math.max(0, utcDayIndex(now));
  let users = DEMO_STATS_START.users;
  let businesses = DEMO_STATS_START.businesses;
  let products = DEMO_STATS_START.products;
  for (let day = 1; day <= days; day += 1) {
    users += demoDailyIncrement(day, "users");
    businesses += demoDailyIncrement(day, "businesses");
    products += demoDailyIncrement(day, "products");
  }
  return {
    users,
    businesses,
    products,
    countries: DEMO_STATS_START.countries,
  };
}

export function formatDemoStat(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatDemoStatLine(key: DemoStatKey, value: number): string {
  const label =
    key === "users"
      ? "Users"
      : key === "businesses"
        ? "Businesses"
        : key === "products"
          ? "Products"
          : "Countries";
  return `${formatDemoStat(value)} ${label}`;
}
