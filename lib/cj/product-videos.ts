/** Normalize CJ productVideo / videoList payloads into playable URLs. */
export function normalizeCjVideoUrls(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" && raw.trim() ? [raw] : [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const item of list) {
    let url = "";
    if (typeof item === "string") {
      url = item.trim();
    } else if (item && typeof item === "object" && "url" in item) {
      url = String((item as { url?: unknown }).url ?? "").trim();
    }
    if (!url.startsWith("http")) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }

  return out;
}

/** Extract .mp4 / CJ video URLs embedded in product HTML descriptions. */
export function extractVideosFromHtml(html: string): string[] {
  if (!html) return [];

  const urls: string[] = [];
  const seen = new Set<string>();

  const add = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed.startsWith("http")) return;
    if (!/\.mp4|video-cf\.cjdropshipping|m3u8|\/video\//i.test(trimmed)) return;
    if (seen.has(trimmed)) return;
    seen.add(trimmed);
    urls.push(trimmed);
  };

  const srcRegex = /src=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = srcRegex.exec(html)) !== null) {
    add(match[1]);
  }

  const bare = html.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/gi) ?? [];
  for (const url of bare) add(url);

  return urls;
}

export function mergeProductVideoUrls(...groups: string[][]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    for (const url of group) {
      if (!url || seen.has(url)) continue;
      seen.add(url);
      out.push(url);
    }
  }
  return out;
}

export function getProductVideoUrls(product: {
  source?: string | null;
  description?: string | null;
  source_metadata?: unknown;
}): string[] {
  const meta =
    product.source_metadata &&
    typeof product.source_metadata === "object" &&
    !Array.isArray(product.source_metadata)
      ? (product.source_metadata as Record<string, unknown>)
      : {};

  const fromMeta = normalizeCjVideoUrls(meta.cj_videos ?? meta.productVideo ?? meta.videoList);
  const fromDescription = product.description ? extractVideosFromHtml(product.description) : [];

  return mergeProductVideoUrls(fromMeta, fromDescription);
}
