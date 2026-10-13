const VIDEO_URL =
  /^https?:\/\/.+\.(mp4|webm|mov|m3u8)(\?.*)?$/i;

const CJ_VIDEO_HOST =
  /^https?:\/\/([a-z0-9-]+\.)?cjdropshipping\.com\/.+(video|\.mp4|\.m3u8|\.webm|\.mov)/i;

/** A stored URL counts only when it looks like a playable product video. */
export function isPlayableVideoUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const url = value.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
  if (VIDEO_URL.test(url) || CJ_VIDEO_HOST.test(url)) return true;
  return false;
}

export function productHasPlayableVideo(input: {
  videoUrls?: unknown[] | null;
  metadataVideos?: unknown;
}): boolean {
  const urls = [
    ...(input.videoUrls ?? []),
    ...(Array.isArray(input.metadataVideos) ? input.metadataVideos : []),
  ];
  return urls.some((url) => isPlayableVideoUrl(url));
}

/**
 * eligible published products with a valid video / eligible published CJ products.
 * Returns null when the denominator is zero.
 */
export function videoCoverageRatio(withVideo: number, eligiblePublished: number): number | null {
  if (!Number.isFinite(eligiblePublished) || eligiblePublished <= 0) return null;
  if (!Number.isFinite(withVideo) || withVideo < 0) return null;
  return Math.min(withVideo, eligiblePublished) / eligiblePublished;
}
