import { canonicalUrl, parseFeed } from "@/lib/editorial/ingest/feed";
import { extractArticlePage, type ExtractedPage } from "@/lib/editorial/ingest/page";
import type { FeedItem } from "@/lib/editorial/ingest/types";

const USER_AGENT = "JimvioMediaBot/1.0 (+https://www.jimvio.com/media)";
const MAX_FEED_BYTES = 500_000;
/** Official sites (e.g. noaa.gov) serve 0.5–2 MB of HTML; pages beyond this are read up to the cap. */
const MAX_PAGE_BYTES = 3_000_000;
const MAX_IMAGE_BYTES = 6_000_000;
const TIMEOUT_MS = 8_000;
const IMAGE_TIMEOUT_MS = 12_000;

export type FetchedFeed =
  | { ok: true; format: "rss" | "atom"; items: FeedItem[]; finalUrl: string }
  | { ok: false; error: string; status?: number };

async function readLimited(response: Response, maxBytes: number, truncate = false): Promise<Uint8Array | null> {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      if (!truncate) return null;
      // Keep what fits: article text sits well before the end of heavy pages.
      chunks.push(value.subarray(0, value.byteLength - (total - maxBytes)));
      total = maxBytes;
      break;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function fetchFeed(locator: string, fetchImpl: typeof fetch = fetch): Promise<FetchedFeed> {
  const target = canonicalUrl(locator);
  if (!target) return { ok: false, error: "The address is not an allowed https URL." };
  let response: Response;
  try {
    response = await fetchImpl(target, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9",
        "user-agent": USER_AGENT,
      },
    });
  } catch {
    return { ok: false, error: "The feed request timed out or failed." };
  }
  const finalUrl = canonicalUrl(response.url || target);
  if (!finalUrl) return { ok: false, error: "The feed redirected to a blocked address.", status: response.status };
  if (response.status === 429) return { ok: false, error: "The source returned a rate limit.", status: 429 };
  if (!response.ok) return { ok: false, error: "The source returned an error response.", status: response.status };
  const bytes = await readLimited(response, MAX_FEED_BYTES);
  if (!bytes) return { ok: false, error: "The feed response is too large." };
  const xml = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const type = (response.headers.get("content-type") ?? "").toLowerCase();
  const looksXml = /^\s*(<\?xml|<rss\b|<feed\b)/i.test(xml);
  const allowedType = /xml|rss|atom/.test(type);
  if (!allowedType && !looksXml) return { ok: false, error: "The response is not an RSS or Atom feed.", status: response.status };
  const parsed = parseFeed(xml);
  if (!parsed.ok) return { ok: false, error: "The response could not be read as a feed.", status: response.status };
  return { ok: true, format: parsed.format, items: parsed.items, finalUrl };
}

/** Extractor input limit (see extractArticlePage). */
const EXTRACT_LIMIT = 500_000;

/**
 * Heavy pages are mostly scripts, styles and inline icons. Those are removed
 * (they never hold article text); if the page is still too large, the part
 * from the article/main element onward is kept.
 */
export function slimPageHtml(html: string): string {
  if (html.length <= EXTRACT_LIMIT) return html;
  const slim = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, "")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  if (slim.length <= EXTRACT_LIMIT) return slim;
  const head = (slim.match(/<head\b[\s\S]*?<\/head>/i) ?? [""])[0].slice(0, 50_000);
  const start = slim.search(/<(article|main)\b/i);
  const body = slim.slice(start >= 0 ? start : 0);
  return (head + body).slice(0, EXTRACT_LIMIT - 1);
}

export async function fetchArticlePage(
  locator: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; page: ExtractedPage } | { ok: false; error: string }> {
  const target = canonicalUrl(locator);
  if (!target) return { ok: false, error: "The address is not an allowed https URL." };
  let response: Response;
  try {
    response = await fetchImpl(target, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: "text/html,application/xhtml+xml", "user-agent": USER_AGENT },
    });
  } catch {
    return { ok: false, error: "The source page request timed out or failed." };
  }
  const finalUrl = canonicalUrl(response.url || target);
  if (!finalUrl) return { ok: false, error: "The source page redirected to a blocked address." };
  if (!response.ok) return { ok: false, error: "The source page returned an error response." };
  const type = (response.headers.get("content-type") ?? "").toLowerCase();
  if (type && !/html|text\/plain/.test(type)) return { ok: false, error: "The source response is not an article page." };
  const bytes = await readLimited(response, MAX_PAGE_BYTES, true);
  if (!bytes) return { ok: false, error: "The source page could not be read." };
  const html = slimPageHtml(new TextDecoder("utf-8", { fatal: false }).decode(bytes));
  const page = extractArticlePage(html, finalUrl);
  if (!page || page.wordCount < 12) return { ok: false, error: "The source page did not include a usable article." };
  return { ok: true, page };
}

export async function fetchImage(locator: string, fetchImpl: typeof fetch = fetch): Promise<Uint8Array | null> {
  const target = canonicalUrl(locator);
  if (!target) return null;
  try {
    const response = await fetchImpl(target, {
      redirect: "follow",
      signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
      headers: { accept: "image/jpeg,image/png,image/webp;q=0.1", "user-agent": USER_AGENT },
    });
    if (!response.ok || !canonicalUrl(response.url || target)) return null;
    return readLimited(response, MAX_IMAGE_BYTES);
  } catch {
    return null;
  }
}
