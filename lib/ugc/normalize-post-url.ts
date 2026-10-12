const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "si",
  "feature",
  "fbclid",
  "igshid",
];

export const UGC_SUBMIT_PLATFORMS = ["tiktok", "instagram", "youtube", "facebook", "x"] as const;
export type UgcSubmitPlatform = (typeof UGC_SUBMIT_PLATFORMS)[number];

export function isUgcSubmitPlatform(value: unknown): value is UgcSubmitPlatform {
  return typeof value === "string" && (UGC_SUBMIT_PLATFORMS as readonly string[]).includes(value);
}

/** Canonicalize a creator post URL so trailing slashes / tracking params cannot bypass duplicate detection. */
export function normalizePostUrl(raw: string): string {
  const trimmed = raw.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return trimmed;
  }
  if (!["http:", "https:"].includes(parsed.protocol)) return trimmed;
  parsed.hash = "";
  for (const key of TRACKING_PARAMS) parsed.searchParams.delete(key);
  parsed.hostname = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  let href = parsed.toString();
  if (href.endsWith("/") && parsed.pathname !== "/") href = href.slice(0, -1);
  return href;
}
