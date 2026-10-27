import DOMPurify from "isomorphic-dompurify";
import { isSafeHref } from "@/lib/editorial/validate";
import type { SafeHtml } from "@/lib/editorial/types";

const ALLOWED_TAGS = ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a", "h2", "h3", "blockquote"];
const ALLOWED_ATTR = ["href", "rel", "target", "title"];

function lockAnchors(html: string): string {
  return html.replace(/<a\b([^>]*)>/gi, (_full, attrs: string) => {
    const match = attrs.match(/href\s*=\s*(['"])(.*?)\1/i);
    let next = attrs.replace(/\s(?:href|rel|target)\s*=\s*(['"]).*?\1/gi, "");
    if (!match || !isSafeHref(match[2])) return `<a${next}>`;
    const href = match[2].trim();
    next += ` href="${href.replace(/"/g, "")}" rel="noopener noreferrer"`;
    if (href.startsWith("https:")) next += ' target="_blank"';
    return `<a${next}>`;
  });
}

export function sanitizeArticleHtml(input: string): SafeHtml {
  const dirty = String(input ?? "").slice(0, 100_000);
  const clean = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "svg", "math", "img", "link", "meta"],
    FORBID_ATTR: ["style", "src", "srcset", "onerror", "onload"],
  });
  return lockAnchors(clean) as SafeHtml;
}
