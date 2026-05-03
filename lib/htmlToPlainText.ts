/** Turn rich HTML (e.g. Shopify body_html) into readable plain text for DB + UI. */
export function htmlToReadablePlainText(html: string): string {
  if (!html?.trim()) return "";

  const withBreaks = html
    .replace(/<\/p\s*>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div\s*>/gi, "\n")
    .replace(/<\/h[1-6]\s*>/gi, "\n\n")
    .replace(/<\/li\s*>/gi, "\n")
    .replace(/<\/tr\s*>/gi, "\n");

  const noTags = withBreaks.replace(/<[^>]+>/g, "");

  return noTags
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v]+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}
