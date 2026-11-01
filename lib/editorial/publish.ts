import { absoluteImageUrl, articleLastModified, metaDescription, publicCorrection } from "@/lib/editorial/discover";
import { sanitizeArticleHtml } from "@/lib/editorial/sanitize";
import {
  MEDIA_CATEGORIES,
  type ArticleInput,
  type FieldErrors,
  type MediaCategory,
  type MediaSection,
  type MediaStatus,
  type PublicArticle,
} from "@/lib/editorial/types";
import {
  canTransition,
  isArticleId,
  isMediaCategory,
  isMediaSection,
  isValidSlug,
  kickerFor,
  parseTags,
  plainText,
  publicAuthorName,
  slugifyTitle,
  validateArticle,
} from "@/lib/editorial/validate";

export const STALE_ARTICLE_ERROR =
  "This article changed after you opened it. Your edits are still in this form. Copy them if you need them, then reload the latest version before saving.";

export type ExistingArticle = {
  id: string;
  slug: string;
  status: MediaStatus;
  publishedAt: string | null;
  updatedAt: string;
};

export type SlugMode = "generated" | "explicit" | "kept";

export type PlannedWrite = {
  slug: string;
  slugMode: SlugMode;
  title: string;
  excerpt: string;
  bodyHtml: string;
  category: MediaCategory;
  kicker: string;
  imageUrl: string | null;
  imageAlt: string;
  section: MediaSection;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  authorName: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  correctionNote: string | null;
  status: MediaStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  idempotencyKey: string | null;
};

export type ArticlePlan =
  | { ok: true; write: PlannedWrite }
  | { ok: false; error: string; fieldErrors?: FieldErrors; conflict?: boolean };

export function publisherDenial(
  auth: { ok: true } | { ok: false; status: 401 | 403 },
): string | null {
  if (auth.ok) return null;
  if (auth.status === 401) return "Sign in as an administrator.";
  return "You do not have permission to publish.";
}

export function uploadOriginAllowed(input: {
  origin: string | null;
  host: string | null;
  secFetchSite: string | null;
}): boolean {
  const site = (input.secFetchSite ?? "").trim().toLowerCase();
  if (site === "cross-site" || site === "same-site") return false;
  const origin = input.origin?.trim() ?? "";
  const host = input.host?.trim().toLowerCase() ?? "";
  if (!host) return false;
  if (origin) {
    try {
      return new URL(origin).host.toLowerCase() === host;
    } catch {
      return false;
    }
  }
  return site === "same-origin";
}

export function isStaleRevision(expected: string | undefined, actual: string): boolean {
  if (!expected) return true;
  const left = Date.parse(expected);
  const right = Date.parse(actual);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return true;
  return left !== right;
}

export function publishedInstant(
  intent: MediaStatus,
  existingPublishedAt: string | null,
  nowIso: string,
): string | null {
  if (intent === "published") return existingPublishedAt ?? nowIso;
  if (intent === "archived") return existingPublishedAt;
  return null;
}

export function resolveSlug(
  input: { title: string; slug?: string },
  existingSlug: string | null,
): { slug: string; mode: SlugMode; error?: string } {
  const requested = (input.slug ?? "").trim();
  if (existingSlug && requested === "") return { slug: existingSlug, mode: "kept" };
  if (!requested) {
    const generated = slugifyTitle(input.title) || "story";
    return { slug: isValidSlug(generated) ? generated : "story", mode: "generated" };
  }
  const normalized = slugifyTitle(requested);
  if (!normalized || !isValidSlug(normalized)) {
    return {
      slug: existingSlug ?? "",
      mode: "explicit",
      error: "Use a short lowercase address with letters, numbers, and hyphens.",
    };
  }
  if (existingSlug && normalized === existingSlug) return { slug: existingSlug, mode: "kept" };
  return { slug: normalized, mode: "explicit" };
}

export function suffixedSlug(base: string, attempt: number): string {
  const suffix = `-${attempt + 2}`;
  const room = Math.max(1, 80 - suffix.length);
  const stem = base.slice(0, room).replace(/-+$/g, "") || "story";
  return `${stem}${suffix}`.slice(0, 80);
}

export function planArticleWrite(
  existing: ExistingArticle | null,
  input: ArticleInput,
  intent: MediaStatus,
  now = new Date(),
): ArticlePlan {
  if (existing && !canTransition(existing.status, intent)) {
    return { ok: false, error: "That publishing step is not available from the current state." };
  }
  if (existing && isStaleRevision(input.expectedUpdatedAt, existing.updatedAt)) {
    return { ok: false, error: STALE_ARTICLE_ERROR, conflict: true };
  }

  const { errors, scheduledAt } = validateArticle(input, intent, now);
  const slug = resolveSlug(input, existing?.slug ?? null);
  if (slug.error) errors.slug = slug.error;
  const bodyHtml = sanitizeArticleHtml(input.bodyHtml);
  if ((intent === "published" || intent === "scheduled") && plainText(bodyHtml).split(/\s+/).filter(Boolean).length < 300) {
    errors.bodyHtml = "Write a substantive article of at least 300 words before publication.";
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, error: "Check the highlighted fields.", fieldErrors: errors };
  }
  if (!isMediaCategory(input.category) || !isMediaSection(input.section)) {
    return { ok: false, error: "Choose a category." };
  }

  const tags = parseTags(input.tags).tags;
  const key =
    !existing && input.idempotencyKey && isArticleId(input.idempotencyKey) ? input.idempotencyKey : null;
  return {
    ok: true,
    write: {
      slug: slug.slug,
      slugMode: slug.mode,
      title: input.title.trim(),
      excerpt: input.excerpt.trim(),
      bodyHtml,
      category: input.category,
      kicker: kickerFor(input.category, input.kicker),
      imageUrl: input.imageUrl.trim() || null,
      imageAlt: (input.imageAlt.trim() || input.title.trim()).slice(0, 180),
      section: input.section,
      tags,
      seoTitle: input.seoTitle.trim() || null,
      seoDescription: input.seoDescription.trim() || null,
      authorName: publicAuthorName(input.authorName),
      sourceName: input.sourceName?.trim() || null,
      sourceUrl: input.sourceUrl?.trim() || null,
      correctionNote: input.correctionNote?.trim() || null,
      status: intent,
      scheduledAt: intent === "scheduled" ? scheduledAt : null,
      publishedAt: publishedInstant(intent, existing?.publishedAt ?? null, now.toISOString()),
      idempotencyKey: key,
    },
  };
}

export function articleJsonLd(
  article: {
    fixture: boolean;
    title: string;
    excerpt: string;
    publishedAt: string | null;
    updatedAt?: string | null;
    imageUrl: string | null;
    slug: string;
    authorName: string | null;
    category?: string;
    seoDescription?: string | null;
    correctionNote?: string | null;
  },
  site: string,
): Record<string, unknown> | null {
  if (article.fixture || !isValidSlug(article.slug)) return null;
  const origin = site.replace(/\/$/, "");
  const description = metaDescription(article.seoDescription, article.excerpt);
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": article.category === "news" ? "NewsArticle" : "Article",
    headline: article.title,
    mainEntityOfPage: `${origin}/media/article/${article.slug}`,
    inLanguage: "en",
    publisher: { "@id": `${origin}/#organization` },
  };
  if (description) data.description = description;
  const author = publicAuthorName(article.authorName ?? null);
  if (author) data.author = { "@type": "Organization", name: author };
  if (article.publishedAt) data.datePublished = article.publishedAt;
  if (publicCorrection(article.correctionNote) && article.updatedAt) {
    data.dateModified = article.updatedAt;
  }
  const image = absoluteImageUrl(origin, article.imageUrl);
  if (image) data.image = [image];
  return data;
}

export function mediaSitemapEntries(
  site: string,
  loaded: { articles: readonly PublicArticle[]; unavailable: boolean },
): { url: string; lastModified?: Date; changeFrequency: "hourly" | "weekly"; priority: number }[] {
  if (loaded.unavailable) return [];
  const origin = site.replace(/\/$/, "");
  const entries: { url: string; lastModified?: Date; changeFrequency: "hourly" | "weekly"; priority: number }[] = [];
  const seen = new Set<string>();
  const push = (
    url: string,
    changeFrequency: "hourly" | "weekly",
    priority: number,
    lastModified?: Date,
  ) => {
    if (seen.has(url)) return;
    seen.add(url);
    entries.push(lastModified ? { url, lastModified, changeFrequency, priority } : { url, changeFrequency, priority });
  };
  push(`${origin}/media`, "hourly", 0.8);
  for (const category of MEDIA_CATEGORIES) {
    push(`${origin}/media/category/${category.slug}`, "hourly", 0.6);
  }
  for (const article of indexableArticles(loaded.articles)) {
    push(`${origin}/media/article/${article.slug}`, "weekly", 0.7, articleLastModified(article));
  }
  return entries;
}

export function indexableArticles<T extends { fixture: boolean; slug: string }>(articles: readonly T[]): T[] {
  return articles.filter((article) => !article.fixture && isValidSlug(article.slug));
}
