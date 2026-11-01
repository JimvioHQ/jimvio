import type { MediaCategory, MediaStatus } from "@/lib/editorial/types";

export const INGEST_MODES = ["disabled", "discovery", "draft", "review", "auto"] as const;
export const SOURCE_KINDS = ["rss", "atom", "api", "announcement", "licensed", "educational", "image", "owned"] as const;
export const PERMITTED_USAGES = ["none", "link", "facts", "full"] as const;
export const IMAGE_RIGHTS = ["none", "attributed", "owned", "licensed"] as const;
export const SOURCE_HEALTH = ["unknown", "ok", "degraded", "failed"] as const;
export const ITEM_STATUSES = [
  "discovered",
  "duplicate",
  "filtered",
  "grouped",
  "drafted",
  "review",
  "published",
  "failed",
] as const;

export type IngestMode = (typeof INGEST_MODES)[number];
export type SourceKind = (typeof SOURCE_KINDS)[number];
export type PermittedUsage = (typeof PERMITTED_USAGES)[number];
export type ImageRights = (typeof IMAGE_RIGHTS)[number];
export type SourceHealth = (typeof SOURCE_HEALTH)[number];
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export type IngestSettings = {
  mode: IngestMode;
  emergencyStop: boolean;
  ownerAutopublishAuthorized: boolean;
  dailyPublishCap: number;
  maxItemsPerRun: number;
  retryLimit: number;
  staleDays: number;
  blockedCategories: string[];
};

/** Quality target. The desk publishes fewer when a cycle lacks credible stories. */
export const DAILY_PUBLISH_MIN = 5;
export const DAILY_PUBLISH_MAX = 5;

export function clampDailyPublishCap(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return DAILY_PUBLISH_MAX;
  return Math.min(DAILY_PUBLISH_MAX, Math.max(0, Math.floor(number)));
}

export const DEFAULT_INGEST_SETTINGS: IngestSettings = {
  mode: "draft",
  emergencyStop: false,
  ownerAutopublishAuthorized: false,
  dailyPublishCap: DAILY_PUBLISH_MAX,
  maxItemsPerRun: 20,
  retryLimit: 3,
  staleDays: 21,
  blockedCategories: [],
};

export type SourceRecord = {
  id: string;
  name: string;
  kind: SourceKind;
  locator: string;
  categories: MediaCategory[];
  language: string;
  region: string;
  permittedUsage: PermittedUsage;
  imageRights: ImageRights;
  pollMinutes: number;
  enabled: boolean;
  alwaysReview: boolean;
  health: SourceHealth;
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
  termsNote: string;
  rateNote: string;
  accessMethod: string;
  verifiedAt: string | null;
};

export type CatalogSource = Omit<SourceRecord, "id" | "health" | "lastSuccessAt" | "lastAttemptAt" | "lastError">;

export type FeedItem = {
  title: string;
  url: string;
  guid: string | null;
  publishedAt: string | null;
  summary: string;
  language: string | null;
  creator: string | null;
  imageUrl: string | null;
};

export type ExistingItemRef = {
  id: string;
  externalKey: string;
  fingerprint: string;
  articleId: string | null;
  url: string;
};

export type ExistingArticleRef = {
  id: string;
  title: string;
  sourceUrl: string | null;
};

export type PlannedItem = {
  id: string;
  externalKey: string;
  guid: string | null;
  title: string;
  url: string;
  summary: string;
  language: string | null;
  publishedAt: string | null;
  fingerprint: string;
  clusterKey: string | null;
  status: ItemStatus;
  filterReason: string | null;
  duplicateOf: string | null;
  sensitive: boolean;
  evidence: string;
  imageStatus: "unchecked" | "rejected" | "verified" | "fallback";
  imageNote: string | null;
  article: null | {
    intent: MediaStatus;
    idempotencyKey: string;
    title: string;
    excerpt: string;
    bodyHtml: string;
    category: MediaCategory;
    tags: string;
    seoTitle: string;
    seoDescription: string;
    sourceName: string;
    sourceUrl: string;
    imageUrl: string;
    imageAlt: string;
    imageCaption: string;
    imageLicense: string;
  };
};

export type CycleCounts = {
  sources: number;
  fetched: number;
  discovered: number;
  duplicates: number;
  filtered: number;
  grouped: number;
  drafted: number;
  review: number;
  published: number;
  failed: number;
};
