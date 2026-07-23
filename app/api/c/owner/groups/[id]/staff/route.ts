import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { resolveGroupManageContext } from "@/lib/community/owner-console/groups";

export const dynamic = "force-dynamic";

async function authorizeGroup(
  groupId: string,
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const admin = createServiceRoleClient();
  const { data: space } = await admin
    .from("spaces")
    .select("id, community_id")
    .eq("id", groupId)
    .maybeSingle();
  if (!space) return { error: "Group not found", status: 404 as const };

  const ctx = await resolveGroupManageContext(
    supabase,
    userId,
    space.community_id
  );
  if ("error" in ctx) return { error: ctx.error, status: ctx.status as 403 | 404 };
  return { admin, space, ctx };
}

export async function GET(
  _req: NextRequest,
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

  const auth = await authorizeGroup(id, user.id, supabase);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data } = await auth.admin
    .from("space_staff")
    .select(
      "user_id, staff_role, created_at, profiles:user_id(full_name, username, avatar_url)"
    )
    .eq("space_id", id)
    .order("created_at", { ascending: true });

  const staff = (data ?? []).map((row) => {
    const profile = row.profiles as
      | { full_name: string | null; username: string | null; avatar_url: string | null }
      | { full_name: string | null; username: string | null; avatar_url: string | null }[]
      | null;
    const p = Array.isArray(profile) ? profile[0] : profile;
    return {
      userId: row.user_id,
      fullName: p?.full_name ?? null,
      username: p?.username ?? null,
      avatarUrl: p?.avatar_url ?? null,
      staffRole: row.staff_role === "admin" ? "admin" : "moderator",
      createdAt: row.created_at,
    };
  });

  return NextResponse.json({ staff });
}

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

  const auth = await authorizeGroup(id, user.id, supabase);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json()) as {
    userId?: string;
    staffRole?: string;
  };
  const targetUserId =
    typeof body.userId === "string" ? body.userId.trim() : "";
  const staffRole = body.staffRole === "admin" ? "admin" : "moderator";

  if (!targetUserId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const { data: membership } = await auth.admin
    .from("community_memberships")
    .select("user_id, status")
    .eq("community_id", auth.space.community_id)
    .eq("user_id", targetUserId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { error: "User must be an active community member" },
      { status: 400 }
    );
  }

  const { error } = await auth.admin.from("space_staff").upsert(
    {
      space_id: id,
      user_id: targetUserId,
      staff_role: staffRole,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "space_id,user_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
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

  const auth = await authorizeGroup(id, user.id, supabase);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const targetUserId = req.nextUrl.searchParams.get("userId")?.trim() ?? "";
  if (!targetUserId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const { error } = await auth.admin
    .from("space_staff")
    .delete()
    .eq("space_id", id)
    .eq("user_id", targetUserId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
