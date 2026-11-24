/**
 * Live Studio production environment gates.
 * Fail-fast for Live Studio APIs when infra is incomplete.
 * Does not crash the entire Jimvio app unless LIVE_STUDIO_REQUIRE_INFRA=true.
 */

import { getSupabasePublishableKey } from "@/lib/supabase/public-env";

export type LiveStudioEnvKey =
  | "NEXT_PUBLIC_LIVEKIT_URL"
  | "LIVEKIT_API_KEY"
  | "LIVEKIT_API_SECRET"
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_ANON_OR_PUBLISHABLE"
  | "SUPABASE_SERVICE_ROLE_OR_SECRET"
  | "CLOUDINARY_CLOUD_NAME"
  | "CLOUDINARY_API_KEY"
  | "CLOUDINARY_API_SECRET";

export type LiveStudioEnvReport = {
  ok: boolean;
  missing: LiveStudioEnvKey[];
  present: LiveStudioEnvKey[];
  requireInfra: boolean;
};

function trim(v: string | undefined): string {
  return (v ?? "").trim();
}

function has(v: string | undefined): boolean {
  const t = trim(v);
  return Boolean(t) && !t.includes("your-project") && t !== "xxx";
}

function liveKitUrl(): string {
  return trim(process.env.NEXT_PUBLIC_LIVEKIT_URL) || trim(process.env.LIVEKIT_URL);
}

function supabasePublishablePresent(): boolean {
  try {
    return has(getSupabasePublishableKey());
  } catch {
    return false;
  }
}

function supabaseSecret(): string {
  return trim(process.env.SUPABASE_SECRET_KEY) || trim(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function cloudinaryCloud(): string {
  return trim(process.env.CLOUDINARY_CLOUD_NAME) || trim(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
}

/** Snapshot of Live Studio infrastructure readiness (no secret values). */
export function getLiveStudioEnvReport(): LiveStudioEnvReport {
  const checks: Array<[LiveStudioEnvKey, boolean]> = [
    ["NEXT_PUBLIC_LIVEKIT_URL", has(liveKitUrl())],
    ["LIVEKIT_API_KEY", has(process.env.LIVEKIT_API_KEY)],
    ["LIVEKIT_API_SECRET", has(process.env.LIVEKIT_API_SECRET)],
    ["NEXT_PUBLIC_SUPABASE_URL", has(process.env.NEXT_PUBLIC_SUPABASE_URL)],
    ["SUPABASE_ANON_OR_PUBLISHABLE", supabasePublishablePresent()],
    ["SUPABASE_SERVICE_ROLE_OR_SECRET", has(supabaseSecret())],
    ["CLOUDINARY_CLOUD_NAME", has(cloudinaryCloud())],
    ["CLOUDINARY_API_KEY", has(process.env.CLOUDINARY_API_KEY)],
    ["CLOUDINARY_API_SECRET", has(process.env.CLOUDINARY_API_SECRET)],
  ];

  const present = checks.filter(([, ok]) => ok).map(([k]) => k);
  const missing = checks.filter(([, ok]) => !ok).map(([k]) => k);
  const requireInfra =
    trim(process.env.LIVE_STUDIO_REQUIRE_INFRA).toLowerCase() === "true" ||
    trim(process.env.LIVE_STUDIO_REQUIRE_INFRA) === "1";

  return { ok: missing.length === 0, missing, present, requireInfra };
}

/** Non-secret recording storage readiness (lengths only — never values). */
export function getEgressStorageReport(): {
  configured: boolean;
  endpointValid: boolean;
  storageMode: "ready" | "missing_credentials" | "invalid_endpoint";
  bucketPresent: boolean;
  bucketName: string | null;
  accessKeyPresent: boolean;
  secretPresent: boolean;
  regionPresent: boolean;
  endpointPresent: boolean;
  accessKeyLen: number;
  secretLen: number;
  region: string | null;
  endpointHost: string | null;
  forcePathStyle: boolean;
} {
  const bucket = trim(process.env.LIVEKIT_EGRESS_S3_BUCKET);
  const accessKey = trim(process.env.LIVEKIT_EGRESS_S3_ACCESS_KEY);
  const secret = trim(process.env.LIVEKIT_EGRESS_S3_SECRET);
  const region = trim(process.env.LIVEKIT_EGRESS_S3_REGION);
  const endpoint = trim(process.env.LIVEKIT_EGRESS_S3_ENDPOINT);
  let endpointHost: string | null = null;
  let endpointValid = !endpoint;
  if (endpoint) {
    try {
      const parsed = new URL(endpoint);
      endpointHost = parsed.host || null;
      endpointValid =
        parsed.protocol === "https:" &&
        Boolean(parsed.hostname) &&
        !parsed.username &&
        !parsed.password;
    } catch {
      endpointHost = "invalid_url";
      endpointValid = false;
    }
  }
  const credentialsPresent = Boolean(bucket && accessKey && secret);
  const configured = credentialsPresent && endpointValid;
  return {
    configured,
    endpointValid,
    storageMode: !credentialsPresent
      ? "missing_credentials"
      : endpointValid
        ? "ready"
        : "invalid_endpoint",
    bucketPresent: Boolean(bucket),
    bucketName: bucket || null,
    accessKeyPresent: Boolean(accessKey),
    secretPresent: Boolean(secret),
    regionPresent: Boolean(region),
    endpointPresent: Boolean(endpoint),
    accessKeyLen: accessKey.length,
    secretLen: secret.length,
    region: region || null,
    endpointHost,
    forcePathStyle: Boolean(endpoint),
  };
}

export class LiveStudioEnvError extends Error {
  readonly missing: LiveStudioEnvKey[];
  constructor(missing: LiveStudioEnvKey[]) {
    super(
      `Live Studio infrastructure incomplete. Missing: ${missing.join(", ")}. ` +
        `Set variables in .env.local / deployment secrets.`
    );
    this.name = "LiveStudioEnvError";
    this.missing = missing;
  }
}

/** Throws if required Live Studio env vars are missing. */
export function assertLiveStudioInfra(): void {
  const report = getLiveStudioEnvReport();
  if (!report.ok) throw new LiveStudioEnvError(report.missing);
}

/**
 * Boot-time validation.
 * Optional Live Studio infrastructure is a warning, not an application-wide error.
 * Required infrastructure remains fail-closed when LIVE_STUDIO_REQUIRE_INFRA=true.
 */
export function validateLiveStudioEnvAtBoot(): LiveStudioEnvReport {
  const report = getLiveStudioEnvReport();
  if (report.ok) {
    console.info(
      JSON.stringify({
        level: "info",
        scope: "live_studio",
        event: "env_ok",
        present: report.present,
      })
    );
  } else if (report.requireInfra) {
    console.error(
      JSON.stringify({
        level: "error",
        scope: "live_studio",
        event: "env_missing_required",
        missing: report.missing,
        requireInfra: true,
      })
    );
    throw new LiveStudioEnvError(report.missing);
  } else {
    console.warn(
      JSON.stringify({
        level: "warning",
        scope: "live_studio",
        event: "env_incomplete_optional",
        missing: report.missing,
        requireInfra: false,
      })
    );
  }
  return report;
}
