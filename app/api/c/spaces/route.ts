import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getHubSpaces } from "@/services/community/hub-data";
import {
  channelKindForSpaceType,
  isSpaceType,
  SPACE_TYPE_LABELS,
  SPACE_TYPE_TO_ROOM_TYPE,
  STAFF_POSTING_SPACE_TYPES,
  type SpaceType,
} from "@/lib/community/workspace/space-types";
import {
  DEFAULT_PERMISSION_CONFIG,
  DISCUSSION_PERMISSION_CONFIG,
} from "@/lib/community/owner-console/channels";
import { logCommunityFailure, publicErrorMessage } from "@/lib/community/public-error";
import { rateLimit } from "@/lib/ops/rate-limit";
import { hasCapability, resolveWorkspaceRole } from "@/lib/community/workspace/permissions";
import {
  resolveCommunityMemberCount,
  resolveSpaceMemberCount,
} from "@/lib/community/member-count";
import {
  HUB_SPACES_PER_COMMUNITY_LIMIT,
  HUB_SPACES_SEARCH_MATCH_CAP,
  isGuestVisibleCommunity,
  isGuestVisibleSpace,
  mergeSearchCommunities,
  selectGuestRepresentativeSpaces,
  sliceCommunityPage,
} from "@/lib/community/hub-spaces-page";

export const dynamic = "force-dynamic";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

const GUEST_COMMUNITY_FIELDS =
  "id, name, slug, avatar_url, cover_image, member_count, settings, is_private";

const GUEST_SPACE_FIELDS =
  "id, name, slug, description, community_id, member_count, cover_url, banner_url, access_type, sort_order, privacy";

/** Same wildcard stripping as getHubSpaces. An empty result uses the public browse page. */
function sanitizeGuestSpacesQuery(q: string): string {
  return q.replace(/[%_,.()"'\\]/g, "").trim().slice(0, 60);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadPublicGuestCommunitiesByIds(admin: any, ids: readonly string[]) {
  const rows = [];
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    const { data, error } = await admin
      .from("communities")
      .select(GUEST_COMMUNITY_FIELDS)
      .in("id", chunk)
      .eq("is_active", true)
      .or("is_private.eq.false,is_private.is.null");
    if (error) throw error;
    rows.push(...(data ?? []));
  }
  return rows;
}

/**
 * Public communities ordered by name, then one spaces read per community on the page.
 * The hub asks for 30 communities. The route allows at most 60, so this is at most 60
 * space reads plus the community page. Search adds one name query, one space-match
 * query, and id lookups in chunks of 100. A single global spaces limit is not used.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadGuestSpacesPage(admin: any, offset: number, limit: number, rawQuery: string) {
  const safeQ = sanitizeGuestSpacesQuery(rawQuery);
  let communities = [];
  let total = 0;
  let nextOffset: number | null = null;

  if (!safeQ) {
    const { data, error, count } = await admin
      .from("communities")
      .select(GUEST_COMMUNITY_FIELDS, { count: "exact" })
      .eq("is_active", true)
      .or("is_private.eq.false,is_private.is.null")
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    communities = (data ?? []).filter((community: { is_private?: boolean | null; slug?: string | null }) =>
      isGuestVisibleCommunity(community),
    );
    total = typeof count === "number" ? count : communities.length;
    nextOffset = offset + limit < total ? offset + limit : null;
  } else {
    const { data: nameMatches, error: nameError } = await admin
      .from("communities")
      .select(GUEST_COMMUNITY_FIELDS)
      .eq("is_active", true)
      .or("is_private.eq.false,is_private.is.null")
      .or(`name.ilike.%${safeQ}%,slug.ilike.%${safeQ}%`)
      .order("name", { ascending: true })
      .limit(HUB_SPACES_SEARCH_MATCH_CAP);
    if (nameError) throw nameError;

    const { data: spaceHits, error: spaceHitError } = await admin
      .from("spaces")
      .select("community_id, access_type, privacy")
      .eq("is_active", true)
      .eq("is_hidden", false)
      .or(`name.ilike.%${safeQ}%,description.ilike.%${safeQ}%`)
      .limit(HUB_SPACES_SEARCH_MATCH_CAP);
    if (spaceHitError) throw spaceHitError;

    const nameRows = (nameMatches ?? []).filter(
      (community: { is_private?: boolean | null; slug?: string | null }) =>
        isGuestVisibleCommunity(community),
    );
    const seenIds = new Set(nameRows.map((community: { id: string }) => community.id));
    const extraIds: string[] = [];
    const seenExtra = new Set<string>();
    const hitRows: readonly unknown[] = Array.isArray(spaceHits) ? spaceHits : [];
    for (const row of hitRows) {
      if (!row || typeof row !== "object" || !("community_id" in row)) continue;
      const communityId = row.community_id;
      if (typeof communityId !== "string" || communityId.length === 0) continue;
      const accessType = "access_type" in row ? row.access_type : null;
      const privacy = "privacy" in row ? row.privacy : null;
      const visible = isGuestVisibleSpace({
        access_type: accessType == null ? null : String(accessType),
        privacy: privacy == null ? null : String(privacy),
      });
      if (!visible || seenIds.has(communityId) || seenExtra.has(communityId)) continue;
      seenExtra.add(communityId);
      extraIds.push(communityId);
    }
    const spaceCommunities = extraIds.length
      ? (await loadPublicGuestCommunitiesByIds(admin, extraIds)).filter(
          (community: { is_private?: boolean | null; slug?: string | null }) =>
            isGuestVisibleCommunity(community),
        )
      : [];
    const merged = mergeSearchCommunities(nameRows, spaceCommunities);
    const page = sliceCommunityPage(merged, offset, limit);
    communities = page.page;
    total = page.total;
    nextOffset = page.nextOffset;
  }

  if (communities.length === 0) {
    return { spaces: [], nextOffset, total };
  }

  const groups = await Promise.all(
    communities.map(async (community: { id: string }) => {
      const { data, error } = await admin
        .from("spaces")
        .select(GUEST_SPACE_FIELDS)
        .eq("community_id", community.id)
        .eq("is_active", true)
        .eq("is_hidden", false)
        .order("sort_order", { ascending: true })
        .limit(HUB_SPACES_PER_COMMUNITY_LIMIT);
      if (error) throw error;
      return data ?? [];
    }),
  );

  const byCommunity = new Map<
    string,
    Array<{
      id: string;
      community_id: string;
      sort_order?: number | null;
      access_type?: string | null;
      privacy?: string | null;
      name?: string | null;
      slug?: string | null;
      description?: string | null;
      member_count?: number | null;
      cover_url?: string | null;
      banner_url?: string | null;
    }>
  >();
  for (const space of groups.flat()) {
    const list = byCommunity.get(space.community_id) ?? [];
    list.push(space);
    byCommunity.set(space.community_id, list);
  }

  const communityById = new Map(
    communities.map((community: { id: string }) => [community.id, community]),
  );
  const representatives = selectGuestRepresentativeSpaces(
    communities.map((community: { id: string }) => community.id),
    byCommunity,
  );

  const spaces = representatives.flatMap((space) => {
    const community = communityById.get(space.community_id) as
      | {
          id: string;
          name?: string | null;
          slug?: string | null;
          avatar_url?: string | null;
          cover_image?: string | null;
          member_count?: number | null;
          settings?: unknown;
          is_private?: boolean | null;
        }
      | undefined;
    if (!community || !isGuestVisibleCommunity(community)) return [];
    const communityCount = resolveCommunityMemberCount({
      slug: community.slug,
      member_count: community.member_count,
      settings: community.settings,
    });
    const cover = space.cover_url?.trim() || space.banner_url?.trim() || null;
    return [
      {
        id: space.id,
        name: space.name,
        slug: space.slug,
        description: space.description,
        cover_url: cover,
        community_avatar_url:
          community.avatar_url?.trim() || community.cover_image?.trim() || null,
        community_id: space.community_id,
        community_name: community.name,
        community_slug: community.slug,
        member_count: resolveSpaceMemberCount(
          { access_type: space.access_type, member_count: space.member_count },
          communityCount,
        ),
        access_type: space.access_type ?? "free",
        last_message: null,
        last_message_at: null,
        href: `/communities/${community.slug}/spaces/${space.slug}`,
        is_member: false,
      },
    ];
  });

  spaces.sort((a, b) => (a.community_name ?? "").localeCompare(b.community_name ?? ""));
  return { spaces, nextOffset, total };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset") ?? 0) || 0);
  const limit = Math.min(
    60,
    Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 30) || 30)
  );
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (user) {
    try {
      const result = await getHubSpaces(user.id, { offset, limit, q });
      return NextResponse.json(result);
    } catch (error) {
      logCommunityFailure("spaces.get", error);
      return NextResponse.json(
        { error: publicErrorMessage(error, "Could not load Spaces") },
        { status: 500 }
      );
    }
  }

  // Guests never share the signed-in primary-space pick or private catalog.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createServiceRoleClient() as any;
  try {
    const result = await loadGuestSpacesPage(admin, offset, limit, q);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    logCommunityFailure("spaces.guest", error);
    return NextResponse.json(
      { error: publicErrorMessage(error, "Could not load Spaces") },
      { status: 500 },
    );
  }
}

/** Create a Space with a primary room matching the Space type. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimit(`space-create:${user.id}`, 20, 60_000);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many spaces created — try again shortly" },
      { status: 429 }
    );
  }

  const body = (await req.json()) as Record<string, unknown>;
  const communityId = typeof body.communityId === "string" ? body.communityId : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim().slice(0, 2000)
      : null;
  const accessType =
    typeof body.access_type === "string" && body.access_type.trim()
      ? body.access_type.trim()
      : "free";
  const icon =
    typeof body.icon === "string" && body.icon.trim() ? body.icon.trim() : null;
  const bannerUrl =
    typeof body.bannerUrl === "string" && body.bannerUrl.trim()
      ? body.bannerUrl.trim()
      : typeof body.banner_url === "string" && body.banner_url.trim()
        ? body.banner_url.trim()
        : null;
  const coverUrl =
    typeof body.coverUrl === "string" && body.coverUrl.trim()
      ? body.coverUrl.trim()
      : typeof body.cover_url === "string" && body.cover_url.trim()
        ? body.cover_url.trim()
        : null;
  const privacy =
    typeof body.privacy === "string" && body.privacy.trim()
      ? body.privacy.trim()
      : "public";

  const rawSpaceType = body.spaceType ?? body.space_type;
  let spaceType: SpaceType = "discussion";
  if (rawSpaceType !== undefined && rawSpaceType !== null && rawSpaceType !== "") {
    if (!isSpaceType(rawSpaceType)) {
      return NextResponse.json(
        { error: "Invalid spaceType" },
        { status: 400 }
      );
    }
    spaceType = rawSpaceType;
  }

  if (!communityId) {
    return NextResponse.json({ error: "communityId is required" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { data: community } = await supabase
    .from("communities")
    .select("id, owner_id")
    .eq("id", communityId)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  const { data: membership } = await supabase
    .from("community_memberships")
    .select("role, status, plan_type")
    .eq("community_id", communityId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const role = resolveWorkspaceRole({
    userId: user.id,
    ownerId: community.owner_id,
    membership: membership
      ? {
          role: String(membership.role),
          status: String(membership.status),
          plan_type: membership.plan_type ? String(membership.plan_type) : null,
        }
      : null,
  });

  if (!hasCapability(role, "space.create") && !hasCapability(role, "group.create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { count: activeSpaceCount } = await supabase
    .from("spaces")
    .select("id", { count: "exact", head: true })
    .eq("community_id", communityId)
    .eq("is_active", true)
    .eq("is_hidden", false);

  if ((activeSpaceCount ?? 0) >= 1) {
    return NextResponse.json(
      { error: "Each community supports one Space. Edit the existing Space instead." },
      { status: 409 }
    );
  }

  const { count } = await supabase
    .from("spaces")
    .select("id", { count: "exact", head: true })
    .eq("community_id", communityId);

  const baseSlug = slugify(name) || "space";
  const slug = `${baseSlug}-${Date.now().toString(36)}`.slice(0, 80);

  const { data: space, error } = await supabase
    .from("spaces")
    .insert({
      community_id: communityId,
      name: name.slice(0, 120),
      slug,
      description,
      icon,
      cover_url: coverUrl,
      banner_url: bannerUrl,
      privacy,
      access_type: accessType,
      space_type: spaceType,
      sort_order: count ?? 0,
      is_active: true,
      room_count: 0,
      member_count: 0,
      last_activity_at: new Date().toISOString(),
    })
    .select(
      "id, name, slug, description, access_type, space_type, sort_order, community_id, icon, banner_url, cover_url, privacy"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const roomType = SPACE_TYPE_TO_ROOM_TYPE[spaceType] ?? "chat";
  const roomName = SPACE_TYPE_LABELS[spaceType] ?? "Discussion";
  const roomSlug = `${slugify(roomName) || "room"}-${Date.now().toString(36)}`.slice(
    0,
    80
  );
  const channelKind = channelKindForSpaceType(spaceType);
  const permissionConfig = STAFF_POSTING_SPACE_TYPES.has(spaceType)
    ? DEFAULT_PERMISSION_CONFIG
    : DISCUSSION_PERMISSION_CONFIG;

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .insert({
      space_id: space.id,
      community_id: communityId,
      name: roomName,
      slug: roomSlug,
      room_type: roomType,
      access_type: "inherit",
      sort_order: 0,
      is_active: true,
      channel_kind: channelKind,
      permission_config: permissionConfig,
    })
    .select(
      "id, name, slug, room_type, space_id, community_id, access_type, sort_order, channel_kind"
    )
    .single();

  if (roomError) {
    await supabase.from("spaces").delete().eq("id", space.id);
    return NextResponse.json({ error: roomError.message }, { status: 400 });
  }

  await supabase
    .from("spaces")
    .update({ room_count: 1 })
    .eq("id", space.id);

  return NextResponse.json({
    space: { ...space, room_count: 1 },
    room,
  });
}
