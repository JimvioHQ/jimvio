import { revalidatePath, revalidateTag } from "next/cache";
import { externalKey, jaccard, titleTokens } from "@/lib/editorial/ingest/feed";
import { fetchArticlePage, fetchFeed, fetchImage } from "@/lib/editorial/ingest/fetch";
import { evaluateImage, selectOfficialImage } from "@/lib/editorial/ingest/images";
import { alreadyStoredDuplicate, countPlans, cycleSourceOutcome, isStuckJob, MAX_SOURCES_PER_CYCLE, planSourceItems, publishSlotsRemaining, serverAutopublishAuthorized, sourceDue, type ItemResearch } from "@/lib/editorial/ingest/plan";
import { illustrativeImage } from "@/lib/editorial/ingest/illustrative";
import { writeGroundedReport } from "@/lib/editorial/ingest/report";
import { loadCycleContext, lookupProfileNames, markJob, markSourceHealth, persistPlannedItem, startJob } from "@/lib/editorial/ingest/store";
import type { CycleCounts, FeedItem, SourceRecord } from "@/lib/editorial/ingest/types";
import type { ExtractedPage } from "@/lib/editorial/ingest/page";

export type CycleResult = {
  ok: boolean;
  unavailable: boolean;
  skipped: "emergency" | "disabled" | "storage" | null;
  counts: CycleCounts;
};

const EMPTY: CycleCounts = {
  sources: 0,
  fetched: 0,
  discovered: 0,
  duplicates: 0,
  filtered: 0,
  grouped: 0,
  drafted: 0,
  review: 0,
  published: 0,
  failed: 0,
};

function add(counts: CycleCounts, extra: ReturnType<typeof countPlans>) {
  counts.discovered += extra.discovered;
  counts.duplicates += extra.duplicates;
  counts.filtered += extra.filtered;
  counts.grouped += extra.grouped;
  counts.drafted += extra.drafted;
  counts.review += extra.review;
  counts.published += extra.published;
  counts.failed += extra.failed;
}

export async function runIngestCycle(options?: {
  sourceId?: string;
  force?: boolean;
  actorId?: string | null;
  fetchImpl?: typeof fetch;
  now?: Date;
}): Promise<CycleResult> {
  const now = options?.now ?? new Date();
  const counts = { ...EMPTY };
  const context = await loadCycleContext(now);
  if (context.unavailable) return { ok: false, unavailable: true, skipped: "storage", counts };
  if (context.settings.emergencyStop) return { ok: true, unavailable: false, skipped: "emergency", counts };
  if (context.settings.mode === "disabled") return { ok: true, unavailable: false, skipped: "disabled", counts };

  for (const job of context.jobs) {
    if (isStuckJob(job.status, job.startedAt, now)) {
      await markJob(job.id, "failed", "interrupted", 0);
      job.status = "failed";
    }
  }

  const selected = context.sources.filter((source) => {
    if (options?.sourceId && source.id !== options.sourceId) return false;
    if (source.kind === "licensed" || source.kind === "api" || source.permittedUsage === "none") return false;
    const forced = options?.force === true && (!options.sourceId || source.id === options.sourceId);
    return sourceDue(source, now, forced);
  });
  // Rotate fairly: sources that have waited longest are polled first.
  const due = [...selected].sort((left, right) => {
    const leftAt = Date.parse(left.lastSuccessAt ?? left.lastAttemptAt ?? "1970-01-01T00:00:00.000Z");
    const rightAt = Date.parse(right.lastSuccessAt ?? right.lastAttemptAt ?? "1970-01-01T00:00:00.000Z");
    return (Number.isFinite(leftAt) ? leftAt : 0) - (Number.isFinite(rightAt) ? rightAt : 0);
  }).slice(0, MAX_SOURCES_PER_CYCLE);
  counts.sources = due.length;

  for (const source of due) {
    const forced = options?.force === true && (!options.sourceId || source.id === options.sourceId);
    const outcome = await syncSource(source, context, now, options?.actorId ?? null, options?.fetchImpl ?? fetch, forced);
    add(counts, outcome.counts);
    counts.fetched += outcome.fetched;
    if (outcome.wrote) {
      revalidatePath("/media/admin");
      revalidatePath("/media/admin/ingestion");
      revalidatePath("/media/admin/articles");
      if (outcome.publishedSlug) {
        revalidateTag("editorial", "max");
        revalidateTag(`editorial:${outcome.publishedSlug}`, "max");
        revalidatePath("/media");
        revalidatePath("/media/search");
        revalidatePath("/media/sitemap.xml");
        revalidatePath("/media/category/[slug]", "page");
        revalidatePath("/media/article/[slug]", "page");
        revalidatePath(`/media/article/${outcome.publishedSlug}`);
      }
    }
  }
  return { ok: true, unavailable: false, skipped: null, counts };
}

async function syncSource(
  source: SourceRecord,
  context: Awaited<ReturnType<typeof loadCycleContext>>,
  now: Date,
  actorId: string | null,
  fetchImpl: typeof fetch,
  force: boolean,
): Promise<{ counts: ReturnType<typeof countPlans>; fetched: number; wrote: boolean; publishedSlug: string | null }> {
  const empty = { discovered: 0, duplicates: 0, filtered: 0, grouped: 0, drafted: 0, review: 0, published: 0, failed: 0 };
  const previous = context.jobs.filter((job) => job.sourceId === source.id);
  if (previous.some((job) => job.status === "running")) return { counts: empty, fetched: 0, wrote: false, publishedSlug: null };
  const recentFailures = previous.slice(0, context.settings.retryLimit);
  if (!force && recentFailures.length >= context.settings.retryLimit && recentFailures.every((job) => job.status === "failed")) {
    return { counts: { ...empty, failed: 1 }, fetched: 0, wrote: false, publishedSlug: null };
  }
  const attempt = Math.min(8, Math.max(0, ...previous.map((job) => job.attempt), 0) + 1);
  const key = force ? `retry:${source.id}:${now.getTime()}` : `sync:${source.id}:${now.toISOString().slice(0, 13)}`;
  const job = await startJob({ sourceId: source.id, key, kind: force ? "retry" : "sync", attempt });
  if (job.unavailable || !job.id) return { counts: empty, fetched: 0, wrote: false, publishedSlug: null };

  if (source.kind !== "rss" && source.kind !== "atom" && source.kind !== "announcement" && source.kind !== "educational") {
    await markJob(job.id, "failed", "This source needs credentials or is not a feed.", 0);
    await markSourceHealth(source.id, "failed", "Credentials or a feed URL are required.", false);
    return { counts: { ...empty, failed: 1 }, fetched: 0, wrote: false, publishedSlug: null };
  }

  const fetched = await fetchFeed(source.locator, fetchImpl);
  if (!fetched.ok) {
    await markJob(job.id, "failed", fetched.error, 0);
    await markSourceHealth(source.id, "failed", fetched.error, false);
    return { counts: { ...empty, failed: 1 }, fetched: 0, wrote: false, publishedSlug: null };
  }

  const known = new Set(context.existingItems.map((item) => item.externalKey));
  const fresh = fetched.items.filter((item) => !known.has(externalKey(item.url, item.guid)));
  const slots = context.settings.mode === "auto"
    ? publishSlotsRemaining(context.publishedToday, context.settings.dailyPublishCap, now)
    : context.settings.mode === "draft" || context.settings.mode === "review" ? 2 : 0;
  const paceClosed = context.settings.mode === "auto" && slots === 0 && fresh.length > 0;
  const research = new Map<string, ItemResearch>();
  const deadline = Date.now() + 45_000;
  const budget = fresh.slice(0, paceClosed ? 0 : Math.min(2, slots));
  let writerUnavailable = false;
  for (const item of budget) {
    if (Date.now() > deadline) break;
    const result = await researchItem(source, item, fetchImpl, context.otherReports);
    if (result.reason === "writer_unavailable") writerUnavailable = true;
    research.set(item.url, result);
  }

  const planned = planSourceItems({
    settings: context.settings,
    source,
    items: fetched.items,
    existingItems: context.existingItems,
    existingArticles: context.existingArticles,
    now,
    serverAutopublish: serverAutopublishAuthorized(),
    publishedToday: context.publishedToday,
    otherReports: context.otherReports,
    researchFor: (item: FeedItem) => research.get(item.url) ?? null,
  });
  if (paceClosed) planned.heldForPace += fresh.length;
  let publishedSlug: string | null = null;
  for (const item of planned) {
    if (item.filterReason === "publish_pace") continue;
    if (alreadyStoredDuplicate(item)) continue;
    const saved = await persistPlannedItem(source.id, item, now, actorId);
    if (saved.unavailable) {
      await markJob(job.id, "failed", "Media storage is not ready.", planned.length);
      await markSourceHealth(source.id, "failed", "Media storage is not ready.", false);
      return { counts: countPlans(planned), fetched: 1, wrote: false, publishedSlug: null };
    }
    if (saved.articleId && item.article) {
      context.existingArticles.push({ id: saved.articleId, title: item.article.title, sourceUrl: item.article.sourceUrl });
      if (item.status === "published" && saved.slug) {
        context.publishedToday += 1;
        publishedSlug = saved.slug;
      }
    }
    context.existingItems.push({
      id: item.id,
      externalKey: item.externalKey,
      fingerprint: item.fingerprint,
      articleId: saved.articleId,
      url: item.url,
    });
  }
  const counts = countPlans(planned);
  const outcome = cycleSourceOutcome({
    heldForPace: planned.heldForPace > 0,
    writerUnavailable,
  });
  await markJob(job.id, "succeeded", outcome.note, planned.length);
  if (outcome.markSuccess) await markSourceHealth(source.id, "ok", null, true);
  return { counts, fetched: 1, wrote: planned.length > 0, publishedSlug };
}

async function researchItem(source: SourceRecord, item: FeedItem, fetchImpl: typeof fetch, otherReports: { sourceName: string; title: string; url: string; summary: string; publishedAt: string | null }[]): Promise<ItemResearch> {
  const loaded = await fetchArticlePage(item.url, fetchImpl);
  if (!loaded.ok) return { brief: null, image: null, reason: "thin_source" };
  const imageTask = selectOfficialImage(loaded.page, fetchImpl).then(async (official) => {
    if (official.status === "verified" || source.imageRights === "none" || !item.imageUrl) return official;
    const bytes = await fetchImage(item.imageUrl, fetchImpl);
    return evaluateImage({
      rights: source.imageRights,
      url: item.imageUrl,
      bytes,
      attribution: source.name,
      sourceName: source.name,
      license: source.imageRights,
    });
  });
  const primaryPublisher = publisherKey(item.url);
  const related = otherReports.filter((report) => {
    if (!report.url || !report.title || report.sourceName === source.name) return false;
    if (publisherKey(report.url) === primaryPublisher) return false;
    const left = report.publishedAt ? Date.parse(report.publishedAt) : NaN;
    const right = item.publishedAt ? Date.parse(item.publishedAt) : NaN;
    if (Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) > 72 * 60 * 60 * 1000) return false;
    return jaccard(titleTokens(report.title), titleTokens(item.title)) >= 0.6;
  }).filter((report, index, all) => all.findIndex((candidate) => publisherKey(candidate.url) === publisherKey(report.url)) === index).slice(0, 3);
  const corroboratingPages: { sourceName: string; sourceTitle: string; sourceUrl: string; page: ExtractedPage }[] = [];
  for (const report of related) {
    const secondary = await fetchArticlePage(report.url, fetchImpl);
    if (secondary.ok && secondary.page.wordCount >= 80) corroboratingPages.push({ sourceName: report.sourceName, sourceTitle: report.title, sourceUrl: report.url, page: secondary.page });
  }
  const written = await writeGroundedReport({ sourceName: source.name, sourceTitle: item.title, sourceUrl: item.url, page: loaded.page, corroboratingPages, lookup: lookupProfileNames });
  const image = await imageTask;
  // No photo the source lets us use: a licensed, clearly-labelled illustration.
  const verified = image.status === "verified" ? image : illustrativeImage(source.categories[0], item.title);
  if (!written.ok) return { brief: null, image: verified, reason: written.reason };
  return { brief: written.brief, image: verified, reason: null };
}


function publisherKey(value: string): string {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\\./, ""); }
  catch { return ""; }
}
