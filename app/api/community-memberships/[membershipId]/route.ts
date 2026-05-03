import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ membershipId: string }> }
) {
  const { membershipId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, reason } = (await req.json()) as {
    action?: "suspend" | "unsuspend" | "change_role";
    role?: string;
    reason?: string;
  };

  if (!action || !["suspend", "unsuspend", "change_role"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  // Fetch the membership
  const { data: membership, error: fetchErr } = await admin
    .from("community_memberships")
    .select("id, user_id, community_id, role, status")
    .eq("id", membershipId)
    .maybeSingle();

  if (fetchErr || !membership) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  // Check if requester is staff in this community
  const { data: requesterMembership } = await admin
    .from("community_memberships")
    .select("role, user_id, community_id")
    .eq("community_id", membership.community_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const staffRoles = new Set(["owner", "admin", "moderator"]);
  const isStaff = requesterMembership && staffRoles.has(requesterMembership.role ?? "");

  // Check if requester is the community owner
  const { data: community } = await admin
    .from("communities")
    .select("owner_id")
    .eq("id", membership.community_id)
    .maybeSingle();

  const isOwner = community?.owner_id === user.id;

  if (!isStaff && !isOwner) {
    return NextResponse.json({ error: "Forbidden: Not a moderator or owner" }, { status: 403 });
  }

  // Prevent moderators from suspending/managing owners or admins
  if (isStaff && !isOwner && (membership.role === "owner" || membership.role === "admin")) {
    return NextResponse.json({ error: "Forbidden: Cannot suspend owners or admins" }, { status: 403 });
  }

  if (action === "suspend") {
    const { error } = await admin
      .from("community_memberships")
      .update({ status: "banned", updated_at: new Date().toISOString() })
      .eq("id", membershipId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Log the moderation action (non-critical, ignore errors)
    try {
      await admin.from("community_moderation_logs").insert({
        community_id: membership.community_id,
        moderator_id: user.id,
        target_user_id: membership.user_id,
        action: "suspend",
        reason: reason || null,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json({ ok: true, message: "Member suspended" });
  }

  if (action === "unsuspend") {
    const { error } = await admin
      .from("community_memberships")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", membershipId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    try {
      await admin.from("community_moderation_logs").insert({
        community_id: membership.community_id,
        moderator_id: user.id,
        target_user_id: membership.user_id,
        action: "unsuspend",
        reason: reason || null,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json({ ok: true, message: "Member unsuspended" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ membershipId: string }> }
) {
  const { membershipId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createServiceRoleClient();

  // Fetch the membership
  const { data: membership, error: fetchErr } = await admin
    .from("community_memberships")
    .select("id, user_id, community_id, role, status")
    .eq("id", membershipId)
    .maybeSingle();

  if (fetchErr || !membership) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  // Check if requester is the community owner
  const { data: community } = await admin
    .from("communities")
    .select("owner_id")
    .eq("id", membership.community_id)
    .maybeSingle();

  const isOwner = community?.owner_id === user.id;

  if (!isOwner) {
    return NextResponse.json({ error: "Forbidden: Only owner can remove members" }, { status: 403 });
  }

  const { error } = await admin
    .from("community_memberships")
    .delete()
    .eq("id", membershipId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  try {
    await admin.from("community_moderation_logs").insert({
      community_id: membership.community_id,
      moderator_id: user.id,
      target_user_id: membership.user_id,
      action: "remove_member",
      reason: null,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Ignore logging errors
  }

  return NextResponse.json({ ok: true, message: "Member removed" });
}
