import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  resolveChannelManageContext,
  type OwnerChannelAnalytics,
  type OwnerChannelMember,
} from "@/lib/community/owner-console/channels";

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
  const { data: room } = await admin
    .from("rooms")
    .select("id, community_id, space_id")
    .eq("id", id)
    .maybeSingle();
  if (!room) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const ctx = await resolveChannelManageContext(
    supabase,
    user.id,
    room.community_id
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const { data: memberships } = await admin
    .from("community_memberships")
    .select(
      "user_id, role, status, created_at, subscribed_at, space_access, profiles:user_id(full_name, username, avatar_url)"
    )
    .eq("community_id", room.community_id)
    .eq("status", "active")
    .limit(500);

  const members: OwnerChannelMember[] = [];
  for (const row of memberships ?? []) {
    const access = Array.isArray(row.space_access) ? row.space_access : [];
    const inGroup =
      access.length === 0 ||
      access.includes(room.space_id) ||
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
