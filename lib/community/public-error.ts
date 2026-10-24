const DATABASE_LEAK =
  /column |relation |schema cache|PGRST|violates |duplicate key|syntax error|permission denied for|JWT|row-level security|password authentication/i;

/** Full diagnostic for server logs. Do not return this string to clients. */
export function communityErrorDetail(error: unknown): string {
  if (typeof error === "string") return error.trim();
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  return "";
}

export function logCommunityFailure(scope: string, error: unknown): void {
  const detail = communityErrorDetail(error);
  console.error(`[community:${scope}]`, detail || error);
}

/**
 * Client-safe message. Database and PostgREST details stay in logs.
 * Messages we throw ourselves (authorization, validation) are returned.
 */
export function publicErrorMessage(error: unknown, fallback: string): string {
  const detail = communityErrorDetail(error);
  if (!detail || DATABASE_LEAK.test(detail)) return fallback;
  if (typeof error === "string" || error instanceof Error) return detail;
  return fallback;
}
