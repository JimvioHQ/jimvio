import { getAdminDB } from "@/services/base";
import { sanitizeArticleHtml } from "@/lib/editorial/sanitize";
import type { AdminArticle, MediaCategory, MediaSection, MediaStatus } from "@/lib/editorial/types";
import {
  isArticleId,
  isMediaCategory,
  isMediaSection,
  isMediaStatus,
  isValidSlug,
} from "@/lib/editorial/validate";

type Row = Record<string, unknown>;
type DbError = { message?: string; code?: string } | null;
type DbResult<T> = { data: T; error: DbError; count?: number | null };

interface Chain<T> extends PromiseLike<DbResult<T>> {
  select: (columns?: string) => Chain<T>;
  insert: (row: Row) => Chain<T>;
  update: (row: Row) => Chain<T>;
  eq: (column: string, value: unknown) => Chain<T>;
  contains: (column: string, value: unknown) => Chain<T>;
  order: (column: string, options?: { ascending?: boolean }) => Chain<T>;
  limit: (count: number) => Chain<T>;
  maybeSingle: () => Promise<DbResult<T>>;
  single: () => Promise<DbResult<T>>;
}

function table<T = Row>(name: string): Chain<T> {
  const client = getAdminDB() as unknown as { from: (tableName: string) => Chain<T> };
  return client.from(name);
}

export function storageUnavailable(error: DbError): boolean {
  if (!error) return false;
  const text = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  return error.code === "42P01" || error.code === "PGRST205" || text.includes("media_articles");
}

function mapAdmin(row: Row): AdminArticle | null {
  const category = String(row.category ?? "");
  const section = String(row.section ?? "");
  const status = String(row.status ?? "");
  const slug = String(row.slug ?? "");
  if (!isMediaCategory(category) || !isMediaSection(section) || !isMediaStatus(status) || !isValidSlug(slug)) {
    return null;
  }
  return {
    id: String(row.id ?? ""),
    slug,
    title: String(row.title ?? ""),
    excerpt: String(row.excerpt ?? ""),
    bodyHtml: sanitizeArticleHtml(String(row.body_html ?? "")),
    category: category as MediaCategory,
    kicker: String(row.kicker ?? ""),
    imageUrl: row.image_url ? String(row.image_url) : null,
    imageAlt: String(row.image_alt ?? ""),
    section: section as MediaSection,
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    seoTitle: row.seo_title ? String(row.seo_title) : null,
    seoDescription: row.seo_description ? String(row.seo_description) : null,
    authorName:
      typeof row.author_name === "string" && row.author_name.trim() ? row.author_name.trim() : null,
    sourceName: row.source_name ? String(row.source_name) : null,
    sourceUrl: row.source_url ? String(row.source_url) : null,
    correctionNote: row.correction_note ? String(row.correction_note) : null,
    publishedAt: row.published_at ? String(row.published_at) : null,
    status: status as MediaStatus,
    scheduledAt: row.scheduled_at ? String(row.scheduled_at) : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    fixture: false,
  };
}

const COLUMNS =
  "id, slug, title, excerpt, body_html, category, kicker, image_url, image_alt, section, tags, seo_title, seo_description, author_name, source_name, source_url, correction_note, status, published_at, scheduled_at, created_at, updated_at";

export type AdminListResult = { articles: AdminArticle[]; unavailable: boolean; failed: boolean };

export async function adminListArticles(): Promise<AdminListResult> {
  try {
    const { data, error } = await table("media_articles")
      .select(COLUMNS)
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) return { articles: [], unavailable: storageUnavailable(error), failed: true };
    const rows = (Array.isArray(data) ? data : []) as Row[];
    const articles = rows
      .map((row) => mapAdmin(row))
      .filter((article): article is AdminArticle => article !== null);
    return { articles, unavailable: false, failed: false };
  } catch {
    return { articles: [], unavailable: true, failed: true };
  }
}

export async function adminGetArticle(id: string): Promise<{ article: AdminArticle | null; unavailable: boolean }> {
  if (!isArticleId(id)) return { article: null, unavailable: false };
  try {
    const { data, error } = await table("media_articles").select(COLUMNS).eq("id", id).maybeSingle();
    if (error) return { article: null, unavailable: storageUnavailable(error) };
    if (!data) return { article: null, unavailable: false };
    return { article: mapAdmin(data as Row), unavailable: false };
  } catch {
    return { article: null, unavailable: true };
  }
}

export type ArticleWrite = {
  slug: string;
  title: string;
  excerpt: string;
  body_html: string;
  category: MediaCategory;
  kicker: string | null;
  image_url: string | null;
  image_alt: string | null;
  section: MediaSection;
  tags: string[];
  seo_title: string | null;
  seo_description: string | null;
  author_name: string | null;
  source_name: string | null;
  source_url: string | null;
  correction_note: string | null;
  author_id: string | null;
  status: MediaStatus;
  scheduled_at: string | null;
  published_at: string | null;
  updated_by: string;
};

export async function adminInsertArticle(
  row: ArticleWrite & { created_by: string; idempotency_key: string | null },
) {
  const now = new Date().toISOString();
  return table("media_articles")
    .insert({ ...row, created_at: now, updated_at: now })
    .select("id, slug, updated_at")
    .single();
}

export async function adminFindByIdempotency(key: string) {
  if (!isArticleId(key)) return { data: null, error: null };
  return table("media_articles").select("id, slug, updated_at").eq("idempotency_key", key).maybeSingle();
}

export async function adminUpdateArticle(id: string, row: ArticleWrite, expectedUpdatedAt: string) {
  return table("media_articles")
    .update({ ...row, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("updated_at", expectedUpdatedAt)
    .select("id, slug, updated_at")
    .maybeSingle();
}

export async function adminReplaceTag(tag: string, articles: AdminArticle[]) {
  const next = articles.filter((article) => article.tags.includes(tag));
  for (const article of next) {
    const tags = article.tags.filter((item) => item !== tag);
    await table("media_articles").update({ tags, updated_at: new Date().toISOString() }).eq("id", article.id);
  }
  return next.length;
}

export type AuditEntry = {
  id: string;
  action: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export async function adminRecentMediaAudit(limit = 20): Promise<{ entries: AuditEntry[]; failed: boolean }> {
  const count = Math.min(Math.max(limit, 1), 30);
  try {
    const { data, error } = await table("admin_audit_events")
      .select("id, action, created_at")
      .eq("entity_type", "media_article")
      .order("created_at", { ascending: false })
      .limit(count);
    if (error || !data) return { entries: [], failed: true };
    const rows = (Array.isArray(data) ? data : []) as unknown as Row[];
    return {
      failed: false,
      entries: rows.map((row) => ({
        id: String(row.id ?? ""),
        action: String(row.action ?? ""),
        createdAt: String(row.created_at ?? ""),
        metadata: {},
      })),
    };
  } catch {
    return { entries: [], failed: true };
  }
}

export async function adminArticleAudit(id: string): Promise<AuditEntry[]> {
  if (!isArticleId(id)) return [];
  const { data, error } = await table("admin_audit_events")
    .select("id, action, created_at, metadata")
    .eq("entity_type", "media_article")
    .eq("entity_id", id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error || !data) return [];
  const rows = (Array.isArray(data) ? data : []) as unknown as Row[];
  return rows.map((row) => ({
    id: String(row.id ?? ""),
    action: String(row.action ?? ""),
    createdAt: String(row.created_at ?? ""),
    metadata: (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, unknown>,
  }));
}
