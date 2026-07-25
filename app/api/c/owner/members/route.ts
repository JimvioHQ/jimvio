import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { hasCapability } from "@/lib/community/workspace/permissions";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MEMBERSHIP_SELECT,
  asMembershipRows,
  mapMembershipToOwnerMember,
  resolveMemberManageContext,
  type OwnerMemberOverview,
} from "@/lib/community/owner-console/members";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const communityId = req.nextUrl.searchParams.get("communityId")?.trim() ?? "";
  if (!communityId) {
    return NextResponse.json({ error: "communityId is required" }, { status: 400 });
  }

  const ctx = await resolveMemberManageContext(
    supabase,
    user.id,
    communityId,
    "members.view"
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  const role = req.nextUrl.searchParams.get("role")?.trim() ?? "";
  const status = req.nextUrl.searchParams.get("status")?.trim() ?? "all";
  const groupId = req.nextUrl.searchParams.get("groupId")?.trim() ?? "";
  const verified = req.nextUrl.searchParams.get("verified");
  const cursor = req.nextUrl.searchParams.get("cursor");
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      Number(req.nextUrl.searchParams.get("limit") ?? DEFAULT_PAGE_SIZE) ||
        DEFAULT_PAGE_SIZE
    )
  );
  const includeEmail = hasCapability(ctx.role, "members.manage");

  const admin = createServiceRoleClient();
  let query = admin
    .from("community_memberships")
    .select(MEMBERSHIP_SELECT, { count: "exact" })
    .eq("community_id", communityId)
    .order("subscribed_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("subscribed_at", cursor);
  }

  if (role && role !== "all") {
    if (role === "staff") {
      query = query.in("role", ["owner", "admin", "moderator"]);
    } else {
      query = query.eq("role", role);
    }
  }

  if (status && status !== "all" && status !== "staff") {
    if (status === "banned") {
      query = query.in("status", ["banned", "cancelled"]);
    } else if (status === "active") {
      query = query.eq("status", "active");
    } else if (status === "muted") {
      query = query.not("muted_until", "is", null);
    } else if (status === "suspended") {
      query = query.or("status.eq.paused,suspended_until.not.is.null");
    } else {
      query = query.eq("status", status);
    }
  }

  if (groupId) {
    query = query.contains("space_access", [groupId]);
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = asMembershipRows(data);
  const spaceIds = Array.from(
    new Set(rows.flatMap((r) => (Array.isArray(r.space_access) ? r.space_access : [])))
  );

  const spaceNameMap = new Map<string, string>();
  if (spaceIds.length > 0) {
    const { data: spaces } = await admin
      .from("spaces")
      .select("id, name")
      .in("id", spaceIds);
    for (const s of spaces ?? []) {
      spaceNameMap.set(s.id, s.name);
    }
  }

  let members = rows.map((row) => {
    const ids = Array.isArray(row.space_access) ? row.space_access : [];
    const lastActive = row.last_active_at ?? row.updated_at ?? null;
    const isOnline =
      !!lastActive &&
      Date.now() - new Date(lastActive).getTime() < 15 * 60 * 1000;
    return mapMembershipToOwnerMember(row, {
      groupNames: ids.map((id) => spaceNameMap.get(id) ?? "Group").filter(Boolean),
      includeEmail,
      isOnline,
    });
  });

  if (q) {
    members = members.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) ||
        (m.username ?? "").toLowerCase().includes(q) ||
        (m.email ?? "").toLowerCase().includes(q)
    );
  }

  if (verified === "1" || verified === "true") {
    members = members.filter((m) => m.isVerified);
  }

  // Overview counts (lightweight parallel queries)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [
    totalRes,
    pendingRes,
    invitedRes,
    bannedRes,
    modsRes,
    adminsRes,
    creatorsRes,
    growthRes,
  ] = await Promise.all([
    admin
      .from("community_memberships")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .eq("status", "active"),
    admin
      .from("community_join_requests")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .eq("status", "pending"),
    admin
      .from("community_invites")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .eq("status", "pending"),
    admin
      .from("community_memberships")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .in("status", ["banned", "cancelled"]),
    admin
      .from("community_memberships")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .eq("status", "active")
      .eq("role", "moderator"),
    admin
      .from("community_memberships")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .eq("status", "active")
      .eq("role", "admin"),
    admin
      .from("community_memberships")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .eq("status", "active")
      .eq("role", "creator"),
    admin
      .from("community_memberships")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityId)
      .gte("subscribed_at", sevenDaysAgo),
  ]);

  const overview: OwnerMemberOverview = {
    total: totalRes.count ?? 0,
    online: 0,
    pending: pendingRes.count ?? 0,
    invited: invitedRes.count ?? 0,
    banned: bannedRes.count ?? 0,
    moderators: modsRes.count ?? 0,
    admins: adminsRes.count ?? 0,
    creators: creatorsRes.count ?? 0,
    growth7d: growthRes.count ?? 0,
  };

  const nextCursor =
    rows.length === limit
      ? rows[rows.length - 1]?.subscribed_at ?? null
      : null;

  return NextResponse.json({
    members,
    overview,
    total: count ?? members.length,
    nextCursor,
    community: ctx,
  });
}
