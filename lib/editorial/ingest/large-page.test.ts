import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchArticlePage } from "@/lib/editorial/ingest/fetch";

const article = `<html><head><title>NOAA milestone</title><meta property="og:title" content="NOAA weather modeling hits key milestone"></head><body><article><h1>NOAA weather modeling hits key milestone</h1>${"<p>NOAA marked an important milestone in numerical weather modeling on November 3 with a new rapid-update forecast system that refreshes every hour.</p>".repeat(8)}</article>`;

function fakeFetch(html: string): typeof fetch {
  return (async () => new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } })) as unknown as typeof fetch;
}

describe("heavy official source pages", () => {
  it("reads an article from a page larger than the read cap instead of failing", async () => {
    const huge = article + `<div>${"x".repeat(4_000_000)}</div></body></html>`;
    const result = await fetchArticlePage("https://www.noaa.gov/news-release/test", fakeFetch(huge));
    assert.equal(result.ok, true, result.ok ? "" : result.error);
  });

  it("drops scripts and styles from script-heavy pages", async () => {
    const heavy = `<html><head><script>${"var a=1;".repeat(150_000)}</script><style>${".x{}".repeat(100_000)}</style></head><body>${article.slice(article.indexOf("<article>"))}</body></html>`;
    const result = await fetchArticlePage("https://www.noaa.gov/news-release/test", fakeFetch(heavy));
    assert.equal(result.ok, true);
    if (result.ok) assert.match(result.page.paragraphs.join(" "), /rapid-update forecast system/);
  });

  it("still rejects pages without a usable article", async () => {
    const result = await fetchArticlePage("https://www.noaa.gov/news-release/test", fakeFetch(`<html><body>${"x".repeat(3_500_000)}</body></html>`));
    assert.equal(result.ok, false);
  });
});
