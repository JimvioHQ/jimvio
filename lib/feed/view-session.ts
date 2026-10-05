/**
 * Privacy-conscious anonymous view session id.
 * Stored in sessionStorage only — never sent to other users or rendered publicly.
 */

const STORAGE_KEY = "jimvio_post_view_sid";

function randomId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `jv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

/** Get or create a short-lived browser session id for anonymous view dedupe. */
export function getPostViewSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.sessionStorage.getItem(STORAGE_KEY)?.trim();
    if (existing && existing.length >= 8 && existing.length <= 80) return existing;
    const next = randomId();
    window.sessionStorage.setItem(STORAGE_KEY, next);
    return next;
  } catch {
    // Private mode / blocked storage — ephemeral per page load.
    const g = window as Window & { __jimvioViewSid?: string };
    if (!g.__jimvioViewSid) g.__jimvioViewSid = randomId();
    return g.__jimvioViewSid;
  }
}
