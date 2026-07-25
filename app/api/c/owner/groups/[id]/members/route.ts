import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  resolveGroupManageContext,
  type OwnerGroupMember,
} from "@/lib/community/owner-console/groups";
import {
  grantSpaceAccess,
  revokeSpaceAccess,
} from "@/lib/community/space-access";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const { data: space } = await admin
    .from("spaces")
    .select("id, community_id")
    .eq("id", id)
    .maybeSingle();

  if (!space) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const ctx = await resolveGroupManageContext(
    supabase,
    user.id,
    space.community_id
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const roleFilter = req.nextUrl.searchParams.get("role")?.trim() ?? "";

  const { data: memberships } = await admin
    .from("community_memberships")
    .select(
      "user_id, role, status, created_at, subscribed_at, space_access, profiles:user_id(full_name, username, avatar_url)"
    )
    .eq("community_id", space.community_id)
    .eq("status", "active")
    .limit(500);

  const members: OwnerGroupMember[] = [];
  for (const row of memberships ?? []) {
    const access = Array.isArray(row.space_access) ? row.space_access : [];
    const inGroup =
      access.length === 0 ||
      access.includes(id) ||
      row.role === "owner" ||
      row.role === "admin";
    if (!inGroup) continue;

    const profile = row.profiles as
      | { full_name: string | null; username: string | null; avatar_url: string | null }
      | { full_name: string | null; username: string | null; avatar_url: string | null }[]
      | null;
    const p = Array.isArray(profile) ? profile[0] : profile;
    const name = (p?.full_name || p?.username || "").toLowerCase();
    if (q && !name.includes(q) && !(p?.username ?? "").toLowerCase().includes(q)) {
      continue;
    }
    if (roleFilter && String(row.role) !== roleFilter) continue;

    members.push({
      userId: row.user_id,
      fullName: p?.full_name ?? null,
      username: p?.username ?? null,
      avatarUrl: p?.avatar_url ?? null,
      role: String(row.role),
      joinedAt: row.subscribed_at ?? row.created_at ?? null,
      status: String(row.status),
    });
  }

  return NextResponse.json({ members });
}

/** Group-scoped member actions via space_access (never mutates community membership status). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const { data: space } = await admin
    .from("spaces")
    .select("id, community_id, member_count")
    .eq("id", id)
    .maybeSingle();

  if (!space) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const ctx = await resolveGroupManageContext(
    supabase,
    user.id,
    space.community_id
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const body = (await req.json()) as {
    userId?: string;
    action?: "remove" | "mute" | "ban" | "unmute";
  };
  const targetUserId =
    typeof body.userId === "string" ? body.userId.trim() : "";
  const action = body.action;
  if (!targetUserId || !action) {
    return NextResponse.json(
      { error: "userId and action are required" },
      { status: 400 }
    );
  }

  if (targetUserId === ctx.ownerId && action !== "unmute") {
    return NextResponse.json(
      { error: "Cannot modify community owner from group members" },
      { status: 400 }
    );
  }

  const { data: membership } = await admin
    .from("community_memberships")
    .select("id, space_access, status, role")
    .eq("community_id", space.community_id)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const { data: otherSpaces } = await admin
    .from("spaces")
    .select("id")
    .eq("community_id", space.community_id)
    .eq("is_active", true)
    .neq("id", id);
  const otherIds = (otherSpaces ?? []).map((s) => s.id);

  async function applyRevoke() {
    const nextAccess = revokeSpaceAccess(
      membership!.space_access,
      id,
      otherIds
    );
    await admin
      .from("community_memberships")
      .update({ space_access: nextAccess, updated_at: new Date().toISOString() })
      .eq("id", membership!.id);

    const nextCount = Math.max(0, (space!.member_count ?? 1) - 1);
    await admin.from("spaces").update({ member_count: nextCount }).eq("id", id);
  }

  if (action === "remove" || action === "mute" || action === "ban") {
    // Group-scoped only — never pause/cancel the community membership.
    await applyRevoke();
    return NextResponse.json({ ok: true, action });
  }

  if (action === "unmute") {
    const nextAccess = grantSpaceAccess(membership.space_access, id);
    await admin
      .from("community_memberships")
      .update({ space_access: nextAccess, updated_at: new Date().toISOString() })
      .eq("id", membership.id);

    const nextCount = (space.member_count ?? 0) + 1;
    await admin.from("spaces").update({ member_count: nextCount }).eq("id", id);

    return NextResponse.json({ ok: true, action });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
