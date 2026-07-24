import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  mapAppealRow,
  resolveModerationContext,
} from "@/lib/community/owner-console/moderation";
import { APPEAL_STATUSES } from "@/lib/community/owner-console/moderation/types";

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

  const ctx = await resolveModerationContext(
    supabase,
    user.id,
    communityId,
    "moderation.view"
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const status = req.nextUrl.searchParams.get("status")?.trim() ?? "";
  const admin = createServiceRoleClient();
  let query = admin
    .from("community_moderation_appeals")
    .select(
      "id, community_id, status, reason, appellant_id, reviewer_id, reviewer_note, related_log_id, related_report_id, created_at, resolved_at"
    )
    .eq("community_id", communityId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (status && status !== "all") {
    query = query.eq("status", status);
  } else if (!status) {
    query = query.in("status", ["open", "in_review"]);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    appeals: (data ?? []).map((row) => mapAppealRow(row)),
  });
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
    appealId?: string;
    status?: string;
    reviewerNote?: string | null;
  };

  const communityId = body.communityId?.trim() ?? "";
  const appealId = body.appealId?.trim() ?? "";
  const status = body.status?.trim() ?? "";

  if (!communityId || !appealId || !status) {
    return NextResponse.json(
      { error: "communityId, appealId, and status are required" },
      { status: 400 }
    );
  }

  if (!(APPEAL_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const ctx = await resolveModerationContext(
    supabase,
    user.id,
    communityId,
    "moderation.manage"
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const now = new Date().toISOString();
  const resolved =
    status === "approved" ||
    status === "rejected" ||
    status === "resolved"
      ? now
      : null;

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("community_moderation_appeals")
    .update({
      status,
      reviewer_id: user.id,
      reviewer_note: body.reviewerNote ?? null,
      resolved_at: resolved,
      updated_at: now,
    })
    .eq("id", appealId)
    .eq("community_id", communityId)
    .select(
      "id, community_id, status, reason, appellant_id, reviewer_id, reviewer_note, related_log_id, related_report_id, created_at, resolved_at"
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Update failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({ appeal: mapAppealRow(data) });
}
