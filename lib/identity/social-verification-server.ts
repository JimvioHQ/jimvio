import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { freshCredentials, type CredentialDestination } from "@/lib/live/destinations/fresh-credentials";
import { fetchTikTokUserInfo } from "@/lib/live/destinations/adapters/tiktok";
import {
  CODE_TTL_MS,
  checkCodeOnPage,
  newVerifyCode,
  publicProfileUrl,
} from "@/lib/identity/social-verification";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (t: string) => any };
const db = (): Db => createServiceRoleClient() as unknown as Db;

export type VerifyResult =
  | { ok: true; status: "verified" | "code_issued" | "pending_review"; message: string; code?: string; account?: unknown }
  | { ok: false; status: number; error: string; needsConnect?: "youtube" | "tiktok" };

const now = () => new Date().toISOString();

async function connection(userId: string, platform: "youtube" | "tiktok"): Promise<CredentialDestination | null> {
  const { data } = await db()
    .from("live_destinations")
    .select("id, user_id, provider_channel_id, provider_account_id, encrypted_credentials")
    .eq("user_id", userId)
    .eq("platform", platform)
    .is("revoked_at", null)
    .order("last_connected_at", { ascending: false, nullsFirst: false })
    .limit(1);
  return ((data ?? []) as CredentialDestination[])[0] ?? null;
}

async function saveVerified(
  userId: string,
  platform: string,
  fields: { handle: string | null; url: string | null; followers?: number | null; metadata?: Record<string, unknown> },
  method: "oauth" | "bio_code" | "admin_review",
  note: string,
) {
  const payload: Record<string, unknown> = {
    user_id: userId,
    platform,
    handle: fields.handle,
    url: fields.url,
    is_verified: true,
    verification_method: method,
    verified_at: now(),
    verify_status: "verified",
    verify_code: null,
    verify_code_created_at: null,
    verify_checked_at: now(),
    verify_note: note,
    updated_at: now(),
  };
  if (fields.followers != null && fields.followers >= 0) payload.followers = fields.followers;
  if (fields.metadata) payload.metadata = fields.metadata;
  const { data } = await db()
    .from("jip_social_accounts")
    .upsert(payload, { onConflict: "user_id,platform" })
    .select("*")
    .single();
  return data;
}

/** Official login: the platform says which account belongs to this person. */
export async function verifyByConnection(userId: string, platform: "youtube" | "tiktok"): Promise<VerifyResult> {
  const dest = await connection(userId, platform);
  if (!dest) return { ok: false, status: 409, error: `Connect ${platform === "youtube" ? "YouTube" : "TikTok"} first.`, needsConnect: platform };
  const fresh = await freshCredentials(platform, dest);
  if (!fresh.ok || !fresh.creds.accessToken) {
    return { ok: false, status: 409, error: "Your connection expired. Connect again.", needsConnect: platform };
  }
  const token = fresh.creds.accessToken;

  if (platform === "youtube") {
    const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    }).catch(() => null);
    if (!res || !res.ok) return { ok: false, status: 502, error: "YouTube could not be reached. Try again in a minute." };
    const json = (await res.json().catch(() => null)) as {
      items?: {
        id?: string;
        snippet?: { title?: string; customUrl?: string };
        statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean };
      }[];
    } | null;
    const ch = json?.items?.[0];
    if (!ch?.id) return { ok: false, status: 404, error: "No YouTube channel was found on this Google account." };
    const custom = ch.snippet?.customUrl?.replace(/^@/, "") ?? null;
    const subs = ch.statistics?.hiddenSubscriberCount ? null : Number(ch.statistics?.subscriberCount ?? NaN);
    const account = await saveVerified(
      userId,
      "youtube",
      {
        handle: custom ?? ch.snippet?.title ?? null,
        url: custom ? `https://www.youtube.com/@${custom}` : `https://www.youtube.com/channel/${ch.id}`,
        followers: Number.isFinite(subs) ? (subs as number) : null,
        metadata: { channel_id: ch.id, channel_title: ch.snippet?.title ?? null },
      },
      "oauth",
      "Verified with YouTube login.",
    );
    return { ok: true, status: "verified", message: "YouTube verified.", account };
  }

  const info = await fetchTikTokUserInfo(token);
  if (!info.openId) return { ok: false, status: 502, error: "TikTok could not be reached. Try again in a minute." };
  const account = await saveVerified(
    userId,
    "tiktok",
    { handle: info.displayName, url: null, metadata: { open_id: info.openId } },
    "oauth",
    "Verified with TikTok login.",
  );
  return { ok: true, status: "verified", message: "TikTok verified.", account };
}

type AccountRow = {
  id: string;
  user_id: string;
  platform: string;
  handle: string | null;
  url: string | null;
  verify_code: string | null;
  verify_code_created_at: string | null;
  verify_status: string | null;
};

async function ownAccount(userId: string, id: string): Promise<AccountRow | null> {
  const { data } = await db()
    .from("jip_social_accounts")
    .select("id, user_id, platform, handle, url, verify_code, verify_code_created_at, verify_status")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as AccountRow | null) ?? null;
}

/** Gives (or re-shows) the one-time code for the bio. */
export async function issueBioCode(userId: string, id: string): Promise<VerifyResult> {
  const acc = await ownAccount(userId, id);
  if (!acc) return { ok: false, status: 404, error: "Account not found." };
  if (acc.verify_status === "verified") return { ok: true, status: "verified", message: "Already verified." };
  const fresh =
    acc.verify_code && acc.verify_code_created_at && Date.now() - Date.parse(acc.verify_code_created_at) < CODE_TTL_MS;
  const code = fresh ? acc.verify_code! : newVerifyCode();
  if (!fresh) {
    await db()
      .from("jip_social_accounts")
      .update({ verify_code: code, verify_code_created_at: now(), verify_status: "code_issued", verify_note: null })
      .eq("id", id);
  }
  return {
    ok: true,
    status: "code_issued",
    code,
    message: "Add this code to your bio, save it, then press Check.",
  };
}

/** Reads the public profile page for the code. */
export async function checkBioCode(userId: string, id: string): Promise<VerifyResult> {
  const acc = await ownAccount(userId, id);
  if (!acc) return { ok: false, status: 404, error: "Account not found." };
  if (!acc.verify_code) return { ok: false, status: 409, error: "Get a code first." };
  const page = publicProfileUrl(acc.platform, acc.handle, acc.url);
  if (!page) return { ok: false, status: 400, error: "Add your profile link or handle first." };
  const result = await checkCodeOnPage(page, acc.verify_code);
  if (result === "found") {
    const account = await saveVerified(
      userId,
      acc.platform,
      { handle: acc.handle, url: acc.url || page },
      "bio_code",
      "Verified with a code in the bio.",
    );
    return { ok: true, status: "verified", message: "Verified. You can remove the code from your bio now.", account };
  }
  await db()
    .from("jip_social_accounts")
    .update({
      verify_checked_at: now(),
      verify_note:
        result === "unreachable"
          ? "The platform did not let Jimvio read the page automatically."
          : "The code was not found on the page yet.",
    })
    .eq("id", id);
  return {
    ok: false,
    status: 409,
    error:
      result === "unreachable"
        ? "This platform blocked the automatic check. Keep the code in your bio and send it for review — a Jimvio reviewer will check it."
        : "Code not found yet. Make sure it is saved in your bio exactly as shown, then try again, or send it for review.",
  };
}

/** Hands the bio-code check to a Jimvio reviewer. */
export async function requestReview(userId: string, id: string): Promise<VerifyResult> {
  const acc = await ownAccount(userId, id);
  if (!acc) return { ok: false, status: 404, error: "Account not found." };
  if (!acc.verify_code) return { ok: false, status: 409, error: "Get a code first." };
  await db()
    .from("jip_social_accounts")
    .update({ verify_status: "pending_review", verify_checked_at: now(), verify_note: "Waiting for a Jimvio reviewer." })
    .eq("id", id);
  return { ok: true, status: "pending_review", message: "Sent for review. Keep the code in your bio until it's approved." };
}

/** Admin decision on a bio-code review. */
export async function reviewDecision(
  id: string,
  approve: boolean,
  note: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data } = await db()
    .from("jip_social_accounts")
    .select("id, user_id, platform, handle, url")
    .eq("id", id)
    .maybeSingle();
  if (!data) return { ok: false, error: "Account not found." };
  if (approve) {
    await saveVerified(data.user_id, data.platform, { handle: data.handle, url: data.url }, "admin_review", note || "Approved by Jimvio review.");
  } else {
    await db()
      .from("jip_social_accounts")
      .update({ verify_status: "failed", verify_checked_at: now(), verify_note: note || "The code was not found in the bio." })
      .eq("id", id);
  }
  return { ok: true };
}
