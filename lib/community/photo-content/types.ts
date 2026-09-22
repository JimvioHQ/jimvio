/**
 * Types for licensed editorial community photo seeding.
 * Provenance lives on community_posts.attachments.jimvio (no new tables).
 */

export type PhotoSourceProvider = "unsplash" | "pexels" | "wikimedia";

export type LicensedPhotoSpec = {
  /** Stable id for the asset (e.g. Unsplash photo-… id). */
  sourceId: string;
  provider: PhotoSourceProvider;
  /** HTTPS download/source URL used to fetch the bytes. */
  sourceUrl: string;
  /** Human-facing attribution page when available. */
  attributionUrl: string;
  license: string;
  licenseUrl: string;
  photographer?: string;
  /** Short topic tags for matching community themes. */
  themes: string[];
};

export type PhotoMediaProvenance = {
  sourceProvider: PhotoSourceProvider;
  sourceId: string;
  sourceUrl: string;
  attributionUrl: string;
  license: string;
  licenseUrl: string;
  photographer?: string;
  downloadedAt: string;
  cloudinaryPublicId: string;
  width: number;
  height: number;
  bytes: number;
};

export type CommunityPhotoTarget = {
  id: string;
  slug: string;
  name: string;
  category: string;
  tagline: string | null;
  description: string | null;
  isPrivate: boolean;
};

export type CaptionKind =
  | "progress"
  | "observation"
  | "bts"
  | "question"
  | "recommendation"
  | "short";

export const PHOTO_CONTENT_KEY_PREFIX = "photo-content:";

export function photoContentKey(communitySlug: string, sourceId: string): string {
  return `${PHOTO_CONTENT_KEY_PREFIX}${communitySlug}:${sourceId}`;
}

export function parsePhotoContentKey(key: string | null | undefined): {
  slug: string;
  sourceId: string;
} | null {
  if (!key || !key.startsWith(PHOTO_CONTENT_KEY_PREFIX)) return null;
  const rest = key.slice(PHOTO_CONTENT_KEY_PREFIX.length);
  const idx = rest.indexOf(":");
  if (idx <= 0) return null;
  return { slug: rest.slice(0, idx), sourceId: rest.slice(idx + 1) };
}
