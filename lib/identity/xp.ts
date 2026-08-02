/**
 * XP + badge award helpers for the Identity Platform achievements engine.
 * Writes go through the `jip_award_xp` RPC (keeps `jip_identity.xp` and the
 * `jip_xp_events` ledger in sync atomically) and `jip_user_badges`. Never
 * throws — award failures are logged and swallowed so they never fail the
 * originating request (portfolio publish, verification, etc).
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role";

export interface AwardXpResult {
  ok: boolean;
  xp: number;
  error?: string;
}

/** Award (or deduct, if amount < 0) XP to a user via the `jip_award_xp` RPC. */
export async function awardXp(
  userId: string,
  amount: number,
  reason: string,
  ref?: { type?: string; id?: string }
): Promise<AwardXpResult> {
  if (!userId || !Number.isFinite(amount) || amount === 0) {
    return { ok: false, xp: 0, error: "Invalid userId or amount" };
  }

  try {
    const db = createServiceRoleClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data, error } = await db.rpc("jip_award_xp", {
      p_user_id: userId,
      p_amount: Math.trunc(amount),
      p_reason: reason,
      p_ref_type: ref?.type ?? null,
      p_ref_id: ref?.id ?? null,
    });

    if (error) {
      console.error("awardXp: rpc failed", error);
      return { ok: false, xp: 0, error: error.message };
    }

    return { ok: true, xp: Number(data ?? 0) };
  } catch (err) {
    console.error("awardXp: unexpected failure", err);
    return { ok: false, xp: 0, error: (err as Error).message };
  }
}

export interface AwardBadgeResult {
  ok: boolean;
  alreadyAwarded: boolean;
  xpAwarded: number;
  error?: string;
}

/** Idempotently grant a badge (jip_user_badges) and its XP reward, if not already held. */
export async function maybeAwardBadge(userId: string, badgeId: string): Promise<AwardBadgeResult> {
  if (!userId || !badgeId) {
    return { ok: false, alreadyAwarded: false, xpAwarded: 0, error: "Invalid userId or badgeId" };
  }

  try {
    const db = createServiceRoleClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const { data: existing } = await db
      .from("jip_user_badges")
      .select("user_id")
      .eq("user_id", userId)
      .eq("badge_id", badgeId)
      .maybeSingle();
    if (existing) return { ok: true, alreadyAwarded: true, xpAwarded: 0 };

    const { data: badge } = await db
      .from("jip_badges")
      .select("id, name, xp_reward")
      .eq("id", badgeId)
      .maybeSingle();
    if (!badge) {
      return { ok: false, alreadyAwarded: false, xpAwarded: 0, error: "Unknown badge" };
    }

    const { error: insertErr } = await db
      .from("jip_user_badges")
      .insert({ user_id: userId, badge_id: badgeId })
      .select("user_id")
      .maybeSingle();

    // Unique-violation race — another request already awarded it.
    if (insertErr && String((insertErr as { code?: string }).code) !== "23505") {
      console.error("maybeAwardBadge: insert failed", insertErr);
      return { ok: false, alreadyAwarded: false, xpAwarded: 0, error: insertErr.message };
    }
    if (insertErr) return { ok: true, alreadyAwarded: true, xpAwarded: 0 };

    const xpReward = Number(badge.xp_reward ?? 0);
    if (xpReward > 0) {
      await awardXp(userId, xpReward, `badge:${badgeId}`, { type: "badge", id: badgeId });
    }

    return { ok: true, alreadyAwarded: false, xpAwarded: xpReward };
  } catch (err) {
    console.error("maybeAwardBadge: unexpected failure", err);
    return { ok: false, alreadyAwarded: false, xpAwarded: 0, error: (err as Error).message };
  }
}

/**
 * Called after the first portfolio item is published for a user.
 * Awards a small XP bump every time, plus the one-time "portfolio_ready" badge.
 */
export async function onPortfolioPublished(userId: string, portfolioItemId: string): Promise<void> {
  await awardXp(userId, 15, "portfolio_item_published", { type: "portfolio_item", id: portfolioItemId });
  await maybeAwardBadge(userId, "portfolio_ready");
}

/**
 * Called when an identity/documents/social verification request is approved.
 * `kind` maps to the corresponding jip_identity boolean flag.
 */
export async function onIdentityVerified(
  userId: string,
  kind: "identity" | "documents" | "social"
): Promise<void> {
  await awardXp(userId, 100, `${kind}_verified`, { type: "verification", id: kind });
  if (kind === "identity") {
    await maybeAwardBadge(userId, "verified_identity");
  }
}
