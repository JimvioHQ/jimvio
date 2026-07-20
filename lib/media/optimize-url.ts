import { cloudinaryService } from "@/services/media/cloudinary";

function isHttpImageUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

/** Resize/format Cloudinary URLs; leave non-Cloudinary http(s) URLs unchanged. */
export function optimizeMediaUrl(
  url: string | null | undefined,
  width = 480,
): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  // Never ship data-URI blobs in SSR HTML / RSC — they destroy FCP.
  if (trimmed.startsWith("data:")) return undefined;
  if (!isHttpImageUrl(trimmed) && !trimmed.startsWith("/")) return undefined;
  if (trimmed.startsWith("/")) return trimmed;
  return (
    cloudinaryService.smartSrc(trimmed, {
      width,
      quality: "auto",
      format: "auto",
      crop: "fill",
    }) ?? trimmed
  );
}

/**
 * Optimized URL for rendering — never falls back to data:/blob: URIs
 * (those explode SSR HTML / RSC size and block FCP).
 */
export function safeMediaUrl(
  url: string | null | undefined,
  width = 480,
): string | undefined {
  const optimized = optimizeMediaUrl(url, width);
  if (optimized) return optimized;
  if (!url) return undefined;
  const trimmed = url.trim();
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return undefined;
  if (trimmed.startsWith("/") || isHttpImageUrl(trimmed)) return trimmed;
  return undefined;
}

/** Cap listing payloads and apply Cloudinary transforms where possible. */
export function slimListingImages(images: unknown, max = 3, width = 480): unknown {
  if (!Array.isArray(images)) return images;
  const out: unknown[] = [];
  for (const entry of images) {
    if (out.length >= max) break;
    if (typeof entry === "string") {
      const next = optimizeMediaUrl(entry, width);
      if (next) out.push(next);
      continue;
    }
    if (entry && typeof entry === "object" && "url" in entry) {
      const row = entry as { url?: string | null };
      const next = optimizeMediaUrl(row.url ?? undefined, width);
      if (next) out.push({ ...row, url: next });
    }
  }
  return out;
}
