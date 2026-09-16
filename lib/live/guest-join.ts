import { isCommunityUuid } from "@/lib/community/resolve-community";
import { isSafeInternalPath, sanitizeInternalPath } from "@/lib/auth/safe-path";

/** Canonical Live session guest path: /communities/live/{uuid} */
const LIVE_SESSION_PATH_RE =
  /^\/communities\/live\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:\/)?$/i;

/**
 * Unauthenticated visitors may open a Live session URL to see the Join Live
 * gate. The hub listing `/communities/live` (create/go-live) stays auth-required.
 */
export function isLiveSessionGuestPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? "";
  return LIVE_SESSION_PATH_RE.test(path);
}

export function liveSessionIdFromPath(pathname: string): string | null {
  const path = pathname.split("?")[0] ?? "";
  const match = path.match(LIVE_SESSION_PATH_RE);
  return match?.[1] ?? null;
}

export function buildLiveSessionPath(sessionId: string): string {
  if (!isCommunityUuid(sessionId)) return "/communities/live";
  return `/communities/live/${sessionId}`;
}

/** Only allow return into a Live session URL (never external / open redirects). */
export function sanitizeLiveReturnPath(
  raw: string | null | undefined,
  fallbackSessionId?: string | null
): string {
  const fallback = fallbackSessionId
    ? buildLiveSessionPath(fallbackSessionId)
    : "/communities/live";
  const candidate = sanitizeInternalPath(raw, fallback);
  if (isLiveSessionGuestPath(candidate)) return candidate.split("?")[0] ?? candidate;
  if (candidate === "/communities/live" || candidate.startsWith("/communities/live?")) {
    return candidate;
  }
  return fallback;
}

export function isSafeLiveReturnPath(path: string): boolean {
  if (!isSafeInternalPath(path)) return false;
  const base = path.split("?")[0] ?? "";
  return base === "/communities/live" || isLiveSessionGuestPath(base);
}

export type LiveGuestPreview = {
  sessionId: string;
  title: string | null;
  status: string;
  privacy: "public" | "private" | "invite_only" | "unknown";
  canGuestJoin: boolean;
  hostName: string | null;
  message?: string;
};

/** Safe display fallback from verified email — never a shared "Guest" label. */
export function displayNameFromVerifiedEmail(email: string): string {
  const local = email.split("@")[0]?.trim() || "";
  const cleaned = local.replace(/[._+-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "Member";
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
    .slice(0, 48);
}
