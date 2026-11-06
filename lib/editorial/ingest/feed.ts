import { createHash } from "node:crypto";
import { isSafeHref } from "@/lib/editorial/validate";
import type { FeedItem } from "@/lib/editorial/ingest/types";

const MAX_XML_CHARS = 500_000;
const MAX_ITEMS = 30;
const SUMMARY_CHARS = 700;

const INJECTION =
  /ignore (all |any |previous |the )|disregard (the |all |previous )|system prompt|you are now|do not follow the|act as (an |a )?/i;

export function externalKey(url: string, guid: string | null): string {
  return createHash("sha256").update(`${url}\n${guid ?? ""}`).digest("hex");
}

export function canonicalUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2000 || !isSafeHref(trimmed) || !trimmed.startsWith("https://")) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.port && url.port !== "443") return null;
  const host = url.hostname.toLowerCase();
  if (host.includes(":") || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;
  url.hostname = host;
  url.hash = "";
  const kept = new URLSearchParams();
  const keys = [...url.searchParams.keys()].sort();
  for (const key of keys) {
    if (/^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$)/i.test(key)) continue;
    for (const entry of url.searchParams.getAll(key)) kept.append(key, entry);
  }
  const query = kept.toString();
  url.search = query ? `?${query}` : "";
  const result = url.toString();
  if (result.length > 500 || !isSafeHref(result)) return null;
  return result;
}

export function fingerprintTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 180);
}

const STOP = new Set([
  "a", "an", "the", "of", "to", "and", "for", "on", "in", "at", "by", "with", "from", "after",
  "its", "as", "is", "are", "was", "be", "this", "that", "new", "latest", "into", "over", "their",
]);

export function titleTokens(title: string): string[] {
  return [...new Set(fingerprintTitle(title).split(" ").filter((word) => word.length > 2 && !STOP.has(word)))];
}

const ENTITY_STOP = new Set([
  "The", "A", "An", "And", "But", "For", "How", "Why", "What", "When", "Who", "New", "Its", "Is", "Are", "This", "That",
  "With", "From", "After", "Over", "Into", "Says", "Report", "Update", "Live", "Breaking", "Exclusive", "Analysis", "Here",
]);

/** Distinctive names in a headline or text: capitalised words, acronyms and figures (e.g. "OPay", "IPO", "29M"). */
export function distinctiveEntities(text: string): string[] {
  const words = text.match(/\b(?:[A-Z][A-Za-z0-9&'-]{1,}|[0-9][0-9.,]*[A-Za-z]{0,3})\b/g) ?? [];
  return [...new Set(words.filter((word) => !ENTITY_STOP.has(word) && word.length >= 2).map((word) => word.toLowerCase().replace(/[’']s$/, "")))];
}

/**
 * Two headlines describe the same story: near-identical wording, or real word
 * overlap plus at least two shared distinctive names. Candidates only — the
 * other publisher's page is still fetched and checked before it counts.
 */
export function sameStory(leftTitle: string, rightTitle: string): boolean {
  const overlap = jaccard(titleTokens(leftTitle), titleTokens(rightTitle));
  if (overlap >= 0.6) return true;
  if (overlap < 0.25) return false;
  const right = new Set(distinctiveEntities(rightTitle));
  return distinctiveEntities(leftTitle).filter((entity) => right.has(entity)).length >= 2;
}

/** Shared distinctive names between two article bodies (page-level corroboration check). */
export function sharedEntityCount(leftText: string, rightText: string): number {
  const right = new Set(distinctiveEntities(rightText));
  return distinctiveEntities(leftText).filter((entity) => right.has(entity)).length;
}

export function jaccard(left: readonly string[], right: readonly string[]): number {
  if (!left.length || !right.length) return 0;
  const other = new Set(right);
  let shared = 0;
  for (const token of left) if (other.has(token)) shared += 1;
  const union = new Set([...left, ...right]).size;
  return union ? shared / union : 0;
}

export function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}

export function shingles(value: string, size = 8): Set<string> {
  const words = value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  for (let index = 0; index + size <= words.length; index += 1) {
    out.add(words.slice(index, index + size).join(" "));
  }
  return out;
}

export function sharesLongPhrase(generated: string, sources: readonly string[], size = 8): boolean {
  const output = shingles(generated, size);
  if (!output.size) return false;
  for (const source of sources) {
    for (const phrase of shingles(source, size)) {
      if (output.has(phrase)) return true;
    }
  }
  return false;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function decodeEntities(value: string): string {
  const withoutCdata = value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  return withoutCdata
    .replace(/&#(\d{1,7});/g, (_full, digits: string) => {
      const code = Number(digits);
      if (!Number.isFinite(code) || code > 0x10ffff || (code < 32 && code !== 9 && code !== 10)) return "";
      try {
        return String.fromCodePoint(code);
      } catch {
        return "";
      }
    })
    .replace(/&#x([0-9a-f]{1,6});/gi, (_full, hex: string) => {
      const code = Number.parseInt(hex, 16);
      if (!Number.isFinite(code) || code > 0x10ffff || (code < 32 && code !== 9 && code !== 10)) return "";
      try {
        return String.fromCodePoint(code);
      } catch {
        return "";
      }
    })
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export function toPlain(value: string): string {
  const decoded = decodeEntities(value);
  return decoded
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function evidenceText(value: string): string {
  const plain = toPlain(value).slice(0, SUMMARY_CHARS);
  const sentences = plain.split(/(?<=[.!?])\s+/);
  return sentences.filter((sentence) => sentence && !INJECTION.test(sentence)).join(" ").slice(0, SUMMARY_CHARS);
}

export function isInjection(value: string): boolean {
  return INJECTION.test(value);
}

function tagValue(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? match[1] : "";
}

function blocks(xml: string, tag: string): string[] {
  const found: string[] = [];
  const pattern = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml)) && found.length < MAX_ITEMS) found.push(match[1]);
  return found;
}

function parseTimestamp(value: string): string | null {
  const plain = toPlain(value);
  if (!plain) return null;
  const parsed = new Date(plain);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function languageOf(value: string): string | null {
  const match = toPlain(value).toLowerCase().match(/[a-z]{2}/);
  return match ? match[0] : null;
}

function rssImage(block: string): string | null {
  const enclosure = block.match(/<enclosure\b[^>]*\burl\s*=\s*['"]([^'"]+)['"]/i);
  const media = block.match(/<media:content\b[^>]*\burl\s*=\s*['"]([^'"]+)['"]/i);
  return canonicalUrl(enclosure?.[1] ?? media?.[1] ?? "");
}

function atomLink(block: string): string | null {
  const links = [...block.matchAll(/<link\b([^>]*)\/?\s*>/gi)].map((match) => match[1]);
  const alternate = links.find((attrs) => /rel\s*=\s*['"]alternate['"]/i.test(attrs)) ?? links[0] ?? "";
  const href = alternate.match(/\bhref\s*=\s*['"]([^'"]+)['"]/i);
  return canonicalUrl(href?.[1] ?? "");
}

function cleanItem(input: FeedItem): FeedItem | null {
  const title = toPlain(input.title).slice(0, 300);
  const url = canonicalUrl(input.url);
  if (!title || title.length < 4 || !url || isInjection(title)) return null;
  return {
    title,
    url,
    guid: input.guid ? toPlain(input.guid).slice(0, 300) : null,
    publishedAt: input.publishedAt,
    summary: evidenceText(input.summary),
    language: input.language,
    creator: input.creator && !isInjection(input.creator) ? toPlain(input.creator).slice(0, 80) : null,
    imageUrl: input.imageUrl,
  };
}

export function parseFeed(xml: string): { ok: true; format: "rss" | "atom"; items: FeedItem[] } | { ok: false; reason: string } {
  const source = String(xml ?? "");
  if (!source.trim()) return { ok: false, reason: "empty" };
  if (source.length > MAX_XML_CHARS) return { ok: false, reason: "too_large" };
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) return { ok: false, reason: "unsafe_xml" };
  const isAtom = /<feed\b/i.test(source) && /<entry\b/i.test(source);
  const isRss = /<rss\b|<channel\b/i.test(source) && /<item\b/i.test(source);
  if (!isAtom && !isRss) return { ok: false, reason: "not_a_feed" };
  const channelLanguage = languageOf(tagValue(source, "language"));
  const rawBlocks = blocks(source, isAtom ? "entry" : "item");
  const items: FeedItem[] = [];
  for (const block of rawBlocks) {
    const title = tagValue(block, "title");
    const url = isAtom ? atomLink(block) : canonicalUrl(toPlain(tagValue(block, "link")));
    const summary = tagValue(block, "description") || tagValue(block, "summary") || tagValue(block, "content");
    const item = cleanItem({
      title,
      url: url ?? "",
      guid: isAtom ? tagValue(block, "id") : tagValue(block, "guid"),
      publishedAt: parseTimestamp(tagValue(block, "pubDate") || tagValue(block, "published") || tagValue(block, "updated") || tagValue(block, "dc:date")),
      summary,
      language: languageOf(tagValue(block, "dc:language")) ?? channelLanguage,
      creator: toPlain(tagValue(block, "dc:creator") || tagValue(block, "author")),
      imageUrl: rssImage(block),
    });
    if (item) items.push(item);
  }
  return { ok: true, format: isAtom ? "atom" : "rss", items };
}

export function primaryLanguage(value: string | null | undefined): string | null {
  return languageOf(value ?? "");
}
