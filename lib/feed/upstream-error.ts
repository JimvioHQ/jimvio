/**
 * Raised when PostgREST/Postgres cannot complete a critical read in time.
 * Callers must surface this as 503 — never as an empty successful payload.
 */
export class UpstreamUnavailableError extends Error {
  readonly status = 503;
  readonly code = "upstream_unavailable";

  constructor(message = "Database temporarily unavailable") {
    super(message);
    this.name = "UpstreamUnavailableError";
  }
}

export function isUpstreamUnavailable(err: unknown): err is UpstreamUnavailableError {
  return err instanceof UpstreamUnavailableError;
}

export function isAbortLikeError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "20" ||
    msg.includes("abort") ||
    msg.includes("timeout") ||
    msg.includes("upstream") ||
    msg.includes("cancel")
  );
}
