import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import net from "net";
import dns from "dns";

export const dynamic = "force-dynamic";

const FETCH_TIMEOUT_MS = 5000;
const MAX_BODY_BYTES = 512 * 1024; // 512kb is plenty for <head>
const MAX_REDIRECTS = 3;

type LinkPreview = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
};

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT shared space
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80:")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local fc00::/7
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.split(":").pop() ?? "";
    if (v4.includes(".")) return isPrivateIPv4(v4);
  }
  return false;
}

/** Fails closed: anything that isn't a clearly-public IPv4/IPv6 address is blocked. */
function isPrivateIP(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true;
}

async function resolveIsPublicHost(hostname: string): Promise<boolean> {
  if (net.isIP(hostname)) return !isPrivateIP(hostname);
  if (hostname.toLowerCase() === "localhost") return false;
  try {
    const records = await dns.promises.lookup(hostname, { all: true, verbatim: true });
    if (records.length === 0) return false;
    return records.every((r) => !isPrivateIP(r.address));
  } catch {
    return false;
  }
}

function isAllowedPort(url: URL): boolean {
  if (!url.port) return true;
  return url.port === "80" || url.port === "443";
}

function extractMeta(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`, "i"),
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) return m[1];
    }
  }
  return null;
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m?.[1]?.trim() || null;
}

async function safeFetchLinkPreview(rawUrl: string): Promise<LinkPreview | null> {
  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return null;
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") return null;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isAllowedPort(target)) return null;
    const isPublic = await resolveIsPublicHost(target.hostname);
    if (!isPublic) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(target.toString(), {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent": "JimvioLinkPreviewBot/1.0 (+https://jimvio.com)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return null;
      try {
        target = new URL(location, target);
      } catch {
        return null;
      }
      if (target.protocol !== "http:" && target.protocol !== "https:") return null;
      continue;
    }

    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return null;

    const reader = res.body?.getReader();
    if (!reader) return null;
    let received = 0;
    let html = "";
    const decoder = new TextDecoder();
    try {
      while (received < MAX_BODY_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        html += decoder.decode(value, { stream: true });
      }
    } finally {
      try {
        await reader.cancel();
      } catch {
        // ignore
      }
    }

    return {
      url: target.toString(),
      title: extractMeta(html, ["og:title", "twitter:title"]) ?? extractTitle(html),
      description: extractMeta(html, ["og:description", "twitter:description", "description"]),
      image: extractMeta(html, ["og:image", "twitter:image"]),
      siteName: extractMeta(html, ["og:site_name"]),
    };
  }

  return null;
}

/** GET — SSRF-safe Open Graph preview fetch. Query: ?url= */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get("url")?.trim() ?? "";
  if (!rawUrl) return NextResponse.json({ error: "url is required" }, { status: 400 });
  if (rawUrl.length > 2000) return NextResponse.json({ error: "url too long" }, { status: 400 });

  try {
    const preview = await safeFetchLinkPreview(rawUrl);
    return NextResponse.json({ preview });
  } catch {
    return NextResponse.json({ preview: null });
  }
}
