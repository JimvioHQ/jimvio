import { canonicalUrl, parseFeed } from "@/lib/editorial/ingest/feed";
import { extractArticlePage, type ExtractedPage } from "@/lib/editorial/ingest/page";
import type { FeedItem } from "@/lib/editorial/ingest/types";

const USER_AGENT = "JimvioMediaBot/1.0 (+https://www.jimvio.com/media)";
const MAX_FEED_BYTES = 500_000;
const MAX_PAGE_BYTES = 500_000;
const MAX_IMAGE_BYTES = 6_000_000;
const TIMEOUT_MS = 8_000;
const IMAGE_TIMEOUT_MS = 12_000;

export type FetchedFeed =
  | { ok: true; format: "rss" | "atom"; items: FeedItem[]; finalUrl: string }
  | { ok: false; error: string; status?: number };

async function readLimited(response: Response, maxBytes: number): Promise<Uint8Array | null> {
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
      return null;
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
  const bytes = await readLimited(response, MAX_PAGE_BYTES);
  if (!bytes) return { ok: false, error: "The source page is too large." };
  const html = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
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
