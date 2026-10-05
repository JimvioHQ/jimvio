import type { WorkspaceSpaceRow } from "@/components/community/workspace-context";

/** Editorial seed slugs — hidden from default member UI when a primary Space exists. */
export const EDITORIAL_TEMPLATE_SPACE_SLUGS = new Set([
  "craft",
  "brands",
  "culture",
  "business",
  "announcements",
  "resources",
  "channels",
  "signals",
  "trading",
  "support",
  "jobs",
  "events",
  "wellness",
  "networking",
]);

export type PrimarySpaceCandidate = {
  id: string;
  name: string;
  slug: string;
  sort_order?: number | null;
  is_featured?: boolean | null;
};

const LEGACY_GENERAL_SLUG = "general";

function isGenericDisplayName(name: string | null | undefined): boolean {
  return /^general$/i.test((name ?? "").trim());
}

/**
 * Pick the canonical Space for a community.
 * Prefers configured custom Spaces (e.g. QuantForg Signals) over legacy "general".
 */
export function pickPrimarySpaceCandidate<T extends PrimarySpaceCandidate>(
  spaces: readonly T[]
): T | null {
  if (spaces.length === 0) return null;
  if (spaces.length === 1) return spaces[0];

  const featuredCustom = spaces.find(
    (s) => s.is_featured && s.slug !== LEGACY_GENERAL_SLUG
  );
  if (featuredCustom) return featuredCustom;

  const customNamed = spaces.filter(
    (s) => s.slug !== LEGACY_GENERAL_SLUG && !isGenericDisplayName(s.name)
  );
  if (customNamed.length === 1) return customNamed[0];
  if (customNamed.length > 1) {
    const featured = customNamed.find((s) => s.is_featured);
    if (featured) return featured;
    return [...customNamed].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    )[0];
  }

  const nonGeneralSlug = spaces.filter((s) => s.slug !== LEGACY_GENERAL_SLUG);
  if (nonGeneralSlug.length === 1) return nonGeneralSlug[0];
  if (nonGeneralSlug.length > 0) {
    const featured = nonGeneralSlug.find((s) => s.is_featured);
    if (featured) return featured;
    return [...nonGeneralSlug].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    )[0];
  }

  return (
    spaces.find((s) => s.slug === LEGACY_GENERAL_SLUG) ?? spaces[0] ?? null
  );
}

/** The main conversation Space for a community. */
export function resolvePrimarySpace(
  spaces: readonly WorkspaceSpaceRow[]
): WorkspaceSpaceRow | null {
  return pickPrimarySpaceCandidate(spaces);
}

export function partitionSpacesForDisplay(
  spaces: readonly WorkspaceSpaceRow[],
  opts?: { isStaff?: boolean }
): {
  primary: WorkspaceSpaceRow | null;
  secondary: WorkspaceSpaceRow[];
} {
  const primary = resolvePrimarySpace(spaces);
  if (opts?.isStaff) {
    return {
      primary,
      secondary: spaces.filter((s) => s.id !== primary?.id),
    };
  }
  const secondary = spaces.filter((s) => {
    if (primary && s.id === primary.id) return false;
    if (EDITORIAL_TEMPLATE_SPACE_SLUGS.has(s.slug.toLowerCase())) return false;
    return true;
  });
  return { primary, secondary };
}

/**
 * Space identity image for community surfaces.
 * Prefer Space artwork, then the parent community logo/cover.
 * Letter/initials fallbacks are only used when this returns null.
 */
export function resolveSpaceAvatarSrc(
  space: Pick<WorkspaceSpaceRow, "cover_url" | "banner_url" | "icon">,
  communityAvatar?: string | null,
  communityCover?: string | null
): string | null {
  const spaceCover = space.cover_url?.trim() || space.banner_url?.trim() || "";
  if (spaceCover) return spaceCover;
  const icon = space.icon?.trim() || "";
  if (/^https?:\/\//i.test(icon)) return icon;
  const communityLogo = communityAvatar?.trim() || "";
  if (communityLogo) return communityLogo;
  const cover = communityCover?.trim() || "";
  if (cover) return cover;
  return null;
}
