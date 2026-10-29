import "server-only";
import { decryptCredentials } from "@/lib/live/destinations/encryption";
import { updateStoredCredentials } from "@/lib/live/destinations/repository";
import { YouTubeDestinationAdapter } from "@/lib/live/destinations/adapters/youtube";
import { refreshTikTokCredentials } from "@/lib/live/destinations/adapters/tiktok";
import type { AdapterContext } from "@/lib/live/destinations/adapters/base";
import type { EncryptedCredentialPayload } from "@/lib/live/destinations/types";

export type CredentialDestination = {
  id: string;
  user_id: string;
  provider_channel_id: string | null;
  provider_account_id: string | null;
  encrypted_credentials: string | null;
};

/** Decrypts a connected account's tokens and refreshes them when they are about to expire. */
function expiringSoon(creds: EncryptedCredentialPayload): boolean {
  const at = creds.expiresAt ? Date.parse(creds.expiresAt) : 0;
  return !creds.accessToken || !Number.isFinite(at) || at < Date.now() + 60_000;
}

export async function freshCredentials(
  platform: "youtube" | "tiktok",
  dest: CredentialDestination,
): Promise<{ ok: true; creds: EncryptedCredentialPayload } | { ok: false }> {
  if (!dest.encrypted_credentials) return { ok: false };
  let creds: EncryptedCredentialPayload;
  try {
    creds = decryptCredentials(dest.encrypted_credentials);
  } catch {
    return { ok: false };
  }
  if (!expiringSoon(creds)) return { ok: true, creds };
  const refreshed =
    platform === "youtube"
      ? await new YouTubeDestinationAdapter().refreshCredentials({
          userId: dest.user_id,
          destinationId: dest.id,
          credentials: creds,
          metadata: {} as AdapterContext["metadata"],
          displayName: "YouTube",
        })
      : await refreshTikTokCredentials(creds);
  if (!refreshed.ok) return { ok: false };
  await updateStoredCredentials(dest.id, dest.user_id, refreshed.value).catch(() => undefined);
  return { ok: true, creds: refreshed.value };
}

