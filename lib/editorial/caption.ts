const DIAGNOSTIC =
  /what is in the record|how sure this is|topic words drawn|the source text includes the figure|named publisher|feed author field|one public source|feed timestamp|public notice on|summarized a public item|wrote this briefing|permitted record|not a photograph of the subject|no licensed photograph was available/i;

export function containsDiagnosticProse(value: string): boolean {
  return DIAGNOSTIC.test(value);
}

function decodeBasic(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A caption that describes the asset. Credits and license lines are not captions. */
export function meaningfulCaption(value: string | null | undefined): string | null {
  const clean = decodeBasic(value ?? "").replace(/\s+/g, " ").trim();
  const words = clean.split(" ").filter(Boolean);
  if (words.length < 8 || clean.length > 300) return null;
  if (/^source:/i.test(clean)) return null;
  if (/not a (picture|photograph)/i.test(clean)) return null;
  if (/no licensed photograph/i.test(clean)) return null;
  if (/\blicen[sc]e:/i.test(clean) && words.length < 14) return null;
  if (containsDiagnosticProse(clean)) return null;
  return clean;
}

export function withHeroCaption(bodyHtml: string, caption: string | null | undefined): string {
  const clean = meaningfulCaption(caption);
  if (!clean) return bodyHtml;
  return `<figure><figcaption>${escapeText(clean)}</figcaption></figure>${bodyHtml}`;
}

export function splitHeroCaption(html: string, title = ""): { caption: string | null; bodyHtml: string } {
  const match = html.match(/^\s*<figure>\s*<figcaption>([\s\S]*?)<\/figcaption>\s*<\/figure>/i);
  if (!match) return { caption: null, bodyHtml: html };
  const bodyHtml = html.slice(match[0].length);
  const caption = meaningfulCaption(match[1]);
  if (!caption) return { caption: null, bodyHtml };
  if (title && caption.toLowerCase() === title.replace(/\s+/g, " ").trim().toLowerCase()) {
    return { caption: null, bodyHtml };
  }
  return { caption, bodyHtml };
}
