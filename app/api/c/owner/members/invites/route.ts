import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  DEFAULT_INVITE_EXPIRY_DAYS,
  isAssignableRole,
  mapInviteRow,
  randomInviteCode,
  resolveMemberManageContext,
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
    "members.invite"
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("community_invites")
    .select(
      "id, community_id, code, email, role, status, max_uses, uses_count, expires_at, created_at, note"
    )
    .eq("community_id", communityId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const origin = req.nextUrl.origin;
  const invites = (data ?? []).map((row) =>
    mapInviteRow(row, ctx.communitySlug, origin)
  );

  return NextResponse.json({ invites });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    communityId?: string;
    email?: string | null;
    role?: string;
    maxUses?: number | null;
    expiresInDays?: number | null;
    note?: string | null;
  };

  const communityId = body.communityId?.trim() ?? "";
  if (!communityId) {
    return NextResponse.json({ error: "communityId is required" }, { status: 400 });
  }

  const ctx = await resolveMemberManageContext(
    supabase,
    user.id,
    communityId,
    "members.invite"
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const role = (body.role ?? "member").trim();
  if (role !== "member" && !isAssignableRole(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const days =
    body.expiresInDays == null
      ? DEFAULT_INVITE_EXPIRY_DAYS
      : Math.max(1, Number(body.expiresInDays) || DEFAULT_INVITE_EXPIRY_DAYS);
  const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
  const code = randomInviteCode();

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("community_invites")
    .insert({
      community_id: communityId,
      code,
      created_by: user.id,
      email: body.email?.trim() || null,
      role,
      max_uses: body.maxUses ?? null,
      status: "pending",
      expires_at: expiresAt,
      note: body.note?.trim() || null,
    })
    .select(
      "id, community_id, code, email, role, status, max_uses, uses_count, expires_at, created_at, note"
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Failed to create invite" },
      { status: 400 }
    );
  }

  const invite = mapInviteRow(data, ctx.communitySlug, req.nextUrl.origin);
  return NextResponse.json({ invite }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    communityId?: string;
    inviteId?: string;
    action?: "revoke";
  };

  const communityId = body.communityId?.trim() ?? "";
  const inviteId = body.inviteId?.trim() ?? "";
  if (!communityId || !inviteId || body.action !== "revoke") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const ctx = await resolveMemberManageContext(
    supabase,
    user.id,
    communityId,
    "members.invite"
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("community_invites")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("community_id", communityId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
