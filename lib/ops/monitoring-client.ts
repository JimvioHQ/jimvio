/**
 * Client-safe monitoring helpers. Remote Sentry activation happens server-side;
 * this module only logs locally so client bundles never import server secrets.
 */
export function captureProductionException(error: unknown, context?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "production") {
    console.error("[monitoring:client]", error, context || {});
    return;
  }
  console.error("[monitoring:client]", error, context || {});
}
