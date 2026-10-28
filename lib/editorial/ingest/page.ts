import { canonicalUrl, toPlain, wordCount } from "@/lib/editorial/ingest/feed";

const INJECTION =
  /ignore (all |any |previous |the )|disregard (the |all |previous )|system prompt|you are now|do not follow the|act as (an |a )?/i;

const DECORATIVE_PATH =
  /favicon|apple-touch|sprite|logo|insignia|avatar|emoji|gravatar|spacer|pixel|badge|topic-card|\/plugins\//i;

const CHROME_HEADING = /^(?:share|details|related terms|explore more|about the author|tags|topics|media resources|credits|discover more topics from nasa|nasa headquarters)$/i;
const BYLINE_HEADING = /^[A-Z][a-z]+(?:['’][A-Za-z]+)? [A-Z][a-z]+$/;

export type ExtractedLink = { text: string; href: string };
export type ExtractedImage = { url: string; alt: string; caption: string };
export type ExtractedPage = {
  url: string;
  title: string;
  paragraphs: string[];
  headings: string[];
  links: ExtractedLink[];
  images: ExtractedImage[];
  captions: string[];
  wordCount: number;
};

function decodeBasic(value: string): string {
  return value
    .replace(/&#(\d{1,7});/g, (_full, digits: string) => {
      const code = Number(digits);
      if (!Number.isFinite(code) || code < 32 || code > 0x10ffff) return "";
      try {
        return String.fromCodePoint(code);
      } catch {
        return "";
      }
    })
    .replace(/&#x([0-9a-f]{1,6});/gi, (_full, hex: string) => {
      const code = Number.parseInt(hex, 16);
      if (!Number.isFinite(code) || code < 32 || code > 0x10ffff) return "";
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
    .replace(/&amp;|&#0*38;/g, "&");
}

function stripChrome(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header\b[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, " ")
    .replace(/<form\b[\s\S]*?<\/form>/gi, " ")
    .replace(/<aside\b[\s\S]*?<\/aside>/gi, " ")
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, " ");
}

function sliceBalanced(html: string, tag: string): string | null {
  const start = html.search(new RegExp(`<${tag}\\b`, "i"));
  if (start < 0) return null;
  const openEnd = html.indexOf(">", start);
  if (openEnd < 0) return null;
  let depth = 1;
  let index = openEnd + 1;
  const open = new RegExp(`^<${tag}\\b`, "i");
  const close = new RegExp(`^</${tag}\\b`, "i");
  while (index < html.length && depth > 0) {
    const next = html.indexOf("<", index);
    if (next < 0) return null;
    if (open.test(html.slice(next, next + tag.length + 2))) {
      depth += 1;
      const end = html.indexOf(">", next);
      index = end < 0 ? html.length : end + 1;
      continue;
    }
    if (close.test(html.slice(next, next + tag.length + 3))) {
      depth -= 1;
      const end = html.indexOf(">", next);
      if (depth === 0) return html.slice(openEnd + 1, next);
      index = end < 0 ? html.length : end + 1;
      continue;
    }
    index = next + 1;
  }
  return null;
}

function attr(tag: string, name: string): string {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  return decodeBasic(match?.[2] ?? match?.[3] ?? "").trim();
}

function resolveHttps(base: string, raw: string): string | null {
  const trimmed = decodeBasic(raw).trim();
  if (!trimmed || /^(?:javascript|data|blob|file):/i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed, base);
    if (url.hostname.toLowerCase() === "gcc02.safelinks.protection.outlook.com") {
      const inner = url.searchParams.get("url");
      if (!inner) return null;
      return canonicalUrl(inner);
    }
    return canonicalUrl(url.toString());
  } catch {
    return null;
  }
}

function usableParagraph(text: string): boolean {
  if (INJECTION.test(text)) return false;
  const words = wordCount(text);
  if (words < 12 || words > 500) return false;
  if (/^https?:\/\/\S+$/i.test(text)) return false;
  if (/explore search news|skip to (?:main|content)|subscribe to|share this|follow us on/i.test(text)) return false;
  if (/\b\d+\s+min read\b/i.test(text)) return false;
  if (/\barticle\s+\d+\s+(?:hour|hours|day|days|week|weeks|month|months)\s+ago\b/i.test(text)) return false;
  return true;
}

function linksFrom(html: string, pageUrl: string): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  const seen = new Set<string>();
  const pattern = /<a\b[^>]*href\s*=\s*("([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    const href = resolveHttps(pageUrl, match[2] || match[3] || "");
    const text = toPlain(match[4] ?? "").slice(0, 160);
    if (!href || text.length < 2 || seen.has(`${text}\n${href}`)) continue;
    if (INJECTION.test(text) || /\b\d+\s+min read\b/i.test(text)) continue;
    seen.add(`${text}\n${href}`);
    links.push({ text, href });
    if (links.length >= 24) break;
  }
  return links;
}

function imagesFrom(html: string, pageUrl: string, pageTitle: string): ExtractedImage[] {
  const images: ExtractedImage[] = [];
  const seen = new Set<string>();
  const push = (url: string | null, alt: string, caption: string) => {
    if (!url || seen.has(url.split("?")[0] ?? url)) return;
    if (DECORATIVE_PATH.test(new URL(url).pathname)) return;
    seen.add(url.split("?")[0] ?? url);
    images.push({
      url,
      alt: alt.replace(/\s+/g, " ").trim().slice(0, 180),
      caption: caption.replace(/\s+/g, " ").trim().slice(0, 300),
    });
  };
  const figures = /<figure\b[^>]*>([\s\S]*?)<\/figure>/gi;
  let match: RegExpExecArray | null;
  while ((match = figures.exec(html))) {
    const block = match[1] ?? "";
    const image = block.match(/<img\b[^>]*>/i)?.[0] ?? "";
    const caption = toPlain((block.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i) ?? [])[1] ?? "");
    push(resolveHttps(pageUrl, attr(image, "src")), attr(image, "alt"), caption);
  }
  const tags = /<img\b[^>]*>/gi;
  while ((match = tags.exec(html))) {
    const tag = match[0];
    push(resolveHttps(pageUrl, attr(tag, "src")), attr(tag, "alt"), "");
  }
  const meta = html.match(/<meta\b[^>]*(?:property|name)\s*=\s*["']og:image["'][^>]*>/i)?.[0]
    ?? html.match(/<meta\b[^>]*content\s*=\s*["'][^"']+["'][^>]*(?:property|name)\s*=\s*["']og:image["'][^>]*>/i)?.[0]
    ?? "";
  if (meta) {
    const content = attr(meta, "content");
    push(resolveHttps(pageUrl, content), pageTitle, "");
  }
  return images.slice(0, 8);
}

export function extractArticlePage(html: string, pageUrl: string): ExtractedPage | null {
  const canonical = canonicalUrl(pageUrl);
  if (!canonical || html.length > 500_000) return null;
  if (/<!ENTITY/i.test(html) || /<!DOCTYPE[^>]*\[/i.test(html)) return null;
  const article = stripChrome(sliceBalanced(html, "article") ?? sliceBalanced(html, "main") ?? html);
  const relatedAt = article.search(/<h[23]\b[^>]*>\s*(?:explore more|discover more topics|follow nasa|was this page helpful)/i);
  const region = relatedAt > 200 ? article.slice(0, relatedAt) : article;
  const title = toPlain((region.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) ?? [])[1] ?? "").slice(0, 180);
  const headings = [...region.matchAll(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/gi)]
    .map((match) => toPlain(match[1] ?? "").slice(0, 140))
    .filter((heading) => heading.length > 2 && !INJECTION.test(heading) && !CHROME_HEADING.test(heading) && !BYLINE_HEADING.test(heading))
    .slice(0, 8);
  const paragraphs = [...region.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => toPlain(match[1] ?? "").slice(0, 1200))
    .filter(usableParagraph)
    .slice(0, 12);
  const captions = [...region.matchAll(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/gi)]
    .map((match) => toPlain(match[1] ?? "").slice(0, 300))
    .filter((caption) => wordCount(caption) >= 6)
    .slice(0, 4);
  if (!title && paragraphs.length === 0) return null;
  return {
    url: canonical,
    title,
    paragraphs,
    headings,
    links: linksFrom(region, canonical),
    images: imagesFrom(html.includes("og:image") ? `${region}\n${html.slice(0, 20000)}` : region, canonical, title),
    captions,
    wordCount: wordCount(paragraphs.join(" ")),
  };
}
