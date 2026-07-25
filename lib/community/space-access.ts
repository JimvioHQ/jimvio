/**
 * Helpers for community_memberships.space_access.
 *
 * Semantics:
 * - null / []  → treated as “unrestricted list” for free/paid groups and owner
 *   member listings; premium groups still require an explicit id (or yearly/lifetime).
 * - [uuid, …]  → explicit allow-list of groups
 */

export function memberHasSpaceAccess(
  spaceAccess: string[] | null | undefined,
  spaceId: string,
  role?: string | null
): boolean {
  const r = (role ?? "").toLowerCase();
  if (r === "owner" || r === "admin") return true;
  if (!spaceAccess || spaceAccess.length === 0) return true;
  return spaceAccess.map(String).includes(String(spaceId));
}

/**
 * Grant access to one group for a self-join.
 * Empty → [spaceId] so premium groups become enterable; restricted lists append.
 */
export function grantSpaceAccess(
  spaceAccess: string[] | null | undefined,
  spaceId: string
): string[] {
  const id = String(spaceId);
  if (!spaceAccess || spaceAccess.length === 0) {
    return [id];
  }
  if (spaceAccess.map(String).includes(id)) return spaceAccess.map(String);
  return [...spaceAccess.map(String), id];
}

/**
 * Revoke access to one group.
 * If access was empty (all groups), expand to every *other* active space id.
 */
export function revokeSpaceAccess(
  spaceAccess: string[] | null | undefined,
  spaceId: string,
  allOtherActiveSpaceIds: string[]
): string[] {
  const id = String(spaceId);
  if (!spaceAccess || spaceAccess.length === 0) {
    return allOtherActiveSpaceIds.map(String).filter((sid) => sid !== id);
  }
  return spaceAccess.map(String).filter((sid) => sid !== id);
}
