import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminDB } from "@/services/base";
import { ensureDefaultCommunityWorkspace } from "@/lib/community/ensure-default-workspace";
import { communityIsPubliclyDiscoverable } from "@/lib/community/join-policy";
import { resolveCommunityMemberCount } from "@/lib/community/member-count";

export const dynamic = "force-dynamic";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET(req: NextRequest) {
  const admin = getAdminDB();
  const auth = await createClient();
  const { searchParams } = new URL(req.url);
  const categoryParams = [searchParams.get("category"), searchParams.get("categories")]
    .filter(Boolean)
    .flatMap((value) => value!.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const requestedLimit = parseInt(searchParams.get("limit") || "20", 10);
  const limit = Math.min(48, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 20));
  const sort = searchParams.get("sort") ?? "popular";
  const mode = searchParams.get("mode");
  const requestedCategories = Array.from(
    new Set(
      categoryParams.flatMap((value) =>
        value === "Technology" ? ["Technology", "Tech"] : value === "Tech" ? ["Tech", "Technology"] : [value]
      )
    )
  );
  const { data: { user } } = await auth.auth.getUser();

  if (mode === "nearby") {
    return NextResponse.json({ communities: [], total: 0, page, limit });
  }

  let query = admin
    .from("communities")
    .select("*, profiles!communities_owner_id_fkey(full_name, avatar_url, username)", {
      count: "exact",
    })
    .eq("is_active", true);

  // Discover/list must not leak private / invite-only communities unless the viewer is a member.
  let memberCommunityIds: string[] = [];
  let ownedCommunityIds: string[] = [];
  if (user) {
    const { data: memberships } = await admin
      .from("community_memberships")
      .select("community_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(2000);
    memberCommunityIds = (memberships ?? []).map((row) => row.community_id).filter(Boolean);

    const { data: owned } = await admin
      .from("communities")
      .select("id")
      .eq("owner_id", user.id)
      .eq("is_active", true)
      .limit(500);
    ownedCommunityIds = (owned ?? []).map((row) => row.id).filter(Boolean);
  }

  const memberSet = new Set(memberCommunityIds);
  const ownerSet = new Set(ownedCommunityIds);

  if (memberCommunityIds.length) {
    query = query.or(
      `is_private.eq.false,is_private.is.null,id.in.(${memberCommunityIds.join(",")})`,
    );
  } else {
    query = query.or("is_private.eq.false,is_private.is.null");
  }

  if (requestedCategories.length) {
    const values = requestedCategories.map((value) => `"${value.replace(/"/g, "")}"`).join(",");
    query = query.or(`category.in.(${values}),tags.ov.{${requestedCategories.map((value) => value.replace(/[{},"]/g, "")).join(",")}}`);
  }
  if (search?.trim()) {
    const q = `%${search.trim().replace(/[%_,()]/g, "")}%`;
    query = query.or(`name.ilike.${q},tagline.ilike.${q},category.ilike.${q}`);
  }

  // Authenticated recommendation modes use existing membership and follow data;
  // anonymous callers intentionally receive the stable popular order.
  if (user && (mode === "recommended" || mode === "friends")) {
    if (mode === "recommended") {
      const { data: memberships } = await admin
        .from("community_memberships")
        .select("community_id, communities(category, tags)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(100);
      const interests = new Set<string>();
      for (const membership of memberships ?? []) {
        const community = Array.isArray(membership.communities)
          ? membership.communities[0]
          : membership.communities;
        if (community?.category) interests.add(community.category);
        for (const tag of community?.tags ?? []) interests.add(tag);
      }
      if (interests.size) {
        const values = [...interests].map((value) => `"${value.replace(/"/g, "")}"`).join(",");
        query = query.or(`category.in.(${values}),tags.ov.{${[...interests].map((value) => value.replace(/[{},"]/g, "")).join(",")}}`);
      }
    } else {
      const { data: followed } = await (admin as any)
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .limit(500);
      const followedIds = ((followed ?? []) as { following_id: string }[]).map(
        (row) => row.following_id
      );
      if (followedIds.length) {
        const { data: friendMemberships } = await admin
          .from("community_memberships")
          .select("community_id")
          .in("user_id", followedIds)
          .eq("status", "active")
          .limit(1000);
        const ids = [...new Set((friendMemberships ?? []).map((row) => row.community_id))];
        if (!ids.length) return NextResponse.json({ communities: [], total: 0, page, limit });
        query = query.in("id", ids);
      } else {
        return NextResponse.json({ communities: [], total: 0, page, limit });
      }
    }
  }

  if (sort === "featured") {
    query = query.eq("is_featured", true).order("member_count", { ascending: false });
  } else if (sort === "verified" || mode === "verified") {
    query = query.or("is_featured.eq.true,member_count.gte.100").order("is_featured", { ascending: false });
  } else if (sort === "newest" || mode === "newest") {
    query = query.order("created_at", { ascending: false });
  } else if (sort === "trending" || mode === "trending" || mode === "hot") {
    query = query.order("post_count", { ascending: false }).order("updated_at", { ascending: false });
  } else {
    query = query
      .order("is_featured", { ascending: false })
      .order("member_count", { ascending: false });
  }

  const isRising = sort === "rising" || mode === "rising";
  const { data, count, error } = isRising
    ? await query.limit(500)
    : await query.range((page - 1) * limit, page * limit - 1);
  if (error) {
    console.error("[communities] list failed:", error.message);
    return NextResponse.json({ error: "Failed to load communities" }, { status: 500 });
  }

  let communities = data ?? [];
  communities = communities.filter(
    (community) =>
      memberSet.has(community.id) || communityIsPubliclyDiscoverable(community),
  );

  // Keep real user hubs discoverable on popular page 1 (not buried by featured editorial).
  if (
    page === 1 &&
    (!sort || sort === "popular") &&
    !search?.trim() &&
    !requestedCategories.length &&
    !mode
  ) {
    const PRESERVE_SLUGS = ["forex-hub", "gcs-unity"];
    const have = new Set(communities.map((c) => c.slug));
    const missing = PRESERVE_SLUGS.filter((slug) => !have.has(slug));
    if (missing.length) {
      const { data: preserved } = await admin
        .from("communities")
        .select("*, profiles!communities_owner_id_fkey(full_name, avatar_url, username)")
        .in("slug", missing)
        .eq("is_active", true);
      const extras = (preserved ?? [])
        .filter(
          (community) =>
            memberSet.has(community.id) || communityIsPubliclyDiscoverable(community),
        )
        .map((community) => ({
          ...community,
          is_member: memberSet.has(community.id),
          is_owner: ownerSet.has(community.id) || community.owner_id === user?.id,
        }));
      if (extras.length) {
        communities = [...extras, ...communities].slice(0, limit);
      }
    }
  }

  if (isRising && communities.length) {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: joins } = await admin
      .from("community_memberships")
      .select("community_id")
      .in("community_id", communities.map((community) => community.id))
      .eq("status", "active")
      .gte("subscribed_at", since)
      .limit(10_000);
    const growth = new Map<string, number>();
    for (const join of joins ?? []) {
      growth.set(join.community_id, (growth.get(join.community_id) ?? 0) + 1);
    }
    communities = communities
      .sort(
        (a, b) =>
          (growth.get(b.id) ?? 0) - (growth.get(a.id) ?? 0) ||
          Number(b.member_count ?? 0) - Number(a.member_count ?? 0)
      )
      .slice((page - 1) * limit, page * limit);
  }

  return NextResponse.json({
    communities: communities.map((community) => ({
      ...community,
      member_count: resolveCommunityMemberCount({
        slug: community.slug,
        member_count: community.member_count,
        settings: (community as { settings?: unknown }).settings,
      }),
    })),
    total: count ?? 0,
    page,
    limit,
    memberCommunityIds: user ? memberCommunityIds : [],
  });
}

/**
 * Create a community and seed a default General group + Discussion room
 * so feed posting and chat work immediately.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const name = String(body.name ?? "");
  if (!name.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const slug = (body.slug as string) || slugify(name);
  if (!slug) return NextResponse.json({ error: "Invalid slug" }, { status: 400 });

  const insert: Record<string, unknown> = {
    name,
    slug,
    owner_id: user.id,
    tagline: body.tagline as string | undefined,
    description: body.description as string | undefined,
    long_description: body.long_description as string | undefined,
    avatar_url: body.avatar_url as string | undefined,
    cover_image: body.cover_image as string | undefined,
    category: body.category as string | undefined,
    tags: body.tags as string[] | undefined,
    is_private: body.is_private as boolean | undefined,
    is_free: body.is_free as boolean | undefined,
    monthly_price: body.monthly_price as number | undefined,
    yearly_price: body.yearly_price as number | undefined,
    lifetime_price: body.lifetime_price as number | undefined,
    currency: (body.currency as string) || "USD",
    trial_days: body.trial_days as number | undefined,
    platform_commission_rate: body.platform_commission_rate as number | undefined,
  };
  if (
    body.visibility === "public" ||
    body.visibility === "private" ||
    body.visibility === "invite_only"
  ) {
    insert.visibility = body.visibility;
    insert.visibility_mode = body.visibility;
    insert.is_private = body.visibility !== "public";
  }

  const { data, error } = await supabase.from("communities").insert(insert as any).select().single();

  if (error) {
    const duplicate =
      error.code === "23505" || /duplicate|unique/i.test(error.message);
    if (duplicate) {
      return NextResponse.json(
        { error: "A community with this name already exists." },
        { status: 409 },
      );
    }
    console.error("[communities] insert failed:", error.message);
    return NextResponse.json({ error: "Could not create community." }, { status: 400 });
  }

  // Owner membership uses service role: user-scoped INSERT only allows free self-join.
  const admin = getAdminDB();
  const { error: membershipError } = await admin.from("community_memberships").insert({
    community_id: data.id,
    user_id: user.id,
    role: "owner",
    plan_type: "lifetime",
    status: "active",
  });
  if (membershipError) {
    console.error("[communities] owner membership insert failed:", membershipError.message);
    await admin.from("communities").delete().eq("id", data.id).eq("owner_id", user.id);
    return NextResponse.json(
      { error: "Could not finish community setup. Please try again." },
      { status: 500 },
    );
  }

  // Seed default workspace with service role so RLS cannot block first group/room.
  await ensureDefaultCommunityWorkspace(admin as any, data.id, {
    communityName: data.name,
    communitySlug: data.slug,
  });

  return NextResponse.json({ community: data });
}
