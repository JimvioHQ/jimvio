import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  DEFAULT_MUTE_MINUTES,
  DEFAULT_TIMEOUT_MINUTES,
  canManageTarget,
  capabilityForAction,
  isAssignableRole,
  resolveMemberManageContext,
} from "@/lib/community/owner-console/members";
import {
  logModeration,
  minutesFromNow,
} from "@/lib/community/owner-console/members/moderation";

export const dynamic = "force-dynamic";

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
    role?: string;
    groupIds?: string[];
    channelIds?: string[];
    reason?: string;
    note?: string;
    durationMinutes?: number;
  };

  const communityId = body.communityId?.trim() ?? "";
  const action = body.action?.trim() ?? "";
  if (!communityId || !action) {
    return NextResponse.json(
      { error: "communityId and action are required" },
      { status: 400 }
    );
  }

  const required = capabilityForAction(action);
  const ctx = await resolveMemberManageContext(
    supabase,
    user.id,
    communityId,
    required
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const admin = createServiceRoleClient();
  const { data: membership, error: fetchErr } = await admin
    .from("community_memberships")
    .select("id, user_id, community_id, role, status, space_access")
    .eq("id", id)
    .eq("community_id", communityId)
    .maybeSingle();

  if (fetchErr || !membership) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (
    !canManageTarget({
      actorRole: ctx.role,
      actorUserId: user.id,
      targetRole: membership.role ?? "member",
      targetUserId: membership.user_id,
      ownerId: ctx.ownerId,
    }) &&
    action !== "add_note"
  ) {
    return NextResponse.json(
      { error: "Forbidden: cannot manage this member" },
      { status: 403 }
    );
  }

  const now = new Date().toISOString();
  const reason = body.reason?.trim() || null;

  switch (action) {
    case "change_role": {
      const nextRole = (body.role ?? "").trim();
      if (!isAssignableRole(nextRole)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      const { error } = await admin
        .from("community_memberships")
        .update({ role: nextRole, updated_at: now })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      await logModeration(admin, {
        communityId,
        moderatorId: user.id,
        targetUserId: membership.user_id,
        action: "change_role",
        reason: reason || `role -> ${nextRole}`,
      });
      return NextResponse.json({ ok: true, role: nextRole });
    }

    case "assign_groups": {
      const groupIds = Array.isArray(body.groupIds) ? body.groupIds : [];
      const current = Array.isArray(membership.space_access)
        ? membership.space_access
        : [];
      const next = Array.from(new Set([...current, ...groupIds]));
      const { error } = await admin
        .from("community_memberships")
        .update({ space_access: next, updated_at: now })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, groupIds: next });
    }

    case "remove_groups": {
      const groupIds = new Set(Array.isArray(body.groupIds) ? body.groupIds : []);
      const current = Array.isArray(membership.space_access)
        ? membership.space_access
        : [];
      const next = current.filter((g: string) => !groupIds.has(g));
      const { error } = await admin
        .from("community_memberships")
        .update({ space_access: next, updated_at: now })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, groupIds: next });
    }

    case "mute": {
      const mins = body.durationMinutes ?? DEFAULT_MUTE_MINUTES;
      const { error } = await admin
        .from("community_memberships")
        .update({ muted_until: minutesFromNow(mins), updated_at: now })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      await logModeration(admin, {
        communityId,
        moderatorId: user.id,
        targetUserId: membership.user_id,
        action: "mute",
        reason,
        metadata: { minutes: mins },
      });
      return NextResponse.json({ ok: true });
    }

    case "unmute": {
      const { error } = await admin
        .from("community_memberships")
        .update({ muted_until: null, updated_at: now })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      await logModeration(admin, {
        communityId,
        moderatorId: user.id,
        targetUserId: membership.user_id,
        action: "unmute",
        reason,
      });
      return NextResponse.json({ ok: true });
    }

    case "timeout": {
      const mins = body.durationMinutes ?? DEFAULT_TIMEOUT_MINUTES;
      const { error } = await admin
        .from("community_memberships")
        .update({ timeout_until: minutesFromNow(mins), updated_at: now })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      await logModeration(admin, {
        communityId,
        moderatorId: user.id,
        targetUserId: membership.user_id,
        action: "timeout",
        reason,
        metadata: { minutes: mins },
      });
      return NextResponse.json({ ok: true });
    }

    case "suspend": {
      const mins = body.durationMinutes;
      const { error } = await admin
        .from("community_memberships")
        .update({
          status: "paused",
          suspended_until: mins ? minutesFromNow(mins) : null,
          ban_reason: reason,
          updated_at: now,
        })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      await logModeration(admin, {
        communityId,
        moderatorId: user.id,
        targetUserId: membership.user_id,
        action: "suspend",
        reason,
      });
      return NextResponse.json({ ok: true });
    }

    case "unsuspend": {
      const { error } = await admin
        .from("community_memberships")
        .update({
          status: "active",
          suspended_until: null,
          ban_reason: null,
          updated_at: now,
        })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      await logModeration(admin, {
        communityId,
        moderatorId: user.id,
        targetUserId: membership.user_id,
        action: "unsuspend",
        reason,
      });
      return NextResponse.json({ ok: true });
    }

    case "ban": {
      const { error } = await admin
        .from("community_memberships")
        .update({
          status: "banned",
          ban_reason: reason,
          cancelled_at: now,
          updated_at: now,
        })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      await logModeration(admin, {
        communityId,
        moderatorId: user.id,
        targetUserId: membership.user_id,
        action: "ban",
        reason,
      });
      return NextResponse.json({ ok: true });
    }

    case "unban": {
      const { error } = await admin
        .from("community_memberships")
        .update({
          status: "active",
          ban_reason: null,
          cancelled_at: null,
          updated_at: now,
        })
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      await logModeration(admin, {
        communityId,
        moderatorId: user.id,
        targetUserId: membership.user_id,
        action: "unban",
        reason,
      });
      return NextResponse.json({ ok: true });
    }

    case "remove": {
      const { error } = await admin
        .from("community_memberships")
        .delete()
        .eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      await logModeration(admin, {
        communityId,
        moderatorId: user.id,
        targetUserId: membership.user_id,
        action: "remove",
        reason,
      });
      return NextResponse.json({ ok: true, deleted: true });
    }

    case "add_note": {
      const note = body.note?.trim() ?? "";
      if (!note) {
        return NextResponse.json({ error: "note is required" }, { status: 400 });
      }
      const { data: inserted, error } = await admin
        .from("community_member_notes")
        .insert({
          community_id: communityId,
          membership_id: id,
          target_user_id: membership.user_id,
          author_id: user.id,
          body: note,
        })
        .select("id, body, author_id, created_at")
        .single();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, note: inserted });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
