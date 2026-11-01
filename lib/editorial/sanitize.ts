import { isSafeHref } from "@/lib/editorial/validate";
import type { SafeHtml } from "@/lib/editorial/types";

/**
 * Allowlist sanitizer for article HTML.
 * Do not import isomorphic-dompurify here. Its jsdom dependency fails Vercel
 * serverless rendering with ERR_REQUIRE_ESM and takes /media down with it.
 */
const ALLOWED = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a", "h2", "h3", "blockquote", "figure", "figcaption"]);
const DROP_WITH_CONTENT = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "form",
  "svg",
  "math",
  "textarea",
  "noscript",
  "template",
  "noframes",
  "title",
]);

type Attr = { name: string; value: string };

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function readName(source: string, index: number): { name: string; index: number } | null {
  if (!/[A-Za-z]/.test(source[index] ?? "")) return null;
  let end = index + 1;
  while (end < source.length && /[A-Za-z0-9:-]/.test(source[end] ?? "")) end += 1;
  return { name: source.slice(index, end).toLowerCase(), index: end };
}

function readAttributes(source: string, index: number): { attrs: Attr[]; index: number; closed: boolean } | null {
  const attrs: Attr[] = [];
  while (index < source.length) {
    const char = source[index] ?? "";
    if (char === ">") return { attrs, index: index + 1, closed: true };
    if (/\s/.test(char) || char === "/") {
      index += 1;
      continue;
    }
    const name = readName(source, index);
    if (!name) return null;
    index = name.index;
    let value = "";
    if (source[index] === "=") {
      index += 1;
      const quote = source[index];
      if (quote === "\"" || quote === "'") {
        index += 1;
        const end = source.indexOf(quote, index);
        if (end < 0) return null;
        value = source.slice(index, end);
        index = end + 1;
      } else {
        const start = index;
        while (index < source.length && !/[\s>]/.test(source[index] ?? "")) index += 1;
        value = source.slice(start, index);
      }
    }
    attrs.push({ name: name.name, value });
  }
  return null;
}

function skipElement(source: string, index: number, name: string): number {
  let depth = 1;
  while (index < source.length && depth > 0) {
    const start = source.indexOf("<", index);
    if (start < 0) return source.length;
    const closing = source[start + 1] === "/";
    const nameAt = closing ? start + 2 : start + 1;
    const parsed = readName(source, nameAt);
    if (!parsed || parsed.name !== name) {
      index = start + 1;
      continue;
    }
    const tag = readAttributes(source, parsed.index);
    if (!tag?.closed) return source.length;
    const selfClosing = /\/\s*$/.test(source.slice(start, tag.index - 1));
    if (closing) depth -= 1;
    else if (!selfClosing) depth += 1;
    index = tag.index;
  }
  return index;
}

function anchorTag(attrs: Attr[]): string {
  const href = attrs.find((attr) => attr.name === "href")?.value.trim() ?? "";
  if (/[\u0000-\u001f\u007f]/.test(href) || !isSafeHref(href)) return "<a>";
  const safe = escapeAttr(href);
  const target = href.startsWith("https:") ? ' target="_blank"' : "";
  return `<a href="${safe}" rel="noopener noreferrer"${target}>`;
}

export function sanitizeArticleHtml(input: string, options: { internalLinksOnly?: boolean } = {}): SafeHtml {
  const source = String(input ?? "").replace(/\0/g, "").slice(0, 100_000);
  let index = 0;
  let html = "";

  while (index < source.length) {
    const start = source.indexOf("<", index);
    if (start < 0) {
      html += source.slice(index);
      break;
    }
    html += source.slice(index, start);
    if (source.startsWith("<!--", start)) {
      const end = source.indexOf("-->", start + 4);
      index = end < 0 ? source.length : end + 3;
      continue;
    }
    if (source.startsWith("<!", start) || source.startsWith("<?", start)) {
      const end = source.indexOf(">", start + 2);
      index = end < 0 ? start + 1 : end + 1;
      if (end < 0) html += "&lt;";
      continue;
    }

    const closing = source[start + 1] === "/";
    const name = readName(source, closing ? start + 2 : start + 1);
    if (!name) {
      html += "&lt;";
      index = start + 1;
      continue;
    }
    const tag = readAttributes(source, name.index);
    if (!tag?.closed) {
      html += "&lt;";
      index = start + 1;
      continue;
    }

    if (!closing && DROP_WITH_CONTENT.has(name.name)) {
      const selfClosing = /\/\s*$/.test(source.slice(start, tag.index - 1));
      index = selfClosing ? tag.index : skipElement(source, tag.index, name.name);
      continue;
    }
    if (name.name === "img" || name.name === "link" || name.name === "meta" || name.name === "input") {
      index = tag.index;
      continue;
    }
    if (!ALLOWED.has(name.name)) {
      index = tag.index;
      continue;
    }
    if (closing) {
      if (name.name !== "br") html += `</${name.name}>`;
    } else if (name.name === "br") {
      html += "<br>";
    } else if (name.name === "a") {
      html += anchorTag(tag.attrs, options.internalLinksOnly === true);
    } else {
      html += `<${name.name}>`;
    }
    index = tag.index;
  }

  return html as SafeHtml;
}
