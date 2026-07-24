import { permanentRedirect, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadCommunityWorkspace } from "@/lib/community/load-community-workspace";
import {
  communityChannelHref,
  communityGroupHref,
  resolveRoom,
  resolveSpace,
  resolveSpaceAndRoom,
} from "@/lib/community/workspace/navigation";

type LegacySearch = {
  space?: string | string[];
  room?: string | string[];
};

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * Light DB resolve for legacy query keys when workspace payload is unavailable
 * (e.g. signed-out visitors). Prefer slug matches; also accept UUID ids.
 */
async function resolveViaDatabase(
  communitySlug: string,
  spaceKey: string | undefined,
  roomKey: string | undefined
): Promise<string | null> {
  const supabase = await createClient();
  const { data: community } = await supabase
    .from("communities")
    .select("id")
    .eq("slug", communitySlug)
    .eq("is_active", true)
    .maybeSingle();
  if (!community) return null;

  let spaceSlug: string | null = null;
  if (spaceKey) {
    const { data: space } = await supabase
      .from("spaces")
      .select("id, slug")
      .eq("community_id", community.id)
      .or(`slug.eq.${spaceKey},id.eq.${spaceKey}`)
      .maybeSingle();
    spaceSlug = space?.slug ?? null;
  }

  if (roomKey) {
    const { data: room } = await supabase
      .from("rooms")
      .select("slug, space_id")
      .eq("community_id", community.id)
      .eq("is_active", true)
      .or(`slug.eq.${roomKey},id.eq.${roomKey}`)
      .limit(1)
      .maybeSingle();

    if (room?.slug) {
      return communityChannelHref(communitySlug, room.slug);
    }
  }

  if (spaceSlug) {
    return communityGroupHref(communitySlug, spaceSlug);
  }

  return null;
}

/**
 * Resolve legacy ?space= / ?room= query URLs to canonical path routes.
 * Always lands somewhere safe — never throws notFound for bad keys.
 */
export async function redirectLegacySpaceRoomQuery(
  communitySlug: string,
  searchParams: LegacySearch,
  options?: { permanent?: boolean }
): Promise<void> {
  const spaceKey = first(searchParams.space);
  const roomKey = first(searchParams.room);
  if (!spaceKey && !roomKey) return;

  const go = options?.permanent === false ? redirect : permanentRedirect;
  const payload = await loadCommunityWorkspace(communitySlug);
  const spaces = payload?.spacesWithRooms ?? [];

  if (spaces.length > 0) {
    if (spaceKey && roomKey) {
      const hit = resolveSpaceAndRoom(spaces, spaceKey, roomKey);
      if (hit) {
        go(communityChannelHref(communitySlug, hit.room.slug));
      }
    }

    if (spaceKey) {
      const space = resolveSpace(spaces, spaceKey);
      if (space) {
        if (roomKey) {
          const room = resolveRoom(space, roomKey);
          if (room) {
            go(communityChannelHref(communitySlug, room.slug));
          }
        }
        go(communityGroupHref(communitySlug, space.slug));
      }
    }

    if (roomKey) {
      const hit = resolveSpaceAndRoom(spaces, null, roomKey);
      if (hit) {
        go(communityChannelHref(communitySlug, hit.room.slug));
      }
    }
  }

  const dbHref = await resolveViaDatabase(communitySlug, spaceKey, roomKey);
  if (dbHref) go(dbHref);

  go(`/communities/${communitySlug}`);
}
