import ipaddr from "ipaddr.js";

/** Pure URL and address rules used before Jimvio opens any user link. */

const ALLOWED_PORTS = new Set(["", "80", "443"]);

export class BlockedUrlError extends Error {}

export function isPublicAddress(ip: string): boolean {
  if (!ipaddr.isValid(ip)) return false;
  let addr = ipaddr.parse(ip);
  if (addr.kind() === "ipv6" && (addr as ipaddr.IPv6).isIPv4MappedAddress()) {
    addr = (addr as ipaddr.IPv6).toIPv4Address();
  }
  return addr.range() === "unicast";
}

export function normalizeUrl(raw: string): URL {
  const text = raw.trim();
  if (!text || text.length > 2048) throw new BlockedUrlError("Enter a valid link (up to 2048 characters).");
  let u: URL;
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    throw new BlockedUrlError("That doesn't look like a valid link.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new BlockedUrlError("Only http and https links can be checked.");
  if (u.username || u.password) throw new BlockedUrlError("Links with a username or password inside can't be checked.");
  if (!ALLOWED_PORTS.has(u.port)) throw new BlockedUrlError("Only standard web ports (80 and 443) are checked.");
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new BlockedUrlError("Private or local addresses can't be checked.");
  }
  u.hash = "";
  return u;
}

