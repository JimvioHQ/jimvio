/**
 * Deterministic photo selection for a community — idempotent-friendly, varied.
 */
import { photosForCommunity } from "./catalog";
import { searchUnsplashPhotos } from "./unsplash";
import type { LicensedPhotoSpec } from "./types";

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rotate<T>(items: T[], offset: number): T[] {
  if (!items.length) return [];
  const n = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(n), ...items.slice(0, n)];
}

export async function selectPhotosForCommunity(input: {
  category: string;
  slug: string;
  name: string;
  description?: string | null;
  count: number;
  excludeSourceIds?: Set<string>;
  preferApiSearch?: boolean;
}): Promise<{ photos: LicensedPhotoSpec[]; source: "catalog" | "mixed" | "empty" }> {
  const exclude = input.excludeSourceIds ?? new Set<string>();
  const catalog = photosForCommunity({
    category: input.category,
    slug: input.slug,
    name: input.name,
    description: input.description,
  }).filter((p) => !exclude.has(p.sourceId));

  let apiPhotos: LicensedPhotoSpec[] = [];
  if (input.preferApiSearch) {
    const query = `${input.category} ${input.name}`.slice(0, 80);
    try {
      apiPhotos = (await searchUnsplashPhotos({ query, perPage: Math.max(12, input.count * 2) })).filter(
        (p) => !exclude.has(p.sourceId)
      );
    } catch (err) {
      console.warn(
        `[photo-select] Unsplash API unavailable for ${input.slug}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  const merged = [...apiPhotos, ...catalog];
  const seen = new Set<string>();
  const unique: LicensedPhotoSpec[] = [];
  for (const photo of merged) {
    if (seen.has(photo.sourceId)) continue;
    seen.add(photo.sourceId);
    unique.push(photo);
  }

  if (!unique.length) return { photos: [], source: "empty" };

  const offset = hash(`${input.slug}:photo-select`) % unique.length;
  const rotated = rotate(unique, offset);
  const photos = rotated.slice(0, Math.max(0, input.count));
  const source =
    apiPhotos.length && photos.some((p) => apiPhotos.some((a) => a.sourceId === p.sourceId))
      ? "mixed"
      : "catalog";
  return { photos, source };
}
