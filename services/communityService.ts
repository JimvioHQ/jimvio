import { createServiceRoleClient } from "@/lib/supabase/service-role";

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
export function isMembershipActive(membership: CommunityMembershipRow | null): boolean {
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
  const { data: spaces } = await supabase
    .from("spaces")
    .select("*")
    .eq("community_id", communityId)
    .eq("is_active", true)
    .order("sort_order");

  if (!spaces?.length) return [];

  if (!userId) {
    return spaces.map((s) => ({ ...s, hasAccess: s.access_type === "free" }));
  }

  const membership = await getUserMembership(userId, communityId);
  const isActive = isMembershipActive(membership);
  const spaceAccessIds = new Set((membership?.space_access ?? []).map((id) => String(id)));

  return spaces.map((space) => {
    let hasAccess = false;
    if (space.access_type === "free") hasAccess = true;
    else if (isActive) {
      if (space.access_type === "paid") hasAccess = true;
      if (space.access_type === "premium") {
        hasAccess =
          membership?.plan_type === "yearly" ||
          membership?.plan_type === "lifetime" ||
          spaceAccessIds.has(String(space.id));
      }
    }
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
 * Join a free community
 */
export async function joinFreeCommunity(userId: string, communityId: string) {
  const supabase = getService();
  const { data: community } = await supabase
    .from("communities")
    .select("id, is_free, member_count")
    .eq("id", communityId)
    .eq("is_active", true)
    .single();

  if (!community) throw new Error("Community not found");
  if (!community.is_free) throw new Error("This community requires a subscription");

  const existing = await getUserMembership(userId, communityId);
  if (existing) return existing;

  const { data: membership, error } = await supabase
    .from("community_memberships")
    .insert({
      community_id: communityId,
      user_id: userId,
      role: "member",
      plan_type: "free",
      status: "active",
    })
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from("communities")
    .update({ member_count: (community.member_count ?? 0) + 1 })
    .eq("id", communityId);

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

    await supabase
      .from("communities")
      .update({ member_count: (community.member_count ?? 0) + 1 })
      .eq("id", params.communityId);
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
