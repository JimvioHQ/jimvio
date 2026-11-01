import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { articlesInCategory, composeHome, searchArticles } from "@/lib/editorial/compose";
import { EDITORIAL_FIXTURES } from "@/lib/editorial/fixtures";
import { sniffImageMime } from "@/lib/editorial/images";
import { sanitizeArticleHtml } from "@/lib/editorial/sanitize";
import type { ArticleInput } from "@/lib/editorial/types";
import {
  articleJsonLd,
  indexableArticles,
  mediaSitemapEntries,
  planArticleWrite,
  publisherDenial,
  publishedInstant,
  resolveSlug,
  suffixedSlug,
  uploadOriginAllowed,
} from "@/lib/editorial/publish";
import type { MediaStatus, PublicArticle } from "@/lib/editorial/types";
import {
  canTransition,
  isBannedByline,
  isPubliclyVisible,
  isSafeHref,
  isSafeImageUrl,
  displayKicker,
  paginate,
  publicAuthorName,
  resolveMediaCategory,
  shouldUseFixtures,
  validateArticle,
} from "@/lib/editorial/validate";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const { destructiveFindings } = require("../../scripts/release/migration-policy.mjs") as {
  destructiveFindings: (sql: string) => string[];
};

function read(relative: string) {
  return readFileSync(join(root, relative), "utf8");
}

function article(overrides: Partial<ArticleInput> = {}): ArticleInput {
  return {
    title: "A local report from Kigali",
    excerpt: "This excerpt is long enough to publish.",
    bodyHtml: "<p>This body is long enough to publish today.</p>",
    category: "news",
    kicker: "News",
    imageUrl: "/editorial/skyline.jpg",
    imageAlt: "Kigali skyline",
    section: "news",
    tags: "local, founders",
    seoTitle: "",
    seoDescription: "",
    authorName: "Aline Uwase",
    scheduledAt: "",
    ...overrides,
  };
}

describe("editorial publishing guards", () => {
  it("strips scripts, event handlers, and unsafe links", () => {
    const html = sanitizeArticleHtml(
      `<script>alert(1)</script><p onclick="alert(1)">Hello <strong>there</strong></p><img src=x onerror=alert(1)><a href="javascript:alert(1)">bad</a><a href="https://example.com/story">ok</a><a href="/media">home</a>`,
    );
    assert.equal(html.includes("<script"), false);
    assert.equal(html.includes("onerror"), false);
    assert.equal(html.includes("onclick"), false);
    assert.equal(html.includes("<img"), false);
    assert.equal(html.includes("javascript:"), false);
    assert.match(html, /<p>Hello <strong>there<\/strong><\/p>/);
    assert.match(html, /href="https:\/\/example\.com\/story"/);
    assert.match(html, /rel="noopener noreferrer"/);
    assert.match(html, /href="\/media"/);
    assert.equal(html.includes('href="/media" target='), false);
    assert.equal(html.includes("alert(1)"), false);
    const hidden = sanitizeArticleHtml(`<p>Visible</p><!--<script>alert(1)</script>--><SCRIPT>alert(2)</SCRIPT><svg><img src=x onerror=alert(3)></svg>`);
    assert.equal(hidden.includes("alert"), false);
    assert.equal(hidden.includes("<svg"), false);
    assert.equal(hidden.includes("<img"), false);
    assert.match(hidden, /<p>Visible<\/p>/);
  });

  it("rejects editorial-team bylines and unsafe images", () => {
    assert.equal(isBannedByline("Jimvio Editorial Team"), true);
    assert.equal(isBannedByline("By Jimvio Editorial Team"), true);
    assert.equal(isBannedByline("Staff Writer"), true);
    assert.equal(isBannedByline("Jimvio"), true);
    assert.equal(publicAuthorName("Jimvio Editorial Team"), null);
    assert.equal(publicAuthorName("Aline Uwase"), "Aline Uwase");
    assert.equal(isSafeImageUrl("/editorial/skyline.jpg"), true);
    assert.equal(isSafeImageUrl("/editorial/../secret.jpg"), false);
    assert.equal(isSafeImageUrl("https://user:pass@cdn.example/a.jpg"), false);
    assert.equal(isSafeImageUrl("https://127.0.0.1/a.jpg"), false);
    assert.equal(isSafeImageUrl("https://cdn.example/a.svg"), false);
    assert.equal(isSafeImageUrl("http://cdn.example/a.jpg"), false);
    assert.equal(isSafeHref("javascript:alert(1)"), false);
    assert.equal(isSafeHref("//evil.example"), false);
    assert.equal(isSafeHref("https://example.com/story"), true);
  });

  it("keeps publish, schedule, and draft as different steps", () => {
    assert.equal(canTransition("published", "scheduled"), false);
    assert.equal(canTransition("published", "review"), false);
    assert.equal(canTransition("published", "draft"), true);
    assert.equal(canTransition("published", "archived"), true);
    assert.equal(canTransition("archived", "published"), false);
    assert.equal(canTransition("archived", "draft"), true);
    assert.equal(canTransition("draft", "published"), true);
    assert.equal(canTransition("review", "published"), true);
    const future = new Date(Date.now() + 5 * 60_000).toISOString();
    const ready = validateArticle(article(), "published");
    assert.deepEqual(ready.errors, {});
    const missingImage = validateArticle(article({ imageUrl: "" }), "published");
    assert.ok(missingImage.errors.imageUrl);
    const tooSoon = validateArticle(article({ scheduledAt: new Date().toISOString() }), "scheduled");
    assert.ok(tooSoon.errors.scheduledAt);
    const scheduled = validateArticle(article({ scheduledAt: future }), "scheduled");
    assert.deepEqual(scheduled.errors, {});
    const banned = validateArticle(article({ authorName: "Jimvio Editorial Team" }), "draft");
    assert.ok(banned.errors.authorName);
  });

  it("uses design fixtures only outside production when nothing is published", () => {
    assert.equal(shouldUseFixtures(0, { nodeEnv: "production", mediaFixtures: "1" }), false);
    assert.equal(shouldUseFixtures(0, { nodeEnv: "development", mediaFixtures: "1" }), true);
    assert.equal(shouldUseFixtures(0, { nodeEnv: "development", mediaFixtures: "0" }), false);
    assert.equal(shouldUseFixtures(2, { nodeEnv: "development" }), false);
    for (const story of EDITORIAL_FIXTURES) {
      assert.equal(story.fixture, true);
      assert.equal(story.authorName, null);
      assert.equal(/editorial team/i.test(story.title), false);
    }
  });

  it("fills homepage slots without repeating a story", () => {
    const home = composeHome(EDITORIAL_FIXTURES);
    assert.equal(home.heroes.length, 3);
    assert.equal(home.featured.length, 3);
    assert.equal(home.latest.length, 4);
    assert.equal(home.magazine.length, 3);
    assert.equal(home.guides.length, 3);
    assert.equal(home.allStories.length, 12);
    assert.ok(home.sections.length > 0);
    assert.ok(home.sections.every((section) => section.articles.length > 0 && section.articles.length <= 3));
    assert.ok(home.sections.some((section) => section.slug === "technology"));
    assert.ok(home.sections.some((section) => section.slug === "business"));
    const ids = [...home.heroes, ...home.featured, ...home.latest, ...home.magazine, ...home.guides].map(
      (story) => story.id,
    );
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(searchArticles(EDITORIAL_FIXTURES, "r").length, 0);
    assert.ok(searchArticles(EDITORIAL_FIXTURES, "rwanda").length >= 1);
    assert.equal(articlesInCategory(EDITORIAL_FIXTURES, "guides").length, 3);
    assert.equal(resolveMediaCategory("Technology"), "technology");
  });

  it("puts News, Technology, and Business stories on their own listings", () => {
    const story = (category: PublicArticle["category"], slug: string): PublicArticle => ({
      id: slug,
      slug,
      title: slug,
      excerpt: "An excerpt that is public.",
      bodyHtml: "<p>This body is long enough to publish today.</p>",
      category,
      kicker: "Custom",
      imageUrl: null,
      imageAlt: "",
      section: "standard",
      tags: [],
      seoTitle: null,
      seoDescription: null,
      authorName: "Aline Uwase",
      publishedAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-02T00:00:00.000Z",
      fixture: false,
    });
    const rows = [story("news", "desk-note"), story("technology", "chip-note"), story("business", "market-note")];
    assert.deepEqual(articlesInCategory(rows, "news").map((item) => item.slug), ["desk-note"]);
    assert.deepEqual(articlesInCategory(rows, "News").map((item) => item.slug), ["desk-note"]);
    assert.deepEqual(articlesInCategory(rows, "technology").map((item) => item.slug), ["chip-note"]);
    assert.deepEqual(articlesInCategory(rows, "business").map((item) => item.slug), ["market-note"]);
    assert.equal(articlesInCategory(rows, "sports").length, 0);
    assert.equal(displayKicker({ category: "technology", kicker: "AI" }), "TECHNOLOGY");
    assert.equal(displayKicker({ category: "business", kicker: "Markets" }), "BUSINESS");
  });

  it("accepts real image bytes and rejects markup", () => {
    assert.equal(sniffImageMime(Uint8Array.from([0xff, 0xd8, 0xff, 0x00])), "image/jpeg");
    assert.equal(
      sniffImageMime(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])),
      "image/png",
    );
    assert.equal(sniffImageMime(Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])), "image/gif");
    const webp = new Uint8Array(13);
    webp.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    assert.equal(sniffImageMime(webp), "image/webp");
    assert.equal(sniffImageMime(Uint8Array.from([0x3c, 0x73, 0x76, 0x67])), null);
    const over = new Uint8Array(4 * 1024 * 1024 + 1);
    over[0] = 0xff;
    over[1] = 0xd8;
    over[2] = 0xff;
    assert.equal(sniffImageMime(over), null);
    const route = read("app/api/media/images/route.ts");
    assert.match(route, /Images must be 4 MB or smaller/);
    assert.ok(route.indexOf("try {") < route.indexOf("secure_url"));
    const editor = read("components/editorial/admin/editor.tsx");
    assert.match(editor, /Images must be 4 MB or smaller/);
    assert.equal(editor.includes("The image could not be uploaded. Paste an https URL instead."), false);
  });

  it("keeps the media migration additive and unpublished", () => {
    const sql = read("supabase/migrations/20261027180000_media_articles.sql");
    assert.deepEqual(destructiveFindings(sql), []);
    for (const category of [
      "news",
      "blog",
      "magazine",
      "guides",
      "reviews",
      "analysis",
      "opinion",
      "business",
      "technology",
      "lifestyle",
    ]) {
      assert.match(sql, new RegExp(`'${category}'`));
    }
    assert.match(sql, /'archived'/);
    assert.match(sql, /idempotency_key/);
    assert.match(sql, /source_name/);
    assert.match(sql, /correction_note/);
    assert.match(sql, /media_articles_source_url_len/);
    assert.equal(/status = 'archived'/.test(sql), false);
    assert.match(sql, /GRANT SELECT ON TABLE public\.media_articles TO anon, authenticated/);
    assert.equal(/create policy[\s\S]*for\s+(insert|update|delete)/i.test(sql), false);
    assert.equal(/alter type\s+user_role/i.test(sql), false);
    assert.equal(sql.includes("super_admin"), false);
    const allowlist = read("scripts/release/eligible-migrations.json");
    assert.equal(allowlist.includes("20261027180000"), true);
  });

  it("authorizes every editorial write on the server", () => {
    const actions = read("lib/editorial/actions.ts");
    const names = [...actions.matchAll(/export async function (\w+)/g)].map((match) => match[1]);
    assert.deepEqual(names, ["saveMediaArticle", "removeMediaTag"]);
    for (const name of names) {
      const start = actions.indexOf(`export async function ${name}`);
      const body = actions.slice(start, start + 700);
      assert.match(body, /requirePublisher\(/);
      assert.match(body, /publisherDenial\(/);
    }
    const saveStart = actions.indexOf("export async function saveMediaArticle");
    const saveBody = actions.slice(saveStart);
    assert.ok(saveBody.indexOf("publisherDenial") < saveBody.indexOf("adminInsertArticle"));
    assert.ok(saveBody.indexOf("publisherDenial") < saveBody.indexOf("adminUpdateArticle"));
    assert.match(read("app/api/media/images/route.ts"), /requirePlatformAdmin\(/);
    assert.match(read("app/api/media/images/route.ts"), /uploadOriginAllowed\(/);
    assert.match(read("app/robots.ts"), /\/media\/admin/);
    assert.match(read("app/robots.ts"), /\/media\/preview/);
    assert.equal(read("app/media/sitemap.ts").includes("EDITORIAL_FIXTURES"), false);
    assert.match(read("app/media/sitemap.ts"), /export const revalidate = 60/);
    const reader = read("lib/editorial/public-store.ts");
    assert.equal(reader.includes("getAdminDB"), false);
    assert.match(reader, /getSupabasePublishableKey/);
    assert.match(reader, /source_name/);
    assert.match(reader, /updated_at/);
    assert.match(reader, /\.in\("status", \["published", "scheduled"\]\)/);
    const analytics = read("app/media/admin/analytics/page.tsx");
    assert.match(analytics, /assertPlatformAdmin/);
    assert.equal(analytics.includes("x-forwarded-for"), false);
    assert.match(read("lib/editorial/actions.ts"), /source_name: plan\.sourceName/);
    assert.match(read("lib/editorial/actions.ts"), /revalidatePath\("\/media\/sitemap\.xml"\)/);
    assert.match(read("app/media/(site)/article/[slug]/page.tsx"), /title: \{ absolute: "Jimvio Media" \}/);
    assert.match(read("app/media/(site)/search/page.tsx"), /\/media\/search/);
    const protectedPaths = read("lib/supabase/middleware.ts").match(/const protectedPaths = \[([\s\S]*?)\];/);
    assert.ok(protectedPaths);
    assert.match(protectedPaths[1], /"\/media\/admin"/);
    assert.match(protectedPaths[1], /"\/media\/preview"/);
    assert.equal(protectedPaths[1].includes('"/media"'), false);
    const preview = read("lib/ops/preview-guard.ts");
    assert.match(preview, /\/media\/admin/);
    assert.match(preview, /\/api\/media/);
  });
});

function saved(overrides: Partial<{ status: MediaStatus; publishedAt: string | null; updatedAt: string; slug: string }> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "kigali-report",
    status: "draft" as MediaStatus,
    publishedAt: null as string | null,
    updatedAt: "2026-10-27T12:00:00.000Z",
    ...overrides,
  };
}

describe("editorial lifecycle decisions", () => {
  const now = new Date("2026-10-27T12:00:00.000Z");

  it("lets only a platform admin publish and denies everyone else", () => {
    assert.equal(publisherDenial({ ok: true }), null);
    assert.equal(publisherDenial({ ok: false, status: 401 }), "Sign in as an administrator.");
    assert.equal(
      publisherDenial({ ok: false, status: 403 }),
      "You do not have permission to publish.",
    );
  });

  it("rejects a missing upload origin and accepts only the same origin", () => {
    assert.equal(uploadOriginAllowed({ origin: null, host: "www.jimvio.com", secFetchSite: null }), false);
    assert.equal(uploadOriginAllowed({ origin: null, host: null, secFetchSite: "same-origin" }), false);
    assert.equal(
      uploadOriginAllowed({ origin: "https://evil.example", host: "www.jimvio.com", secFetchSite: "cross-site" }),
      false,
    );
    assert.equal(
      uploadOriginAllowed({ origin: "https://shop.jimvio.com", host: "www.jimvio.com", secFetchSite: "same-site" }),
      false,
    );
    assert.equal(
      uploadOriginAllowed({ origin: "https://www.jimvio.com", host: "www.jimvio.com", secFetchSite: null }),
      true,
    );
    assert.equal(uploadOriginAllowed({ origin: null, host: "www.jimvio.com", secFetchSite: "same-origin" }), true);
  });

  it("keeps scheduled stories private until the UTC instant and stores that instant", () => {
    const scheduled = validateArticle(article({ scheduledAt: "2026-10-27T15:00:00.000+02:00" }), "scheduled", now);
    assert.deepEqual(scheduled.errors, {});
    assert.equal(scheduled.scheduledAt, "2026-10-27T13:00:00.000Z");
    const tooSoon = validateArticle(article({ scheduledAt: "2026-10-27T12:00:30.000Z" }), "scheduled", now);
    assert.ok(tooSoon.errors.scheduledAt);
    assert.equal(
      isPubliclyVisible({ status: "scheduled", publishedAt: null, scheduledAt: "2026-10-27T12:05:00.000Z" }, now),
      false,
    );
    assert.equal(
      isPubliclyVisible({ status: "scheduled", publishedAt: null, scheduledAt: "2026-10-27T12:00:00.000Z" }, now),
      true,
    );
    assert.equal(isPubliclyVisible({ status: "draft", publishedAt: null, scheduledAt: null }, now), false);
    assert.equal(isPubliclyVisible({ status: "review", publishedAt: null, scheduledAt: null }, now), false);
    assert.equal(isPubliclyVisible({ status: "archived", publishedAt: "2026-10-01T00:00:00.000Z", scheduledAt: null }, now), false);
    assert.equal(
      isPubliclyVisible({ status: "published", publishedAt: "2026-10-27T13:00:00.000Z", scheduledAt: null }, now),
      false,
    );
  });

  it("publishes once, preserves the first publication time, and refuses stale edits", () => {
    const current = saved({ status: "published", publishedAt: "2026-10-01T08:00:00.000Z" });
    const again = planArticleWrite(current, article({ expectedUpdatedAt: current.updatedAt, title: "A rewritten local report" }), "published", now);
    assert.equal(again.ok, true);
    if (!again.ok) return;
    assert.equal(again.write.publishedAt, "2026-10-01T08:00:00.000Z");
    assert.equal(again.write.slug, "kigali-report");
    assert.equal(publishedInstant("published", current.publishedAt, now.toISOString()), current.publishedAt);

    const stale = planArticleWrite(current, article({ expectedUpdatedAt: "2026-10-27T11:00:00.000Z" }), "published", now);
    assert.equal(stale.ok, false);
    if (stale.ok) return;
    assert.equal(stale.conflict, true);

    const missing = planArticleWrite(current, article(), "draft", now);
    assert.equal(missing.ok, false);
    const blocked = planArticleWrite(current, article({ expectedUpdatedAt: current.updatedAt }), "scheduled", now);
    assert.equal(blocked.ok, false);
    const archived = planArticleWrite(
      saved({ status: "archived", publishedAt: "2026-10-01T08:00:00.000Z" }),
      article({ expectedUpdatedAt: current.updatedAt }),
      "published",
      now,
    );
    assert.equal(archived.ok, false);
  });

  it("normalizes an explicit slug and does not invent a second article address from the title", () => {
    const current = saved();
    const renamed = resolveSlug({ title: "A completely different headline", slug: "kigali-report" }, current.slug);
    assert.deepEqual(renamed, { slug: "kigali-report", mode: "kept" });
    const custom = resolveSlug({ title: "A local report from Kigali", slug: "Kigali Markets!" }, null);
    assert.equal(custom.slug, "kigali-markets");
    assert.equal(custom.mode, "explicit");
    const bad = resolveSlug({ title: "A local report from Kigali", slug: "!!!" }, current.slug);
    assert.ok(bad.error);
    const suffix = suffixedSlug("a-very-long-story-title-that-needs-a-stable-address-for-readers", 0);
    assert.equal(suffix.endsWith("-2"), true);
    assert.ok(suffix.length <= 80);
    const created = planArticleWrite(null, article({ idempotencyKey: "not-a-uuid" }), "draft", now);
    assert.equal(created.ok, true);
    if (!created.ok) return;
    assert.equal(created.write.idempotencyKey, null);
    assert.equal(created.write.slugMode, "generated");
    assert.equal(created.write.sourceName, null);
    assert.equal(created.write.sourceUrl, null);
    assert.equal(created.write.correctionNote, null);
  });

  it("keeps an https source and rejects an unsafe one", () => {
    const http = validateArticle(article({ sourceUrl: "http://example.com/story" }), "draft", now);
    assert.ok(http.errors.sourceUrl);
    const script = validateArticle(article({ sourceUrl: "javascript:alert(1)" }), "draft", now);
    assert.ok(script.errors.sourceUrl);
    const longName = validateArticle(article({ sourceName: "x".repeat(121) }), "draft", now);
    assert.ok(longName.errors.sourceName);
    const planned = planArticleWrite(
      null,
      article({
        sourceName: "  Reuters  ",
        sourceUrl: "https://www.reuters.com/world/story",
        correctionNote: "  Fixed a name.  ",
      }),
      "draft",
      now,
    );
    assert.equal(planned.ok, true);
    if (!planned.ok) return;
    assert.equal(planned.write.sourceName, "Reuters");
    assert.equal(planned.write.sourceUrl, "https://www.reuters.com/world/story");
    assert.equal(planned.write.correctionNote, "Fixed a name.");
  });

  it("omits private and fixture facts from public article metadata", () => {
    assert.equal(articleJsonLd({ ...EDITORIAL_FIXTURES[0], authorName: "Aline" }, "https://www.jimvio.com"), null);
    const data = articleJsonLd(
      {
        fixture: false,
        title: "A local report",
        excerpt: "An excerpt that is public.",
        publishedAt: null,
        imageUrl: null,
        slug: "a-local-report",
        authorName: null,
      },
      "https://www.jimvio.com",
    );
    assert.ok(data);
    assert.equal(data?.["@type"], "Article");
    assert.equal(data?.inLanguage, "en");
    assert.deepEqual(data?.publisher, { "@id": "https://www.jimvio.com/#organization" });
    assert.equal("datePublished" in (data ?? {}), false);
    assert.equal("author" in (data ?? {}), false);
    assert.equal(data?.headline, "A local report");
    assert.equal(
      articleJsonLd(
        {
          fixture: false,
          title: "A local report",
          excerpt: "An excerpt that is public.",
          publishedAt: null,
          imageUrl: null,
          slug: "Bad Slug",
          authorName: null,
        },
        "https://www.jimvio.com",
      ),
      null,
    );
    const news = articleJsonLd(
      {
        fixture: false,
        category: "news",
        title: "A local report",
        excerpt: "An excerpt that is public.",
        publishedAt: "2026-10-01T08:00:00.000Z",
        updatedAt: "2026-10-01T08:02:00.000Z",
        imageUrl: "/editorial/skyline.jpg",
        slug: "a-local-report",
        authorName: "Jimvio Editorial Team",
        sourceName: "NASA",
        sourceUrl: "https://www.nasa.gov/news-release/",
      },
      "https://www.jimvio.com",
    );
    assert.equal(news?.["@type"], "NewsArticle");
    assert.equal(news?.datePublished, "2026-10-01T08:00:00.000Z");
    assert.equal("dateModified" in (news ?? {}), false);
    assert.deepEqual(news?.image, ["https://www.jimvio.com/editorial/skyline.jpg"]);
    assert.equal("author" in (news ?? {}), false);
    assert.deepEqual(news?.citation, { "@type": "CreativeWork", name: "NASA", url: "https://www.nasa.gov/news-release/" });
    const corrected = articleJsonLd(
      {
        fixture: false,
        category: "news",
        title: "A local report",
        excerpt: "An excerpt that is public.",
        publishedAt: "2026-10-01T08:00:00.000Z",
        updatedAt: "2026-10-02T08:00:00.000Z",
        imageUrl: "/editorial/skyline.jpg",
        slug: "a-local-report",
        authorName: "Aline Uwase",
        correctionNote: "Fixed the date of the announcement.",
      },
      "https://www.jimvio.com",
    );
    assert.equal(corrected?.datePublished, "2026-10-01T08:00:00.000Z");
    assert.equal(corrected?.dateModified, "2026-10-02T08:00:00.000Z");
    assert.deepEqual(corrected?.author, { "@type": "Person", name: "Aline Uwase" });
    const recent = articleJsonLd(
      {
        fixture: false,
        category: "guides",
        title: "A local report",
        excerpt: "An excerpt that is public.",
        publishedAt: "2026-10-01T08:00:00.000Z",
        updatedAt: "2026-10-01T08:00:30.000Z",
        imageUrl: "http://example.com/note.svg",
        slug: "a-local-report",
        authorName: null,
      },
      "https://www.jimvio.com",
    );
    assert.equal(recent?.["@type"], "Article");
    assert.equal("dateModified" in (recent ?? {}), false);
    assert.equal("image" in (recent ?? {}), false);
    const indexed = indexableArticles([
      { fixture: true, slug: "sample-story" },
      { fixture: false, slug: "real-story" },
      { fixture: false, slug: "Bad Slug" },
    ]);
    assert.deepEqual(indexed, [{ fixture: false, slug: "real-story" }]);
  });

  it("pages a long list without dropping or repeating stories", () => {
    const items = Array.from({ length: 25 }, (_item, index) => index + 1);
    const first = paginate(items, 1, 12);
    const second = paginate(items, 2, 12);
    const third = paginate(items, 9, 12);
    assert.equal(first.items.length, 12);
    assert.equal(first.from, 1);
    assert.equal(second.items[0], 13);
    assert.equal(third.page, 3);
    assert.deepEqual(third.items, [25]);
    assert.equal(new Set([...first.items, ...second.items, ...third.items]).size, 25);
  });

  it("publishes a sitemap of canonical public media urls only", () => {
    assert.deepEqual(mediaSitemapEntries("https://www.jimvio.com", { articles: [], unavailable: true }), []);
    const story = (overrides: Partial<PublicArticle>): PublicArticle => ({
      id: "11111111-1111-4111-8111-111111111111",
      slug: "real-story",
      title: "A local report",
      excerpt: "An excerpt that is public.",
      bodyHtml: "<p>This body is long enough to publish today.</p>",
      category: "news",
      kicker: "News",
      imageUrl: null,
      imageAlt: "Kigali skyline",
      section: "news",
      tags: [],
      seoTitle: null,
      seoDescription: null,
      authorName: null,
      publishedAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-02T00:00:00.000Z",
      fixture: false,
      ...overrides,
    });
    const entries = mediaSitemapEntries("https://www.jimvio.com/", {
      unavailable: false,
      articles: [
        story({}),
        story({ id: "22222222-2222-4222-8222-222222222222", slug: "sample-story", fixture: true }),
        story({ id: "33333333-3333-4333-8333-333333333333", slug: "Bad Slug" }),
        story({}),
      ],
    });
    const urls = entries.map((entry) => entry.url);
    assert.equal(urls[0], "https://www.jimvio.com/media");
    assert.equal(urls.filter((url) => url.endsWith("/media/article/real-story")).length, 1);
    assert.equal(urls.some((url) => url.includes("/media/admin") || url.includes("/media/preview") || url.includes("/media/search")), false);
    assert.equal(urls.includes("https://www.jimvio.com/media/article/sample-story"), false);
    assert.equal(new Set(urls).size, urls.length);
    assert.equal(urls.length, 12);
    const articleEntry = entries.find((entry) => entry.url.endsWith("/real-story"));
    assert.equal(articleEntry?.lastModified?.toISOString(), "2026-10-02T00:00:00.000Z");
    const articleView = read("components/editorial/article-view.tsx");
    assert.equal(articleView.includes("Updated {"), false);
    assert.match(articleView, /article\.authorName/);
    assert.match(articleView, /publicSource\(article\)/);
    assert.match(articleView, /Source:/);
    assert.match(articleView, /Published /);
    const storyImage = read("components/editorial/story-image-asset.tsx");
    assert.match(storyImage, /onError=\{\(\) => setFailed\(true\)\}/);
    assert.match(storyImage, /Jimvio Media/);
    assert.match(storyImage, /role="img"/);
    const homeView = read("components/editorial/home-view.tsx");
    assert.match(homeView, /allStories\.slice\(0, 8\)/);
    assert.match(homeView, /section\.articles\.slice\(0, 2\)/);
    const presentation = read("components/editorial/presentation.tsx");
    assert.match(presentation, /aspect-\[16\/9\]/);
    const categoryPage = read("app/media/(site)/category/[slug]/page.tsx");
    const searchPage = read("app/media/(site)/search/page.tsx");
    assert.equal(categoryPage.includes("Showing "), false);
    assert.equal(searchPage.includes("Showing "), false);
    assert.match(read("app/media/admin/articles/page.tsx"), /Showing /);
    const metadata = read("app/media/(site)/article/[slug]/page.tsx");
    assert.equal(metadata.includes("authors:"), false);
  });
});
