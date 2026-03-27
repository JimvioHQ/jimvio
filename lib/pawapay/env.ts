/**
 * Whether the app is configured for PawaPay sandbox API (vs production).
 * Uses PAWAPAY_BASE_URL when set, else PAWAPAY_ENV (defaults to sandbox in API client).
 */
export function isPawaPaySandboxEnv(): boolean {
  const base = process.env.PAWAPAY_BASE_URL?.trim().toLowerCase() ?? "";
  if (base) {
    return base.includes("sandbox.pawapay") || base.includes("api.sandbox");
  }
  const env = (process.env.PAWAPAY_ENV || "sandbox").toLowerCase().trim();
  return env !== "production";
}
