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

/** The main conversation Space for a community (preserves existing General Space data). */
export function resolvePrimarySpace(
  spaces: readonly WorkspaceSpaceRow[]
): WorkspaceSpaceRow | null {
  if (spaces.length === 0) return null;
  const byGeneral = spaces.find((s) => s.slug === "general");
  if (byGeneral) return byGeneral;
  const featured = spaces.find((s) => s.is_featured);
  if (featured) return featured;
  const sorted = [...spaces].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  return sorted[0] ?? spaces[0] ?? null;
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

export function resolveSpaceAvatarSrc(
  space: WorkspaceSpaceRow,
  communityAvatar?: string | null,
  communityCover?: string | null
): string | null {
  const spaceCover = space.cover_url?.trim() || space.banner_url?.trim() || null;
  if (spaceCover) return spaceCover;
  const community = communityAvatar?.trim() || communityCover?.trim() || null;
  return community || null;
}
