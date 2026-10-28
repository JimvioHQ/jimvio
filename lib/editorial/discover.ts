import type { MediaCategory, MediaStatus, PublicArticle } from "@/lib/editorial/types";
import { MEDIA_CATEGORIES, MEDIA_STATUSES } from "@/lib/editorial/types";
import { isEditorialMarkUrl } from "@/lib/editorial/image-display";
import { categoryLabel, isSafeHref, isSafeImageUrl, plainText } from "@/lib/editorial/validate";

export const READING_WORDS_PER_MINUTE = 200;

export function readingMinutes(html: string): number {
  const words = plainText(html).split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  return Math.max(1, Math.round(words.length / READING_WORDS_PER_MINUTE));
}

export function metaDescription(
  seo: string | null | undefined,
  excerpt: string | null | undefined,
): string | undefined {
  const preferred = (seo ?? "").replace(/\s+/g, " ").trim();
  const fallback = (excerpt ?? "").replace(/\s+/g, " ").trim();
  const value = preferred || fallback;
  if (!value) return undefined;
  if (value.length <= 160) return value;
  const slice = value.slice(0, 160);
  const space = slice.lastIndexOf(" ");
  const cut = (space >= 80 ? slice.slice(0, space) : slice).trim();
  return cut || undefined;
}

export function mediaTitle(title: string): string | { absolute: string } {
  const clean = title.replace(/\s+/g, " ").trim();
  if (/jimvio media/i.test(clean)) return { absolute: clean };
  return clean;
}

export function absoluteImageUrl(site: string, value: string | null | undefined): string | null {
  if (!value || !isSafeImageUrl(value) || isEditorialMarkUrl(value)) return null;
  const trimmed = value.trim();
  const origin = site.replace(/\/$/, "");
  if (trimmed.startsWith("/")) return `${origin}${trimmed}`;
  return trimmed;
}

export function showUpdated(
  publishedAt: string | null | undefined,
  updatedAt: string | null | undefined,
): boolean {
  if (!publishedAt || !updatedAt) return false;
  const published = Date.parse(publishedAt);
  const updated = Date.parse(updatedAt);
  if (!Number.isFinite(published) || !Number.isFinite(updated)) return false;
  return updated - published > 60_000;
}

export function articleLastModified(article: {
  updatedAt?: string | null;
  publishedAt?: string | null;
}): Date | undefined {
  for (const candidate of [article.updatedAt, article.publishedAt]) {
    if (!candidate) continue;
    const time = Date.parse(candidate);
    if (Number.isFinite(time)) return new Date(time);
  }
  return undefined;
}

export function relatedArticles(
  articles: readonly PublicArticle[],
  current: PublicArticle,
  limit = 3,
): PublicArticle[] {
  const tags = new Set(current.tags.map((tag) => tag.toLowerCase()));
  return articles
    .filter((item) => item.id !== current.id)
    .map((item) => {
      const shared = item.tags.reduce((count, tag) => count + (tags.has(tag.toLowerCase()) ? 1 : 0), 0);
      const sameCategory = item.category === current.category ? 1 : 0;
      const published = Date.parse(item.publishedAt ?? "");
      return {
        item,
        score: shared * 3 + sameCategory,
        published: Number.isFinite(published) ? published : 0,
      };
    })
    .filter((row) => row.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || b.published - a.published || a.item.slug.localeCompare(b.item.slug),
    )
    .slice(0, limit)
    .map((row) => row.item);
}

export function neighborArticles(
  articles: readonly PublicArticle[],
  current: PublicArticle,
): { previous: PublicArticle | null; next: PublicArticle | null } {
  if (!current.publishedAt || !Number.isFinite(Date.parse(current.publishedAt))) {
    return { previous: null, next: null };
  }
  const ordered = articles
    .filter(
      (item) =>
        item.category === current.category &&
        Boolean(item.publishedAt) &&
        Number.isFinite(Date.parse(item.publishedAt ?? "")),
    )
    .sort((a, b) => {
      const diff = Date.parse(a.publishedAt ?? "") - Date.parse(b.publishedAt ?? "");
      if (diff !== 0) return diff;
      return a.slug.localeCompare(b.slug);
    });
  const index = ordered.findIndex((item) => item.id === current.id);
  if (index < 0) return { previous: null, next: null };
  return {
    previous: index > 0 ? ordered[index - 1] : null,
    next: index < ordered.length - 1 ? ordered[index + 1] : null,
  };
}

export function breadcrumbJsonLd(
  site: string,
  items: readonly { name: string; path: string }[],
): Record<string, unknown> {
  const origin = site.replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${origin}${item.path.startsWith("/") ? item.path : `/${item.path}`}`,
    })),
  };
}

export function mediaCollectionJsonLd(site: string): Record<string, unknown> {
  const origin = site.replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${origin}/media#collection`,
    name: "Jimvio Media",
    description: "Real stories and deeper insights from Jimvio Media.",
    url: `${origin}/media`,
    inLanguage: "en",
    isPartOf: { "@id": `${origin}/#website` },
    publisher: { "@id": `${origin}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${origin}/media/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function jsonLdHtml(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function publicSource(article: {
  sourceName?: string | null;
  sourceUrl?: string | null;
}): { name: string; url: string | null } | null {
  const name = (article.sourceName ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  const rawUrl = (article.sourceUrl ?? "").trim();
  const url = rawUrl.startsWith("https://") && rawUrl.length <= 500 && isSafeHref(rawUrl) ? rawUrl : null;
  if (!name && !url) return null;
  if (name) return { name, url };
  try {
    return { name: new URL(url ?? "").hostname.replace(/^www\./, ""), url };
  } catch {
    return null;
  }
}

export function publicCorrection(note: string | null | undefined): string | null {
  const clean = (note ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return null;
  return clean.slice(0, 500);
}

function isUtcDay(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(day: string, days: number): string {
  const parsed = new Date(`${day}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function parseDeskRange(
  from: string | undefined,
  to: string | undefined,
  now = new Date(),
): { from: string; to: string } {
  const today = utcDay(now);
  const end = isUtcDay(to) && to <= today ? to : today;
  let start = isUtcDay(from) ? from : addUtcDays(end, -89);
  if (start > end) start = end;
  const earliest = addUtcDays(end, -365);
  if (start < earliest) start = earliest;
  return { from: start, to: end };
}

export type DeskArticle = {
  status: MediaStatus;
  category: MediaCategory;
  publishedAt: string | null;
};

export type DeskSummary = {
  byStatus: Record<MediaStatus, number>;
  byCategory: { slug: MediaCategory; label: string; count: number }[];
  publishedInRange: number;
  months: { month: string; count: number }[];
  loaded: number;
  capped: boolean;
};

function utcDayOf(iso: string | null): string | null {
  if (!iso) return null;
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return null;
  return new Date(time).toISOString().slice(0, 10);
}

export function summarizeDesk(
  articles: readonly DeskArticle[],
  range: { from: string; to: string },
): DeskSummary {
  const byStatus = Object.fromEntries(MEDIA_STATUSES.map((status) => [status, 0])) as Record<MediaStatus, number>;
  const categoryCounts = Object.fromEntries(MEDIA_CATEGORIES.map((item) => [item.slug, 0])) as Record<
    MediaCategory,
    number
  >;
  const monthCounts = new Map<string, number>();
  let publishedInRange = 0;

  for (const article of articles) {
    byStatus[article.status] += 1;
    categoryCounts[article.category] += 1;
    if (article.status !== "published") continue;
    const day = utcDayOf(article.publishedAt);
    if (!day || day < range.from || day > range.to) continue;
    publishedInRange += 1;
    const month = day.slice(0, 7);
    monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
  }

  return {
    byStatus,
    byCategory: MEDIA_CATEGORIES.map((item) => ({
      slug: item.slug,
      label: categoryLabel(item.slug),
      count: categoryCounts[item.slug],
    })),
    publishedInRange,
    months: [...monthCounts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count })),
    loaded: articles.length,
    capped: articles.length >= 500,
  };
}
