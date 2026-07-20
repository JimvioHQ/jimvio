/**
 * Creator Economy — Membership lifecycle (extend-only).
 * Does not modify wallet/payment core; records events and updates memberships.
 */

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export type PlanType = "free" | "monthly" | "yearly" | "lifetime";

export type MembershipTierInput = {
  slug: string;
  name: string;
  description?: string | null;
  plan_type: PlanType;
  price: number;
  currency?: string;
  trial_days?: number;
  features?: string[];
  space_access?: string[];
  is_default?: boolean;
  sort_order?: number;
};

function getService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase service credentials missing");
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function assertCommunityOwner(communityId: string, userId: string) {
  const db = getService();
  const { data } = await db
    .from("communities")
    .select("id, owner_id, slug, name, is_free, monthly_price, yearly_price, lifetime_price, currency, trial_days")
    .eq("id", communityId)
    .maybeSingle();
  if (!data) throw new Error("Community not found");
  if (data.owner_id !== userId) throw new Error("Forbidden");
  return data;
}

async function recordEvent(input: {
  community_id: string;
  membership_id?: string | null;
  user_id: string;
  event_type: string;
  from_plan?: string | null;
  to_plan?: string | null;
  from_tier_id?: string | null;
  to_tier_id?: string | null;
  amount?: number | null;
  currency?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const db = getService();
  await db.from("community_subscription_events").insert({
    community_id: input.community_id,
    membership_id: input.membership_id ?? null,
    user_id: input.user_id,
    event_type: input.event_type,
    from_plan: input.from_plan ?? null,
    to_plan: input.to_plan ?? null,
    from_tier_id: input.from_tier_id ?? null,
    to_tier_id: input.to_tier_id ?? null,
    amount: input.amount ?? null,
    currency: input.currency ?? null,
    metadata: input.metadata ?? {},
  });
}

const PLAN_RANK: Record<PlanType, number> = {
  free: 0,
  monthly: 1,
  yearly: 2,
  lifetime: 3,
};

export async function listMembershipTiers(communityId: string) {
  const db = getService();
  const { data, error } = await db
    .from("community_membership_tiers")
    .select("*")
    .eq("community_id", communityId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function upsertMembershipTiers(
  communityId: string,
  ownerId: string,
  tiers: MembershipTierInput[]
) {
  await assertCommunityOwner(communityId, ownerId);
  const db = getService();
  const rows = tiers.map((t, i) => ({
    community_id: communityId,
    slug: t.slug,
    name: t.name,
    description: t.description ?? null,
    plan_type: t.plan_type,
    price: t.price,
    currency: t.currency ?? "USD",
    trial_days: t.trial_days ?? 0,
    features: t.features ?? [],
    space_access: t.space_access ?? [],
    is_default: Boolean(t.is_default),
    is_active: true,
    sort_order: t.sort_order ?? i,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await db
    .from("community_membership_tiers")
    .upsert(rows, { onConflict: "community_id,slug" })
    .select();
  if (error) throw error;
  return data ?? [];
}

/** Seed default free / monthly / yearly tiers from community price fields. */
export async function ensureDefaultTiers(communityId: string, ownerId: string) {
  const community = await assertCommunityOwner(communityId, ownerId);
  const existing = await listMembershipTiers(communityId);
  if (existing.length > 0) return existing;

  const tiers: MembershipTierInput[] = [
    {
      slug: "free",
      name: "Free",
      plan_type: "free",
      price: 0,
      currency: community.currency || "USD",
      trial_days: 0,
      is_default: Boolean(community.is_free),
      sort_order: 0,
      features: ["Community access"],
    },
  ];
  if (community.monthly_price != null && Number(community.monthly_price) > 0) {
    tiers.push({
      slug: "monthly",
      name: "Monthly",
      plan_type: "monthly",
      price: Number(community.monthly_price),
      currency: community.currency || "USD",
      trial_days: Number(community.trial_days ?? 0),
      is_default: !community.is_free,
      sort_order: 1,
      features: ["Full access", "Monthly billing"],
    });
  }
  if (community.yearly_price != null && Number(community.yearly_price) > 0) {
    tiers.push({
      slug: "yearly",
      name: "Annual",
      plan_type: "yearly",
      price: Number(community.yearly_price),
      currency: community.currency || "USD",
      trial_days: Number(community.trial_days ?? 0),
      sort_order: 2,
      features: ["Full access", "Best value"],
    });
  }
  if (community.lifetime_price != null && Number(community.lifetime_price) > 0) {
    tiers.push({
      slug: "lifetime",
      name: "Lifetime",
      plan_type: "lifetime",
      price: Number(community.lifetime_price),
      currency: community.currency || "USD",
      trial_days: 0,
      sort_order: 3,
      features: ["Lifetime access"],
    });
  }
  return upsertMembershipTiers(communityId, ownerId, tiers);
}

export async function startTrial(params: {
  userId: string;
  communityId: string;
  tierId?: string | null;
}) {
  const db = getService();
  const { data: community } = await db
    .from("communities")
    .select("id, trial_days, currency, is_active")
    .eq("id", params.communityId)
    .eq("is_active", true)
    .maybeSingle();
  if (!community) throw new Error("Community not found");

  let trialDays = Number(community.trial_days ?? 0);
  const tierId = params.tierId ?? null;
  let planType: PlanType = "monthly";

  if (tierId) {
    const { data: tier } = await db
      .from("community_membership_tiers")
      .select("*")
      .eq("id", tierId)
      .eq("community_id", params.communityId)
      .maybeSingle();
    if (!tier) throw new Error("Tier not found");
    trialDays = Number(tier.trial_days ?? trialDays);
    planType = tier.plan_type as PlanType;
  }

  if (trialDays <= 0) throw new Error("No trial available for this community");

  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + trialDays);

  const { data: existing } = await db
    .from("community_memberships")
    .select("id, plan_type, status, tier_id")
    .eq("user_id", params.userId)
    .eq("community_id", params.communityId)
    .maybeSingle();

  if (existing?.status === "active" && existing.plan_type && existing.plan_type !== "free") {
    throw new Error("Already subscribed");
  }

  const payload = {
    community_id: params.communityId,
    user_id: params.userId,
    role: "member" as const,
    plan_type: planType,
    billing_interval: planType === "free" ? "free" : planType,
    status: "active",
    tier_id: tierId,
    trial_ends_at: trialEnds.toISOString(),
    cancel_at_period_end: false,
    cancelled_at: null,
    subscribed_at: new Date().toISOString(),
    expires_at: trialEnds.toISOString(),
  };

  let membership;
  if (existing) {
    const { data, error } = await db
      .from("community_memberships")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    membership = data;
  } else {
    const { data, error } = await db
      .from("community_memberships")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    membership = data;
  }

  await recordEvent({
    community_id: params.communityId,
    membership_id: membership.id,
    user_id: params.userId,
    event_type: "trial_started",
    from_plan: existing?.plan_type ?? null,
    to_plan: planType,
    to_tier_id: tierId,
    metadata: { trial_days: trialDays },
  });

  return membership;
}

export async function changePlan(params: {
  userId: string;
  communityId: string;
  toPlan: PlanType;
  toTierId?: string | null;
}) {
  const db = getService();
  const { data: membership } = await db
    .from("community_memberships")
    .select("*")
    .eq("user_id", params.userId)
    .eq("community_id", params.communityId)
    .maybeSingle();
  if (!membership) throw new Error("Membership not found");

  const fromPlan = (membership.plan_type ?? "free") as PlanType;
  const toPlan = params.toPlan;
  if (fromPlan === toPlan && (!params.toTierId || params.toTierId === membership.tier_id)) {
    return membership;
  }

  const eventType =
    PLAN_RANK[toPlan] > PLAN_RANK[fromPlan]
      ? "upgraded"
      : PLAN_RANK[toPlan] < PLAN_RANK[fromPlan]
        ? "downgraded"
        : "subscribed";

  let expiresAt: string | null = membership.expires_at;
  if (toPlan === "monthly") {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    expiresAt = d.toISOString();
  } else if (toPlan === "yearly") {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    expiresAt = d.toISOString();
  } else if (toPlan === "lifetime") {
    expiresAt = null;
  } else {
    expiresAt = null;
  }

  const { data, error } = await db
    .from("community_memberships")
    .update({
      plan_type: toPlan,
      billing_interval: toPlan === "free" ? "free" : toPlan,
      tier_id: params.toTierId ?? membership.tier_id,
      status: "active",
      cancel_at_period_end: false,
      cancelled_at: null,
      trial_ends_at: null,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", membership.id)
    .select()
    .single();
  if (error) throw error;

  await recordEvent({
    community_id: params.communityId,
    membership_id: membership.id,
    user_id: params.userId,
    event_type: eventType,
    from_plan: fromPlan,
    to_plan: toPlan,
    from_tier_id: membership.tier_id,
    to_tier_id: params.toTierId ?? membership.tier_id,
  });

  return data;
}

export async function cancelSubscription(params: {
  userId: string;
  communityId: string;
  immediate?: boolean;
}) {
  const db = getService();
  const { data: membership } = await db
    .from("community_memberships")
    .select("*")
    .eq("user_id", params.userId)
    .eq("community_id", params.communityId)
    .maybeSingle();
  if (!membership) throw new Error("Membership not found");

  const now = new Date().toISOString();
  const update = params.immediate
    ? {
        status: "cancelled",
        cancelled_at: now,
        cancel_at_period_end: false,
        expires_at: now,
      }
    : {
        cancel_at_period_end: true,
        cancelled_at: now,
      };

  const { data, error } = await db
    .from("community_memberships")
    .update({ ...update, updated_at: now })
    .eq("id", membership.id)
    .select()
    .single();
  if (error) throw error;

  await recordEvent({
    community_id: params.communityId,
    membership_id: membership.id,
    user_id: params.userId,
    event_type: "cancelled",
    from_plan: membership.plan_type,
    to_plan: membership.plan_type,
    metadata: { immediate: Boolean(params.immediate) },
  });

  return data;
}

export async function listMembersForOwner(communityId: string, ownerId: string) {
  await assertCommunityOwner(communityId, ownerId);
  const db = getService();
  const { data, error } = await db
    .from("community_memberships")
    .select(
      `id, role, plan_type, status, expires_at, cancelled_at, cancel_at_period_end, trial_ends_at, tier_id, subscribed_at, created_at,
       profiles:user_id ( id, full_name, username, avatar_url, email )`
    )
    .eq("community_id", communityId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function getBillingHistory(params: {
  userId: string;
  communityId?: string;
  asOwner?: boolean;
}) {
  const db = getService();
  let q = db
    .from("community_payments")
    .select(
      `id, community_id, user_id, membership_id, amount, currency, payment_provider, payment_reference, status, platform_commission, creator_earnings, created_at,
       communities:community_id ( slug, name, owner_id )`
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (params.asOwner && params.communityId) {
    await assertCommunityOwner(params.communityId, params.userId);
    q = q.eq("community_id", params.communityId);
  } else {
    q = q.eq("user_id", params.userId);
    if (params.communityId) q = q.eq("community_id", params.communityId);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getSubscriptionEvents(params: {
  userId: string;
  communityId?: string;
}) {
  const db = getService();
  let q = db
    .from("community_subscription_events")
    .select("*")
    .eq("user_id", params.userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (params.communityId) q = q.eq("community_id", params.communityId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function requireAuthedUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return user;
}
