/**
 * Helpers for licensed Unsplash photography (Unsplash License).
 * Prefer official API when UNSPLASH_ACCESS_KEY is set; otherwise use curated CDN URLs.
 */

import type { LicensedPhotoSpec } from "./types";

const UNSPLASH_LICENSE = "Unsplash License";
const UNSPLASH_LICENSE_URL = "https://unsplash.com/license";

export function normalizeUnsplashPhotoId(id: string): string {
  const trimmed = id.trim();
  if (!trimmed) return trimmed;
  return trimmed.startsWith("photo-") ? trimmed : `photo-${trimmed}`;
}

/** High-res crop suitable for community feed media. Always request JPEG for reliable validation. */
export function unsplashDownloadUrl(photoId: string, width = 1600): string {
  const id = normalizeUnsplashPhotoId(photoId);
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85&fm=jpg`;
}

export function unsplashAttributionUrl(photoId: string): string {
  const id = normalizeUnsplashPhotoId(photoId);
  return `https://unsplash.com/photos/${id}`;
}

export function licensedUnsplashPhoto(input: {
  sourceId: string;
  themes: string[];
  photographer?: string;
  width?: number;
}): LicensedPhotoSpec {
  const sourceId = normalizeUnsplashPhotoId(input.sourceId);
  return {
    sourceId,
    provider: "unsplash",
    sourceUrl: unsplashDownloadUrl(sourceId, input.width ?? 1600),
    attributionUrl: unsplashAttributionUrl(sourceId),
    license: UNSPLASH_LICENSE,
    licenseUrl: UNSPLASH_LICENSE_URL,
    photographer: input.photographer,
    themes: input.themes,
  };
}

type UnsplashSearchResult = {
  id: string;
  width: number;
  height: number;
  urls: { raw: string; full: string; regular: string };
  user?: { name?: string; links?: { html?: string } };
  links?: { html?: string };
};

/**
 * Optional Unsplash Search API. Returns [] when no access key is configured.
 */
export async function searchUnsplashPhotos(opts: {
  query: string;
  perPage?: number;
  page?: number;
  accessKey?: string;
}): Promise<LicensedPhotoSpec[]> {
  const key =
    opts.accessKey?.trim() ||
    process.env.UNSPLASH_ACCESS_KEY?.trim() ||
    process.env.UNSPLASH_API_KEY?.trim() ||
    "";
  if (!key) return [];

  const params = new URLSearchParams({
    query: opts.query,
    per_page: String(Math.min(30, Math.max(1, opts.perPage ?? 12))),
    page: String(Math.max(1, opts.page ?? 1)),
    orientation: "landscape",
    content_filter: "high",
  });

  const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
    headers: {
      Authorization: `Client-ID ${key}`,
      "Accept-Version": "v1",
    },
    signal: AbortSignal.timeout(7_000),
  });
  if (!res.ok) {
    throw new Error(`Unsplash search failed: HTTP ${res.status}`);
  }
  const json = (await res.json()) as { results?: UnsplashSearchResult[] };
  const results = json.results ?? [];
  return results
    .filter((r) => r.id && r.urls?.raw)
    .map((r) => {
      const sourceId = r.id.startsWith("photo-") ? r.id : `unsplash-${r.id}`;
      const raw = r.urls.raw;
      const joiner = raw.includes("?") ? "&" : "?";
      return {
        sourceId,
        provider: "unsplash" as const,
        sourceUrl: `${raw}${joiner}w=1600&q=85&fit=crop&auto=format`,
        attributionUrl: r.links?.html || `https://unsplash.com/photos/${r.id}`,
        license: UNSPLASH_LICENSE,
        licenseUrl: UNSPLASH_LICENSE_URL,
        photographer: r.user?.name,
        themes: [opts.query],
      };
    });
}
