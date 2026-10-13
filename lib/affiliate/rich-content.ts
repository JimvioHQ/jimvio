import { cleanCJDescription } from "@/lib/cj/render";

/** Plain-text length before Affiliate product copy offers expansion. */
export const AFFILIATE_PREVIEW_CHARS = 420;

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "div",
  "span",
]);

/**
 * Decode HTML entities a single time.
 * `&amp;lt;` becomes `&lt;`, not `<`.
 */
export function decodeHtmlEntitiesOnce(
  input: string,
  options?: { keepLtGt?: boolean },
): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (entity, body: string) => {
    const lower = body.toLowerCase();
    if (lower.startsWith("#x")) {
      const code = Number.parseInt(lower.slice(2), 16);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return entity;
      if (options?.keepLtGt && (code === 60 || code === 62)) return entity;
      return String.fromCodePoint(code);
    }
    if (lower.startsWith("#")) {
      const code = Number.parseInt(lower.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return entity;
      if (options?.keepLtGt && (code === 60 || code === 62)) return entity;
      return String.fromCodePoint(code);
    }
    if (options?.keepLtGt && (lower === "lt" || lower === "gt")) return entity;
    return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, lower)
      ? NAMED_ENTITIES[lower]
      : entity;
  });
}

function unwrapImportedHtml(raw: string): string {
  let value = raw.replace(/^\uFEFF/, "").trim();
  if (!value) return "";
  for (let pass = 0; pass < 3 && /&(?:amp;)*lt;\s*\/?[a-z]/i.test(value); pass += 1) {
    const next = decodeHtmlEntitiesOnce(value);
    if (next === value) break;
    value = next;
  }
  return decodeHtmlEntitiesOnce(value, { keepLtGt: true });
}

export function isSafeProductImageUrl(url: string): boolean {
  const value = url.trim();
  if (!value || /^(javascript|data|blob|vbscript):/i.test(value)) return false;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (parsed.username || parsed.password) return false;
  if (parsed.pathname.toLowerCase().includes(".svg")) return false;
  return true;
}

export function extractSafeDescriptionImages(raw: string | null | undefined): string[] {
  const html = unwrapImportedHtml(raw ?? "");
  if (!html) return [];
  const urls: string[] = [];
  const seen = new Set<string>();
  const re = /<img\b[^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const url = (match[1] || match[2] || match[3] || "").trim();
    if (!isSafeProductImageUrl(url) || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
    if (urls.length >= 8) break;
  }
  return urls;
}

function stripEmbeddedMedia(html: string): string {
  return html
    .replace(/<picture\b[^>]*>[\s\S]*?<\/picture>/gi, "")
    .replace(/<video\b[^>]*>[\s\S]*?<\/video>/gi, "")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "")
    .replace(/<img\b[^>]*\/?>/gi, "")
    .replace(/<\/?(?:video|svg|img)\b[^>]*>/gi, "");
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function plainToHtml(text: string): string {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  if (blocks.length === 0) return "";
  return blocks
    .map((block) => `<p>${escapeText(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function allowlistHtml(html: string): string {
  let out = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<(?:script|style|iframe|object|embed|link|meta|form|input|button|textarea|select|math|svg|video|audio)\b[^>]*>[\s\S]*?<\/(?:script|style|iframe|object|embed|form|math|svg|video|audio)>/gi, "")
    .replace(/<\/?(?:script|style|iframe|object|embed|link|meta|form|input|button|textarea|select|math|svg|video|audio|img)\b[^>]*\/?>/gi, "");

  out = out.replace(/<\/?([a-z0-9]+)(\s[^<>]*)?\s*\/?>/gi, (full, name: string) => {
    const tag = name.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (tag === "br") return "<br>";
    return full.startsWith("</") ? `</${tag}>` : `<${tag}>`;
  });

  out = out
    .replace(/javascript:/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(?:<br>\s*){3,}/gi, "<br><br>")
    .replace(/<(p|div|span|blockquote|h[234]|li)>\s*<\/\1>/gi, "")
    .replace(/<(p|div)>(\s|<br>)*<\/\1>/gi, "")
    .replace(/<(?!\/?(?:p|br|b|strong|i|em|u|ul|ol|li|h2|h3|h4|blockquote|div|span)\b)/gi, "")
    .replace(/<(b|strong|h[234])>\s*Product Images?:?\s*<\/\1>/gi, "")
    .replace(/(^|<br>)\s*Product Images?:?\s*(?=<br>|<\/p>|$)/gi, "$1");

  return out.replace(/[ \t]+\n/g, "\n").trim();
}

/** Sanitize imported product HTML for Affiliate Center display. */
export function prepareAffiliateRichHtml(raw: string | null | undefined): string {
  const decoded = unwrapImportedHtml(raw ?? "");
  if (!decoded) return "";
  const withoutMedia = stripEmbeddedMedia(decoded);
  const hasTags = /<\/?[a-z][^>\n]*>/i.test(withoutMedia);
  if (!hasTags) return plainToHtml(withoutMedia);
  const safe = allowlistHtml(cleanCJDescription(withoutMedia));
  if (safe && /<\/?[a-z]/.test(safe)) return safe;
  const plain = withoutMedia.replace(/<[^>]+>/g, " ").replace(/[ \t]+/g, " ").trim();
  return plain ? plainToHtml(plain) : "";
}

export function affiliatePlainText(raw: string | null | undefined): string {
  const html = prepareAffiliateRichHtml(raw);
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function affiliateContentNeedsDisclosure(plain: string | null | undefined): boolean {
  const text = (plain ?? "").trim();
  if (!text) return false;
  if (text.length > AFFILIATE_PREVIEW_CHARS) return true;
  return text.split("\n").filter((line) => line.trim()).length > 6;
}

function cleanBenefitLine(line: string): string {
  return line.replace(/^[-•*]+\s*/, "").replace(/\s+/g, " ").trim();
}

function isUsefulBenefit(line: string): boolean {
  if (line.length < 8 || line.length > 180) return false;
  if (/[<>]/.test(line)) return false;
  if (/^https?:\/\//i.test(line)) return false;
  if (/product image/i.test(line)) return false;
  if (/^[A-Za-z][\w\s/]{0,40}:$/.test(line)) return false;
  return true;
}

function splitBenefitLines(plain: string): string[] {
  if (!plain.trim()) return [];
  let lines = plain.split(/\n+/).map(cleanBenefitLine).filter(isUsefulBenefit);
  if (lines.length === 0) {
    lines = plain
      .split(/(?<=[.!;])\s+/)
      .map(cleanBenefitLine)
      .filter(isUsefulBenefit);
  }
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(line);
    if (unique.length >= 12) break;
  }
  return unique;
}

/** Readable benefit lines from product copy. Does not invent claims. */
export function deriveAffiliateBenefits(
  description: string | null | undefined,
  features: string[] | null | undefined,
): string[] {
  const featureLines = (features ?? []).flatMap((feature) =>
    splitBenefitLines(affiliatePlainText(feature)),
  );
  if (featureLines.length >= 2) {
    const seen = new Set<string>();
    return featureLines.filter((line) => {
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 12);
  }
  return splitBenefitLines(affiliatePlainText(description));
}
