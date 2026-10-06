/**
 * Server-only Backblaze B2 (S3-compatible) helpers for Live recordings.
 * Credentials never leave the server. Used for signed playback URLs.
 */

import { createHmac, createHash } from "node:crypto";

export type EgressStorageConfig = {
  bucket: string;
  accessKey: string;
  secret: string;
  region: string;
  endpoint: string;
  forcePathStyle: boolean;
};

export function getEgressStorageConfig(): EgressStorageConfig | null {
  const bucket = process.env.LIVEKIT_EGRESS_S3_BUCKET?.trim();
  const accessKey = process.env.LIVEKIT_EGRESS_S3_ACCESS_KEY?.trim();
  const secret = process.env.LIVEKIT_EGRESS_S3_SECRET?.trim();
  const region = process.env.LIVEKIT_EGRESS_S3_REGION?.trim() || "us-east-005";
  const endpoint = process.env.LIVEKIT_EGRESS_S3_ENDPOINT?.trim();
  if (!bucket || !accessKey || !secret || !endpoint) return null;
  return {
    bucket,
    accessKey,
    secret,
    region,
    endpoint: endpoint.replace(/\/$/, ""),
    forcePathStyle: true,
  };
}

export type ParsedRecordingObject = {
  bucket: string;
  key: string;
  /** Prefer HTTPS object URL when present. */
  httpsUrl: string | null;
};

/**
 * Parse LiveKit FileInfo.location / filename into bucket+key.
 * Accepts https B2/S3 URLs, s3:// URIs, or raw object keys.
 */
export function parseRecordingObjectRef(
  location: string,
  fallbackBucket?: string | null
): ParsedRecordingObject | null {
  const raw = location.trim();
  if (!raw) return null;

  if (raw.startsWith("s3://")) {
    const without = raw.slice("s3://".length);
    const slash = without.indexOf("/");
    if (slash <= 0) return null;
    const bucket = without.slice(0, slash);
    const key = decodeURIComponent(without.slice(slash + 1));
    if (!bucket || !key) return null;
    return { bucket, key, httpsUrl: null };
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const url = new URL(raw);
      const path = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
      // Path-style: /bucket/key...
      const firstSlash = path.indexOf("/");
      if (firstSlash > 0) {
        const bucket = path.slice(0, firstSlash);
        const key = path.slice(firstSlash + 1);
        if (bucket && key) {
          return { bucket, key, httpsUrl: raw };
        }
      }
      // Virtual-hosted: bucket.s3.... /key
      const hostBucket = url.hostname.split(".")[0];
      if (hostBucket && path) {
        return { bucket: hostBucket, key: path, httpsUrl: raw };
      }
    } catch {
      return null;
    }
    return null;
  }

  // Raw object key under configured bucket
  if (fallbackBucket) {
    return {
      bucket: fallbackBucket,
      key: raw.replace(/^\/+/, ""),
      httpsUrl: null,
    };
  }
  return null;
}

function sha256Hex(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function amzDate(d: Date): { amz: string; date: string } {
  const iso = d.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amz: iso, date: iso.slice(0, 8) };
}

/**
 * Create a short-lived SigV4 presigned GET URL for an S3-compatible object.
 */
export function createPresignedGetUrl(input: {
  config: EgressStorageConfig;
  key: string;
  expiresSeconds?: number;
  filename?: string | null;
}): string {
  const expires = Math.min(Math.max(input.expiresSeconds ?? 3600, 60), 86400);
  const { config } = input;
  const endpointHost = new URL(config.endpoint).host;
  const key = input.key.replace(/^\/+/, "");
  const canonicalUri = `/${config.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
  const { amz, date } = amzDate(new Date());
  const credential = `${config.accessKey}/${date}/${config.region}/s3/aws4_request`;

  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amz,
    "X-Amz-Expires": String(expires),
    "X-Amz-SignedHeaders": "host",
  });
  if (input.filename) {
    query.set(
      "response-content-disposition",
      `attachment; filename="${input.filename.replace(/"/g, "")}"`
    );
  }
  // Sort query params for canonical request
  const sorted = [...query.entries()].sort(([a], [b]) => a.localeCompare(b));
  const canonicalQuery = sorted
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const canonicalHeaders = `host:${endpointHost}\n`;
  const canonicalRequest = [
    "GET",
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amz,
    `${date}/${config.region}/s3/aws4_request`,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = hmac(`AWS4${config.secret}`, date);
  const kRegion = hmac(kDate, config.region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning)
    .update(stringToSign, "utf8")
    .digest("hex");

  return `${config.endpoint}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

export function buildPlaybackUrlForLocation(location: string): string | null {
  const config = getEgressStorageConfig();
  const parsed = parseRecordingObjectRef(location, config?.bucket ?? null);
  if (!parsed) return null;
  if (!config) {
    // Fall back to HTTPS location if already absolute and no signing config.
    return parsed.httpsUrl;
  }
  if (parsed.bucket !== config.bucket) {
    // Different bucket — only return existing https URL.
    return parsed.httpsUrl;
  }
  try {
    return createPresignedGetUrl({
      config,
      key: parsed.key,
      expiresSeconds: 3600,
    });
  } catch {
    return parsed.httpsUrl;
  }
}

export function buildDownloadUrlForLocation(
  location: string,
  filename: string
): string | null {
  const config = getEgressStorageConfig();
  const parsed = parseRecordingObjectRef(location, config?.bucket ?? null);
  if (!parsed || !config || parsed.bucket !== config.bucket) {
    return parsed?.httpsUrl ?? null;
  }
  try {
    return createPresignedGetUrl({
      config,
      key: parsed.key,
      expiresSeconds: 3600,
      filename,
    });
  } catch {
    return parsed.httpsUrl;
  }
}
