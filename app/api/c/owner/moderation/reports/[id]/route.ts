import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  DEFAULT_MUTE_MINUTES,
  DEFAULT_SUSPEND_DAYS,
  DEFAULT_TIMEOUT_MINUTES,
  REPORT_SELECT,
  asReportRow,
  canModerateTarget,
  capabilityForModerationAction,
  logModeration,
  mapReportRow,
  minutesFromNow,
  resolveModerationContext,
} from "@/lib/community/owner-console/moderation";

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

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("community_content_reports")
    .select(REPORT_SELECT)
    .eq("id", id)
    .eq("community_id", communityId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const report = mapReportRow(asReportRow(data));

  // Enrich names
  const ids = [
    report.reporterId,
    report.reportedUserId,
    report.assignedModeratorId,
  ].filter(Boolean) as string[];

  if (ids.length) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, username")
      .in("id", ids);
    const byId = new Map(
      (profiles ?? []).map((p) => [
        p.id,
        p.full_name?.trim() || p.username?.trim() || null,
      ])
    );
    report.reporterName = byId.get(report.reporterId) ?? report.reporterName;
    if (report.reportedUserId) {
      report.reportedUserName =
        byId.get(report.reportedUserId) ?? report.reportedUserName;
    }
    if (report.assignedModeratorId) {
      report.assignedModeratorName =
        byId.get(report.assignedModeratorId) ?? report.assignedModeratorName;
    }
  }

  const { data: history } = await admin
    .from("community_moderation_logs")
    .select("id, action, reason, moderator_id, target_user_id, metadata, created_at")
    .eq("community_id", communityId)
    .or(
      report.reportedUserId
        ? `target_user_id.eq.${report.reportedUserId},metadata->>reportId.eq.${id}`
        : `metadata->>reportId.eq.${id}`
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    report,
    history: history ?? [],
  });
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

  const body = (await req.json()) as {
    communityId?: string;
    action?: string;
    reason?: string | null;
    note?: string | null;
    durationMinutes?: number;
    assignModeratorId?: string | null;
  };

  const communityId = body.communityId?.trim() ?? "";
  const action = body.action?.trim() ?? "";
  if (!communityId || !action) {
    return NextResponse.json(
      { error: "communityId and action are required" },
      { status: 400 }
    );
  }

  const required = capabilityForModerationAction(action);
  let gate = await resolveModerationContext(
    supabase,
    user.id,
    communityId,
    required
  );
  if ("error" in gate && required !== "moderation.manage") {
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

  const modCtx = gate;
  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("community_content_reports")
    .select(REPORT_SELECT)
    .eq("id", id)
    .eq("community_id", communityId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const report = mapReportRow(asReportRow(existing));
  const now = new Date().toISOString();
  const reason = body.reason?.trim() || null;
  const meta = { reportId: id, queue: report.queue };

  async function loadTargetMembership(userId: string) {
    const { data } = await admin
      .from("community_memberships")
      .select("id, user_id, role, status")
      .eq("community_id", communityId)
      .eq("user_id", userId)
      .maybeSingle();
    return data;
  }

  async function enforceOnTarget(
    enforceAction: string,
    patch: Record<string, unknown>
  ) {
    if (!report.reportedUserId) {
      return { error: "No reported user on this case" as string };
    }
    const membership = await loadTargetMembership(report.reportedUserId);
    if (!membership) {
      return { error: "Reported member not found" };
    }
    if (
      !canModerateTarget({
        actorRole: modCtx.role,
        actorUserId: user!.id,
        targetRole: membership.role ?? "member",
        targetUserId: membership.user_id,
        ownerId: modCtx.ownerId,
      })
    ) {
      return { error: "Forbidden: cannot moderate this member" };
    }
    const { error } = await admin
      .from("community_memberships")
      .update({ ...patch, updated_at: now })
      .eq("id", membership.id);
    if (error) return { error: error.message };
    await logModeration(admin, {
      communityId,
      moderatorId: user!.id,
      targetUserId: membership.user_id,
      action: enforceAction,
      reason,
      metadata: meta,
    });
    return { ok: true as const };
  }

  switch (action) {
    case "approve":
    case "dismiss": {
      const status = action === "approve" ? "actioned" : "dismissed";
      const { error } = await admin
        .from("community_content_reports")
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: now,
          updated_at: now,
        })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      await logModeration(admin, {
        communityId,
        moderatorId: user.id,
        targetUserId: report.reportedUserId ?? report.reporterId,
        action,
        reason,
        metadata: meta,
      });
      return NextResponse.json({ ok: true, status });
    }

    case "add_note": {
      const note = body.note?.trim() || reason;
      if (!note) {
        return NextResponse.json({ error: "note is required" }, { status: 400 });
      }
      const { error } = await admin
        .from("community_content_reports")
        .update({ internal_note: note, updated_at: now })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      await logModeration(admin, {
        communityId,
        moderatorId: user.id,
        targetUserId: report.reportedUserId ?? report.reporterId,
        action: "add_note",
        reason: note,
        metadata: meta,
      });
      return NextResponse.json({ ok: true });
    }

    case "assign_moderator": {
      const assignee = body.assignModeratorId?.trim() || user.id;
      const { error } = await admin
        .from("community_content_reports")
        .update({
          assigned_moderator_id: assignee,
          status: report.status === "open" ? "reviewed" : report.status,
          updated_at: now,
        })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      await logModeration(admin, {
        communityId,
        moderatorId: user.id,
        targetUserId: report.reportedUserId ?? report.reporterId,
        action: "assign_moderator",
        reason,
        metadata: { ...meta, assignModeratorId: assignee },
      });
      return NextResponse.json({ ok: true });
    }

    case "escalate": {
      const { error } = await admin
        .from("community_content_reports")
        .update({
          risk_level: "critical",
          status: "reviewed",
          updated_at: now,
        })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      await logModeration(admin, {
        communityId,
        moderatorId: user.id,
        targetUserId: report.reportedUserId ?? report.reporterId,
        action: "escalate",
        reason,
        metadata: meta,
      });
      return NextResponse.json({ ok: true });
    }

    case "warn": {
      if (!report.reportedUserId) {
        return NextResponse.json(
          { error: "No reported user to warn" },
          { status: 400 }
        );
      }
      await logModeration(admin, {
        communityId,
        moderatorId: user.id,
        targetUserId: report.reportedUserId,
        action: "warn",
        reason,
        metadata: meta,
      });
      await admin
        .from("community_content_reports")
        .update({
          status: "actioned",
          reviewed_by: user.id,
          reviewed_at: now,
          updated_at: now,
        })
        .eq("id", id);
      return NextResponse.json({ ok: true });
    }

    case "mute": {
      const mins = body.durationMinutes ?? DEFAULT_MUTE_MINUTES;
      const result = await enforceOnTarget("mute", {
        muted_until: minutesFromNow(mins),
      });
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 403 });
      }
      await admin
        .from("community_content_reports")
        .update({
          status: "actioned",
          reviewed_by: user.id,
          reviewed_at: now,
          updated_at: now,
        })
        .eq("id", id);
      return NextResponse.json({ ok: true });
    }

    case "timeout": {
      const mins = body.durationMinutes ?? DEFAULT_TIMEOUT_MINUTES;
      const result = await enforceOnTarget("timeout", {
        timeout_until: minutesFromNow(mins),
      });
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 403 });
      }
      await admin
        .from("community_content_reports")
        .update({
          status: "actioned",
          reviewed_by: user.id,
          reviewed_at: now,
          updated_at: now,
        })
        .eq("id", id);
      return NextResponse.json({ ok: true });
    }

    case "suspend": {
      const days = body.durationMinutes
        ? body.durationMinutes / (60 * 24)
        : DEFAULT_SUSPEND_DAYS;
      const result = await enforceOnTarget("suspend", {
        suspended_until: minutesFromNow(Math.max(1, days) * 24 * 60),
        status: "suspended",
      });
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 403 });
      }
      await admin
        .from("community_content_reports")
        .update({
          status: "actioned",
          reviewed_by: user.id,
          reviewed_at: now,
          updated_at: now,
        })
        .eq("id", id);
      return NextResponse.json({ ok: true });
    }

    case "ban": {
      const result = await enforceOnTarget("ban", {
        status: "banned",
        ban_reason: reason,
        muted_until: null,
        timeout_until: null,
        suspended_until: null,
      });
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 403 });
      }
      await admin
        .from("community_content_reports")
        .update({
          status: "actioned",
          reviewed_by: user.id,
          reviewed_at: now,
          updated_at: now,
        })
        .eq("id", id);
      return NextResponse.json({ ok: true });
    }

    case "delete_content": {
      const { error } = await admin
        .from("community_content_reports")
        .update({
          content_deleted_at: now,
          status: "actioned",
          reviewed_by: user.id,
          reviewed_at: now,
          updated_at: now,
        })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      await logModeration(admin, {
        communityId,
        moderatorId: user.id,
        targetUserId: report.reportedUserId ?? report.reporterId,
        action: "delete_content",
        reason,
        metadata: {
          ...meta,
          targetType: report.targetType,
          targetId: report.targetId,
        },
      });
      return NextResponse.json({ ok: true });
    }

    case "restore_content": {
      const { error } = await admin
        .from("community_content_reports")
        .update({
          content_deleted_at: null,
          updated_at: now,
        })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      await logModeration(admin, {
        communityId,
        moderatorId: user.id,
        targetUserId: report.reportedUserId ?? report.reporterId,
        action: "restore_content",
        reason,
        metadata: meta,
      });
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
