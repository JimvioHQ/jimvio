import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  DEFAULT_MUTE_MINUTES,
  canManageTarget,
  isAssignableRole,
  resolveMemberManageContext,
} from "@/lib/community/owner-console/members";
import {
  logModeration,
  minutesFromNow,
} from "@/lib/community/owner-console/members/moderation";
import type { PermissionCapability } from "@/lib/community/workspace/permissions";

export const dynamic = "force-dynamic";

function capabilityForBulk(action: string): PermissionCapability {
  switch (action) {
    case "assign_role":
      return "members.role";
    case "mute":
    case "ban":
      return "members.ban";
    case "assign_group":
    case "remove_group":
    case "export":
    case "announce":
      return "members.manage";
    default:
      return "members.manage";
  }
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
    membershipIds?: string[];
    action?: string;
    role?: string;
    groupId?: string;
    reason?: string;
    message?: string;
    durationMinutes?: number;
  };

  const communityId = body.communityId?.trim() ?? "";
  const action = body.action?.trim() ?? "";
  const ids = Array.isArray(body.membershipIds) ? body.membershipIds : [];

  if (!communityId || !action || ids.length === 0) {
    return NextResponse.json(
      { error: "communityId, action, and membershipIds are required" },
      { status: 400 }
    );
  }

  const ctx = await resolveMemberManageContext(
    supabase,
    user.id,
    communityId,
    capabilityForBulk(action)
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("community_memberships")
    .select("id, user_id, role, status, space_access")
    .eq("community_id", communityId)
    .in("id", ids);

  const targets = rows ?? [];
  const now = new Date().toISOString();
  const reason = body.reason?.trim() || null;
  let processed = 0;
  const skipped: string[] = [];

  if (action === "export") {
    return NextResponse.json({
      ok: true,
      export: targets.map((t) => ({
        id: t.id,
        userId: t.user_id,
        role: t.role,
        status: t.status,
      })),
    });
  }

  if (action === "announce") {
    // Announcement delivery is wired to messaging in a later phase;
    // record intent in moderation log for auditability.
    for (const t of targets) {
      await logModeration(admin, {
        communityId,
        moderatorId: user.id,
        targetUserId: t.user_id,
        action: "announce",
        reason: body.message?.trim() || reason,
      });
      processed += 1;
    }
    return NextResponse.json({ ok: true, processed });
  }

  for (const t of targets) {
    if (
      !canManageTarget({
        actorRole: ctx.role,
        actorUserId: user.id,
        targetRole: t.role ?? "member",
        targetUserId: t.user_id,
        ownerId: ctx.ownerId,
      })
    ) {
      skipped.push(t.id);
      continue;
    }

    if (action === "assign_role") {
      const nextRole = (body.role ?? "").trim();
      if (!isAssignableRole(nextRole)) continue;
      await admin
        .from("community_memberships")
        .update({ role: nextRole, updated_at: now })
        .eq("id", t.id);
    } else if (action === "assign_group" && body.groupId) {
      const current = Array.isArray(t.space_access) ? t.space_access : [];
      const next = Array.from(new Set([...current, body.groupId]));
      await admin
        .from("community_memberships")
        .update({ space_access: next, updated_at: now })
        .eq("id", t.id);
    } else if (action === "remove_group" && body.groupId) {
      const current = Array.isArray(t.space_access) ? t.space_access : [];
      const next = current.filter((g: string) => g !== body.groupId);
      await admin
        .from("community_memberships")
        .update({ space_access: next, updated_at: now })
        .eq("id", t.id);
    } else if (action === "mute") {
      const mins = body.durationMinutes ?? DEFAULT_MUTE_MINUTES;
      await admin
        .from("community_memberships")
        .update({ muted_until: minutesFromNow(mins), updated_at: now })
        .eq("id", t.id);
    } else if (action === "ban") {
      await admin
        .from("community_memberships")
        .update({
          status: "banned",
          ban_reason: reason,
          cancelled_at: now,
          updated_at: now,
        })
        .eq("id", t.id);
    } else {
      skipped.push(t.id);
      continue;
    }

    await logModeration(admin, {
      communityId,
      moderatorId: user.id,
      targetUserId: t.user_id,
      action: `bulk_${action}`,
      reason,
    });
    processed += 1;
  }

  return NextResponse.json({ ok: true, processed, skipped });
}
