/**
 * Privacy resolution for the Identity Platform.
 * Mirrors (and stays in sync with) the RLS policy on `jip_identity`:
 *   public visibility OR owner OR admin can always read the row.
 * This helper additionally understands 'brand_only', 'followers_only',
 * and 'custom' so API layers can decide how much detail to expose.
 */

import type { PrivacyVisibility } from "./types";

export interface ViewableIdentity {
  user_id: string;
  privacy_visibility: PrivacyVisibility;
  privacy_custom?: Record<string, unknown> | null;
}

export interface ViewerFlags {
  isAdmin?: boolean;
  isFollower?: boolean;
  isBrand?: boolean;
  /** Explicit allow-list of viewer ids, used for privacy_visibility='custom'. */
  allowedViewerIds?: string[];
}

/**
 * Determine whether `viewerId` may view `identity` at all (existence + basic
 * profile). Full detail gating (stats, contact info, etc.) is a separate,
 * stricter check — see `canViewFullDetails`.
 */
export function canViewIdentity(
  viewerId: string | null | undefined,
  identity: ViewableIdentity,
  flags: ViewerFlags = {}
): boolean {
  const isSelf = Boolean(viewerId) && viewerId === identity.user_id;
  if (isSelf || flags.isAdmin) return true;

  switch (identity.privacy_visibility) {
    case "public":
      return true;
    case "private":
      return false;
    case "brand_only":
      return Boolean(flags.isBrand);
    case "followers_only":
      return Boolean(flags.isFollower);
    case "custom":
      return Boolean(viewerId && flags.allowedViewerIds?.includes(viewerId));
    default:
      return false;
  }
}

/**
 * Stricter check for sensitive sections (contact preferences, AI insights,
 * detailed stats). Defaults to the same rules as canViewIdentity, but never
 * grants access to a non-self, non-admin viewer for 'private'.
 */
export function canViewFullDetails(
  viewerId: string | null | undefined,
  identity: ViewableIdentity,
  flags: ViewerFlags = {}
): boolean {
  const isSelf = Boolean(viewerId) && viewerId === identity.user_id;
  if (isSelf || flags.isAdmin) return true;
  return canViewIdentity(viewerId, identity, flags);
}

export function isSelfViewer(viewerId: string | null | undefined, userId: string): boolean {
  return Boolean(viewerId) && viewerId === userId;
}
