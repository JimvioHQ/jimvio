import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreatorProfileSnapshot } from "@/lib/ugc/campaign-detail";
import { isCreatorWorkspaceReady } from "@/lib/identity/creator-profile-completion";
import { ensureInfluencerMirror, loadCreatorProfileCompletion } from "@/lib/identity/sync";
import {
  evaluateJoinEligibility,
  resolveJoinConfig,
  resolveJoinMode,
  resolveJoinOutcome,
  type JoinConfig,
} from "@/lib/ugc/join-engine";
import { logJoinAudit } from "@/lib/ugc/join-audit";
import {
  notifyCreatorApplicationSubmitted,
  notifyCreatorProjectCreated,
  notifyVendorNewApplication,
} from "@/lib/ugc/join-notifications";
import { normalizeCountryCode } from "@/lib/geo/buyer-country";
import { trustedCountry } from "@/lib/geo/country-trust";
import type { UGCCampaign } from "@/types/ugc";

export type CampaignJoinRow = UGCCampaign & {
  join_mode?: string | null;
  join_config?: JoinConfig | null;
  max_participants?: number | null;
  brand_id: string;
};

export async function loadCreatorProfile(
  db: SupabaseClient,
  userId: string,
): Promise<CreatorProfileSnapshot> {
  const completion = await loadCreatorProfileCompletion(userId);
  if (completion.complete) {
    await ensureInfluencerMirror(userId);
  }

  const { data: inf } = await db
    .from("influencers")
    .select("id, total_followers, social_platforms, niche, created_at, is_verified, engagement_rate")
    .eq("user_id", userId)
    .maybeSingle();

  const [{ data: profileRow }, { data: identityRow }] = await Promise.all([
    db.from("profiles").select("country").eq("id", userId).maybeSingle(),
    (db as unknown as { from: (t: string) => ReturnType<SupabaseClient["from"]> })
      .from("jip_identity")
      .select("verified_country, country_confidence, country_vpn_suspected")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  const declaredCountry = normalizeCountryCode(profileRow?.country) ?? profileRow?.country?.trim() ?? null;
  const identityCountry = (identityRow ?? {}) as {
    verified_country?: string | null;
    country_confidence?: string | null;
    country_vpn_suspected?: boolean | null;
  };
  // Only a country Jimvio has confirmed counts for eligibility; typing one is not enough.
  const country = trustedCountry(identityCountry);
  const countryMeta = {
    declaredCountry,
    countryConfidence: (identityCountry.country_confidence ?? "none") as CreatorProfileSnapshot["countryConfidence"],
    vpnSuspected: Boolean(identityCountry.country_vpn_suspected),
  };

  if (!inf || !isCreatorWorkspaceReady(completion, inf)) {
    return {
      hasProfile: false,
      totalFollowers: null,
      platforms: [],
      niche: [],
      accountAgeDays: null,
      isVerified: false,
      country,
      ...countryMeta,
    };
  }

  const platformsRaw = inf.social_platforms;
  const platforms: string[] = Array.isArray(platformsRaw)
    ? platformsRaw.map((p) => String(p).toLowerCase())
    : typeof platformsRaw === "object" && platformsRaw
      ? Object.keys(platformsRaw as object)
      : [];

  return {
    hasProfile: true,
    totalFollowers: inf.total_followers,
    platforms,
    niche: (inf.niche as string[]) ?? [],
    accountAgeDays: inf.created_at
      ? Math.floor((Date.now() - new Date(inf.created_at).getTime()) / 86400000)
      : null,
    isVerified: Boolean(inf.is_verified),
    country,
    ...countryMeta,
  };
}

export async function countAcceptedParticipants(
  db: SupabaseClient,
  campaignId: string,
): Promise<number> {
  const { count } = await db
    .from("ugc_campaign_participants")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .in("status", ["accepted", "pending", "invited", "waitlisted"]);
  return count ?? 0;
}

export async function getVendorUserId(
  db: SupabaseClient,
  brandId: string,
): Promise<string | null> {
  const { data } = await db.from("vendors").select("user_id").eq("id", brandId).maybeSingle();
  return data?.user_id ?? null;
}

type ProcessJoinInput = {
  db: SupabaseClient;
  campaign: CampaignJoinRow;
  campaignId: string;
  influencerId: string;
  userId: string;
  profile: CreatorProfileSnapshot;
  applicationData?: Record<string, unknown>;
  applicationMessage?: string;
  termsAcceptedAt: string;
  existingParticipant?: { id: string; status: string } | null;
};

/** Pre-insert guard. Withdrawn and rejected creators may apply again. */
export function blockExistingParticipant(
  status: string | null | undefined,
): { status: 409; error: string } | null {
  if (!status) return null;
  if (status === "withdrawn" || status === "rejected") return null;
  if (status === "accepted") {
    return { status: 409, error: "You are already a participant in this campaign." };
  }
  if (status === "pending" || status === "waitlisted" || status === "invited") {
    return {
      status: 409,
      error: "You already have an active application for this campaign.",
    };
  }
  return { status: 409, error: "You are already a participant in this campaign." };
}

/** Unique participant row. Same message as the pre-insert guard. */
export function participantConflictFromDb(
  error: { code?: string } | null | undefined,
): { status: 409; error: string } | null {
  if (error?.code === "23505") {
    return { status: 409, error: "You are already a participant in this campaign." };
  }
  return null;
}

function isCapacityFullError(err: { message?: string; code?: string; hint?: string } | null | undefined): boolean {
  if (!err) return false;
  const msg = `${err.message ?? ""} ${err.hint ?? ""}`.toLowerCase();
  return (
    msg.includes("campaign is full") ||
    msg.includes("max_participants") ||
    (err.code === "23514" && msg.includes("full"))
  );
}

export async function processCampaignJoin(input: ProcessJoinInput) {
  const {
    db,
    campaign,
    campaignId,
    influencerId,
    userId,
    profile,
    applicationData = {},
    applicationMessage,
    termsAcceptedAt,
    existingParticipant,
  } = input;

  const mode = resolveJoinMode(campaign);
  const config = resolveJoinConfig(campaign);
  const participantCount = await countAcceptedParticipants(db, campaignId);
  const eligibility = evaluateJoinEligibility(campaign, profile, participantCount);

  await logJoinAudit(db, {
    campaignId,
    influencerId,
    actorUserId: userId,
    action: "eligibility_check",
    metadata: { score: eligibility.score, level: eligibility.level, mode },
  });

  if (eligibility.blocked) {
    await logJoinAudit(db, {
      campaignId,
      influencerId,
      actorUserId: userId,
      action: "join_attempt",
      metadata: { success: false, reason: eligibility.blockReason },
    });
    return { ok: false as const, status: 400, error: eligibility.blockReason ?? "Not eligible" };
  }

  if (mode === "invite_only" && existingParticipant?.status !== "invited") {
    await logJoinAudit(db, {
      campaignId,
      influencerId,
      actorUserId: userId,
      action: "join_attempt",
      metadata: { success: false, reason: "invite_only" },
    });
    return {
      ok: false as const,
      status: 403,
      error: "This campaign is invite-only.",
    };
  }

  const duplicate = blockExistingParticipant(existingParticipant?.status);
  if (duplicate) return { ok: false as const, ...duplicate };

  const outcome = resolveJoinOutcome(
    mode,
    eligibility.score,
    config,
    existingParticipant?.status as Parameters<typeof resolveJoinOutcome>[3],
  );

  const now = new Date().toISOString();
  const row = {
    campaign_id: campaignId,
    influencer_id: influencerId,
    status: outcome.status,
    joined_at: now,
    application_message: applicationMessage ?? null,
    application_data: applicationData,
    eligibility_score: eligibility.score,
    terms_accepted_at: termsAcceptedAt,
    reviewed_at: outcome.autoApproved ? now : null,
    withdrawn_at: null,
    review_feedback: null,
  };

  let participantId = existingParticipant?.id;

  if (existingParticipant?.id) {
    const { error } = await db
      .from("ugc_campaign_participants")
      .update(row)
      .eq("id", existingParticipant.id);
    if (error) {
      if (isCapacityFullError(error)) {
        return { ok: false as const, status: 409, error: "Campaign is full." };
      }
      const { error: fallbackErr } = await db
        .from("ugc_campaign_participants")
        .update({ status: outcome.status, joined_at: now })
        .eq("id", existingParticipant.id);
      if (fallbackErr) {
        if (isCapacityFullError(fallbackErr)) {
          return { ok: false as const, status: 409, error: "Campaign is full." };
        }
        return { ok: false as const, status: 500, error: fallbackErr.message };
      }
    }
  } else {
    const { data, error } = await db
      .from("ugc_campaign_participants")
      .insert(row)
      .select("id")
      .single();
    if (error) {
      if (isCapacityFullError(error)) {
        return { ok: false as const, status: 409, error: "Campaign is full." };
      }
      const conflict = participantConflictFromDb(error);
      if (conflict) return { ok: false as const, ...conflict };
      const { data: fallback, error: fallbackErr } = await db
        .from("ugc_campaign_participants")
        .insert({
          campaign_id: campaignId,
          influencer_id: influencerId,
          status: outcome.status,
          joined_at: now,
        })
        .select("id")
        .single();
      if (fallbackErr) {
        if (isCapacityFullError(fallbackErr)) {
          return { ok: false as const, status: 409, error: "Campaign is full." };
        }
        const fallbackConflict = participantConflictFromDb(fallbackErr);
        if (fallbackConflict) return { ok: false as const, ...fallbackConflict };
        return { ok: false as const, status: 500, error: fallbackErr.message };
      }
      participantId = fallback.id;
    } else {
      participantId = data.id;
    }
  }

  await logJoinAudit(db, {
    campaignId,
    influencerId,
    actorUserId: userId,
    action: outcome.autoApproved ? "invite_accepted" : "application_submitted",
    metadata: { status: outcome.status, score: eligibility.score, mode },
  });

  if (outcome.projectCreated) {
    await logJoinAudit(db, {
      campaignId,
      influencerId,
      actorUserId: userId,
      action: "project_created",
      metadata: { participantId },
    });
    await notifyCreatorProjectCreated(db, userId, campaign.title, campaignId);
  } else {
    await notifyCreatorApplicationSubmitted(db, userId, campaign.title, campaignId);
    const vendorUserId = await getVendorUserId(db, campaign.brand_id);
    if (vendorUserId) {
      await notifyVendorNewApplication(db, vendorUserId, campaign.title, campaignId);
    }
  }

  return {
    ok: true as const,
    status: 201,
    outcome,
    eligibility,
    mode,
    config,
    participantId,
  };
}

export async function reviewParticipant(
  db: SupabaseClient,
  opts: {
    campaignId: string;
    participantId: string;
    reviewerUserId: string;
    action: "approve" | "reject" | "waitlist";
    feedback?: string;
  },
) {
  const { data: participant, error } = await db
    .from("ugc_campaign_participants")
    .select("*, influencer:influencers!influencer_id(user_id)")
    .eq("id", opts.participantId)
    .eq("campaign_id", opts.campaignId)
    .single();

  if (error || !participant) {
    return { ok: false as const, status: 404, error: "Application not found" };
  }

  const currentStatus = String(participant.status ?? "");
  const reviewableFrom =
    opts.action === "approve"
      ? ["pending", "waitlisted", "invited"]
      : opts.action === "waitlist"
        ? ["pending", "invited"]
        : ["pending", "waitlisted", "invited", "accepted"];

  if (!reviewableFrom.includes(currentStatus)) {
    return {
      ok: false as const,
      status: 400,
      error: `Cannot ${opts.action} a participant with status “${currentStatus}”.`,
    };
  }

  const now = new Date().toISOString();
  let newStatus: string;
  let auditAction: "application_approved" | "application_rejected" | "application_waitlisted";

  switch (opts.action) {
    case "approve":
      newStatus = "accepted";
      auditAction = "application_approved";
      break;
    case "reject":
      newStatus = "rejected";
      auditAction = "application_rejected";
      break;
    case "waitlist":
      newStatus = "waitlisted";
      auditAction = "application_waitlisted";
      break;
  }

  const { data: updatedRow, error: updateErr } = await db
    .from("ugc_campaign_participants")
    .update({
      status: newStatus,
      reviewed_by: opts.reviewerUserId,
      reviewed_at: now,
      review_feedback: opts.feedback ?? null,
    })
    .eq("id", opts.participantId)
    .eq("campaign_id", opts.campaignId)
    .in("status", reviewableFrom)
    .select("id")
    .maybeSingle();

  if (updateErr) {
    if (isCapacityFullError(updateErr)) {
      return { ok: false as const, status: 409, error: "Campaign is full." };
    }
    return { ok: false as const, status: 500, error: updateErr.message };
  }
  if (!updatedRow) {
    return {
      ok: false as const,
      status: 409,
      error: "Participant was updated by another review. Refresh and try again.",
    };
  }

  await logJoinAudit(db, {
    campaignId: opts.campaignId,
    influencerId: participant.influencer_id,
    actorUserId: opts.reviewerUserId,
    action: auditAction,
    metadata: { participantId: opts.participantId, feedback: opts.feedback },
  });

  if (opts.action === "approve") {
    await logJoinAudit(db, {
      campaignId: opts.campaignId,
      influencerId: participant.influencer_id,
      actorUserId: opts.reviewerUserId,
      action: "project_created",
      metadata: { participantId: opts.participantId },
    });
  }

  const { data: campaign } = await db
    .from("ugc_campaigns")
    .select("title")
    .eq("id", opts.campaignId)
    .single();

  const creatorUserId = (participant.influencer as { user_id?: string } | null)?.user_id;
  if (creatorUserId && campaign?.title) {
    const { notifyCreatorApplicationApproved, notifyCreatorApplicationRejected, notifyCreatorWaitlisted, notifyCreatorProjectCreated } =
      await import("@/lib/ugc/join-notifications");
    if (opts.action === "approve") {
      await notifyCreatorApplicationApproved(db, creatorUserId, campaign.title, opts.campaignId);
      await notifyCreatorProjectCreated(db, creatorUserId, campaign.title, opts.campaignId);
    } else if (opts.action === "reject") {
      await notifyCreatorApplicationRejected(db, creatorUserId, campaign.title, opts.campaignId, opts.feedback);
    } else {
      await notifyCreatorWaitlisted(db, creatorUserId, campaign.title, opts.campaignId);
    }
  }

  return { ok: true as const, status: newStatus };
}
