/** Client-side access checks (mirrors server rules; membership from props). */

export type MembershipLite = {
  role?: string;
  plan_type: string | null;
  status: string;
  space_access?: string[] | null;
};

export function isMembershipActive(m: MembershipLite | null): boolean {
  if (!m || m.status !== "active") return false;
  return true;
}

export function canAccessSpace(
  spaceAccessType: string,
  membership: MembershipLite | null,
  communityOwnerId: string | undefined,
  userId: string | undefined,
  spaceId?: string
): boolean {
  if (communityOwnerId && userId && communityOwnerId === userId) return true;
  const t = spaceAccessType.toLowerCase();
  if (t === "free") return true;
  if (!isMembershipActive(membership)) return false;
  if (t === "paid") return true;
  if (t === "premium") {
    const ids = (membership?.space_access ?? []).map(String);
    return (
      membership?.plan_type === "yearly" ||
      membership?.plan_type === "lifetime" ||
      (spaceId != null && ids.includes(String(spaceId)))
    );
  }
  return false;
}

export function canAccessRoomNav(
  room: { is_locked: boolean; access_type: string },
  spaceAccessType: string,
  membership: MembershipLite | null,
  communityOwnerId: string | undefined,
  userId: string | undefined,
  spaceId: string
): boolean {
  if (communityOwnerId && userId && communityOwnerId === userId) return true;
  if (!room.is_locked) return true;
  if (!isMembershipActive(membership)) return false;
  const at = room.access_type === "inherit" ? "paid" : room.access_type;
  if (at === "free") return true;
  if (at === "paid") return canAccessSpace("paid", membership, communityOwnerId, userId, spaceId);
  if (at === "premium") {
    if (membership?.plan_type === "yearly" || membership?.plan_type === "lifetime") return true;
    const ids = (membership?.space_access ?? []).map(String);
    if (ids.includes(String(spaceId))) return true;
    return canAccessSpace(spaceAccessType, membership, communityOwnerId, userId, spaceId);
  }
  return canAccessSpace(spaceAccessType, membership, communityOwnerId, userId, spaceId);
}

export function requiredPlanLabel(room: { access_type: string }, spaceAccessType: string): "Paid" | "Premium" {
  const at = room.access_type === "inherit" ? spaceAccessType : room.access_type;
  if (at === "premium") return "Premium";
  return "Paid";
}
