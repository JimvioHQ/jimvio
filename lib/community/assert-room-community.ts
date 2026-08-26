/**
 * Bind a room to the community the caller claimed — blocks cross-community IDOR.
 */

type RoomLite = {
  id: string;
  community_id: string;
  space_id: string | null;
  is_active?: boolean | null;
};

export function roomBelongsToCommunity(
  room: RoomLite | null | undefined,
  communityId: string
): room is RoomLite {
  if (!room?.id) return false;
  if (room.community_id !== communityId) return false;
  if (room.is_active === false) return false;
  return true;
}

export function roomSpaceMatches(
  room: RoomLite,
  spaceId: string | null | undefined
): boolean {
  if (!spaceId) return true;
  return room.space_id === spaceId;
}
