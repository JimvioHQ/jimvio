/**
 * Shared open-redirect guard for login, OAuth callback, and post-login routing.
 * Only relative in-app paths are allowed.
 */
export function isSafeInternalPath(path: string): boolean {
  if (typeof path !== "string") return false;
  const s = path.trim();
  if (!s.startsWith("/") || s.startsWith("//") || s.startsWith("/\\")) return false;
  if (s.includes("://") || s.includes("\\")) return false;
  const lower = s.toLowerCase();
  if (lower.includes("%2f") || lower.includes("%5c")) return false;
  return true;
}

export function sanitizeInternalPath(
  raw: string | null | undefined,
  fallback = "/",
): string {
  const s = raw?.trim() ?? "";
  return isSafeInternalPath(s) ? s : fallback;
}
