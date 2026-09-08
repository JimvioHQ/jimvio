import { isSafeInternalPath, sanitizeInternalPath } from "@/lib/auth/safe-path";

const JOIN_PATH_RE = /^\/ugc\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/join\/?$/i;

/** Canonical join route for a campaign UUID. */
export function ugcCampaignJoinPath(campaignId: string): string {
  return `/ugc/${campaignId}/join`;
}

/** True when `href` is (or targets) a UGC join campaign path. */
export function isUgcJoinPath(href: string): boolean {
  if (typeof href !== "string") return false;
  const path = href.trim().split("?")[0]?.split("#")[0] ?? "";
  return JOIN_PATH_RE.test(path);
}

/**
 * Sanitize a return path for login redirects.
 * Only safe internal relative paths are allowed (no open redirects).
 */
export function sanitizeJoinReturnPath(raw: string | null | undefined): string {
  const fallback = "/ugc";
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return fallback;
  const pathOnly = trimmed.split("#")[0] ?? trimmed;
  if (!isSafeInternalPath(pathOnly)) return fallback;
  return sanitizeInternalPath(pathOnly, fallback);
}

/** Existing Jimvio login URL with a safe `next` return path. */
export function loginUrlForReturnPath(returnPath: string): string {
  const safe = sanitizeJoinReturnPath(returnPath);
  return `/login?next=${encodeURIComponent(safe)}`;
}
