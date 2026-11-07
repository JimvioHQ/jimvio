/**
 * Readable preview for long feed posts: keeps whole paragraphs / words,
 * limits both characters and lines, never splits a hashtag or URL.
 */
export function previewPostText(
  text: string,
  opts: { maxChars?: number; maxLines?: number } = {},
): { text: string; truncated: boolean } {
  const maxChars = opts.maxChars ?? 320;
  const maxLines = opts.maxLines ?? 5;
  const normalized = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trimEnd();

  const lines = normalized.split("\n");
  let out = "";
  let usedLines = 0;
  for (const line of lines) {
    // Blank separator lines count as half a line visually.
    const cost = line.trim() ? Math.max(1, Math.ceil(line.length / 80)) : 0.5;
    if (usedLines + cost > maxLines && out) break;
    const candidate = out ? `${out}\n${line}` : line;
    if (candidate.length > maxChars) {
      if (!out) out = cutAtWord(line, maxChars);
      break;
    }
    out = candidate;
    usedLines += cost;
  }
  out = out.trimEnd();
  if (out.length >= normalized.length) return { text: normalized, truncated: false };
  return { text: out, truncated: true };
}

function cutAtWord(line: string, maxChars: number): string {
  const slice = line.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  const base = lastSpace > maxChars * 0.6 ? slice.slice(0, lastSpace) : slice;
  // Do not leave a dangling partial URL / hashtag token.
  return base.replace(/\s+(https?:\/\/\S*|#\S*)$/i, "").trimEnd();
}
