import { createHash } from "node:crypto";

/**
 * Cloudmersive Virus Scan API, advanced file scan.
 * Documented at https://api.cloudmersive.com/docs/virus.asp
 * and the OpenAPI spec https://api-console.cloudmersive.com/swagger/api/spec/virus
 *
 * POST https://api.cloudmersive.com/virus/scan/file/advanced
 * Auth header: Apikey (not Authorization: Bearer)
 * Body: multipart/form-data field inputFile
 * 200 JSON: VirusScanAdvancedResult
 *
 * Free tier (https://cloudmersive.com/pricing-small-business): 600 calls/month,
 * 1 call/second, one concurrent request, 3.5 MB maximum file size.
 * Jimvio's upload cap does not raise that provider limit.
 * File bytes are sent to Cloudmersive for scanning. The API key stays on the server.
 */

export const CLOUDMERSIVE_ADVANCED_SCAN_URL = "https://api.cloudmersive.com/virus/scan/file/advanced";
/** 3.5 MB as stated for the free tier. Decimal MB, not a larger binary interpretation. */
export const CLOUDMERSIVE_FREE_TIER_MAX_BYTES = 3_500_000;

export function cloudmersiveMaxBytes(raw: string | undefined | null): number {
  if (raw == null || String(raw).trim() === "") return CLOUDMERSIVE_FREE_TIER_MAX_BYTES;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return CLOUDMERSIVE_FREE_TIER_MAX_BYTES;
  return Math.floor(parsed);
}

export function contentDigest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function sha1Digest(bytes: Uint8Array): string {
  return createHash("sha1").update(bytes).digest("hex");
}

export type CloudmersiveScanDecision = {
  status: "passed" | "quarantined" | "requires_review" | "unavailable";
  bytesInspected: boolean;
  digest: string | null;
  engine: "cloudmersive";
  engineVersion: null;
  detail: string;
};

type AdvancedBody = {
  CleanResult?: unknown;
  ContainsExecutable?: unknown;
  ContainsInvalidFile?: unknown;
  ContainsScript?: unknown;
  ContainsPasswordProtectedFile?: unknown;
  ContainsRestrictedFileFormat?: unknown;
  ContainsMacros?: unknown;
  ContainsXmlExternalEntities?: unknown;
  ContainsInsecureDeserialization?: unknown;
  ContainsUnsafeArchive?: unknown;
  ContainsOleEmbeddedObject?: unknown;
  FoundViruses?: unknown;
  ContentInformation?: { Hash_SHA1?: unknown } | null;
};

function threatFlag(body: AdvancedBody): boolean {
  return [
    body.ContainsExecutable,
    body.ContainsInvalidFile,
    body.ContainsScript,
    body.ContainsPasswordProtectedFile,
    body.ContainsRestrictedFileFormat,
    body.ContainsMacros,
    body.ContainsXmlExternalEntities,
    body.ContainsInsecureDeserialization,
    body.ContainsUnsafeArchive,
    body.ContainsOleEmbeddedObject,
  ].some((value) => value === true);
}

/**
 * Map a documented advanced-scan body to Jimvio's result.
 * A clean verdict requires CleanResult true, no threat flags, no viruses,
 * and ContentInformation.Hash_SHA1 equal to the SHA-1 of the bytes Jimvio uploaded.
 * The returned digest is Jimvio's SHA-256 of those same bytes.
 * engineVersion stays null because this response schema does not include one.
 */
export function mapCloudmersiveAdvancedResult(body: unknown, bytes: Uint8Array): CloudmersiveScanDecision {
  const digest = contentDigest(bytes);
  const base = {
    digest,
    engine: "cloudmersive" as const,
    engineVersion: null,
  };
  if (!body || typeof body !== "object") {
    return {
      ...base,
      status: "unavailable",
      bytesInspected: false,
      detail: "The scanner response was not a recognized result. The file is not marked clean.",
    };
  }
  const parsed = body as AdvancedBody;
  const viruses = Array.isArray(parsed.FoundViruses) ? parsed.FoundViruses : [];
  const sha1 = typeof parsed.ContentInformation?.Hash_SHA1 === "string"
    ? parsed.ContentInformation.Hash_SHA1.trim().toLowerCase()
    : "";
  const sha1Matches = sha1.length > 0 && sha1 === sha1Digest(bytes);
  if (viruses.length > 0) {
    return {
      ...base,
      status: "quarantined",
      bytesInspected: sha1Matches,
      detail: "Cloudmersive reported malware in the uploaded file bytes.",
    };
  }
  if (parsed.CleanResult !== true || threatFlag(parsed)) {
    return {
      ...base,
      status: parsed.CleanResult === false ? "requires_review" : "unavailable",
      bytesInspected: false,
      detail: "Cloudmersive did not return a clean byte-level result. The file is not marked clean.",
    };
  }
  if (!sha1Matches) {
    return {
      ...base,
      status: "unavailable",
      bytesInspected: false,
      detail: "Cloudmersive did not bind its result to these file bytes. The file is not marked clean.",
    };
  }
  return {
    ...base,
    status: "passed",
    bytesInspected: true,
    detail: "Cloudmersive inspected these file bytes and returned a clean result.",
  };
}
