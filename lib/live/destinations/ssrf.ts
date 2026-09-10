import { isIP } from "node:net";

/**
 * SSRF protection for user-supplied Custom RTMP URLs.
 * Only rtmp:// and rtmps:// are allowed. Block localhost, private nets, metadata.
 */

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
  "instance-data",
]);

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // ULA
  if (normalized.startsWith("fe80")) return true; // link-local
  return false;
}

export type RtmpUrlValidation =
  | { ok: true; normalizedUrl: string; host: string; protocol: "rtmp" | "rtmps" }
  | { ok: false; error: string };

export function validateRtmpUrl(raw: string): RtmpUrlValidation {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "RTMP URL is required" };
  if (trimmed.length > 512) return { ok: false, error: "RTMP URL is too long" };

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: "Invalid RTMP URL" };
  }

  const protocol = url.protocol.replace(":", "").toLowerCase();
  if (protocol !== "rtmp" && protocol !== "rtmps") {
    return { ok: false, error: "Only rtmp:// and rtmps:// URLs are allowed" };
  }

  const host = url.hostname.toLowerCase();
  if (!host) return { ok: false, error: "RTMP URL must include a host" };
  if (BLOCKED_HOSTS.has(host)) {
    return { ok: false, error: "This RTMP host is not allowed" };
  }
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) {
    return { ok: false, error: "This RTMP host is not allowed" };
  }

  const ipVersion = isIP(host);
  if (ipVersion === 4 && isPrivateIpv4(host)) {
    return { ok: false, error: "Private or loopback RTMP hosts are not allowed" };
  }
  if (ipVersion === 6 && isPrivateIpv6(host)) {
    return { ok: false, error: "Private or loopback RTMP hosts are not allowed" };
  }

  // Disallow credentials embedded in URL (stream key belongs in separate field)
  if (url.username || url.password) {
    return { ok: false, error: "Do not embed credentials in the RTMP URL" };
  }

  // Normalize: strip trailing slash only on empty path edge cases carefully
  const normalized = `${protocol}://${url.host}${url.pathname}${url.search}`.replace(
    /\/+$/,
    ""
  );

  return {
    ok: true,
    normalizedUrl: normalized,
    host,
    protocol: protocol as "rtmp" | "rtmps",
  };
}

export function buildPushUrl(rtmpUrl: string, streamKey: string): string {
  const base = rtmpUrl.replace(/\/+$/, "");
  const key = streamKey.trim().replace(/^\/+/, "");
  if (!key) throw new Error("Stream key is required");
  // Standard RTMP: base/app + / + streamKey
  return `${base}/${key}`;
}
