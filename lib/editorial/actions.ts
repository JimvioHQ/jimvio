"use server";

import { revalidatePath, updateTag } from "next/cache";
import { headers } from "next/headers";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import { writeAuditEvent } from "@/services/ops/audit";
import {
  adminFindByIdempotency,
  adminGetArticle,
  adminInsertArticle,
  adminListArticles,
  adminReplaceTag,
  adminUpdateArticle,
  storageUnavailable,
  type ArticleWrite,
} from "@/lib/editorial/admin-store";
import {
  planArticleWrite,
  publisherDenial,
  STALE_ARTICLE_ERROR,
  suffixedSlug,
  type PlannedWrite,
} from "@/lib/editorial/publish";
import type { ActionResult, ArticleInput, MediaStatus } from "@/lib/editorial/types";
import { isArticleId } from "@/lib/editorial/validate";

const STORAGE_ERROR =
  "Media storage is not ready. Apply the media_articles migration before publishing.";

function savedRow(data: unknown): { id: string; slug: string; updatedAt: string } | null {
  if (!data || typeof data !== "object") return null;
  const row = data as { id?: unknown; slug?: unknown; updated_at?: unknown };
  if (typeof row.id !== "string" || typeof row.slug !== "string") return null;
  return {
    id: row.id,
    slug: row.slug,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : new Date().toISOString(),
  };
}

function toWrite(plan: PlannedWrite, actorId: string): ArticleWrite {
  return {
    slug: plan.slug,
    title: plan.title,
    excerpt: plan.excerpt,
    body_html: plan.bodyHtml,
    category: plan.category,
    kicker: plan.kicker,
    image_url: plan.imageUrl,
    image_alt: plan.imageAlt,
    section: plan.section,
    tags: plan.tags,
    seo_title: plan.seoTitle,
    seo_description: plan.seoDescription,
    author_name: plan.authorName,
    source_name: plan.sourceName,
    source_url: plan.sourceUrl,
    correction_note: plan.correctionNote,
    author_id: actorId,
    status: plan.status,
    scheduled_at: plan.scheduledAt,
    published_at: plan.publishedAt,
    updated_by: actorId,
  };
}

async function requirePublisher() {
  return assertPlatformAdmin();
}

function invalidate(slug?: string) {
  updateTag("editorial");
  if (slug) updateTag(`editorial:${slug}`);
  revalidatePath("/media");
  revalidatePath("/media/search");
  revalidatePath("/media/admin");
  revalidatePath("/media/admin/articles");
  revalidatePath("/media/category/[slug]", "page");
  revalidatePath("/media/article/[slug]", "page");
  revalidatePath("/media/sitemap.xml");
  if (slug) revalidatePath(`/media/article/${slug}`);
}

async function audit(actorId: string, action: string, id: string, metadata: Record<string, unknown>) {
  const headerStore = await headers();
  await writeAuditEvent({
    actorId,
    action,
    entityType: "media_article",
    entityId: id,
    metadata,
    ip: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headerStore.get("user-agent"),
  });
}

export async function saveMediaArticle(
  id: string | null,
  input: ArticleInput,
  intent: MediaStatus,
): Promise<ActionResult> {
  const auth = await requirePublisher();
  const denied = publisherDenial(auth.ok ? { ok: true } : { ok: false, status: auth.status });
  if (denied || !auth.ok) return { ok: false, error: denied ?? "You do not have permission to publish." };
  if (id && !isArticleId(id)) return { ok: false, error: "Article not found." };

  const existing = id ? await adminGetArticle(id) : null;
  if (existing?.unavailable) return { ok: false, error: STORAGE_ERROR };
  if (id && !existing?.article) return { ok: false, error: "Article not found." };

  const current = existing?.article;
  const plan = planArticleWrite(
    current
      ? {
          id: current.id,
          slug: current.slug,
          status: current.status,
          publishedAt: current.publishedAt,
          updatedAt: current.updatedAt,
        }
      : null,
    input,
    intent,
  );
  if (!plan.ok) return plan;

  const write = toWrite(plan.write, auth.user.id);
  if (!current) {
    let slug = plan.write.slug;
    const key = plan.write.idempotencyKey;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await adminInsertArticle({
        ...write,
        slug,
        created_by: auth.user.id,
        idempotency_key: key,
      });
      const created = savedRow(result.data);
      if (!result.error && created) {
        await audit(auth.user.id, `media_${intent}`, created.id, { slug: created.slug, title: write.title });
        invalidate(created.slug);
        return { ok: true, id: created.id, slug: created.slug, updatedAt: created.updatedAt };
      }
      if (storageUnavailable(result.error)) return { ok: false, error: STORAGE_ERROR };
      if (result.error?.code === "23505") {
        const message = result.error.message ?? "";
        if (key && /idempotency/i.test(message)) {
          const replay = await adminFindByIdempotency(key);
          const found = savedRow(replay.data);
          if (found) {
            invalidate(found.slug);
            return { ok: true, id: found.id, slug: found.slug, updatedAt: found.updatedAt };
          }
          return { ok: false, error: "The article could not be saved." };
        }
        if (plan.write.slugMode === "explicit") {
          return {
            ok: false,
            error: "Check the highlighted fields.",
            fieldErrors: { slug: "That address is already used." },
          };
        }
        slug = suffixedSlug(plan.write.slug, attempt);
        continue;
      }
      return { ok: false, error: "The article could not be saved." };
    }
    return { ok: false, error: "The article could not be saved." };
  }

  const result = await adminUpdateArticle(current.id, { ...write, slug: plan.write.slug }, current.updatedAt);
  if (storageUnavailable(result.error)) return { ok: false, error: STORAGE_ERROR };
  if (result.error?.code === "23505") {
    return {
      ok: false,
      error: "Check the highlighted fields.",
      fieldErrors: { slug: "That address is already used." },
    };
  }
  const saved = savedRow(result.data);
  if (!saved) {
    if (result.error) return { ok: false, error: "The article could not be saved." };
    return { ok: false, error: STALE_ARTICLE_ERROR, conflict: true };
  }
  await audit(auth.user.id, `media_${intent}`, saved.id, {
    slug: saved.slug,
    title: write.title,
    from: current.status,
    to: intent,
  });
  invalidate(current.slug);
  if (saved.slug !== current.slug) invalidate(saved.slug);
  return { ok: true, id: saved.id, slug: saved.slug, updatedAt: saved.updatedAt };
}

export async function removeMediaTag(
  tag: string,
): Promise<{ ok: true; removed: number } | { ok: false; error: string }> {
  const auth = await requirePublisher();
  const denied = publisherDenial(auth.ok ? { ok: true } : { ok: false, status: auth.status });
  if (denied || !auth.ok) return { ok: false, error: denied ?? "You do not have permission to edit tags." };
  const clean = tag.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(clean)) return { ok: false, error: "That tag is not valid." };
  const list = await adminListArticles();
  if (list.unavailable || list.failed) return { ok: false, error: STORAGE_ERROR };
  const removed = await adminReplaceTag(clean, list.articles);
  await audit(auth.user.id, "media_tag_removed", clean, { tag: clean, articles: removed });
  invalidate();
  return { ok: true, removed };
}
