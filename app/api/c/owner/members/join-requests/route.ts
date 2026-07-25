import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  mapJoinRequestRow,
  resolveMemberManageContext,
} from "@/lib/community/owner-console/members";
import { logModeration } from "@/lib/community/owner-console/members/moderation";

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
    "members.manage"
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const status = req.nextUrl.searchParams.get("status")?.trim() || "pending";
  const admin = createServiceRoleClient();
  let query = admin
    .from("community_join_requests")
    .select(
      `id, community_id, user_id, reason, referral_code, status, created_at,
       profiles:user_id(full_name, username, avatar_url),
       referred:referred_by(full_name, username, avatar_url)`
    )
    .eq("community_id", communityId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    requests: (data ?? []).map(mapJoinRequestRow),
  });
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
    requestIds?: string[];
    action?: "approve" | "reject";
    note?: string;
  };

  const communityId = body.communityId?.trim() ?? "";
  const action = body.action;
  const ids = Array.isArray(body.requestIds) ? body.requestIds : [];

  if (!communityId || !action || !["approve", "reject"].includes(action) || ids.length === 0) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const ctx = await resolveMemberManageContext(
    supabase,
    user.id,
    communityId,
    "members.manage"
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const admin = createServiceRoleClient();
  const { data: requests } = await admin
    .from("community_join_requests")
    .select("id, user_id, status")
    .eq("community_id", communityId)
    .in("id", ids);

  const now = new Date().toISOString();
  let processed = 0;

  for (const row of requests ?? []) {
    if (row.status !== "pending") continue;

    if (action === "approve") {
      const { data: existing } = await admin
        .from("community_memberships")
        .select("id")
        .eq("community_id", communityId)
        .eq("user_id", row.user_id)
        .maybeSingle();

      if (!existing) {
        await admin.from("community_memberships").insert({
          community_id: communityId,
          user_id: row.user_id,
          role: "member",
          status: "active",
          plan_type: "free",
          subscribed_at: now,
        });
      } else {
        await admin
          .from("community_memberships")
          .update({ status: "active", updated_at: now })
          .eq("id", existing.id);
      }
    }

    await admin
      .from("community_join_requests")
      .update({
        status: action === "approve" ? "approved" : "rejected",
        reviewed_by: user.id,
        reviewed_at: now,
        review_note: body.note?.trim() || null,
        updated_at: now,
      })
      .eq("id", row.id);

    await logModeration(admin, {
      communityId,
      moderatorId: user.id,
      targetUserId: row.user_id,
      action: action === "approve" ? "approve_join" : "reject_join",
      reason: body.note?.trim() || null,
    });
    processed += 1;
  }

  return NextResponse.json({ ok: true, processed });
}
