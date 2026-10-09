import { getDemoPlatformStats } from "@/lib/demo-platform-stats";

export const PLATFORM_STATS = {
  countries: 195,
  users: 17238,
  businesses: 85000,
  products: 126000,
} as const;

export type PlatformStatKey = keyof typeof PLATFORM_STATS;

export type PlatformStatsSnapshot = {
  [K in PlatformStatKey]: number;
};

export const PLATFORM_STAT_META: Record<
  PlatformStatKey,
  { label: string; emoji: string }
> = {
  countries: { label: "Countries", emoji: "🌍" },
  users: { label: "Users", emoji: "👥" },
  businesses: { label: "Businesses", emoji: "🏪" },
  products: { label: "Products", emoji: "📦" },
};

export const PLATFORM_STAT_KEYS: PlatformStatKey[] = [
  "countries",
  "users",
  "businesses",
  "products",
];

/** Format a public stat with thousands separators. Not a compact K abbreviation. */
export function formatPlatformStat(_key: PlatformStatKey, value: number): string {
  return value.toLocaleString("en-US");
}

export function getPlatformStatLabel(key: PlatformStatKey): string {
  return PLATFORM_STAT_META[key].label;
}

export function getPlatformStatDisplay(
  key: PlatformStatKey,
  value: number,
): string {
  return `${formatPlatformStat(key, value)} ${PLATFORM_STAT_META[key].label}`;
}

export function getPlatformStatEmojiDisplay(
  key: PlatformStatKey,
  value: number,
): string {
  return `${PLATFORM_STAT_META[key].emoji} ${getPlatformStatDisplay(key, value)}`;
}

/**
 * Public illustrative snapshot. Not the live database totals from getPlatformStats.
 * Same value for every caller on the same UTC day.
 */
export function getPlatformStatsLaunchSnapshot(): PlatformStatsSnapshot {
  return getDemoPlatformStats();
}
