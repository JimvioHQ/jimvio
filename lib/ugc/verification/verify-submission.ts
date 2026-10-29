import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { TIKTOK_VIDEO_LIST_SCOPE } from "@/lib/live/destinations/adapters/tiktok";
import { freshCredentials, type CredentialDestination as DestinationRow } from "@/lib/live/destinations/fresh-credentials";
import { videoRefFromUrl } from "./video-ref";
import { fetchTikTokStats, fetchYouTubeStats, type StatsResult } from "./platform-stats";
import { assessViews, type PlatformSnapshot } from "./signals";

export type VerificationStatus =
  | "unverified"
  | "verified"
  | "owner_mismatch"
  | "needs_connection"
  | "needs_permission"
  | "unsupported"
  | "unavailable";

export type VerifyOutcome = {
  submissionId: string;
  status: VerificationStatus;
  note: string;
  latestViews?: number;
  verifiedViews?: number;
};

type SubmissionRow = {
  id: string;
  campaign_id: string;
  influencer_id: string;
  post_url: string;
  platform: string;
  status: string;
  baseline_views: number | null;
  latest_views: number | null;
  verification_status: string | null;
};


// Tables added after the generated types; keep the cast in one place.
function table(db: SupabaseClient, name: string) {
  return (db as unknown as { from: (t: string) => ReturnType<SupabaseClient["from"]> }).from(name);
}

async function record(
  db: SupabaseClient,
  sub: SubmissionRow,
  status: VerificationStatus,
  note: string,
  extra: Record<string, unknown> = {},
): Promise<VerifyOutcome> {
  await table(db, "ugc_submissions")
    .update({
      verification_status: status,
      verification_note: note,
      verification_checked_at: new Date().toISOString(),
      ...extra,
    })
    .eq("id", sub.id);
  return { submissionId: sub.id, status, note };
}

/**
 * Reads the post's real numbers from the platform API on the creator's own
 * connected account, stores a snapshot and updates the payable views.
 * The first successful read is the baseline; only later growth is payable.
 */
export async function verifySubmissionViews(
  submissionId: string,
  client?: SupabaseClient,
): Promise<VerifyOutcome> {
  const db = client ?? createServiceRoleClient();
  const { data } = await table(db, "ugc_submissions")
    .select("id, campaign_id, influencer_id, post_url, platform, status, baseline_views, latest_views, verification_status")
    .eq("id", submissionId)
    .maybeSingle();
  const sub = data as SubmissionRow | null;
  if (!sub) return { submissionId, status: "unverified", note: "Submission not found." };

  const ref = videoRefFromUrl(sub.platform, sub.post_url);
  if (sub.platform === "instagram" || sub.platform === "facebook") {
    return record(db, sub, "unsupported", "Automatic view checks for this platform are coming soon. The brand reviews views by hand.", {
      platform_video_id: ref?.videoId ?? null,
    });
  }
  if (!ref || (ref.platform !== "youtube" && ref.platform !== "tiktok")) {
    return record(db, sub, "unsupported", "Use the full post link so Jimvio can read the video.");
  }
  const platform = ref.platform;

  const { data: dup } = await table(db, "ugc_submissions")
    .select("id")
    .eq("platform", platform)
    .eq("platform_video_id", ref.videoId)
    .neq("id", sub.id)
    .neq("status", "rejected")
    .limit(1);
  const duplicateElsewhere = (dup ?? []).length > 0;

  const { data: inf } = await db
    .from("influencers")
    .select("user_id")
    .eq("id", sub.influencer_id)
    .maybeSingle();
  const userId = (inf as { user_id?: string } | null)?.user_id;
  if (!userId) return record(db, sub, "needs_connection", "Creator account not found.");

  const { data: destData } = await table(db, "live_destinations")
    .select("id, user_id, provider_channel_id, provider_account_id, encrypted_credentials")
    .eq("user_id", userId)
    .eq("platform", platform)
    .is("revoked_at", null)
    .order("last_connected_at", { ascending: false, nullsFirst: false })
    .limit(1);
  const dest = ((destData ?? []) as DestinationRow[])[0];
  const label = platform === "youtube" ? "YouTube" : "TikTok";
  if (!dest) {
    return record(db, sub, "needs_connection", `Connect your ${label} account so Jimvio can verify views.`, {
      platform_video_id: ref.videoId,
    });
  }

  const fresh = await freshCredentials(platform, dest);
  if (!fresh.ok) {
    return record(db, sub, "needs_connection", `Your ${label} connection expired. Reconnect ${label}.`, {
      platform_video_id: ref.videoId,
    });
  }
  if (platform === "tiktok" && !(fresh.creds.scopes ?? []).includes(TIKTOK_VIDEO_LIST_SCOPE)) {
    return record(db, sub, "needs_permission", "Reconnect TikTok and allow Jimvio to read your videos.", {
      platform_video_id: ref.videoId,
    });
  }

  const token = fresh.creds.accessToken ?? "";
  const result: StatsResult =
    platform === "youtube" ? await fetchYouTubeStats(token, ref.videoId) : await fetchTikTokStats(token, ref.videoId);

  if (!result.ok) {
    const status: VerificationStatus =
      result.reason === "auth"
        ? "needs_connection"
        : result.reason === "needs_permission"
          ? "needs_permission"
          : result.reason === "unavailable"
            ? "unavailable"
            : ((sub.verification_status as VerificationStatus | null) ?? "unverified");
    return record(db, sub, status, result.message, { platform_video_id: ref.videoId });
  }

  const stats = result.stats;
  if (platform === "youtube" && dest.provider_channel_id && stats.ownerId !== dest.provider_channel_id) {
    return record(db, sub, "owner_mismatch", "This video is not on your connected YouTube channel.", {
      platform_video_id: ref.videoId,
      latest_views: stats.views,
    });
  }

  const now = new Date().toISOString();
  const previous = sub.latest_views ?? stats.views;
  await table(db, "ugc_view_snapshots").insert({
    submission_id: sub.id,
    views_at_snapshot: stats.views,
    delta_views: Math.max(0, stats.views - previous),
    earnings_this_snapshot: 0,
    likes: stats.likes,
    comments: stats.comments,
    shares: stats.shares,
    saves: null,
    snapshotted_at: now,
    source: "platform_api",
  });

  const { data: snapRows } = await table(db, "ugc_view_snapshots")
    .select("views_at_snapshot, likes, comments, shares, snapshotted_at")
    .eq("submission_id", sub.id)
    .eq("source", "platform_api")
    .order("snapshotted_at", { ascending: false })
    .limit(60);
  const snapshots: PlatformSnapshot[] = ((snapRows ?? []) as {
    views_at_snapshot: number;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    snapshotted_at: string;
  }[]).map((r) => ({
    views: Number(r.views_at_snapshot),
    likes: r.likes == null ? null : Number(r.likes),
    comments: r.comments == null ? null : Number(r.comments),
    shares: r.shares == null ? null : Number(r.shares),
    at: r.snapshotted_at,
  }));

  const baseline = sub.baseline_views ?? stats.views;
  const assessment = assessViews({ baselineViews: baseline, snapshots, duplicateElsewhere });
  const note = assessment.suspicious
    ? "Views are on hold for a manual check."
    : `Verified from ${label}. ${assessment.gainedViews.toLocaleString("en-US")} views since submission.`;

  await record(db, sub, "verified", note, {
    platform_video_id: ref.videoId,
    verified_account_id: dest.provider_channel_id ?? dest.provider_account_id,
    baseline_views: baseline,
    latest_views: assessment.latestViews,
    verified_views: assessment.payableViews,
    verification_flags: assessment.flags,
    fraud_score: assessment.fraudScore,
    is_suspicious: assessment.suspicious,
    last_synced_at: now,
  });

  return {
    submissionId: sub.id,
    status: "verified",
    note,
    latestViews: assessment.latestViews,
    verifiedViews: assessment.payableViews,
  };
}

const RECHECK_HOURS = 6;

/**
 * Scheduled refresh: re-reads open per-view submissions that have not been
 * checked in the last few hours. Settled submissions are left alone.
 */
export async function verifyDueSubmissions(limit = 60): Promise<{
  checked: number;
  verified: number;
  errors: string[];
}> {
  const db = createServiceRoleClient();
  const cutoff = new Date(Date.now() - RECHECK_HOURS * 3_600_000).toISOString();
  const { data, error } = await table(db, "ugc_submissions")
    .select("id, ugc_campaigns!inner(payment_model, status)")
    .in("status", ["pending", "approved"])
    .is("accepted_views", null)
    .in("platform", ["youtube", "tiktok", "instagram"])
    .eq("ugc_campaigns.payment_model", "per_views")
    .in("ugc_campaigns.status", ["active", "paused"])
    .or(`verification_checked_at.is.null,verification_checked_at.lt.${cutoff}`)
    .order("verification_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) throw new Error(`Failed to load submissions to verify: ${error.message}`);

  let checked = 0;
  let verified = 0;
  const errors: string[] = [];
  for (const row of (data ?? []) as { id: string }[]) {
    try {
      const outcome = await verifySubmissionViews(row.id, db);
      checked++;
      if (outcome.status === "verified") verified++;
    } catch (err) {
      errors.push(`${row.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { checked, verified, errors };
}
