/** Jimvio UGC workspace design tokens — flagship reference */
export const UGC = {
  primary: "#FF5A1F",
  primaryHover: "#E54E18",
  ink: "#111827",
  white: "#FFFFFF",
  bg: "#F8FAFC",
  radius: "22px",
  radiusMd: "16px",
  radiusSm: "12px",
  border: "#E8EAED",
  muted: "#6B7280",
  surface: "#F5F6F8",
  verified: "#1D9BF0",
  payout: "#059669",
  payoutBg: "#ECFDF5",
} as const;

export type ContentTypeFilter = "all" | "clipping" | "ugc";
export type PlatformKey =
  | "all"
  | "tiktok"
  | "instagram"
  | "youtube"
  | "x";

export type SortKey = "newest" | "budget" | "payout" | "popular";

export const CONTENT_TYPES: { value: ContentTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "clipping", label: "Clipping" },
  { value: "ugc", label: "UGC" },
];

/** Reference filter row — supported UGC submit platforms only */
export const PLATFORM_FILTERS: { key: PlatformKey; label: string }[] = [
  { key: "youtube", label: "YouTube" },
  { key: "tiktok", label: "TikTok" },
  { key: "instagram", label: "Instagram" },
  { key: "x", label: "X" },
];

export const PLATFORMS: { key: PlatformKey; label: string; apiKey?: string }[] = [
  { key: "tiktok", label: "TikTok", apiKey: "tiktok" },
  { key: "instagram", label: "Instagram", apiKey: "instagram" },
  { key: "youtube", label: "YouTube", apiKey: "youtube" },
  { key: "x", label: "X", apiKey: "x" },
];

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "budget", label: "Highest budget" },
  { value: "payout", label: "Highest payout" },
  { value: "popular", label: "Most creators" },
];
