import "server-only";
import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import ipaddr from "ipaddr.js";
import { BlockedUrlError, isPublicAddress, normalizeUrl } from "./url-guard";

/**
 * Fetches public web pages without letting a user aim Jimvio's servers at
 * private networks (SSRF). Every hop is resolved, every resolved address is
 * checked, and the connection is pinned to that checked address so a second
 * DNS answer can't swap it (rebinding).
 */

export const MAX_BYTES = 1_500_000;
export const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 8_000;
export { BlockedUrlError, isPublicAddress, normalizeUrl };

export async function resolvePublic(host: string): Promise<string[]> {
  const bare = host.replace(/^\[|\]$/g, "");
  if (ipaddr.isValid(bare)) {
    if (!isPublicAddress(bare)) throw new BlockedUrlError("Private or reserved IP addresses can't be checked.");
    return [bare];
  }
  const records = await lookup(bare, { all: true, verbatim: true }).catch(() => []);
  if (records.length === 0) throw new BlockedUrlError("This domain doesn't resolve to any address.");
  const addrs = records.map((r) => r.address);
  if (addrs.some((a) => !isPublicAddress(a))) {
    throw new BlockedUrlError("This domain points to a private or reserved address, so it was not opened.");
  }
  // IPv4 first: serverless egress often has no IPv6 route.
  return [...addrs].sort((a, b) => Number(a.includes(":")) - Number(b.includes(":")));
}

export type SafeResponse = {
  url: string;
  status: number;
  headers: Record<string, string>;
  body: Buffer;
  truncated: boolean;
  ip: string;
};

function requestOnce(u: URL, ip: string, method: "GET" | "HEAD"): Promise<SafeResponse> {
  const lib = u.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        method,
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || (u.protocol === "https:" ? 443 : 80),
        path: `${u.pathname}${u.search}`,
        servername: ipaddr.isValid(u.hostname) ? undefined : u.hostname,
        // Pin the connection to the address we already checked.
        // Newer Node asks with { all: true } and expects a list back.
        lookup: ((_h: string, o: { all?: boolean }, cb: (...args: unknown[]) => void) => {
          const family = ipaddr.parse(ip).kind() === "ipv6" ? 6 : 4;
          if (o?.all) cb(null, [{ address: ip, family }]);
          else cb(null, ip, family);
        }) as unknown as http.RequestOptions["lookup"],
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; JimvioTrustChecker/1.0; +https://www.jimvio.com/trust-checker)",
          Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.5",
          "Accept-Language": "en-US,en;q=0.8",
        },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        let truncated = false;
        res.on("data", (c: Buffer) => {
          if (truncated) return;
          size += c.length;
          if (size > MAX_BYTES) {
            truncated = true;
            chunks.push(c.subarray(0, Math.max(0, MAX_BYTES - (size - c.length))));
            res.destroy();
            return;
          }
          chunks.push(c);
        });
        const done = () =>
          resolve({
            url: u.toString(),
            status: res.statusCode ?? 0,
            headers: Object.fromEntries(
              Object.entries(res.headers).map(([k, v]) => [k.toLowerCase(), Array.isArray(v) ? v.join(", ") : String(v ?? "")]),
            ),
            body: Buffer.concat(chunks),
            truncated,
            ip,
          });
        res.on("end", done);
        res.on("close", done);
        res.on("error", (e) => (truncated ? done() : reject(e)));
      },
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

export type FetchChain = { hops: { url: string; status: number; ip: string }[]; final: SafeResponse | null; error: string | null };

/** GET with manual, validated redirects. Never throws for network errors. */
export async function safeFetch(start: URL, method: "GET" | "HEAD" = "GET"): Promise<FetchChain> {
  const hops: FetchChain["hops"] = [];
  let current = start;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    let ips: string[];
    try {
      ips = await resolvePublic(current.hostname);
    } catch (e) {
      return { hops, final: null, error: e instanceof Error ? e.message : "Could not resolve the domain." };
    }
    let res: SafeResponse | null = null;
    let lastError: unknown = null;
    // Try up to two checked addresses (e.g. IPv4 then IPv6).
    for (const ip of ips.slice(0, 2)) {
      try {
        res = await requestOnce(current, ip, method);
        break;
      } catch (e) {
        lastError = e;
      }
    }
    if (!res) {
      const msg = lastError instanceof Error && /timeout/i.test(lastError.message) ? "The site took too long to answer." : "The site could not be reached.";
      return { hops, final: null, error: msg };
    }
    hops.push({ url: current.toString(), status: res.status, ip: res.ip });
    const loc = res.headers.location;
    if (res.status >= 300 && res.status < 400 && loc) {
      try {
        current = normalizeUrl(new URL(loc, current).toString());
      } catch (e) {
        return { hops, final: res, error: e instanceof Error ? e.message : "Unsafe redirect." };
      }
      continue;
    }
    return { hops, final: res, error: null };
  }
  return { hops, final: null, error: `More than ${MAX_REDIRECTS} redirects.` };
}
