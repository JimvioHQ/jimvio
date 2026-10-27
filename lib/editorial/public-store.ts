import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/public-env";
import { sanitizeArticleHtml } from "@/lib/editorial/sanitize";
import type { MediaCategory, MediaSection, PublicArticle } from "@/lib/editorial/types";
import {
  isMediaCategory,
  isMediaSection,
  isPubliclyVisible,
  isValidSlug,
  publicAuthorName,
} from "@/lib/editorial/validate";

type LoadResult = { articles: PublicArticle[]; unavailable: boolean };

type Row = {
  id?: string;
  slug?: string;
  title?: string;
  excerpt?: string;
  body_html?: string | null;
  category?: string;
  kicker?: string | null;
  image_url?: string | null;
  image_alt?: string | null;
  section?: string;
  tags?: string[] | null;
  seo_title?: string | null;
  seo_description?: string | null;
  author_name?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  correction_note?: string | null;
  status?: string;
  published_at?: string | null;
  scheduled_at?: string | null;
  updated_at?: string | null;
};

const LIST_COLUMNS =
  "id, slug, title, excerpt, category, kicker, image_url, image_alt, section, tags, seo_title, seo_description, author_name, source_name, source_url, correction_note, status, published_at, scheduled_at, updated_at";

function missingRelation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const text = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  return error.code === "42P01" || error.code === "PGRST205" || text.includes("media_articles");
}

function mapRow(row: Row, bodyHtml = ""): PublicArticle | null {
  const category = String(row.category ?? "");
  const section = String(row.section ?? "standard");
  const slug = String(row.slug ?? "");
  if (!isMediaCategory(category) || !isMediaSection(section) || !isValidSlug(slug)) return null;
  if (
    !isPubliclyVisible(
      {
        status: String(row.status ?? ""),
        publishedAt: row.published_at ?? null,
        scheduledAt: row.scheduled_at ?? null,
      },
      new Date(),
    )
  ) {
    return null;
  }
  return {
    id: String(row.id ?? ""),
    slug,
    title: String(row.title ?? ""),
    excerpt: String(row.excerpt ?? ""),
    bodyHtml,
    category: category as MediaCategory,
    kicker: String(row.kicker || "").trim(),
    imageUrl: row.image_url ? String(row.image_url) : null,
    imageAlt: String(row.image_alt || row.title || ""),
    section: section as MediaSection,
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    seoTitle: row.seo_title ? String(row.seo_title) : null,
    seoDescription: row.seo_description ? String(row.seo_description) : null,
    authorName: publicAuthorName(row.author_name),
    publishedAt: row.published_at ?? row.scheduled_at ?? null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
    sourceName: row.source_name ? String(row.source_name) : null,
    sourceUrl: row.source_url ? String(row.source_url) : null,
    correctionNote: row.correction_note ? String(row.correction_note) : null,
    fixture: false,
  };
}

function reader() {
  return createClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function loadPublished(): Promise<LoadResult> {
  try {
    const client = reader();
    const { data, error } = await client
      .from("media_articles")
      .select(LIST_COLUMNS)
      .in("status", ["published", "scheduled"])
      .order("published_at", { ascending: false })
      .limit(200);
    if (error) {
      if (!missingRelation(error)) console.error("editorial_list_failed", error.code ?? "unknown");
      return { articles: [], unavailable: true };
    }
    const articles = (data ?? [])
      .map((row) => mapRow(row as Row))
      .filter((article): article is PublicArticle => Boolean(article));
    return { articles, unavailable: false };
  } catch {
    return { articles: [], unavailable: true };
  }
}

export const listPublishedArticles = unstable_cache(loadPublished, ["editorial-published-v2"], {
  revalidate: 60,
  tags: ["editorial"],
});

async function loadArticle(slug: string): Promise<PublicArticle | null> {
  if (!isValidSlug(slug)) return null;
  try {
    const client = reader();
    const { data, error } = await client
      .from("media_articles")
      .select(`${LIST_COLUMNS}, body_html`)
      .eq("slug", slug)
      .in("status", ["published", "scheduled"])
      .maybeSingle();
    if (error || !data) return null;
    const mapped = mapRow(data as Row, String((data as Row).body_html ?? ""));
    if (!mapped) return null;
    return { ...mapped, bodyHtml: sanitizeArticleHtml(mapped.bodyHtml) };
  } catch {
    return null;
  }
}

export function getPublishedArticle(slug: string): Promise<PublicArticle | null> {
  return unstable_cache(() => loadArticle(slug), ["editorial-article-v2", slug], {
    revalidate: 60,
    tags: ["editorial", `editorial:${slug}`],
  })();
}
