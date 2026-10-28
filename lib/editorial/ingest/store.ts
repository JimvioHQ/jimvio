import { getAdminDB } from "@/services/base";
import { planArticleWrite, suffixedSlug } from "@/lib/editorial/publish";
import type { MediaCategory } from "@/lib/editorial/types";
import { isArticleId, isMediaCategory, isValidSlug } from "@/lib/editorial/validate";
import type {
  ExistingArticleRef,
  ExistingItemRef,
  IngestMode,
  IngestSettings,
  PlannedItem,
  SourceHealth,
  SourceKind,
  SourceRecord,
} from "@/lib/editorial/ingest/types";
import { clampDailyPublishCap, DEFAULT_INGEST_SETTINGS } from "@/lib/editorial/ingest/types";

type Row = Record<string, unknown>;
type DbError = { message?: string; code?: string } | null;
type DbResult<T> = { data: T; error: DbError };

interface Chain<T> extends PromiseLike<DbResult<T>> {
  select: (columns?: string) => Chain<T>;
  insert: (row: Row | Row[]) => Chain<T>;
  update: (row: Row) => Chain<T>;
  eq: (column: string, value: unknown) => Chain<T>;
  order: (column: string, options?: { ascending?: boolean }) => Chain<T>;
  limit: (count: number) => Chain<T>;
  maybeSingle: () => Promise<DbResult<T>>;
  single: () => Promise<DbResult<T>>;
}

function from<T = Row>(name: string): Chain<T> {
  const client = getAdminDB() as unknown as { from: (tableName: string) => Chain<T> };
  return client.from(name);
}

export function ingestUnavailable(error: DbError): boolean {
  if (!error) return false;
  const text = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    text.includes("media_ingest") ||
    text.includes("media_sources") ||
    text.includes("media_external") ||
    text.includes("media_image_rights") ||
    text.includes("media_articles")
  );
}

function asRows(data: unknown): Row[] {
  return Array.isArray(data) ? (data as Row[]) : [];
}

function modeOf(value: unknown): IngestMode {
  const mode = String(value ?? "");
  if (mode === "disabled" || mode === "discovery" || mode === "draft" || mode === "review" || mode === "auto") return mode;
  return DEFAULT_INGEST_SETTINGS.mode;
}

export function mapSettings(row: Row | null): IngestSettings {
  if (!row) return { ...DEFAULT_INGEST_SETTINGS };
  const cap = Number(row.daily_publish_cap);
  const items = Number(row.max_items_per_run);
  const retry = Number(row.retry_limit);
  const stale = Number(row.stale_days);
  return {
    mode: modeOf(row.mode),
    emergencyStop: row.emergency_stop === true,
    ownerAutopublishAuthorized: row.owner_autopublish_authorized === true,
    dailyPublishCap: clampDailyPublishCap(cap),
    maxItemsPerRun: Number.isFinite(items) ? Math.min(40, Math.max(1, items)) : 20,
    retryLimit: Number.isFinite(retry) ? Math.min(8, Math.max(1, retry)) : 3,
    staleDays: Number.isFinite(stale) ? Math.min(90, Math.max(1, stale)) : 21,
    blockedCategories: Array.isArray(row.blocked_categories) ? row.blocked_categories.map(String) : [],
  };
}

function mapSource(row: Row): SourceRecord | null {
  const categories = (Array.isArray(row.categories) ? row.categories.map(String) : []).filter((item): item is MediaCategory =>
    isMediaCategory(item),
  );
  const kind = String(row.kind ?? "");
  const usage = String(row.permitted_usage ?? "");
  const rights = String(row.image_rights ?? "");
  const health = String(row.health ?? "");
  if (!categories.length) return null;
  if (!["rss", "atom", "api", "announcement", "licensed", "educational", "image", "owned"].includes(kind)) return null;
  if (!["none", "link", "facts", "full"].includes(usage)) return null;
  if (!["none", "attributed", "owned", "licensed"].includes(rights)) return null;
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    kind: kind as SourceKind,
    locator: String(row.locator ?? ""),
    categories,
    language: String(row.language ?? "en"),
    region: String(row.region ?? "global"),
    permittedUsage: usage as SourceRecord["permittedUsage"],
    imageRights: rights as SourceRecord["imageRights"],
    pollMinutes: Number(row.poll_minutes ?? 360),
    enabled: row.enabled === true,
    alwaysReview: row.always_review === true,
    health: (["unknown", "ok", "degraded", "failed"].includes(health) ? health : "unknown") as SourceHealth,
    lastSuccessAt: row.last_success_at ? String(row.last_success_at) : null,
    lastAttemptAt: row.last_attempt_at ? String(row.last_attempt_at) : null,
    lastError: row.last_error ? String(row.last_error) : null,
    termsNote: String(row.terms_note ?? ""),
    rateNote: String(row.rate_note ?? ""),
    accessMethod: String(row.access_method ?? ""),
    verifiedAt: row.verified_at ? String(row.verified_at) : null,
  };
}

const SOURCE_COLUMNS =
  "id, name, kind, locator, categories, language, region, permitted_usage, image_rights, poll_minutes, enabled, always_review, health, last_success_at, last_attempt_at, last_error, terms_note, rate_note, access_method, verified_at";

export type IngestDesk = {
  unavailable: boolean;
  failed: boolean;
  settings: IngestSettings;
  sources: SourceRecord[];
  items: Row[];
  jobs: Row[];
};

export async function loadIngestDesk(): Promise<IngestDesk> {
  try {
    const settingsResult = await from("media_ingest_settings").select("*").eq("id", 1).maybeSingle();
    if (ingestUnavailable(settingsResult.error)) {
      return { unavailable: true, failed: true, settings: { ...DEFAULT_INGEST_SETTINGS }, sources: [], items: [], jobs: [] };
    }
    const [sourcesResult, itemsResult, jobsResult] = await Promise.all([
      from("media_sources").select(SOURCE_COLUMNS).order("name", { ascending: true }).limit(100),
      from("media_external_items")
        .select("id, source_id, title, url, status, filter_reason, article_id, duplicate_of, sensitive, evidence, image_status, image_note, published_at, created_at")
        .order("created_at", { ascending: false })
        .limit(80),
      from("media_ingest_jobs")
        .select("id, source_id, kind, status, attempt, item_count, error, started_at, finished_at")
        .order("started_at", { ascending: false })
        .limit(40),
    ]);
    if (ingestUnavailable(sourcesResult.error) || ingestUnavailable(itemsResult.error) || ingestUnavailable(jobsResult.error)) {
      return { unavailable: true, failed: true, settings: mapSettings(settingsResult.data as Row), sources: [], items: [], jobs: [] };
    }
    return {
      unavailable: false,
      failed: Boolean(sourcesResult.error || itemsResult.error || jobsResult.error),
      settings: mapSettings((settingsResult.data ?? null) as Row | null),
      sources: asRows(sourcesResult.data).map(mapSource).filter((source): source is SourceRecord => source !== null),
      items: asRows(itemsResult.data),
      jobs: asRows(jobsResult.data),
    };
  } catch {
    return { unavailable: true, failed: true, settings: { ...DEFAULT_INGEST_SETTINGS }, sources: [], items: [], jobs: [] };
  }
}

export async function saveIngestSettings(settings: IngestSettings): Promise<{ ok: boolean; unavailable: boolean }> {
  const { error } = await from("media_ingest_settings")
    .update({
      mode: settings.mode,
      emergency_stop: settings.emergencyStop,
      owner_autopublish_authorized: settings.ownerAutopublishAuthorized,
      daily_publish_cap: settings.dailyPublishCap,
      max_items_per_run: settings.maxItemsPerRun,
      retry_limit: settings.retryLimit,
      stale_days: settings.staleDays,
      blocked_categories: settings.blockedCategories,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (ingestUnavailable(error)) return { ok: false, unavailable: true };
  return { ok: !error, unavailable: false };
}

export async function insertSource(row: Omit<SourceRecord, "id" | "health" | "lastSuccessAt" | "lastAttemptAt" | "lastError"> & { enabled: boolean }): Promise<{ ok: boolean; unavailable: boolean; id?: string }> {
  const { data, error } = await from("media_sources")
    .insert({
      name: row.name,
      kind: row.kind,
      locator: row.locator,
      categories: row.categories,
      language: row.language,
      region: row.region,
      permitted_usage: row.permittedUsage,
      image_rights: row.imageRights,
      poll_minutes: row.pollMinutes,
      enabled: row.enabled,
      always_review: row.alwaysReview,
      health: "unknown",
      terms_note: row.termsNote.slice(0, 500),
      rate_note: row.rateNote.slice(0, 300),
      access_method: row.accessMethod.slice(0, 40),
      verified_at: row.verifiedAt,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (ingestUnavailable(error)) return { ok: false, unavailable: true };
  if (error?.code === "23505") return { ok: true, unavailable: false };
  const id = data && typeof data === "object" ? String((data as Row).id ?? "") : "";
  return { ok: !error && Boolean(id), unavailable: false, id };
}

export async function getIngestSource(id: string): Promise<SourceRecord | null | "unavailable"> {
  if (!isArticleId(id)) return null;
  try {
    const { data, error } = await from("media_sources").select(SOURCE_COLUMNS).eq("id", id).maybeSingle();
    if (ingestUnavailable(error)) return "unavailable";
    if (error || !data) return null;
    return mapSource(data as Row);
  } catch {
    return "unavailable";
  }
}

export async function setSourceEnabled(id: string, enabled: boolean): Promise<{ ok: boolean; unavailable: boolean }> {
  if (!isArticleId(id)) return { ok: false, unavailable: false };
  const { error } = await from("media_sources").update({ enabled, updated_at: new Date().toISOString() }).eq("id", id);
  if (ingestUnavailable(error)) return { ok: false, unavailable: true };
  return { ok: !error, unavailable: false };
}

export type CycleContext = {
  unavailable: boolean;
  settings: IngestSettings;
  sources: SourceRecord[];
  existingItems: ExistingItemRef[];
  existingArticles: ExistingArticleRef[];
  otherReports: { sourceName: string; title: string; url: string; summary: string; publishedAt: string | null }[];
  publishedToday: number;
  jobs: { id: string; sourceId: string | null; status: string; attempt: number; startedAt: string; idempotencyKey?: string }[];
};

export async function loadCycleContext(now: Date): Promise<CycleContext> {
  const empty: CycleContext = {
    unavailable: true,
    settings: { ...DEFAULT_INGEST_SETTINGS },
    sources: [],
    existingItems: [],
    existingArticles: [],
    otherReports: [],
    publishedToday: 0,
    jobs: [],
  };
  try {
    const settingsResult = await from("media_ingest_settings").select("*").eq("id", 1).maybeSingle();
    if (settingsResult.error || !settingsResult.data) return empty;
    const [sourcesResult, itemsResult, articlesResult, jobsResult, publishedResult] = await Promise.all([
      from("media_sources").select(SOURCE_COLUMNS).order("name", { ascending: true }).limit(100),
      from("media_external_items").select("id, external_key, fingerprint, article_id, url, title, summary, published_at, source_id").order("created_at", { ascending: false }).limit(500),
      from("media_articles").select("id, title, source_url").order("updated_at", { ascending: false }).limit(500),
      from("media_ingest_jobs").select("id, source_id, status, attempt, started_at").order("started_at", { ascending: false }).limit(40),
      from("media_external_items").select("updated_at").eq("status", "published").order("updated_at", { ascending: false }).limit(50),
    ]);
    if ([sourcesResult, itemsResult, articlesResult, jobsResult].some((result) => ingestUnavailable(result.error))) return empty;
    const settings = mapSettings(settingsResult.data as Row);
    const sources = asRows(sourcesResult.data).map(mapSource).filter((source): source is SourceRecord => source !== null);
    const names = new Map(sources.map((source) => [source.id, source.name]));
    const itemRows = asRows(itemsResult.data);
    const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return {
      unavailable: false,
      settings,
      sources,
      existingItems: itemRows.map((row) => ({
        id: String(row.id ?? ""),
        externalKey: String(row.external_key ?? ""),
        fingerprint: String(row.fingerprint ?? ""),
        articleId: row.article_id ? String(row.article_id) : null,
        url: String(row.url ?? ""),
      })),
      existingArticles: asRows(articlesResult.data).map((row) => ({
        id: String(row.id ?? ""),
        title: String(row.title ?? ""),
        sourceUrl: row.source_url ? String(row.source_url) : null,
      })),
      otherReports: itemRows.slice(0, 80).map((row) => ({
        sourceName: names.get(String(row.source_id ?? "")) ?? "Source",
        title: String(row.title ?? ""),
        url: String(row.url ?? ""),
        summary: String(row.summary ?? ""),
        publishedAt: row.published_at ? String(row.published_at) : null,
      })),
      publishedToday: asRows(publishedResult.data).filter((row) => {
        const time = Date.parse(String(row.updated_at ?? ""));
        return Number.isFinite(time) && time >= midnight;
      }).length,
      jobs: asRows(jobsResult.data).map((row) => ({
        id: String(row.id ?? ""),
        sourceId: row.source_id ? String(row.source_id) : null,
        status: String(row.status ?? ""),
        attempt: Number(row.attempt ?? 1),
        startedAt: String(row.started_at ?? ""),
      })),
    };
  } catch {
    return empty;
  }
}

export async function markJob(id: string, status: "failed" | "succeeded" | "retried", error: string | null, itemCount: number) {
  await from("media_ingest_jobs")
    .update({ status, error: error?.slice(0, 300) ?? null, item_count: itemCount, finished_at: new Date().toISOString() })
    .eq("id", id);
}

export async function startJob(input: { sourceId: string; key: string; kind: "sync" | "retry"; attempt: number }) {
  const { data, error } = await from("media_ingest_jobs")
    .insert({
      source_id: input.sourceId,
      idempotency_key: input.key,
      kind: input.kind,
      status: "running",
      attempt: input.attempt,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error?.code === "23505") return { id: null, blocked: true, unavailable: false };
  if (ingestUnavailable(error)) return { id: null, blocked: false, unavailable: true };
  const id = data && typeof data === "object" ? String((data as Row).id ?? "") : "";
  return { id: id || null, blocked: Boolean(error), unavailable: false };
}

export async function markSourceHealth(id: string, health: SourceHealth, error: string | null, succeeded: boolean) {
  const now = new Date().toISOString();
  await from("media_sources")
    .update({
      health,
      last_error: error?.slice(0, 300) ?? null,
      last_attempt_at: now,
      ...(succeeded ? { last_success_at: now } : {}),
      updated_at: now,
    })
    .eq("id", id);
}

export async function persistPlannedItem(sourceId: string, item: PlannedItem, now: Date, actorId: string | null): Promise<{ articleId: string | null; slug: string | null; unavailable: boolean }> {
  let articleId: string | null = null;
  let slug: string | null = null;
  if (item.article) {
    const saved = await insertIngestArticle(item, now, actorId);
    if (saved.unavailable) return { articleId: null, slug: null, unavailable: true };
    if (!saved.id) {
      item.status = "failed";
      item.filterReason = "article_not_saved";
      item.article = null;
    } else {
      articleId = saved.id;
      slug = saved.slug;
    }
  }
  const { error } = await from("media_external_items").insert({
    id: item.id,
    source_id: sourceId,
    external_key: item.externalKey,
    guid: item.guid,
    title: item.title,
    url: item.url,
    summary: item.summary,
    language: item.language,
    published_at: item.publishedAt,
    fingerprint: item.fingerprint,
    cluster_key: item.clusterKey,
    status: item.status,
    filter_reason: item.filterReason,
    article_id: articleId,
    duplicate_of: item.duplicateOf,
    sensitive: item.sensitive,
    evidence: item.evidence,
    image_status: item.imageStatus,
    image_note: item.imageNote?.slice(0, 300) ?? null,
    updated_at: now.toISOString(),
  });
  if (ingestUnavailable(error)) return { articleId, slug, unavailable: true };
  if (error?.code === "23505") return { articleId, slug, unavailable: false };
  if (error) return { articleId, slug, unavailable: false };
  if (articleId && item.article && (item.imageStatus === "verified" || item.imageStatus === "fallback") && item.article.imageUrl) {
    await from("media_image_rights").insert({
      article_id: articleId,
      item_id: item.id,
      provider: item.article.sourceName.slice(0, 120),
      source_url: item.article.imageUrl,
      license: item.article.imageLicense.slice(0, 160),
      attribution: item.article.imageCaption.slice(0, 300),
      rights: item.imageStatus === "fallback" ? "fallback" : "verified",
      alt_text: item.article.imageAlt.slice(0, 180),
      caption: item.article.imageCaption.slice(0, 300),
    });
  }
  return { articleId, slug, unavailable: false };
}

async function insertIngestArticle(item: PlannedItem, now: Date, actorId: string | null): Promise<{ id: string | null; slug: string | null; unavailable: boolean }> {
  const article = item.article;
  if (!article || !isArticleId(article.idempotencyKey)) return { id: null, slug: null, unavailable: false };
  const actor = actorId && isArticleId(actorId) ? actorId : null;
  const plan = planArticleWrite(
    null,
    {
      title: article.title,
      excerpt: article.excerpt,
      bodyHtml: article.bodyHtml,
      category: article.category,
      kicker: "",
      imageUrl: article.imageUrl,
      imageAlt: article.imageAlt,
      section: "standard",
      tags: article.tags,
      seoTitle: article.seoTitle,
      seoDescription: article.seoDescription,
      authorName: "",
      scheduledAt: "",
      idempotencyKey: article.idempotencyKey,
      sourceName: article.sourceName,
      sourceUrl: article.sourceUrl,
    },
    article.intent,
    now,
  );
  if (!plan.ok) return { id: null, slug: null, unavailable: false };
  let slug = plan.write.slug;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await from("media_articles")
      .insert({
        slug,
        idempotency_key: plan.write.idempotencyKey,
        title: plan.write.title,
        excerpt: plan.write.excerpt,
        body_html: plan.write.bodyHtml,
        category: plan.write.category,
        kicker: plan.write.kicker,
        image_url: plan.write.imageUrl,
        image_alt: plan.write.imageAlt,
        status: plan.write.status,
        section: plan.write.section,
        tags: plan.write.tags,
        seo_title: plan.write.seoTitle,
        seo_description: plan.write.seoDescription,
        author_name: plan.write.authorName,
        source_name: plan.write.sourceName,
        source_url: plan.write.sourceUrl,
        correction_note: plan.write.correctionNote,
        scheduled_at: plan.write.scheduledAt,
        published_at: plan.write.publishedAt,
        created_by: actor,
        updated_by: actor,
        author_id: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .select("id, slug")
      .single();
    if (!error && data && typeof data === "object") {
      return { id: String((data as Row).id ?? ""), slug: String((data as Row).slug ?? plan.write.slug), unavailable: false };
    }
    if (ingestUnavailable(error)) return { id: null, slug: null, unavailable: true };
    if (error?.code === "23505" && plan.write.idempotencyKey && /idempotency/i.test(error.message ?? "")) {
      const existing = await from("media_articles").select("id, slug").eq("idempotency_key", plan.write.idempotencyKey).maybeSingle();
      const row = existing.data && typeof existing.data === "object" ? (existing.data as Row) : null;
      return { id: row ? String(row.id ?? "") : null, slug: row ? String(row.slug ?? "") : null, unavailable: false };
    }
    if (error?.code === "23505") {
      slug = suffixedSlug(plan.write.slug, attempt);
      if (!isValidSlug(slug)) return { id: null, slug: null, unavailable: false };
      continue;
    }
    return { id: null, slug: null, unavailable: false };
  }
  return { id: null, slug: null, unavailable: false };
}

