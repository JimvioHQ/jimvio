/**
 * Product video proxy. CJ files require a supplier Referer and iOS Safari
 * requires byte ranges. The proxy forwards Range and does not log the source URL.
 */

export const PRODUCT_VIDEO_PROXY_HOSTS = [
  "download-only-api.cjdropshipping.com",
  "video-cf.cjdropshipping.com",
  "cf.cjdropshipping.com",
] as const;

const PASS_HEADERS = ["content-length", "content-range", "accept-ranges", "etag", "last-modified"] as const;

export function isAllowedProductVideoHost(hostname: string): boolean {
  return PRODUCT_VIDEO_PROXY_HOSTS.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`),
  );
}

export function videoProxyUpstreamHeaders(range: string | null): Headers {
  const headers = new Headers();
  headers.set("Referer", "https://developers.cjdropshipping.com/");
  if (range) headers.set("Range", range);
  return headers;
}

export function parseProductVideoProxyTarget(rawUrl: string | null): URL | null {
  if (!rawUrl) return null;
  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return null;
  }
  if (target.protocol !== "https:" || !isAllowedProductVideoHost(target.hostname)) return null;
  return target;
}

export function videoProxyResponseHeaders(upstream: Headers, status: number): Headers {
  const headers = new Headers();
  const contentType = upstream.get("content-type") ?? "";
  headers.set(
    "Content-Type",
    contentType.startsWith("video/") || contentType.startsWith("application/octet-stream")
      ? contentType.startsWith("video/")
        ? contentType
        : "video/mp4"
      : "video/mp4",
  );
  for (const name of PASS_HEADERS) {
    const value = upstream.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has("accept-ranges")) headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", status === 206 ? "private, max-age=300" : "public, max-age=300");
  headers.set("Vary", "Range");
  return headers;
}

export function isStreamableVideoStatus(status: number): boolean {
  return status === 200 || status === 206 || status === 416;
}
