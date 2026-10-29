import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { freshCredentials, type CredentialDestination } from "@/lib/live/destinations/fresh-credentials";
import { TIKTOK_VIDEO_LIST_SCOPE } from "@/lib/live/destinations/adapters/tiktok";
import { videoRefFromUrl } from "./video-ref";
import { fetchTikTokStats, fetchYouTubeStats } from "./platform-stats";

export type OwnershipCheck =
  | { ok: true; verifiable: true; account: string | null; views: number }
  | { ok: true; verifiable: false; note: string }
  | {
      ok: false;
      reason: "bad_link" | "needs_connection" | "not_yours" | "unavailable";
      message: string;
      connect?: "youtube" | "tiktok";
      account?: string | null;
    };

type Dest = CredentialDestination & { display_name: string | null };

async function connection(userId: string, platform: "youtube" | "tiktok"): Promise<Dest | null> {
  const db = createServiceRoleClient() as unknown as { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data } = await db
    .from("live_destinations")
    .select("id, user_id, provider_channel_id, provider_account_id, encrypted_credentials, display_name")
    .eq("user_id", userId)
    .eq("platform", platform)
    .is("revoked_at", null)
    .order("last_connected_at", { ascending: false, nullsFirst: false })
    .limit(1);
  return ((data ?? []) as Dest[])[0] ?? null;
}

/**
 * Before a post is submitted: is it really on the creator's own connected
 * account? YouTube always; TikTok once video access is approved. Other
 * platforms can't be checked yet and go to the owner's review.
 */
export async function checkPostOwnership(userId: string, platform: string, url: string): Promise<OwnershipCheck> {
  if (platform !== "youtube" && platform !== "tiktok") {
    return { ok: true, verifiable: false, note: "This platform can't be checked automatically yet. The campaign owner reviews it." };
  }
  const ref = videoRefFromUrl(platform, url);
  if (!ref) {
    return { ok: false, reason: "bad_link", message: "Use the full link to the video itself (not a profile or short link)." };
  }
  const label = platform === "youtube" ? "YouTube" : "TikTok";
  const dest = await connection(userId, platform);
  if (!dest) {
    if (platform === "tiktok") {
      return { ok: true, verifiable: false, note: "Connect TikTok so Jimvio can verify your views automatically." };
    }
    return {
      ok: false,
      reason: "needs_connection",
      connect: "youtube",
      message: "Connect the YouTube channel that posted this video, then submit again.",
    };
  }
  const fresh = await freshCredentials(platform, dest);
  if (!fresh.ok || !fresh.creds.accessToken) {
    return { ok: false, reason: "needs_connection", connect: platform, message: `Your ${label} connection expired. Connect again, then submit.` };
  }
  if (platform === "tiktok" && !(fresh.creds.scopes ?? []).includes(TIKTOK_VIDEO_LIST_SCOPE)) {
    return { ok: true, verifiable: false, note: "TikTok ownership can't be checked yet. The campaign owner reviews it." };
  }
  const stats =
    platform === "youtube"
      ? await fetchYouTubeStats(fresh.creds.accessToken, ref.videoId)
      : await fetchTikTokStats(fresh.creds.accessToken, ref.videoId);
  const account = dest.display_name ?? null;
  if (!stats.ok) {
    if (stats.reason === "unavailable") {
      return platform === "tiktok"
        ? {
            ok: false,
            reason: "not_yours",
            connect: "tiktok",
            account,
            message: `This video isn't on your connected TikTok${account ? ` (${account})` : ""}. Connect the account that posted it.`,
          }
        : { ok: false, reason: "unavailable", message: "This video is private, removed or not public yet. Make it public, then submit." };
    }
    if (stats.reason === "auth" || stats.reason === "needs_permission") {
      return { ok: false, reason: "needs_connection", connect: platform, message: `Connect ${label} again, then submit.` };
    }
    return { ok: true, verifiable: false, note: `${label} didn't answer right now. Jimvio will check again after you submit.` };
  }
  if (platform === "youtube" && dest.provider_channel_id && stats.stats.ownerId !== dest.provider_channel_id) {
    return {
      ok: false,
      reason: "not_yours",
      connect: "youtube",
      account,
      message: `This video isn't on your connected YouTube channel${account ? ` (${account})` : ""}. Connect the channel that posted it, then submit again.`,
    };
  }
  return { ok: true, verifiable: true, account, views: stats.stats.views };
}
