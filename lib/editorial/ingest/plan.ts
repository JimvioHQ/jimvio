import { createHash } from "node:crypto";
import { containsDiagnosticProse, withHeroCaption } from "@/lib/editorial/caption";
import { isEditorialMarkUrl } from "@/lib/editorial/image-display";
import type { MediaCategory, MediaStatus } from "@/lib/editorial/types";
import { resolveMediaCategory } from "@/lib/editorial/validate";
import { isSensitiveText, type OriginalBrief } from "@/lib/editorial/ingest/compose";
import {
  externalKey,
  fingerprintTitle,
  jaccard,
  primaryLanguage,
  titleTokens,
  wordCount,
} from "@/lib/editorial/ingest/feed";
import type { ImageDecision } from "@/lib/editorial/ingest/images";
import {
  DAILY_PUBLISH_MAX,
  type ExistingArticleRef,
  type ExistingItemRef,
  type FeedItem,
  type IngestSettings,
  type PlannedItem,
  type SourceRecord,
} from "@/lib/editorial/ingest/types";

export const STUCK_JOB_MS = 15 * 60 * 1000;
export const MAX_SOURCES_PER_CYCLE = 3;

/** How many stories may publish by this UTC hour so a daily cap is spread across the day. */
export function publishSlotsRemaining(publishedToday: number, cap: number, now: Date): number {
  const limit = Math.min(DAILY_PUBLISH_MAX, Math.max(0, Math.floor(cap)));
  if (limit <= 0 || publishedToday >= limit) return 0;
  const opened = Math.max(1, Math.ceil(((now.getUTCHours() + 1) / 24) * limit));
  return Math.max(0, Math.min(limit, opened) - publishedToday);
}

export function publishPaceOpen(publishedToday: number, cap: number, now: Date): boolean {
  return publishSlotsRemaining(publishedToday, cap, now) > 0;
}

/** A finished feed read may advance the poll clock. A pace hold or a missed writer must not. */
export function cycleSourceOutcome(input: {
  heldForPace: boolean;
  writerUnavailable: boolean;
}): { note: string | null; markSuccess: boolean } {
  if (input.heldForPace) return { note: "Held for the daily publication pace.", markSuccess: false };
  if (input.writerUnavailable) return { note: "Writer unavailable.", markSuccess: false };
  return { note: null, markSuccess: true };
}

export type ItemResearch = {
  brief: OriginalBrief | null;
  image: ImageDecision | null;
  reason: "thin_source" | "writer_unavailable" | "quality_gate" | string | null;
};

export function stableItemId(externalKey: string): string {
  const hex = createHash("sha256").update(externalKey).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function serverAutopublishAuthorized(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.MEDIA_AUTOPUBLISH_AUTHORIZED === "1";
}

/** An item already saved under this external key must not be inserted again. */
export function alreadyStoredDuplicate(item: { status: string; filterReason: string | null }): boolean {
  return item.status === "duplicate" && item.filterReason === "already_stored";
}

export function sourceDue(
  source: { enabled: boolean; lastSuccessAt: string | null; lastAttemptAt: string | null; pollMinutes: number },
  now: Date,
  force = false,
): boolean {
  if (!source.enabled) return false;
  if (force) return true;
  const anchor = source.lastSuccessAt ?? source.lastAttemptAt;
  if (!anchor) return true;
  const time = Date.parse(anchor);
  if (!Number.isFinite(time)) return true;
  return now.getTime() - time >= source.pollMinutes * 60_000;
}

export function isStuckJob(status: string, startedAt: string, now: Date): boolean {
  if (status !== "running") return false;
  const time = Date.parse(startedAt);
  return Number.isFinite(time) && now.getTime() - time > STUCK_JOB_MS;
}

function withinWindow(left: string | null, right: string | null): boolean {
  if (!left || !right) return true;
  const a = Date.parse(left);
  const b = Date.parse(right);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return true;
  return Math.abs(a - b) <= 72 * 60 * 60 * 1000;
}

type Working = FeedItem & { externalKey: string; fingerprint: string; tokens: string[] };

function publisherKey(url: string, fallback: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\\./, "");
  } catch {
    return fallback.trim().toLowerCase();
  }
}

function decideIntent(input: {
  settings: IngestSettings;
  source: SourceRecord;
  sensitive: boolean;
  undated: boolean;
  independent: number;
  imageOk: boolean;
  category: MediaCategory;
  publishedToday: number;
  serverAutopublish: boolean;
  now: Date;
}): { intent: MediaStatus | null; reasons: string[] } {
  const reasons: string[] = [];
  if (input.settings.blockedCategories.includes(input.category)) {
    return { intent: null, reasons: ["category_blocked"] };
  }
  if (input.settings.mode === "discovery") return { intent: null, reasons: ["discovery_only"] };
  if (input.settings.mode === "disabled") return { intent: null, reasons: ["disabled"] };
  const needsReview =
    input.sensitive || input.source.alwaysReview || input.undated || input.settings.mode === "review";
  if (input.settings.mode === "draft" || input.settings.mode === "review") {
    return { intent: needsReview ? "review" : "draft", reasons: needsReview ? ["review_required"] : [] };
  }
  if (!input.serverAutopublish || !input.settings.ownerAutopublishAuthorized) {
    return { intent: "review", reasons: ["autopublish_not_authorized"] };
  }
  if (needsReview) reasons.push("review_required");
  // Auto-publishing requires corroboration from at least two distinct publishers.
  // Related feed entries are only candidate corroboration; they must be from another source.
  if (input.independent < 2) reasons.push("insufficient_independent_sources");
  if (!input.imageOk) reasons.push("image_unavailable");
  if (input.publishedToday >= input.settings.dailyPublishCap) reasons.push("publish_cap");
  if (input.source.permittedUsage !== "facts" && input.source.permittedUsage !== "full") reasons.push("usage");
  if (reasons.length) return { intent: "review", reasons };
  if (!publishPaceOpen(input.publishedToday, input.settings.dailyPublishCap, input.now)) {
    return { intent: null, reasons: ["publish_pace"] };
  }
  return { intent: "published", reasons: [] };
}

export function planSourceItems(input: {
  settings: IngestSettings;
  source: SourceRecord;
  items: FeedItem[];
  existingItems: readonly ExistingItemRef[];
  existingArticles: readonly ExistingArticleRef[];
  now: Date;
  serverAutopublish: boolean;
  publishedToday: number;
  imageFor?: (item: FeedItem) => ImageDecision | null;
  researchFor?: (item: FeedItem) => ItemResearch | null;
  otherReports?: readonly { sourceName: string; title: string; url: string; summary: string; publishedAt: string | null }[];
  ids?: (externalKey: string) => string;
}): PlannedItem[] & { heldForPace: number } {
  const ids = input.ids ?? stableItemId;
  const now = input.now;
  const staleBefore = now.getTime() - input.settings.staleDays * 24 * 60 * 60 * 1000;
  const sourceLanguage = primaryLanguage(input.source.language);
  const knownKeys = new Map(input.existingItems.map((item) => [item.externalKey, item]));
  const knownPrints = new Map(input.existingItems.map((item) => [item.fingerprint, item]));
  const articlePrints = new Map(input.existingArticles.map((article) => [fingerprintTitle(article.title), article.id]));
  const articleUrls = new Map(
    input.existingArticles.filter((article) => article.sourceUrl).map((article) => [article.sourceUrl as string, article.id]),
  );

  const fresh: Working[] = [];
  const planned: PlannedItem[] = [];
  let heldForPace = 0;
  const seen = new Set<string>();
  for (const item of input.items) {
    if (planned.length + fresh.length >= input.settings.maxItemsPerRun) break;
    const key = externalKey(item.url, item.guid);
    if (seen.has(key)) continue;
    seen.add(key);
    const fingerprint = fingerprintTitle(item.title);
    const existing = knownKeys.get(key);
    if (existing) {
      planned.push(blank(ids(key), item, key, fingerprint, existing.articleId ? "drafted" : "discovered", null, existing.id));
      const last = planned[planned.length - 1];
      last.status = "duplicate";
      last.filterReason = "already_stored";
      last.duplicateOf = existing.id;
      last.article = null;
      continue;
    }
    const language = primaryLanguage(item.language);
    if (sourceLanguage && language && sourceLanguage !== language) {
      planned.push(blank(ids(key), item, key, fingerprint, "filtered", "language", null));
      continue;
    }
    if (item.publishedAt && Date.parse(item.publishedAt) < staleBefore) {
      planned.push(blank(ids(key), item, key, fingerprint, "filtered", "stale", null));
      continue;
    }
    if (input.source.permittedUsage === "none" || input.source.permittedUsage === "link") {
      planned.push(blank(ids(key), item, key, fingerprint, "filtered", input.source.permittedUsage === "none" ? "usage_none" : "link_only", null));
      continue;
    }
    fresh.push({ ...item, externalKey: key, fingerprint, tokens: titleTokens(item.title) });
  }

  const groups: Working[][] = [];
  for (const item of fresh) {
    const group = groups.find((candidate) =>
      candidate.some((other) => withinWindow(other.publishedAt, item.publishedAt) && (other.fingerprint === item.fingerprint || jaccard(other.tokens, item.tokens) >= 0.6)),
    );
    if (group) group.push(item);
    else groups.push([item]);
  }

  let publishedSlots = input.publishedToday;
  for (const group of groups) {
    const primary = [...group].sort((left, right) => wordCount(right.summary) - wordCount(left.summary))[0];
    const prior = knownPrints.get(primary.fingerprint);
    const articleHit = articlePrints.get(primary.fingerprint) ?? articleUrls.get(primary.url) ?? null;
    const clusterKey = primary.externalKey.slice(0, 16);
    if (prior || articleHit) {
      for (const item of group) {
        const row = blank(ids(item.externalKey), item, item.externalKey, item.fingerprint, "duplicate", "matching_record", prior?.id ?? null);
        row.clusterKey = clusterKey;
        row.duplicateOf = prior?.id ?? null;
        planned.push(row);
      }
      continue;
    }
    const category =
      input.source.categories
        .map((value) => resolveMediaCategory(value))
        .find((value): value is NonNullable<typeof value> => value !== null) ?? "news";
    const blocked = input.settings.blockedCategories.includes(category);
    const primaryPublisher = publisherKey(primary.url, input.source.name);
    const related = (input.otherReports ?? []).filter((report) => {
      if (report.sourceName === input.source.name) return false;
      if (publisherKey(report.url, report.sourceName) === primaryPublisher) return false;
      return withinWindow(report.publishedAt, primary.publishedAt) && jaccard(titleTokens(report.title), primary.tokens) >= 0.6;
    }).filter((report, index, all) =>
      all.findIndex((candidate) => publisherKey(candidate.url, candidate.sourceName) === publisherKey(report.url, report.sourceName)) === index,
    ).slice(0, 3);
    const ordered = [primary, ...group.filter((item) => item !== primary)];
    const sourceUrls = [primary.url, ...related.map((report) => report.url)].join(" ");
    if (input.settings.mode === "discovery") {
      for (const item of ordered) {
        const row = blank(ids(item.externalKey), item, item.externalKey, item.fingerprint, "discovered", null, null);
        row.clusterKey = clusterKey;
        planned.push(row);
      }
      const primaryRow = planned.find((entry) => entry.externalKey === primary.externalKey);
      for (const row of planned) {
        if (row.clusterKey === clusterKey && row.externalKey !== primary.externalKey && primaryRow) row.duplicateOf = primaryRow.id;
      }
      continue;
    }
    if (blocked) {
      for (const item of ordered) {
        const row = blank(ids(item.externalKey), item, item.externalKey, item.fingerprint, "filtered", "category_blocked", null);
        row.clusterKey = clusterKey;
        planned.push(row);
      }
      continue;
    }
    const research = input.researchFor ? input.researchFor(primary) : null;
    if (!research || research.reason === "writer_unavailable") continue;
    const supplied = input.imageFor ? input.imageFor(primary) : research.image;
    const verified = supplied && supplied.status === "verified" && supplied.url && !isEditorialMarkUrl(supplied.url) ? supplied : null;
    const prose = research.brief ? `${research.brief.title}\n${research.brief.excerpt}\n${research.brief.bodyHtml}` : "";
    const brief = research.brief && research.brief.sufficient && research.brief.originalityOk && research.brief.bodyHtml && !containsDiagnosticProse(prose)
      ? research.brief
      : null;
    const sensitive = isSensitiveText(group.map((item) => `${item.title} ${item.summary}`).join(" ")) || Boolean(brief?.sensitive);
    if (!brief) {
      const reason = research.reason || "thin_source";
      const status: PlannedItem["status"] = reason === "quality_gate" || sensitive ? "review" : "filtered";
      ordered.forEach((item, index) => {
        const row = blank(ids(item.externalKey), item, item.externalKey, item.fingerprint, index === 0 ? status : "grouped", index === 0 ? reason : "grouped", null);
        row.clusterKey = clusterKey;
        row.sensitive = sensitive;
        row.evidence = `Held: ${reason}. ${sourceUrls}`.slice(0, 2000);
        row.imageStatus = "rejected";
        row.imageNote = supplied?.note ?? "No verified official image.";
        planned.push(row);
      });
      const primaryRow = planned.find((entry) => entry.externalKey === primary.externalKey);
      for (const row of planned) {
        if (row.clusterKey === clusterKey && row.externalKey !== primary.externalKey && primaryRow) row.duplicateOf = primaryRow.id;
      }
      continue;
    }
    const decision = decideIntent({
      settings: input.settings,
      source: input.source,
      sensitive,
      undated: !primary.publishedAt,
      independent: new Set([input.source.name, ...related.map((report) => report.sourceName)]).size,
      imageOk: Boolean(verified),
      category,
      publishedToday: publishedSlots,
      serverAutopublish: input.serverAutopublish,
      now,
    });
    if (decision.reasons.includes("publish_pace")) {
      heldForPace += group.length;
      continue;
    }
    let status: PlannedItem["status"] = "filtered";
    let reason: string | null = "quality_gate";
    if (decision.intent === "published") {
      status = "published";
      reason = null;
      publishedSlots += 1;
    } else if (decision.intent === "review") {
      status = "review";
      reason = decision.reasons[0] ?? "review_required";
    } else if (decision.intent === "draft") {
      status = "drafted";
      reason = null;
    } else {
      reason = decision.reasons[0] ?? reason;
    }
    const makeArticle = status === "drafted" || status === "review" || status === "published";
    ordered.forEach((item, index) => {
      const row = blank(ids(item.externalKey), item, item.externalKey, item.fingerprint, index === 0 ? status : "grouped", index === 0 ? reason : "grouped", null);
      row.clusterKey = clusterKey;
      row.sensitive = sensitive;
      row.evidence = `${brief.evidence} Sources: ${sourceUrls}`.slice(0, 2000);
      row.imageStatus = verified ? "verified" : "rejected";
      row.imageNote = verified?.note ?? supplied?.note ?? "No verified official image.";
      if (index === 0 && makeArticle) {
        const intent: MediaStatus = status === "published" ? "published" : status === "review" ? "review" : "draft";
        row.article = {
          intent,
          idempotencyKey: row.id,
          title: brief.title,
          excerpt: brief.excerpt,
          bodyHtml: withHeroCaption(brief.bodyHtml, verified?.caption),
          category,
          tags: brief.tags,
          seoTitle: brief.seoTitle,
          seoDescription: brief.seoDescription,
          sourceName: input.source.name.slice(0, 120),
          sourceUrl: primary.url,
          imageUrl: verified?.url ?? "",
          imageAlt: verified?.alt ?? "",
          imageCaption: verified?.caption ?? "",
          imageLicense: verified?.license ?? "",
        };
      }
      planned.push(row);
    });
    const primaryRow = planned.find((entry) => entry.externalKey === primary.externalKey);
    for (const row of planned) {
      if (row.clusterKey === clusterKey && row.externalKey !== primary.externalKey && primaryRow) row.duplicateOf = primaryRow.id;
    }
  }
  return Object.assign(planned, { heldForPace });
}

function blank(
  id: string,
  item: FeedItem,
  key: string,
  fingerprint: string,
  status: PlannedItem["status"],
  reason: string | null,
  duplicateOf: string | null,
): PlannedItem {
  return {
    id,
    externalKey: key,
    guid: item.guid,
    title: item.title.slice(0, 300),
    url: item.url,
    summary: item.summary.slice(0, 700),
    language: item.language,
    publishedAt: item.publishedAt,
    fingerprint,
    clusterKey: null,
    status,
    filterReason: reason,
    duplicateOf,
    sensitive: false,
    evidence: "",
    imageStatus: "rejected",
    imageNote: "No granted image rights.",
    article: null,
  };
}

export function countPlans(items: readonly PlannedItem[]) {
  return {
    discovered: items.filter((item) => item.status === "discovered").length,
    duplicates: items.filter((item) => item.status === "duplicate").length,
    filtered: items.filter((item) => item.status === "filtered").length,
    grouped: items.filter((item) => item.status === "grouped").length,
    drafted: items.filter((item) => item.status === "drafted").length,
    review: items.filter((item) => item.status === "review").length,
    published: items.filter((item) => item.status === "published").length,
    failed: items.filter((item) => item.status === "failed").length,
  };
}
