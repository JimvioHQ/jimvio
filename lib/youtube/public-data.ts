import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { freshCredentials, type CredentialDestination } from "@/lib/live/destinations/fresh-credentials";

/**
 * Reads public YouTube Data API v3 data (free; quota only, no billing).
 * Tries every Google API key Jimvio already has, then the signed-in
 * person's own connected YouTube login. Keys are never logged.
 */

const KEY_ENVS = ["YOUTUBE_API_KEY", "YOUTUBE_DATA_API_KEY", "YOUTUBE_CLIENT_SECRET", "GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "GEMINI_API_KEY"];
const GOOGLE_KEY = /^AIza[0-9A-Za-z_-]{30,}$/;

/** Env names holding a Google API key (OAuth client secrets are skipped). */
export function youtubeKeyEnvs(env: Record<string, string | undefined> = process.env): string[] {
  return KEY_ENVS.filter((name) => GOOGLE_KEY.test(env[name]?.trim() ?? ""));
}

// Remembers a key that YouTube refused (API not enabled on its project) for this instance.
const refused = new Set<string>();

async function connectedToken(userId: string): Promise<string | null> {
  const db = createServiceRoleClient() as unknown as { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data } = await db
    .from("live_destinations")
    .select("id, user_id, provider_channel_id, provider_account_id, encrypted_credentials")
    .eq("user_id", userId)
    .eq("platform", "youtube")
    .is("revoked_at", null)
    .order("last_connected_at", { ascending: false, nullsFirst: false })
    .limit(1);
  const dest = ((data ?? []) as CredentialDestination[])[0];
  if (!dest) return null;
  const fresh = await freshCredentials("youtube", dest);
  return fresh.ok && fresh.creds.accessToken ? fresh.creds.accessToken : null;
}

export type YouTubeRead =
  | { ok: true; json: Record<string, unknown>; via: string }
  | { ok: false; reason: "no_access" | "failed" };

/** `path` like "videos?part=statistics&id=…". */
export async function youtubePublic(path: string, userId: string | null = null): Promise<YouTubeRead> {
  const base = `https://www.googleapis.com/youtube/v3/${path}`;
  let anyFailure = false;
  for (const name of youtubeKeyEnvs()) {
    if (refused.has(name)) continue;
    const key = process.env[name]!.trim();
    const res = await fetch(`${base}&key=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(8_000), cache: "no-store" }).catch(() => null);
    if (res?.ok) return { ok: true, json: (await res.json()) as Record<string, unknown>, via: name };
    if (res && (res.status === 400 || res.status === 403)) {
      const body = await res.text().catch(() => "");
      // Quota-exhausted keys stay usable tomorrow; disabled/invalid keys are skipped.
      if (!/quotaExceeded|dailyLimitExceeded/.test(body)) refused.add(name);
      console.warn(`[youtube] ${name} refused (${res.status}).`);
    }
    anyFailure = true;
  }
  if (userId) {
    const token = await connectedToken(userId).catch(() => null);
    if (token) {
      const res = await fetch(base, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8_000), cache: "no-store" }).catch(() => null);
      if (res?.ok) return { ok: true, json: (await res.json()) as Record<string, unknown>, via: "connected_account" };
      anyFailure = true;
    }
  }
  return { ok: false, reason: anyFailure ? "failed" : "no_access" };
}

/** Free public oEmbed: confirms a video exists and who posted it. No counts. */
export async function youtubeOembed(videoUrl: string): Promise<{ title: string | null; author: string | null } | null> {
  const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(videoUrl)}`, {
    signal: AbortSignal.timeout(6_000),
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return null;
  const j = (await res.json().catch(() => null)) as { title?: string; author_name?: string } | null;
  return j ? { title: j.title ?? null, author: j.author_name ?? null } : null;
}
