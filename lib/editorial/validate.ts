import {
  MEDIA_CATEGORIES,
  MEDIA_SECTIONS,
  MEDIA_STATUSES,
  type ArticleInput,
  type FieldErrors,
  type MediaCategory,
  type MediaSection,
  type MediaStatus,
} from "@/lib/editorial/types";

const CATEGORY_SET = new Set<string>(MEDIA_CATEGORIES.map((item) => item.slug));
const SECTION_SET = new Set<string>(MEDIA_SECTIONS);
const STATUS_SET = new Set<string>(MEDIA_STATUSES);

export const EDITORIAL_BYLINE = "Jimvio Editorial Team";

const BANNED_BYLINES = [
  /jimvio\s+staff/i,
  /staff\s+writer/i,
  /^jimvio$/i,
  /^admin$/i,
  /^editor$/i,
];

const TRANSITIONS: Record<MediaStatus, readonly MediaStatus[]> = {
  draft: ["draft", "review", "scheduled", "published", "archived"],
  review: ["draft", "review", "scheduled", "published", "archived"],
  scheduled: ["draft", "review", "scheduled", "published", "archived"],
  published: ["draft", "published", "archived"],
  archived: ["draft", "archived"],
};

export function isMediaCategory(value: string): value is MediaCategory {
  return CATEGORY_SET.has(value);
}

export function isMediaSection(value: string): value is MediaSection {
  return SECTION_SET.has(value);
}

export function isMediaStatus(value: string): value is MediaStatus {
  return STATUS_SET.has(value);
}

export function categoryLabel(slug: string): string {
  return MEDIA_CATEGORIES.find((item) => item.slug === slug)?.label ?? slug;
}

/** One category key for manual publishing, ingestion, and public listings. */
export function resolveMediaCategory(value: string | null | undefined): MediaCategory | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (isMediaCategory(raw)) return raw;
  const match = MEDIA_CATEGORIES.find((item) => item.label.toLowerCase() === raw);
  return match ? match.slug : null;
}

export function slugifyTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 80;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isArticleId(value: string): boolean {
  return UUID_RE.test(value);
}

export function isBannedByline(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  return BANNED_BYLINES.some((pattern) => pattern.test(trimmed));
}

export function publicAuthorName(_name: string | null | undefined): string {
  return EDITORIAL_BYLINE;
}

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host === "::1" || host === "0.0.0.0") return true;
  const match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const parts = match.slice(1).map((part) => Number(part));
  if (parts.some((part) => part > 255)) return true;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export function isSafeImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2000) return false;
  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//") || trimmed.includes("..") || trimmed.includes("\\")) return false;
    return /^\/(?:editorial|images)\/[a-z0-9][a-z0-9._/-]*\.(?:jpg|jpeg|png|webp|gif)$/i.test(trimmed);
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (isPrivateHostname(url.hostname)) return false;
  if (url.pathname.toLowerCase().endsWith(".svg")) return false;
  return true;
}

export function isSafeHref(value: string): boolean {
  const href = value.trim();
  if (!href || href.length > 2000) return false;
  if (href.startsWith("/")) return !href.startsWith("//") && !href.includes("\\");
  try {
    const url = new URL(href);
    return url.protocol === "https:" && !url.username && !url.password && !isPrivateHostname(url.hostname);
  } catch {
    return false;
  }
}

export function parseTags(value: string): { tags: string[]; error?: string } {
  const tags = value
    .split(",")
    .map((tag) => tag.trim().toLowerCase().replace(/\s+/g, "-"))
    .filter(Boolean);
  const unique = [...new Set(tags)];
  if (unique.length > 24) return { tags: [], error: "Use 24 tags or fewer." };
  for (const tag of unique) {
    if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(tag)) {
      return { tags: [], error: "Tags use letters, numbers, and hyphens." };
    }
  }
  return { tags: unique };
}

export function plainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function canTransition(from: MediaStatus, to: MediaStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export type VisibilityFields = {
  status: string;
  publishedAt: string | null;
  scheduledAt: string | null;
};

export function isPubliclyVisible(article: VisibilityFields, now: Date): boolean {
  const nowMs = now.getTime();
  if (article.status === "published") {
    if (!article.publishedAt) return true;
    const published = new Date(article.publishedAt).getTime();
    return Number.isFinite(published) && published <= nowMs;
  }
  if (article.status === "scheduled") {
    if (!article.scheduledAt) return false;
    const scheduled = new Date(article.scheduledAt).getTime();
    return Number.isFinite(scheduled) && scheduled <= nowMs;
  }
  return false;
}

export function shouldUseFixtures(
  realCount: number,
  env: { nodeEnv?: string; mediaFixtures?: string },
): boolean {
  if (realCount > 0) return false;
  if (env.mediaFixtures === "0") return false;
  return (env.nodeEnv ?? "production") !== "production";
}

export function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&").slice(0, 80);
}

export function kickerFor(category: MediaCategory, kicker: string): string {
  const custom = kicker.trim();
  return (custom || categoryLabel(category)).slice(0, 32);
}

const MIN_PUBLISH_WORDS = 900;

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function validateArticle(
  input: ArticleInput,
  intent: MediaStatus,
  now = new Date(),
): { errors: FieldErrors; scheduledAt: string | null } {
  const errors: FieldErrors = {};
  const title = input.title.trim();
  const excerpt = input.excerpt.trim();
  if (title.length < 4 || title.length > 180) {
    errors.title = "Enter a title between 4 and 180 characters.";
  }
  if (!isMediaCategory(input.category)) errors.category = "Choose a category.";
  if (!isMediaSection(input.section)) errors.section = "Choose a homepage section.";

  const author = input.authorName.trim();
  if (author && author.length > 80) errors.authorName = "Byline must be 80 characters or fewer.";

  const image = input.imageUrl.trim();
  if (image && !isSafeImageUrl(image)) {
    errors.imageUrl = "Use an https image or an uploaded editorial image.";
  }
  if (input.imageAlt.trim().length > 180) errors.imageAlt = "Alt text must be 180 characters or fewer.";

  const tags = parseTags(input.tags);
  if (tags.error) errors.tags = tags.error;

  const seoTitle = input.seoTitle.trim();
  const seoDescription = input.seoDescription.trim();
  if (seoTitle.length > 70) errors.seoTitle = "SEO title must be 70 characters or fewer.";
  if (seoDescription.length > 160) errors.seoDescription = "SEO description must be 160 characters or fewer.";

  const sourceName = input.sourceName?.trim() ?? "";
  const sourceUrl = input.sourceUrl?.trim() ?? "";
  const correction = input.correctionNote?.trim() ?? "";
  if (sourceName.length > 120) errors.sourceName = "Source name must be 120 characters or fewer.";
  if (correction.length > 500) errors.correctionNote = "The update note must be 500 characters or fewer.";
  if (intent === "published" || intent === "scheduled") {
    if (!sourceName) errors.sourceName = "Add the primary source or reporting reference before publication.";
    if (!sourceUrl) errors.sourceUrl = "Add a verified source link before publication.";
  }
  if (sourceUrl && (!sourceUrl.startsWith("https://") || !isSafeHref(sourceUrl) || sourceUrl.length > 500)) {
    errors.sourceUrl = "Use an https source link, or leave it blank.";
  }

  let scheduledAt: string | null = null;
  if (input.scheduledAt.trim()) {
    const parsed = new Date(input.scheduledAt);
    if (Number.isNaN(parsed.getTime())) errors.scheduledAt = "Enter a valid schedule time.";
    else scheduledAt = parsed.toISOString();
  }

  if (intent === "scheduled") {
    if (!scheduledAt) errors.scheduledAt = "Choose a time in the future.";
    else if (new Date(scheduledAt).getTime() < now.getTime() + 60_000) {
      errors.scheduledAt = "Schedule at least a minute from now.";
    }
  }

  if (intent === "published" || intent === "scheduled") {
    if (excerpt.length < 12 || excerpt.length > 500) {
      errors.excerpt = "Add an excerpt between 12 and 500 characters before publishing.";
    }
    if (countWords(plainText(input.bodyHtml)) < MIN_PUBLISH_WORDS) {
      errors.bodyHtml = "Write a researched article of at least 900 words before publication.";
    }
    if (!image) errors.imageUrl = "Add a featured image before publishing.";
  } else if (excerpt.length > 500) {
    errors.excerpt = "Excerpt must be 500 characters or fewer.";
  }

  return { errors, scheduledAt };
}

export function displayKicker(article: { category: string; kicker?: string }): string {
  return categoryLabel(article.category).toUpperCase();
}

export const KICKER_COLORS: Record<string, string> = {
  rwanda: "#fd5000",
  business: "#fd5000",
  technology: "#2563eb",
  education: "#16a34a",
  politics: "#2563eb",
  health: "#0f9d8a",
  feature: "#fd5000",
  analysis: "#e11d48",
  environment: "#16a34a",
  guide: "#16a34a",
  news: "#fd5000",
  blog: "#7c3aed",
  magazine: "#fd5000",
  guides: "#16a34a",
  reviews: "#d97706",
  opinion: "#4f46e5",
  lifestyle: "#db2777",
};

export function kickerColor(kicker: string): string {
  return KICKER_COLORS[kicker.trim().toLowerCase()] ?? "#fd5000";
}

export const PUBLIC_PAGE_SIZE = 12;
export const ADMIN_PAGE_SIZE = 20;

export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number(raw);
  if (!Number.isInteger(page) || page < 1) return 1;
  return Math.min(page, 500);
}

export function paginate<T>(items: readonly T[], page: number, size: number) {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, page), pages);
  const start = (current - 1) * size;
  const slice = items.slice(start, start + size);
  return {
    items: slice,
    page: current,
    pages,
    total,
    from: total === 0 ? 0 : start + 1,
    to: start + slice.length,
  };
}
