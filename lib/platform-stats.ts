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

function formatCompactK(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

/** Format a stat value for display. */
export function formatPlatformStat(key: PlatformStatKey, value: number): string {
  switch (key) {
    case "countries":
    case "users":
      return value.toLocaleString("en-US");
    case "businesses":
    case "products":
      return formatCompactK(value);
  }
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

/** Launch snapshot for server-rendered copy. */
export function getPlatformStatsLaunchSnapshot(): PlatformStatsSnapshot {
  return { ...PLATFORM_STATS };
}
