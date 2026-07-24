import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  REPORT_SELECT,
  asReportRow,
  logModeration,
  mapReportRow,
  resolveModerationContext,
} from "@/lib/community/owner-console/moderation";

export const dynamic = "force-dynamic";

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
    reportIds?: string[];
    action?: string;
    reason?: string | null;
    assignModeratorId?: string | null;
  };

  const communityId = body.communityId?.trim() ?? "";
  const action = body.action?.trim() ?? "";
  const reportIds = Array.isArray(body.reportIds) ? body.reportIds : [];

  if (!communityId || !action || reportIds.length === 0) {
    return NextResponse.json(
      { error: "communityId, action, and reportIds are required" },
      { status: 400 }
    );
  }

  if (action === "export") {
    const ctx = await resolveModerationContext(
      supabase,
      user.id,
      communityId,
      "moderation.view"
    );
    if ("error" in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }
    const admin = createServiceRoleClient();
    const { data } = await admin
      .from("community_content_reports")
      .select(REPORT_SELECT)
      .eq("community_id", communityId)
      .in("id", reportIds);
    return NextResponse.json({
      ok: true,
      export: (data ?? []).map((row) => mapReportRow(asReportRow(row))),
    });
  }

  let gate = await resolveModerationContext(
    supabase,
    user.id,
    communityId,
    "moderation.manage"
  );
  if ("error" in gate) {
    gate = await resolveModerationContext(
      supabase,
      user.id,
      communityId,
      "moderation.manage"
    );
  }
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const admin = createServiceRoleClient();
  const now = new Date().toISOString();
  const reason = body.reason?.trim() || null;
  let processed = 0;
  const skipped: string[] = [];

  for (const reportId of reportIds) {
    const { data: existing } = await admin
      .from("community_content_reports")
      .select(REPORT_SELECT)
      .eq("id", reportId)
      .eq("community_id", communityId)
      .maybeSingle();

    if (!existing) {
      skipped.push(reportId);
      continue;
    }

    const report = mapReportRow(asReportRow(existing));
    const patch: Record<string, unknown> = { updated_at: now };

    if (action === "dismiss") {
      patch.status = "dismissed";
      patch.reviewed_by = user.id;
      patch.reviewed_at = now;
    } else if (action === "approve") {
      patch.status = "actioned";
      patch.reviewed_by = user.id;
      patch.reviewed_at = now;
    } else if (action === "escalate") {
      patch.risk_level = "critical";
      patch.status = "reviewed";
    } else if (action === "assign_moderator") {
      patch.assigned_moderator_id = body.assignModeratorId ?? user.id;
      patch.status = report.status === "open" ? "reviewed" : report.status;
    } else {
      skipped.push(reportId);
      continue;
    }

    const { error } = await admin
      .from("community_content_reports")
      .update(patch)
      .eq("id", reportId);

    if (error) {
      skipped.push(reportId);
      continue;
    }

    await logModeration(admin, {
      communityId,
      moderatorId: user.id,
      targetUserId: report.reportedUserId ?? report.reporterId,
      action: `bulk_${action}`,
      reason,
      metadata: { reportId },
    });
    processed += 1;
  }

  return NextResponse.json({
    ok: true,
    processed,
    skipped: skipped.length,
    skippedIds: skipped,
  });
}
