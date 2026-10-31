import { randomUUID } from "node:crypto";
import { updateTag, revalidatePath } from "next/cache";
import {
  adminArticleAudit,
  adminGetArticle,
  adminInsertArticle,
  adminListArticles,
  adminUpdateArticle,
  type ArticleWrite,
} from "@/lib/editorial/admin-store";
import { planArticleWrite, suffixedSlug } from "@/lib/editorial/publish";
import type { AdminArticle, ArticleInput, MediaStatus } from "@/lib/editorial/types";
import { writeAuditEvent } from "@/services/ops/audit";
import { imageExtension, MAX_IMAGE_BYTES, sniffImageMime } from "@/lib/editorial/images";
import { serverCloudinaryCloudName } from "@/services/media/cloudinary-account";

type Actor = { userId: string; email: string | null; clientId: string };
type Input = Record<string, unknown>;

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function articleInput(input: Input, current?: AdminArticle): ArticleInput {
  return {
    title: text(input.title, current?.title ?? ""),
    excerpt: text(input.excerpt, current?.excerpt ?? ""),
    bodyHtml: text(input.bodyHtml, current?.bodyHtml ?? ""),
    category: text(input.category, current?.category ?? "news"),
    kicker: text(input.kicker, current?.kicker ?? ""),
    imageUrl: text(input.imageUrl, current?.imageUrl ?? ""),
    imageAlt: text(input.imageAlt, current?.imageAlt ?? ""),
    section: text(input.section, current?.section ?? "standard"),
    tags: Array.isArray(input.tags)
      ? input.tags.filter((tag): tag is string => typeof tag === "string").join(",")
      : text(input.tags, current?.tags.join(",") ?? ""),
    seoTitle: text(input.seoTitle, current?.seoTitle ?? ""),
    seoDescription: text(input.seoDescription, current?.seoDescription ?? ""),
    authorName: text(input.authorName, current?.authorName ?? ""),
    scheduledAt: text(input.scheduledAt, current?.scheduledAt ?? ""),
    slug: text(input.slug, current?.slug ?? ""),
    expectedUpdatedAt: text(input.expectedUpdatedAt, current?.updatedAt ?? ""),
    idempotencyKey: text(input.idempotencyKey),
    sourceName: text(input.sourceName, current?.sourceName ?? ""),
    sourceUrl: text(input.sourceUrl, current?.sourceUrl ?? ""),
    correctionNote: text(input.correctionNote, current?.correctionNote ?? ""),
  };
}

function toWrite(plan: NonNullable<Extract<ReturnType<typeof planArticleWrite>, { ok: true }>["write"]>, actor: Actor): ArticleWrite {
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
    author_id: actor.userId,
    status: plan.status,
    scheduled_at: plan.scheduledAt,
    published_at: plan.publishedAt,
    updated_by: actor.userId,
  };
}

function invalidate(slug?: string) {
  updateTag("editorial");
  if (slug) updateTag(`editorial:${slug}`);
  for (const path of [
    "/media",
    "/media/search",
    "/media/admin",
    "/media/admin/articles",
    "/media/sitemap.xml",
  ]) revalidatePath(path);
  revalidatePath("/media/category/[slug]", "page");
  revalidatePath("/media/article/[slug]", "page");
  if (slug) revalidatePath(`/media/article/${slug}`);
}

async function audit(actor: Actor, action: string, id: string, metadata: Record<string, unknown>) {
  await writeAuditEvent({
    actorId: actor.userId,
    action,
    entityType: "media_article",
    entityId: id,
    metadata: { ...metadata, source: "mcp", oauthClientId: actor.clientId },
  });
}

function savedRow(value: unknown): { id: string; slug: string; updatedAt: string } | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { id?: unknown; slug?: unknown; updated_at?: unknown };
  if (typeof row.id !== "string" || typeof row.slug !== "string") return null;
  return { id: row.id, slug: row.slug, updatedAt: typeof row.updated_at === "string" ? row.updated_at : new Date().toISOString() };
}

export async function searchMediaArticles(input: Input) {
  const result = await adminListArticles();
  if (result.failed) throw new Error(result.unavailable ? "Media storage is unavailable." : "Could not search Media articles.");
  const query = text(input.query).trim().toLowerCase();
  const status = text(input.status);
  const category = text(input.category);
  const limit = Math.min(Math.max(Number(input.limit) || 20, 1), 100);
  const articles = result.articles.filter((article) =>
    (!status || article.status === status) &&
    (!category || article.category === category) &&
    (!query || [article.title, article.excerpt, article.slug, article.tags.join(" ")].join(" ").toLowerCase().includes(query))
  );
  return {
    total: articles.length,
    articles: articles.slice(0, limit).map(({ bodyHtml, ...article }) => article),
  };
}

export async function getMediaArticle(id: string) {
  const result = await adminGetArticle(id);
  if (result.unavailable) throw new Error("Media storage is unavailable.");
  if (!result.article) throw new Error("Article not found.");
  return { article: result.article, audit: await adminArticleAudit(id) };
}

async function persistArticle(
  actor: Actor,
  current: AdminArticle | null,
  input: ArticleInput,
  intent: MediaStatus,
) {
  const existing = current ? {
    id: current.id,
    slug: current.slug,
    status: current.status,
    publishedAt: current.publishedAt,
    updatedAt: current.updatedAt,
  } : null;
  const plan = planArticleWrite(existing, input, intent);
  if (!plan.ok) throw new Error(plan.error + (plan.fieldErrors ? ` ${JSON.stringify(plan.fieldErrors)}` : ""));
  const write = toWrite(plan.write, actor);

  if (current) {
    const result = await adminUpdateArticle(current.id, write, current.updatedAt);
    if (result.error?.code === "23505") throw new Error("That article slug is already in use.");
    const saved = savedRow(result.data);
    if (!saved) throw new Error(result.error ? "Article update failed." : "Article changed; reload before updating.");
    await audit(actor, `media_${intent}`, saved.id, { slug: saved.slug, title: write.title, from: current.status, to: intent });
    invalidate(current.slug);
    if (saved.slug !== current.slug) invalidate(saved.slug);
    return { ...saved, status: intent };
  }

  let slug = plan.write.slug;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await adminInsertArticle({
      ...write,
      slug,
      created_by: actor.userId,
      idempotency_key: plan.write.idempotencyKey,
    });
    const saved = savedRow(result.data);
    if (!result.error && saved) {
      await audit(actor, `media_${intent}`, saved.id, { slug: saved.slug, title: write.title });
      invalidate(saved.slug);
      return { ...saved, status: intent };
    }
    if (result.error?.code !== "23505") throw new Error("Article could not be created.");
    if (plan.write.slugMode === "explicit") throw new Error("That article slug is already in use.");
    slug = suffixedSlug(plan.write.slug, attempt);
  }
  throw new Error("Article could not be created after resolving slug conflicts.");
}

export async function createMediaDraft(actor: Actor, input: Input) {
  const article = await persistArticle(actor, null, articleInput(input), "draft");
  return { message: "Draft created.", article };
}

export async function updateMediaArticle(actor: Actor, input: Input) {
  const id = text(input.article_id);
  const result = await adminGetArticle(id);
  if (result.unavailable) throw new Error("Media storage is unavailable.");
  const current = result.article;
  if (!current) throw new Error("Article not found.");
  if (current.status !== "draft" && current.status !== "review") {
    throw new Error("Only draft or review articles can be edited with this tool. Use the explicit publish workflow for publication changes.");
  }
  const merged = articleInput(input, current);
  if (merged.expectedUpdatedAt !== current.updatedAt) throw new Error("Article version conflict. Fetch the latest article and retry.");
  const article = await persistArticle(actor, current, merged, current.status);
  return { message: "Article updated.", article };
}

export async function publishMediaArticle(actor: Actor, input: Input) {
  const id = text(input.article_id);
  const confirmation = text(input.confirmation);
  if (confirmation !== `PUBLISH ${id}`) {
    throw new Error(`Explicit confirmation required. Set confirmation to exactly: PUBLISH ${id}`);
  }
  const result = await adminGetArticle(id);
  if (result.unavailable) throw new Error("Media storage is unavailable.");
  const current = result.article;
  if (!current) throw new Error("Article not found.");
  if (!["draft", "review", "scheduled"].includes(current.status)) {
    throw new Error(`Cannot publish an article in the ${current.status} state.`);
  }
  const merged = articleInput(input, current);
  if (merged.expectedUpdatedAt !== current.updatedAt) throw new Error("Article version conflict. Fetch the latest article and retry.");
  const article = await persistArticle(actor, current, merged, "published");
  return { message: "Article published.", article, publicUrl: `https://www.jimvio.com/media/article/${article.slug}` };
}

export async function uploadMediaFeaturedImage(actor: Actor, input: Input) {
  const encoded = text(input.image_base64);
  if (!encoded || encoded.length > Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 16 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new Error("Provide a valid base64 image no larger than 4 MB.");
  }
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length <= 0 || bytes.length > MAX_IMAGE_BYTES) throw new Error("Images must be 4 MB or smaller.");
  const mime = sniffImageMime(new Uint8Array(bytes));
  if (!mime) throw new Error("Use a JPEG, PNG, WebP, or GIF image.");
  const cloudName = serverCloudinaryCloudName();
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary image upload is not configured.");

  const { v2: cloudinary } = await import("cloudinary");
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  const uploaded = await cloudinary.uploader.upload(
    `data:${mime};base64,${bytes.toString("base64")}`,
    { folder: "jimvio/editorial", resource_type: "image", unique_filename: true, overwrite: false, format: imageExtension(mime) },
  );
  if (!uploaded.secure_url?.startsWith("https://")) throw new Error("Cloudinary did not return a secure image URL.");
  await writeAuditEvent({
    actorId: actor.userId,
    action: "media_featured_image_uploaded",
    entityType: "media_article",
    metadata: { source: "mcp", oauthClientId: actor.clientId, imageUrl: uploaded.secure_url },
  });
  return { imageUrl: uploaded.secure_url, width: uploaded.width, height: uploaded.height, format: uploaded.format };
}

export async function verifyPublishedArticle(input: Input) {
  const id = text(input.article_id);
  const slugInput = text(input.slug);
  let article: AdminArticle | null = null;
  if (id) {
    const result = await adminGetArticle(id);
    if (result.unavailable) throw new Error("Media storage is unavailable.");
    article = result.article;
  } else if (slugInput) {
    const result = await adminListArticles();
    if (result.failed) throw new Error("Could not verify Media article.");
    article = result.articles.find((item) => item.slug === slugInput) ?? null;
  } else {
    throw new Error("Provide article_id or slug.");
  }
  if (!article) throw new Error("Article not found.");
  if (article.status !== "published" || !article.publishedAt) {
    return { published: false, status: article.status, slug: article.slug, message: "The article is not published." };
  }
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.jimvio.com").replace(/\/$/, "");
  const publicUrl = `${origin}/media/article/${article.slug}`;
  const response = await fetch(publicUrl, { cache: "no-store", redirect: "manual" }).catch(() => null);
  if (!response || !response.ok) {
    return { published: true, reachable: false, statusCode: response?.status ?? null, publicUrl, message: "The database marks this article as published, but the public page could not be verified." };
  }
  const html = await response.text();
  const reachable = html.includes(article.slug) && html.includes("media");
  return {
    published: true,
    reachable,
    statusCode: response.status,
    publicUrl,
    title: article.title,
    publishedAt: article.publishedAt,
    message: reachable ? "The published article is reachable on the public Media site." : "The page responded, but its article content could not be confirmed.",
  };
}

export function isPublishConfirmationValid(articleId: string, confirmation: string): boolean {
  return confirmation === `PUBLISH ${articleId}`;
}
