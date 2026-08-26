/**
 * Canonical Live session URLs.
 * Production never emits localhost or Vercel preview hosts.
 */

import { getSiteUrl } from "@/lib/site-url";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const LIVE_SESSION_PATH_PREFIX = "/communities/live";

export function isLiveSessionId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

export function liveSessionPath(sessionId: string): string {
  return `${LIVE_SESSION_PATH_PREFIX}/${encodeURIComponent(sessionId.trim())}`;
}

/** Absolute public Live URL — safe for SSR and the browser. */
export function canonicalLiveUrl(sessionId: string): string {
  const id = sessionId.trim();
  const origin = getSiteUrl().replace(/\/$/, "");
  if (!id) return `${origin}${LIVE_SESSION_PATH_PREFIX}`;
  return `${origin}${liveSessionPath(id)}`;
}

export function isCanonicalLiveUrl(url: string, sessionId: string): boolean {
  try {
    const parsed = new URL(url);
    const expected = new URL(canonicalLiveUrl(sessionId));
    return (
      parsed.origin === expected.origin &&
      parsed.pathname === expected.pathname
    );
  } catch {
    return false;
  }
}
