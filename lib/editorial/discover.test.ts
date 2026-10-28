import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { searchPublishedArticles } from "@/lib/editorial/compose";
import {
  articleLastModified,
  breadcrumbJsonLd,
  jsonLdHtml,
  mediaCollectionJsonLd,
  mediaTitle,
  metaDescription,
  neighborArticles,
  parseDeskRange,
  absoluteImageUrl,
  publicCorrection,
  publicSource,
  readingMinutes,
  relatedArticles,
  showUpdated,
  summarizeDesk,
} from "@/lib/editorial/discover";
import type { MediaCategory, PublicArticle } from "@/lib/editorial/types";

function story(overrides: Partial<PublicArticle> = {}): PublicArticle {
  return {
    id: "story-a",
    slug: "story-a",
    title: "A measured report",
    excerpt: "A public excerpt.",
    bodyHtml: `<p>${"word ".repeat(200)}</p>`,
    category: "news",
    kicker: "News",
    imageUrl: null,
    imageAlt: "A measured report",
    section: "news",
    tags: ["markets"],
    seoTitle: null,
    seoDescription: null,
    authorName: null,
    publishedAt: "2026-10-10T00:00:00.000Z",
    updatedAt: "2026-10-10T00:00:00.000Z",
    fixture: false,
    ...overrides,
  };
}

describe("editorial discovery", () => {
  it("estimates reading time from the article body", () => {
    assert.equal(readingMinutes(""), 0);
    assert.equal(readingMinutes("<p>One</p>"), 1);
    assert.equal(readingMinutes(`<p>${"word ".repeat(200)}</p>`), 1);
    assert.equal(readingMinutes(`<p>${"word ".repeat(300)}</p>`), 2);
  });

  it("trims descriptions on a word boundary and avoids a repeated brand title", () => {
    assert.equal(metaDescription(null, "  "), undefined);
    assert.equal(metaDescription("Stored description", "Excerpt that should not win"), "Stored description");
    const long = `${"alpha ".repeat(40)}omega`;
    const trimmed = metaDescription(null, long);
    assert.ok(trimmed);
    assert.ok((trimmed ?? "").length <= 160);
    assert.equal((trimmed ?? "").endsWith(" "), false);
    assert.equal(mediaTitle("Markets this week"), "Markets this week");
    assert.deepEqual(mediaTitle("Jimvio Media weekly"), { absolute: "Jimvio Media weekly" });
  });

  it("ranks shared tags ahead of the same section and orders neighbors by publication time", () => {
    const current = story();
    const tagged = story({
      id: "tagged",
      slug: "tagged",
      category: "business" as MediaCategory,
      tags: ["markets"],
      publishedAt: "2026-10-09T00:00:00.000Z",
    });
    const same = story({
      id: "same",
      slug: "same",
      tags: ["other"],
      publishedAt: "2026-10-11T00:00:00.000Z",
    });
    const older = story({
      id: "older",
      slug: "older",
      tags: [],
      publishedAt: "2026-10-01T00:00:00.000Z",
    });
    const unrelated = story({
      id: "other",
      slug: "other",
      category: "lifestyle",
      tags: ["food"],
      publishedAt: "2026-10-12T00:00:00.000Z",
    });
    const related = relatedArticles([current, tagged, same, older, unrelated], current, 3);
    assert.deepEqual(related.map((item) => item.id), ["tagged", "same", "older"]);
    const neighbors = neighborArticles([older, current, same, tagged], current);
    assert.equal(neighbors.previous?.id, "older");
    assert.equal(neighbors.next?.id, "same");
    assert.deepEqual(neighborArticles([current], story({ publishedAt: null })), {
      previous: null,
      next: null,
    });
  });

  it("builds escaped structured data without a second organization", () => {
    const crumbs = breadcrumbJsonLd("https://www.jimvio.com", [
      { name: "Media", path: "/media" },
      { name: "News <script>", path: "/media/category/news" },
    ]);
    const html = jsonLdHtml(crumbs);
    assert.equal(html.includes("<script>"), false);
    assert.match(html, /\\u003cscript/);
    const collection = mediaCollectionJsonLd("https://www.jimvio.com/");
    assert.equal(collection.publisher && (collection.publisher as { "@id": string })["@id"], "https://www.jimvio.com/#organization");
    const action = collection.potentialAction as { target: { urlTemplate: string } };
    assert.equal(action.target.urlTemplate, "https://www.jimvio.com/media/search?q={search_term_string}");
    assert.equal(showUpdated("2026-10-01T00:00:00.000Z", "2026-10-01T00:00:30.000Z"), false);
    assert.equal(showUpdated("2026-10-01T00:00:00.000Z", "2026-10-01T00:02:00.000Z"), true);
    assert.equal(articleLastModified({ updatedAt: "2026-10-02T00:00:00.000Z", publishedAt: "2026-10-01T00:00:00.000Z" })?.toISOString(), "2026-10-02T00:00:00.000Z");
  });

  it("shows only a safe source and a real correction note", () => {
    assert.equal(publicSource({ sourceUrl: "javascript:alert(1)" }), null);
    assert.deepEqual(publicSource({ sourceName: "Reuters", sourceUrl: "http://example.com" }), {
      name: "Reuters",
      url: null,
    });
    assert.equal(publicSource({ sourceUrl: "https://www.reuters.com/world/story" })?.url, "https://www.reuters.com/world/story");
    assert.equal(absoluteImageUrl("https://www.jimvio.com", "/editorial/desk-mark.png"), null);
    assert.equal(
      absoluteImageUrl("https://www.jimvio.com", "https://www.nasa.gov/wp-content/uploads/2026/10/chapeamission2.jpg"),
      "https://www.nasa.gov/wp-content/uploads/2026/10/chapeamission2.jpg",
    );
    assert.equal(publicCorrection("   "), null);
    assert.equal(publicCorrection("Fixed the date."), "Fixed the date.");
  });

  it("counts stored articles without inventing months, views, or history", () => {
    const now = new Date("2026-10-27T12:00:00.000Z");
    const range = parseDeskRange("not-a-date", "2026-12-01", now);
    assert.equal(range.to, "2026-10-27");
    assert.equal(range.from <= range.to, true);
    const reversed = parseDeskRange("2026-10-20", "2026-10-01", now);
    assert.equal(reversed.from, "2026-10-01");
    assert.equal(reversed.to, "2026-10-01");
    const empty = summarizeDesk([], { from: "2026-07-30", to: "2026-10-27" });
    assert.equal(empty.publishedInRange, 0);
    assert.deepEqual(empty.months, []);
    assert.equal(empty.byStatus.published, 0);
    assert.equal(empty.capped, false);
    const summary = summarizeDesk(
      [
        { status: "published", category: "news", publishedAt: "2026-10-15T18:00:00.000Z" },
        { status: "published", category: "news", publishedAt: "2026-01-01T00:00:00.000Z" },
        { status: "draft", category: "news", publishedAt: null },
        { status: "scheduled", category: "guides", publishedAt: null },
      ],
      { from: "2026-10-01", to: "2026-10-31" },
    );
    assert.equal(summary.publishedInRange, 1);
    assert.deepEqual(summary.months, [{ month: "2026-10", count: 1 }]);
    assert.equal(summary.byStatus.draft, 1);
    assert.equal(summary.byStatus.published, 2);
    assert.equal(summary.byCategory.find((item) => item.slug === "news")?.count, 3);
  });

  it("searches published titles and keeps the section filter", () => {
    const articles = [
      story({ title: "Kigali markets open", excerpt: "Trade", tags: ["trade"] }),
      story({ id: "guide", slug: "guide", title: "A quiet guide", category: "guides", excerpt: "Markets inside a guide", tags: [] }),
    ];
    assert.deepEqual(searchPublishedArticles(articles, "m"), []);
    assert.deepEqual(
      searchPublishedArticles(articles, "markets", "guides").map((item) => item.id),
      ["guide"],
    );
    assert.equal(searchPublishedArticles(articles, "kigali").length, 1);
  });
});
