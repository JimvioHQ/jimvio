/**
 * next/navigation `redirect()` throws an internal error with digest NEXT_REDIRECT.
 * Client code must rethrow it so navigation completes; do not treat as a failed login.
 */
export function isNextRedirectError(err: unknown): boolean {
  if (err === null || typeof err !== "object") return false;
  const d = (err as { digest?: unknown }).digest;
  return typeof d === "string" && d.startsWith("NEXT_REDIRECT");
}
