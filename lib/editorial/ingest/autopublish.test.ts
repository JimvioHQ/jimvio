import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { distinctiveEntities, sameStory, sharedEntityCount } from "@/lib/editorial/ingest/feed";
import {
  FAILED_SOURCE_BACKOFF_MS,
  planSourceItems,
  QUEUED_REASON,
  researchCandidates,
  sourceResting,
  type ItemResearch,
} from "@/lib/editorial/ingest/plan";
import type { OriginalBrief } from "@/lib/editorial/ingest/compose";
import type { ImageDecision } from "@/lib/editorial/ingest/images";
import { DEFAULT_INGEST_SETTINGS, type FeedItem, type SourceRecord } from "@/lib/editorial/ingest/types";

const now = new Date("2026-11-06T12:00:00.000Z");
const auto = { ...DEFAULT_INGEST_SETTINGS, mode: "auto" as const, ownerAutopublishAuthorized: true, dailyPublishCap: 5, emergencyStop: false };

function source(overrides: Partial<SourceRecord> = {}): SourceRecord {
  return {
    id: "22222222-2222-4222-a222-222222222222",
    name: "WeeTracker",
    kind: "rss",
    locator: "https://weetracker.com/feed/",
    categories: ["business"],
    language: "en",
    region: "KE",
    permittedUsage: "facts",
    imageRights: "none",
    pollMinutes: 180,
    enabled: true,
    alwaysReview: false,
    health: "ok",
    lastSuccessAt: null,
    lastAttemptAt: null,
    lastError: null,
    termsNote: "",
    rateNote: "",
    accessMethod: "rss",
    verifiedAt: null,
    ...overrides,
  };
}

function feedItem(title: string, url: string, publishedAt = "2026-11-06T09:00:00.000Z"): FeedItem {
  return { title, url, guid: url, publishedAt, summary: "A fintech company withdrew its planned listing after investor talks.", language: "en", creator: null, imageUrl: null };
}

const image: ImageDecision = {
  status: "verified",
  url: "https://images.unsplash.com/photo-1?w=1600",
  alt: "Illustration",
  caption: "Illustrative photo (Unsplash). It is not a picture of the people or events in this story.",
  license: "Unsplash License",
  mime: "image/jpeg",
  width: 1600,
  height: 900,
  note: "Licensed Unsplash illustration.",
};

function brief(url: string, overrides: Partial<OriginalBrief> = {}): OriginalBrief {
  return {
    title: "OPay shelves its listing plan as investors reassess fintech valuations",
    excerpt: "OPay has withdrawn a planned public listing, according to two independent reports, as investors reassess fintech valuations across Africa.",
    bodyHtml: "<p>OPay withdrew a planned listing.</p><h2>What happened</h2><p>Two publishers reported the decision.</p>",
    category: "business",
    tags: "opay, fintech",
    seoTitle: "OPay shelves listing plan",
    seoDescription: "OPay withdrew a planned listing.",
    sourceName: "WeeTracker",
    sourceUrl: url,
    evidence: "Grounded report from two publishers.",
    sensitive: false,
    originalityOk: true,
    sufficient: true,
    issues: [],
    ...overrides,
  };
}

const research = (url: string): ItemResearch => ({ brief: brief(url), image, reason: null });
const corroboration = [{
  sourceName: "Techpoint Africa",
  title: "OPay drops IPO plans amid fintech valuation reset",
  url: "https://techpoint.africa/2026/11/06/opay-drops-ipo/",
  summary: "",
  publishedAt: "2026-11-06T08:00:00.000Z",
}];

function plan(overrides: Partial<Parameters<typeof planSourceItems>[0]> = {}) {
  const primary = feedItem("OPay scraps IPO as African fintech valuations reset", "https://weetracker.com/2026/11/06/opay-ipo/");
  return planSourceItems({
    settings: auto,
    source: source(),
    items: [primary],
    existingItems: [],
    existingArticles: [],
    now,
    serverAutopublish: true,
    publishedToday: 0,
    otherReports: corroboration,
    researchFor: (entry) => research(entry.url),
    ...overrides,
  });
}

describe("media autopublish pipeline", () => {
  it("rests a repeatedly failing source so it cannot take every run's slots", () => {
    const failed = (hoursAgo: number) => ({ status: "failed", startedAt: new Date(now.getTime() - hoursAgo * 3600_000).toISOString() });
    assert.equal(sourceResting([failed(1), failed(2), failed(3)], 3, now), true);
    // After the back-off one probe is allowed again (recovery).
    const old = FAILED_SOURCE_BACKOFF_MS / 3600_000 + 1;
    assert.equal(sourceResting([failed(old), failed(old + 1), failed(old + 2)], 3, now), false);
    // A success in the recent window means the source is healthy.
    assert.equal(sourceResting([failed(1), { status: "succeeded", startedAt: now.toISOString() }, failed(3)], 3, now), false);
    assert.equal(sourceResting([failed(1)], 3, now), false);
  });

  it("matches the same story across publishers without matching unrelated ones", () => {
    assert.equal(sameStory("OPay scraps IPO as African fintech valuations reset", "OPay drops IPO plans amid fintech valuation reset"), true);
    assert.equal(sameStory("OPay scraps IPO as African fintech valuations reset", "M-Pesa adds savings feature for Kenyan users"), false);
    assert.equal(sameStory("Apple launches new iPhone", "Apple faces EU fine over App Store rules"), false);
    assert.deepEqual(distinctiveEntities("OPay’s IPO raises USD 29 M").includes("opay"), true);
    assert.ok(sharedEntityCount("OPay IPO Lagos Olu Akanmu", "Olu Akanmu said OPay IPO was paused in Lagos") >= 3);
  });

  it("spends research on a fresh, same-language story, never on a stale one", () => {
    const stale = feedItem("Old story", "https://weetracker.com/old/", "2026-10-30T00:00:00.000Z");
    const french = { ...feedItem("Histoire", "https://weetracker.com/fr/"), language: "fr" };
    const fresh = feedItem("Fresh story", "https://weetracker.com/fresh/");
    const picked = researchCandidates([stale, french, fresh], { settings: auto, source: source(), now });
    assert.deepEqual(picked.map((entry) => entry.url), ["https://weetracker.com/fresh/"]);
    assert.deepEqual(researchCandidates([fresh], { settings: auto, source: source({ permittedUsage: "link" }), now }), []);
  });

  it("A: publishes a corroborated, quality-checked story with a licensed image", () => {
    const rows = plan();
    assert.equal(rows[0]?.status, "published");
    assert.equal(rows[0]?.article?.intent, "published");
    assert.equal(rows[0]?.article?.imageLicense, "Unsplash License");
    assert.match(rows[0]?.evidence ?? "", /techpoint\.africa/);
  });

  it("C: a single-source story goes to review, not to the public site", () => {
    const rows = plan({ otherReports: [] });
    assert.equal(rows[0]?.status, "review");
    assert.equal(rows[0]?.filterReason, "insufficient_independent_sources");
  });

  it("F: a sensitive story goes to review even when corroborated", () => {
    const rows = plan({ researchFor: (entry) => ({ brief: brief(entry.url, { sensitive: true }), image, reason: null }) });
    assert.equal(rows[0]?.status, "review");
  });

  it("G/H: emergency-off mode and the daily cap stop automatic publication", () => {
    assert.equal(plan({ serverAutopublish: false })[0]?.status, "review");
    assert.equal(plan({ settings: { ...auto, ownerAutopublishAuthorized: false } })[0]?.status, "review");
    const capped = plan({ publishedToday: 5 });
    assert.notEqual(capped[0]?.status, "published");
  });

  it("queues stories it did not research instead of dropping them, and re-plans them later", () => {
    const first = plan({ researchFor: () => null });
    assert.equal(first[0]?.status, "discovered");
    assert.equal(first[0]?.filterReason, QUEUED_REASON);
    assert.equal(first[0]?.article, null);
    assert.match(first[0]?.imageNote ?? "", /queued/);

    const later = plan({
      existingItems: [{ id: first[0]!.id, externalKey: first[0]!.externalKey, fingerprint: first[0]!.fingerprint, articleId: null, url: first[0]!.url, queued: true }],
    });
    assert.equal(later[0]?.id, first[0]?.id);
    assert.equal(later[0]?.status, "published");

    // E: a decided (non-queued) record is a duplicate and is never written again.
    const dup = plan({
      existingItems: [{ id: first[0]!.id, externalKey: first[0]!.externalKey, fingerprint: first[0]!.fingerprint, articleId: "a1", url: first[0]!.url }],
    });
    assert.equal(dup[0]?.status, "duplicate");
  });

  it("keeps the exact quality-gate reasons as evidence", () => {
    const rows = plan({ researchFor: () => ({ brief: null, image, reason: "quality_gate", issues: ["insufficient_independent_sources", "overlong"] }) });
    assert.equal(rows[0]?.status, "review");
    assert.match(rows[0]?.evidence ?? "", /insufficient_independent_sources, overlong/);
  });

  it("D: a stale story is filtered and labelled honestly", () => {
    const rows = plan({ items: [feedItem("Old OPay story", "https://weetracker.com/old/", "2026-10-30T00:00:00.000Z")] });
    assert.equal(rows[0]?.filterReason, "stale");
    assert.match(rows[0]?.imageNote ?? "", /Not checked/);
  });
});
