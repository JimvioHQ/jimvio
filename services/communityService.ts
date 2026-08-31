import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { notifyCommunityOwnerOnJoin, notifyCommunityOwnerOnJoinRequest } from "@/lib/community/notify-community";
import {
  communityAcceptsInstantJoin,
  communityRequiresApproval,
  communityRequiresInvite,
  sanitizeInviteCode,
} from "@/lib/community/join-policy";
import { isAssignableRole } from "@/lib/community/owner-console/members";

function getService() {
  return createServiceRoleClient();
}

export type CommunityMembershipRow = {
  id: string;
  community_id: string;
  user_id: string;
  role: string;
  plan_type: string | null;
  status: string;
  subscribed_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  payment_reference: string | null;
  payment_provider: string | null;
  amount_paid: number | null;
  space_access: string[] | null;
  created_at: string | null;
  updated_at: string | null;
};

/**
 * Check if a user has active membership in a community
 */
export async function getUserMembership(
  userId: string,
  communityId: string
): Promise<CommunityMembershipRow | null> {
  const supabase = getService();
  const { data } = await supabase
    .from("community_memberships")
    .select("*")
    .eq("user_id", userId)
    .eq("community_id", communityId)
    .maybeSingle();
  return data as CommunityMembershipRow | null;
}

/**
 * Check if membership is active (not expired or cancelled)
 */
export function isMembershipActive(membership: Pick<CommunityMembershipRow, 'status' | 'expires_at'> | null): boolean {
  if (!membership) return false;
  if (membership.status !== "active") return false;
  if (membership.expires_at && new Date(membership.expires_at) < new Date()) return false;
  return true;
}

/**
 * Get community with full details
 */
export async function getCommunityBySlug(slug: string) {
  const supabase = getService();
  const { data, error } = await supabase
    .from("communities")
    .select(
      `
      *,
      profiles!communities_owner_id_fkey (
        id, full_name, avatar_url, username
      )
    `
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Get spaces for a community, with access info for a user
 */
export async function getCommunitySpaces(communityId: string, userId?: string) {
  const supabase = getService();
  const { data: community } = await supabase
    .from("communities")
    .select("id, is_private, is_active, owner_id")
    .eq("id", communityId)
    .maybeSingle();

  if (!community || community.is_active === false) return [];

  const membership = userId ? await getUserMembership(userId, communityId) : null;
  const isOwner = Boolean(userId && community.owner_id === userId);
  const memberOk = isOwner || isMembershipActive(membership);

  // Private communities: spaces are members-only.
  if (community.is_private && !memberOk) return [];

  const { data: spaces } = await supabase
    .from("spaces")
    .select("*")
    .eq("community_id", communityId)
    .eq("is_active", true)
    .order("sort_order");

  if (!spaces?.length) return [];

  const isPublicSpace = (accessType: string | null | undefined) => {
    const t = (accessType ?? "free").toLowerCase();
    return t !== "private" && t !== "paid" && t !== "premium";
  };

  if (!userId) {
    return spaces
      .filter((s) => isPublicSpace(s.access_type))
      .map((s) => ({ ...s, hasAccess: true }));
  }

  const spaceAccessIds = new Set((membership?.space_access ?? []).map((id) => String(id)));

  return spaces.map((space) => {
    let hasAccess = false;
    if (space.access_type === "free") hasAccess = true;
    else if (isMembershipActive(membership)) {
      if (space.access_type === "paid") hasAccess = true;
      if (space.access_type === "premium") {
        hasAccess =
          membership?.plan_type === "yearly" ||
          membership?.plan_type === "lifetime" ||
          spaceAccessIds.has(String(space.id));
      }
    }
    if (isOwner) hasAccess = true;
    return { ...space, hasAccess };
  });
}

/**
 * Get rooms for a space, with access info
 */
export async function getSpaceRooms(spaceId: string, communityId: string, userId?: string) {
  const supabase = getService();
  const { data: rooms } = await supabase
    .from("rooms")
    .select("*")
    .eq("space_id", spaceId)
    .eq("is_active", true)
    .order("sort_order");

  if (!rooms?.length) return [];

  if (!userId) return rooms.map((r) => ({ ...r, hasAccess: !r.is_locked }));

  const membership = await getUserMembership(userId, communityId);
  const isActive = isMembershipActive(membership);
  const spaceAccessIds = new Set((membership?.space_access ?? []).map((id) => String(id)));

  return rooms.map((room) => {
    const accessType = room.access_type === "inherit" ? "paid" : room.access_type;
    let hasAccess = false;
    if (!room.is_locked) hasAccess = true;
    else if (accessType === "free") hasAccess = true;
    else if (isActive && accessType === "paid") hasAccess = true;
    else if (isActive && accessType === "premium") {
      hasAccess =
        membership?.plan_type === "yearly" ||
        membership?.plan_type === "lifetime" ||
        spaceAccessIds.has(String(spaceId));
    }
    return { ...room, hasAccess };
  });
}

/**
 * Join a free community, or queue a join request / redeem an invite.
 * Visibility is resolved from the database — never from the client.
 */
export type JoinCommunityOutcome =
  | { kind: "joined"; membership: CommunityMembershipRow }
  | { kind: "pending"; requestId: string };

export async function joinFreeCommunity(
  userId: string,
  communityId: string,
  opts?: { inviteCode?: string; reason?: string; userEmail?: string | null }
): Promise<JoinCommunityOutcome> {
  const supabase = getService();
  const { data: community } = await supabase
    .from("communities")
    .select(
      "id, is_free, is_private, is_active, member_count, owner_id, slug, name, visibility, visibility_mode, archived_at"
    )
    .eq("id", communityId)
    .eq("is_active", true)
    .maybeSingle();

  if (!community || community.archived_at) throw new Error("Community not found");
  if (!community.is_free) throw new Error("This community requires a subscription");

  const existing = await getUserMembership(userId, communityId);
  if (existing?.status === "banned") {
    throw new Error("You are banned from this community");
  }

  const inviteCode = sanitizeInviteCode(opts?.inviteCode);
  if (inviteCode) {
    return redeemCommunityInvite(userId, community, inviteCode, opts?.userEmail ?? null);
  }

  if (communityRequiresInvite(community)) {
    throw new Error("This community is invite-only. You need a valid invitation.");
  }

  if (communityRequiresApproval(community)) {
    return submitJoinRequest(userId, community, opts?.reason);
  }

  if (!communityAcceptsInstantJoin(community)) {
    throw new Error("This community cannot be joined directly");
  }

  return activateFreeMembership(userId, community, existing, "member");
}

type JoinCommunityRow = {
  id: string;
  is_free: boolean | null;
  is_private: boolean | null;
  is_active: boolean | null;
  member_count: number | null;
  owner_id: string;
  slug: string;
  name: string;
  visibility?: string | null;
  visibility_mode?: string | null;
  archived_at?: string | null;
};

async function activateFreeMembership(
  userId: string,
  community: JoinCommunityRow,
  existing: CommunityMembershipRow | null,
  role: string
): Promise<{ kind: "joined"; membership: CommunityMembershipRow }> {
  const supabase = getService();
  const communityId = community.id;
  const safeRole = role === "owner" ? "member" : role;

  if (existing) {
    if (existing.status === "active") {
      return { kind: "joined", membership: existing };
    }
    if (existing.status === "cancelled" || existing.status === "expired" || existing.status === "paused") {
      const { data: membership, error } = await supabase
        .from("community_memberships")
        .update({
          status: "active",
          cancelled_at: null,
          plan_type: existing.plan_type ?? "free",
          role: existing.role === "owner" ? "owner" : safeRole === "member" ? (existing.role || "member") : safeRole,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      await bumpMemberCount(communityId, community.member_count);
      return { kind: "joined", membership: membership as CommunityMembershipRow };
    }
    throw new Error("You cannot join this community right now");
  }

  const { data: membership, error } = await supabase
    .from("community_memberships")
    .insert({
      community_id: communityId,
      user_id: userId,
      role: safeRole,
      plan_type: "free",
      status: "active",
    })
    .select()
    .single();

  if (error) throw error;

  await bumpMemberCount(communityId, community.member_count);
  await notifyJoin(userId, community);
  return { kind: "joined", membership: membership as CommunityMembershipRow };
}

async function bumpMemberCount(communityId: string, current: number | null) {
  const supabase = getService();
  const next = (current ?? 0) + 1;
  await supabase
    .from("communities")
    .update({ member_count: next })
    .eq("id", communityId);
  await syncFreeSpaceMemberCounts(communityId, next);
}

/** Free/inherit spaces mirror active community membership size. */
async function syncFreeSpaceMemberCounts(communityId: string, memberCount: number) {
  const supabase = getService();
  const { data: spaces } = await supabase
    .from("spaces")
    .select("id, access_type")
    .eq("community_id", communityId)
    .eq("is_active", true);
  for (const space of spaces ?? []) {
    const access = (space.access_type || "free").toLowerCase();
    if (access === "free" || access === "inherit") {
      await supabase
        .from("spaces")
        .update({ member_count: memberCount })
        .eq("id", space.id);
    }
  }
}

async function notifyJoin(userId: string, community: JoinCommunityRow) {
  const supabase = getService();
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", userId)
      .maybeSingle();
    await notifyCommunityOwnerOnJoin(supabase, {
      ownerId: community.owner_id,
      memberId: userId,
      memberName: profile?.full_name || profile?.username || "Someone",
      communityId: community.id,
      communitySlug: community.slug,
      communityName: community.name,
    });
  } catch (err) {
    console.error("[joinFreeCommunity] notify failed:", err);
  }
}

async function submitJoinRequest(
  userId: string,
  community: JoinCommunityRow,
  reason?: string
): Promise<{ kind: "pending"; requestId: string }> {
  const supabase = getService();
  const existing = await getUserMembership(userId, community.id);
  if (existing?.status === "active") {
    throw new Error("You are already a member");
  }

  const { data: current } = await supabase
    .from("community_join_requests")
    .select("id, status")
    .eq("community_id", community.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (current?.status === "pending") {
    return { kind: "pending", requestId: current.id };
  }

  const now = new Date().toISOString();
  if (current) {
    const { data: updated, error } = await supabase
      .from("community_join_requests")
      .update({
        status: "pending",
        reason: reason?.trim() || null,
        reviewed_by: null,
        reviewed_at: null,
        review_note: null,
        updated_at: now,
      })
      .eq("id", current.id)
      .select("id")
      .single();
    if (error) throw error;
    await notifyJoinRequest(userId, community);
    return { kind: "pending", requestId: updated.id };
  }

  const { data: inserted, error } = await supabase
    .from("community_join_requests")
    .insert({
      community_id: community.id,
      user_id: userId,
      reason: reason?.trim() || null,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) throw error;
  await notifyJoinRequest(userId, community);
  return { kind: "pending", requestId: inserted.id };
}

async function notifyJoinRequest(userId: string, community: JoinCommunityRow) {
  const supabase = getService();
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", userId)
      .maybeSingle();
    await notifyCommunityOwnerOnJoinRequest(supabase, {
      ownerId: community.owner_id,
      memberId: userId,
      memberName: profile?.full_name || profile?.username || "Someone",
      communityId: community.id,
      communitySlug: community.slug,
      communityName: community.name,
    });
  } catch (err) {
    console.error("[submitJoinRequest] notify failed:", err);
  }
}

async function redeemCommunityInvite(
  userId: string,
  community: JoinCommunityRow,
  code: string,
  userEmail: string | null
): Promise<JoinCommunityOutcome> {
  const supabase = getService();
  const { data: invite } = await supabase
    .from("community_invites")
    .select("id, community_id, code, email, role, status, max_uses, uses_count, expires_at")
    .eq("community_id", community.id)
    .eq("code", code)
    .maybeSingle();

  if (!invite) throw new Error("Invitation is invalid");
  if (invite.status === "revoked") throw new Error("Invitation has been revoked");
  if (invite.status === "exhausted" || invite.status === "expired") {
    throw new Error("Invitation is no longer valid");
  }
  if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) {
    await supabase
      .from("community_invites")
      .update({ status: "expired" })
      .eq("id", invite.id);
    throw new Error("Invitation has expired");
  }
  const used = Number(invite.uses_count ?? 0);
  const max = invite.max_uses == null ? null : Number(invite.max_uses);
  if (max != null && used >= max) {
    throw new Error("Invitation has already been used");
  }
  if (invite.email) {
    const expected = invite.email.trim().toLowerCase();
    const actual = (userEmail ?? "").trim().toLowerCase();
    if (!actual || actual !== expected) {
      throw new Error("This invitation was issued for a different email");
    }
  }

  const existing = await getUserMembership(userId, community.id);
  if (existing?.status === "active") {
    return { kind: "joined", membership: existing };
  }
  const requestedRole = String(invite.role || "member").toLowerCase();
  const role =
    requestedRole !== "owner" && isAssignableRole(requestedRole) ? requestedRole : "member";

  const joined = await activateFreeMembership(userId, community, existing, role);

  const nextUses = used + 1;
  const exhausted = max != null && nextUses >= max;
  await supabase
    .from("community_invites")
    .update({
      uses_count: nextUses,
      status: exhausted ? "exhausted" : invite.status === "pending" && max === 1 ? "accepted" : invite.status,
      accepted_by: userId,
    })
    .eq("id", invite.id);

  return joined;
}

/**
 * Leave a community (member self-cancel). Owners cannot leave via this path.
 */
export async function leaveCommunity(userId: string, communityId: string) {
  const supabase = getService();
  const { data: community } = await supabase
    .from("communities")
    .select("id, owner_id, member_count")
    .eq("id", communityId)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) throw new Error("Community not found");
  if (community.owner_id === userId) {
    throw new Error("Owners cannot leave their own community");
  }

  const existing = await getUserMembership(userId, communityId);
  if (!existing || existing.status !== "active") {
    return existing;
  }

  const { data: membership, error } = await supabase
    .from("community_memberships")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) throw error;

  const next = Math.max(0, (community.member_count ?? 1) - 1);
  await supabase
    .from("communities")
    .update({
      member_count: next,
    })
    .eq("id", communityId);
  await syncFreeSpaceMemberCounts(communityId, next);

  return membership;
}

export type CommunityPaymentParams = {
  userId: string;
  communityId: string;
  planType: "monthly" | "yearly" | "lifetime";
  amount: number;
  currency: string;
  paymentProvider: string;
  paymentReference: string;
};

/**
 * Handle successful community subscription payment
 * Called by payment webhooks or server-side after confirmation
 */
export async function handleCommunityPayment(params: CommunityPaymentParams) {
  const supabase = getService();
  const { data: community } = await supabase
    .from("communities")
    .select(
      "monthly_price, yearly_price, lifetime_price, platform_commission_rate, owner_id, member_count"
    )
    .eq("id", params.communityId)
    .single();

  if (!community) throw new Error("Community not found");

  let expiresAt: string | null = null;
  if (params.planType === "monthly") {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    expiresAt = d.toISOString();
  } else if (params.planType === "yearly") {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    expiresAt = d.toISOString();
  }

  const existing = await getUserMembership(params.userId, params.communityId);
  let membershipId: string;

  if (existing) {
    membershipId = existing.id;
    const { error } = await supabase
      .from("community_memberships")
      .update({
        plan_type: params.planType,
        status: "active",
        subscribed_at: new Date().toISOString(),
        expires_at: expiresAt,
        payment_reference: params.paymentReference,
        payment_provider: params.paymentProvider,
        amount_paid: params.amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { data: inserted, error } = await supabase
      .from("community_memberships")
      .insert({
        community_id: params.communityId,
        user_id: params.userId,
        role: "member",
        plan_type: params.planType,
        status: "active",
        expires_at: expiresAt,
        payment_reference: params.paymentReference,
        payment_provider: params.paymentProvider,
        amount_paid: params.amount,
      })
      .select("id")
      .single();
    if (error) throw error;
    membershipId = inserted!.id;

    const next = (community.member_count ?? 0) + 1;
    await supabase
      .from("communities")
      .update({ member_count: next })
      .eq("id", params.communityId);
    await syncFreeSpaceMemberCounts(params.communityId, next);
  }

  const commissionRate = Number(community.platform_commission_rate ?? 15);
  const platformEarnings = params.amount * (commissionRate / 100);
  const creatorEarnings = params.amount - platformEarnings;

  const { error: payErr } = await supabase.from("community_payments").insert({
    community_id: params.communityId,
    membership_id: membershipId,
    user_id: params.userId,
    amount: params.amount,
    currency: params.currency,
    plan_type: params.planType,
    payment_provider: params.paymentProvider,
    payment_reference: params.paymentReference,
    platform_commission: platformEarnings,
    creator_earnings: creatorEarnings,
    status: "completed",
  });
  if (payErr) throw payErr;

  const { data: creatorWallet } = await supabase
    .from("wallets")
    .select("available_balance, total_earned")
    .eq("user_id", community.owner_id)
    .maybeSingle();

  if (creatorWallet) {
    await supabase
      .from("wallets")
      .update({
        available_balance: Number(creatorWallet.available_balance) + creatorEarnings,
        total_earned: Number(creatorWallet.total_earned) + creatorEarnings,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", community.owner_id);
  }

  const platformUserId = process.env.JIMVIO_PLATFORM_WALLET_USER_ID;
  if (platformUserId) {
    const { data: platformWallet } = await supabase
      .from("wallets")
      .select("available_balance, total_earned")
      .eq("user_id", platformUserId)
      .maybeSingle();

    if (platformWallet) {
      await supabase
        .from("wallets")
        .update({
          available_balance: Number(platformWallet.available_balance) + platformEarnings,
          total_earned: Number(platformWallet.total_earned) + platformEarnings,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", platformUserId);
    }

    await supabase.from("transactions").insert({
      user_id: platformUserId,
      reference: `COMM-COMM-${params.communityId.slice(0, 8)}-${Date.now()}`,
      type: "community_commission",
      amount: platformEarnings,
      currency: params.currency,
      status: "completed",
      provider: params.paymentProvider,
      description: `Community subscription commission (${commissionRate}%)`,
      metadata: { community_id: params.communityId, plan_type: params.planType },
    });
  }

  return { creatorEarnings, platformEarnings };
}

/**
 * Award points to a member (after task completion, etc.)
 */
export async function awardPoints(userId: string, communityId: string, points: number) {
  const supabase = getService();
  const { data: existing } = await supabase
    .from("member_points")
    .select("total_points, level")
    .eq("user_id", userId)
    .eq("community_id", communityId)
    .maybeSingle();

  const newTotal = (existing?.total_points ?? 0) + points;
  const newLevel = Math.floor(newTotal / 100) + 1;

  const { error } = await supabase.from("member_points").upsert(
    {
      user_id: userId,
      community_id: communityId,
      total_points: newTotal,
      level: newLevel,
      last_active_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,community_id" }
  );
  if (error) throw error;
}
