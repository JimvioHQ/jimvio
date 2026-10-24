import {
  CLOUDMERSIVE_ADVANCED_SCAN_URL,
  cloudmersiveMaxBytes,
  contentDigest,
  mapCloudmersiveAdvancedResult,
} from "./cloudmersive";
import type { ScanStatus } from "./types";

/**
 * Malware scanning adapter.
 *
 * DIGITAL_PRODUCT_SCANNER:
 *   unset or "unconfigured" — no engine. Result is unavailable, never passed.
 *   "cloudmersive" — upload the file bytes to Cloudmersive's documented
 *     advanced scan endpoint. The URL is fixed. DIGITAL_PRODUCT_SCANNER_URL
 *     is ignored so bytes cannot be sent to another host. The API key is the
 *     Apikey header. A pass requires a clean advanced result bound to the
 *     SHA-1 of those bytes. Jimvio stores the SHA-256 of the same bytes.
 *   "http" — POST metadata to DIGITAL_PRODUCT_SCANNER_URL.
 *     This mode does not inspect file bytes inside Jimvio.
 *     A result is passed only when the engine returns verdict "clean",
 *     echoes the same digest, and sets bytesInspected true.
 *     Transport errors, timeouts, digest mismatches, and metadata-only
 *     answers stay unavailable or requires_review. They are never passed.
 *
 * This module never executes the uploaded file.
 */

export type ScanRequest = {
  fulfillment: "download" | "affiliate_redirect";
  hasDeliverable: boolean;
  structuralFailure: boolean;
  encryptedArchive: boolean;
  suspiciousExecutable: boolean;
  fileDigest: string | null;
  fileName: string | null;
  mime: string | null;
  sizeBytes: number | null;
  /** Exact bytes to upload. Required for the Cloudmersive mode. */
  bytes?: Uint8Array | null;
};

export type ScanResult = {
  status: ScanStatus;
  engine: string;
  engineVersion: string | null;
  detail: string;
  /** True only when the configured engine says it inspected file bytes for this digest. */
  bytesInspected: boolean;
};

export type ScannerEnv = {
  mode?: string | null;
  url?: string | null;
  token?: string | null;
  /** Provider upload ceiling. Cloudmersive free tier defaults to 3.5 MB. */
  providerMaxBytes?: number | null;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export function scannerEnvFromProcess(env: NodeJS.ProcessEnv = process.env): ScannerEnv {
  return {
    mode: env.DIGITAL_PRODUCT_SCANNER ?? null,
    url: env.DIGITAL_PRODUCT_SCANNER_URL ?? null,
    token: env.DIGITAL_PRODUCT_SCANNER_TOKEN ?? null,
    providerMaxBytes: cloudmersiveMaxBytes(env.DIGITAL_PRODUCT_SCANNER_MAX_BYTES),
  };
}

export async function runSecurityScan(
  request: ScanRequest,
  env: ScannerEnv = scannerEnvFromProcess(),
  fetchImpl: FetchLike = fetch,
): Promise<ScanResult> {
  if (request.fulfillment === "affiliate_redirect" && !request.hasDeliverable) {
    return {
      status: "not_applicable",
      engine: "none",
      engineVersion: null,
      bytesInspected: false,
      detail: "Affiliate-only listings do not include a Jimvio-hosted file to scan.",
    };
  }

  if (!request.hasDeliverable) {
    return {
      status: "failed",
      engine: "policy",
      engineVersion: null,
      bytesInspected: false,
      detail: "A downloadable product has no file to scan.",
    };
  }

  if (request.suspiciousExecutable || request.structuralFailure) {
    return {
      status: "quarantined",
      engine: "policy",
      engineVersion: null,
      bytesInspected: false,
      detail: "The file failed structural safety checks and was quarantined. This is not a malware-clean result.",
    };
  }

  if (request.encryptedArchive) {
    return {
      status: "requires_review",
      engine: "policy",
      engineVersion: null,
      bytesInspected: false,
      detail: "Encrypted or unscannable content cannot be marked clean.",
    };
  }

  const mode = String(env.mode || "unconfigured").trim().toLowerCase();
  if (mode === "cloudmersive") {
    return scanWithCloudmersive(request, env, fetchImpl);
  }
  let scannerUrl: URL | null = null;
  if (mode === "http" && env.url) {
    try {
      scannerUrl = new URL(env.url);
    } catch {
      scannerUrl = null;
    }
  }
  if (!scannerUrl || scannerUrl.protocol !== "https:") {
    return {
      status: "unavailable",
      engine: "none",
      engineVersion: null,
      bytesInspected: false,
      detail: "No malware scanner is configured. The file is not marked clean.",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (env.token) headers.authorization = `Bearer ${env.token}`;
    const response = await fetchImpl(scannerUrl.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify({
        digest: request.fileDigest,
        fileName: request.fileName,
        mime: request.mime,
        sizeBytes: request.sizeBytes,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return {
        status: "unavailable",
        engine: "http",
        engineVersion: null,
        bytesInspected: false,
        detail: "The scanner did not return a usable result. The file is not marked clean.",
      };
    }
    const body = (await response.json()) as {
      verdict?: string;
      digest?: string;
      bytesInspected?: boolean;
      engine?: string;
      engineVersion?: string | null;
    };
    const verdict = String(body.verdict || "").toLowerCase();
    const engine = body.engine || "http";
    const engineVersion = body.engineVersion ?? null;
    const digestMatches = Boolean(request.fileDigest) && body.digest === request.fileDigest;
    const inspected = body.bytesInspected === true && digestMatches;
    if (!digestMatches) {
      return {
        status: "unavailable",
        engine,
        engineVersion,
        bytesInspected: false,
        detail: "The scanner result was not bound to this file version. The file is not marked clean.",
      };
    }
    if (verdict === "clean" && inspected) {
      return {
        status: "passed",
        engine,
        engineVersion,
        bytesInspected: true,
        detail: "The configured scanner inspected this file version and returned a clean verdict.",
      };
    }
    if (verdict === "clean") {
      return {
        status: "requires_review",
        engine,
        engineVersion,
        bytesInspected: false,
        detail: "The scanner did not confirm a byte-level inspection of this file. It is not marked clean.",
      };
    }
    if (verdict === "infected") {
      return {
        status: "quarantined",
        engine,
        engineVersion,
        bytesInspected: inspected,
        detail: "The configured scanner reported malicious content for this file version.",
      };
    }
    if (verdict === "suspicious") {
      return {
        status: "requires_review",
        engine,
        engineVersion,
        bytesInspected: inspected,
        detail: "The configured scanner reported a suspicious result for this file version.",
      };
    }
    return {
      status: "unavailable",
      engine,
      engineVersion,
      bytesInspected: false,
      detail: "The scanner response did not include a recognized verdict. The file is not marked clean.",
    };
  } catch {
    return {
      status: "unavailable",
      engine: "http",
      engineVersion: null,
      bytesInspected: false,
      detail: "The scanner could not be reached or timed out. The file is not marked clean.",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function scanWithCloudmersive(
  request: ScanRequest,
  env: ScannerEnv,
  fetchImpl: FetchLike,
): Promise<ScanResult> {
  const unavailable = (detail: string): ScanResult => ({
    status: "unavailable",
    engine: "cloudmersive",
    engineVersion: null,
    bytesInspected: false,
    detail,
  });
  const apiKey = String(env.token || "").trim();
  if (!apiKey) {
    return unavailable("No Cloudmersive API key is configured. The file is not marked clean.");
  }
  const bytes = request.bytes;
  if (!bytes || bytes.byteLength === 0) {
    return unavailable("The file bytes could not be read for scanning. The file is not marked clean.");
  }
  const limit = env.providerMaxBytes && env.providerMaxBytes > 0
    ? env.providerMaxBytes
    : cloudmersiveMaxBytes(null);
  if (bytes.byteLength > limit) {
    return unavailable("The file is larger than the configured scanner limit. It is not marked clean.");
  }
  const digest = contentDigest(bytes);
  if (request.fileDigest && request.fileDigest !== digest) {
    return unavailable("The file bytes do not match the version submitted for scanning. The file is not marked clean.");
  }
  const form = new FormData();
  const name = (request.fileName || "file").replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80) || "file";
  const uploadBytes = new Uint8Array(bytes.byteLength);
  uploadBytes.set(bytes);
  form.append("inputFile", new Blob([uploadBytes]), name);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetchImpl(CLOUDMERSIVE_ADVANCED_SCAN_URL, {
      method: "POST",
      headers: { Apikey: apiKey },
      body: form,
      signal: controller.signal,
    });
    if (!response.ok) {
      return unavailable("Cloudmersive did not return a usable result. The file is not marked clean.");
    }
    const body = await response.json();
    const mapped = mapCloudmersiveAdvancedResult(body, bytes);
    return {
      status: mapped.status,
      engine: mapped.engine,
      engineVersion: mapped.engineVersion,
      bytesInspected: mapped.bytesInspected,
      detail: mapped.detail,
    };
  } catch {
    return unavailable("Cloudmersive could not be reached or timed out. The file is not marked clean.");
  } finally {
    clearTimeout(timer);
  }
}
