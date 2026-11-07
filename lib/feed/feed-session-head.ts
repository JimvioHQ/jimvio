/**
 * Feed session "head" memory: the first few post ids a viewer saw in their
 * last feed session. The next session keeps them out of the top slots so
 * opening / returning to / refreshing the Feed shows fresh posts first.
 *
 * Stored in a first-party cookie (so SSR can use it) — ids only, no PII.
 */

export const FEED_HEAD_COOKIE = "jv_feed_head";
export const FEED_HEAD_SIZE = 4;
const MAX_AVOID = 8;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Parse a "." or "," separated list of post ids; invalid entries are dropped. */
export function parseFeedAvoidIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const out: string[] = [];
  for (const part of raw.split(/[.,]/)) {
    const id = part.trim();
    if (UUID_RE.test(id) && !out.includes(id)) out.push(id.toLowerCase());
    if (out.length >= MAX_AVOID) break;
  }
  return out;
}

export function serializeFeedAvoidIds(ids: string[]): string {
  return parseFeedAvoidIds(ids.join(".")).join(".");
}

/** Browser only: remember the head of the session the viewer is looking at. */
export function rememberFeedHead(postIds: string[]): void {
  if (typeof document === "undefined") return;
  const value = serializeFeedAvoidIds(postIds.slice(0, FEED_HEAD_SIZE));
  if (!value) return;
  try {
    document.cookie = `${FEED_HEAD_COOKIE}=${value}; Path=/; Max-Age=86400; SameSite=Lax${
      location.protocol === "https:" ? "; Secure" : ""
    }`;
  } catch {
    /* cookies disabled */
  }
}

/** Browser only: read the last remembered head. */
export function readFeedHead(): string[] {
  if (typeof document === "undefined") return [];
  try {
    const match = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${FEED_HEAD_COOKIE}=`));
    return parseFeedAvoidIds(match ? decodeURIComponent(match.split("=")[1] ?? "") : "");
  } catch {
    return [];
  }
}

const SHOWN_SESSIONS_KEY = "jimvio:feed:shown-sessions-v1";

/**
 * Browser only: true when this exact feed session (seed) was already shown in
 * this tab — e.g. Back/Forward restored a cached RSC payload. Marks it shown.
 */
export function wasFeedSessionShown(sessionCursor: string | null | undefined): boolean {
  if (typeof window === "undefined" || !sessionCursor) return false;
  try {
    const raw = sessionStorage.getItem(SHOWN_SESSIONS_KEY);
    const list: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    if (list.includes(sessionCursor)) return true;
    const next = [...list.slice(-19), sessionCursor];
    sessionStorage.setItem(SHOWN_SESSIONS_KEY, JSON.stringify(next));
    return false;
  } catch {
    return false;
  }
}
