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
import { rateLimit } from "@/lib/ops/rate-limit";
import { hasCapability, resolveWorkspaceRole } from "@/lib/community/workspace/permissions";
import {
  resolveCommunityMemberCount,
  resolveSpaceMemberCount,
} from "@/lib/community/member-count";

export const dynamic = "force-dynamic";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
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
    const result = await getHubSpaces(user.id, { offset, limit, q });
    const spaces = (result.spaces ?? []).map((space) => ({
      ...space,
      is_member: true,
    }));
    return NextResponse.json({ ...result, spaces });
  }

  // Guests: public spaces from public/active communities only.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createServiceRoleClient() as any;
  const { data: communities } = await admin
    .from("communities")
    .select(
      "id, name, slug, avatar_url, cover_image, member_count, settings, is_private, visibility"
    )
    .eq("is_active", true)
    .or("is_private.eq.false,is_private.is.null")
    .order("member_count", { ascending: false })
    .limit(80);

  const communityIds = (communities ?? []).map((c: { id: string }) => c.id);
  if (!communityIds.length) {
    return NextResponse.json({ spaces: [], nextOffset: null, total: 0 });
  }

  const communityById = new Map(
    (communities ?? []).map((c: {
      id: string;
      name: string;
      slug: string;
      avatar_url: string | null;
      cover_image: string | null;
      member_count: number | null;
      settings: unknown;
    }) => [c.id, c])
  );

  const { data: spaces } = await admin
    .from("spaces")
    .select(
      "id, name, slug, description, community_id, member_count, cover_url, banner_url, access_type, sort_order, privacy"
    )
    .in("community_id", communityIds)
    .eq("is_active", true)
    .eq("is_hidden", false)
    .order("sort_order", { ascending: true })
    .limit(200);

  const seenCommunities = new Set<string>();
  const items = [];
  for (const space of spaces ?? []) {
    const access = String(space.access_type ?? "free").toLowerCase();
    const privacy = String(space.privacy ?? "public").toLowerCase();
    const isPrivate =
      privacy === "private" ||
      access === "private" ||
      access === "invite" ||
      access === "paid" ||
      access === "premium" ||
      access === "members";
    if (isPrivate) continue;
    if (seenCommunities.has(space.community_id)) continue;
    seenCommunities.add(space.community_id);
    const community = communityById.get(space.community_id);
    if (!community) continue;
    const communityCount = resolveCommunityMemberCount({
      slug: community.slug,
      member_count: community.member_count,
      settings: community.settings,
    });
    const cover =
      space.cover_url?.trim() || space.banner_url?.trim() || null;
    items.push({
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
        communityCount
      ),
      access_type: space.access_type ?? "free",
      last_message: null,
      last_message_at: null,
      href: `/communities/${community.slug}/spaces/${space.slug}`,
      is_member: false,
    });
  }

  const ql = q.toLowerCase();
  const filtered = ql
    ? items.filter(
        (s) =>
          s.name.toLowerCase().includes(ql) ||
          s.community_name.toLowerCase().includes(ql) ||
          (s.description ?? "").toLowerCase().includes(ql)
      )
    : items;
  const total = filtered.length;
  const page = filtered.slice(offset, offset + limit);
  const nextOffset = offset + limit < total ? offset + limit : null;
  return NextResponse.json({ spaces: page, nextOffset, total });
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
