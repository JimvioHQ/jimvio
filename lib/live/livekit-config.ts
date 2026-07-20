/** LiveKit env — media transport only. Never put business logic here. */

export function getLiveKitUrl(): string | null {
  const url =
    process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim() ||
    process.env.LIVEKIT_URL?.trim() ||
    "";
  return url || null;
}

export function getLiveKitApiKey(): string | null {
  return process.env.LIVEKIT_API_KEY?.trim() || null;
}

export function getLiveKitApiSecret(): string | null {
  return process.env.LIVEKIT_API_SECRET?.trim() || null;
}

export function isLiveKitConfigured(): boolean {
  return Boolean(getLiveKitUrl() && getLiveKitApiKey() && getLiveKitApiSecret());
}

/** Stable room name for a Jimvio live session (Supabase session id). */
export function liveKitRoomName(sessionId: string): string {
  return `jimvio-live-${sessionId}`;
}
