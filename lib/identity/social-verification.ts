import { safeFetch, normalizeUrl } from "@/lib/trust/safe-fetch";

/**
 * Proving a social account belongs to the person who added it.
 *
 * 1. Official login (OAuth) — YouTube and TikTok. The platform itself says
 *    who owns the account. Strongest.
 * 2. Bio code — Jimvio gives a one-time code; the person puts it in the
 *    account's bio (or website), Jimvio reads the public page. If the
 *    platform blocks automatic reading, the request goes to a Jimvio
 *    reviewer who checks the same code by hand.
 */

export const OAUTH_PLATFORMS = new Set(["youtube", "tiktok"]);

export const CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newVerifyCode(random: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return `JIMVIO-${out}`;
}

function cleanHandle(handle: string | null | undefined): string {
  return (handle ?? "").trim().replace(/^@+/, "").replace(/\s+/g, "");
}

/** The public page Jimvio reads for a bio code. */
export function publicProfileUrl(platform: string, handle: string | null, url: string | null): string | null {
  const raw = (url ?? "").trim();
  if (raw) {
    try {
      const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      if (u.protocol === "https:" || u.protocol === "http:") return u.toString();
    } catch {
      /* fall through to handle */
    }
  }
  const h = cleanHandle(handle);
  if (!h) return null;
  switch (platform) {
    case "instagram":
      return `https://www.instagram.com/${h}/`;
    case "tiktok":
      return `https://www.tiktok.com/@${h}`;
    case "youtube":
      return `https://www.youtube.com/@${h}`;
    case "x":
      return `https://x.com/${h}`;
    case "threads":
      return `https://www.threads.net/@${h}`;
    case "facebook":
      return `https://www.facebook.com/${h}`;
    case "pinterest":
      return `https://www.pinterest.com/${h}/`;
    case "snapchat":
      return `https://www.snapchat.com/add/${h}`;
    case "linkedin":
      return `https://www.linkedin.com/in/${h}/`;
    default:
      return null;
  }
}

/** Finds the code in page HTML, including JSON-escaped and spaced variants. */
export function pageContainsCode(html: string, code: string): boolean {
  if (!html || !code) return false;
  const normalized = html
    .replace(/\\u002[dD]/g, "-")
    .replace(/&#45;|&#x2d;|&ndash;/gi, "-")
    .toUpperCase();
  const target = code.toUpperCase();
  if (normalized.includes(target)) return true;
  const compact = normalized.replace(/[\s_.-]/g, "");
  return compact.includes(target.replace(/[\s_.-]/g, ""));
}

export type CodeCheck = "found" | "not_found" | "unreachable";

/** Handle from a stored handle or from the path of a profile link. */
export function handleFor(platform: string, handle: string | null, url: string | null): string | null {
  const direct = cleanHandle(handle);
  if (direct && !/^https?:/i.test(direct) && !direct.includes("/")) return direct;
  const raw = (url ?? handle ?? "").trim();
  if (!raw) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const parts = u.pathname.split("/").filter(Boolean);
    const first = (platform === "snapchat" && parts[0] === "add") || (platform === "linkedin" && parts[0] === "in") ? parts[1] : parts[0];
    return first ? cleanHandle(decodeURIComponent(first)) : null;
  } catch {
    return null;
  }
}

type Source = { url: string; headers?: Record<string, string> };

/**
 * Where each platform shows a person's bio publicly, most reliable first.
 * Several sources are tried so one blocked page doesn't stop verification.
 */
export function bioSources(platform: string, handle: string | null, url: string | null): Source[] {
  const h = handleFor(platform, handle, url);
  const page = publicProfileUrl(platform, handle, url);
  const html = (u: string): Source => ({ url: u });
  const out: Source[] = [];
  switch (platform) {
    case "instagram":
      if (h) {
        out.push({
          url: `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(h)}`,
          headers: { "x-ig-app-id": "936619743392459", Accept: "application/json" },
        });
        out.push({
          url: `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(h)}`,
          headers: { "x-ig-app-id": "936619743392459", Accept: "application/json" },
        });
      }
      break;
    case "x":
      if (h) {
        out.push({ url: `https://api.fxtwitter.com/${encodeURIComponent(h)}`, headers: { Accept: "application/json" } });
        out.push(html(`https://syndication.twitter.com/srv/timeline-profile/screen-name/${encodeURIComponent(h)}`));
      }
      break;
    case "youtube":
      if (h) out.push(html(`https://www.youtube.com/@${encodeURIComponent(h)}/about`));
      break;
    case "threads":
      if (h) out.push(html(`https://www.threads.net/@${encodeURIComponent(h)}`));
      break;
    default:
      break;
  }
  if (page && !out.some((s) => s.url === page)) out.push(html(page));
  return out;
}

async function readSource(source: Source): Promise<string | null> {
  try {
    // Resolve and validate every hop, pin checked public IPs, and cap bytes.
    const chain = await safeFetch(normalizeUrl(source.url), "GET", source.headers);
    const response = chain.final;
    if (!response || chain.error || response.status < 200 || response.status >= 300) return null;
    const text = response.body.toString("utf8").slice(0, 1_500_000);
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

/**
 * Reads every public source for the account at once. "found" as soon as any
 * source shows the code; "not_found" when pages were read but the code isn't
 * there; "unreachable" only when no source could be read at all.
 */
export async function checkCodeForAccount(
  platform: string,
  handle: string | null,
  url: string | null,
  code: string,
): Promise<CodeCheck> {
  const sources = bioSources(platform, handle, url);
  if (sources.length === 0) return "unreachable";
  const pages = await Promise.all(sources.map(readSource));
  if (pages.some((p) => p != null && pageContainsCode(p, code))) return "found";
  return pages.some((p) => p != null) ? "not_found" : "unreachable";
}

/** Server-side read of one public page (kept for callers that have a URL only). */
export async function checkCodeOnPage(pageUrl: string, code: string): Promise<CodeCheck> {
  const page = await readSource({ url: pageUrl });
  if (page == null) return "unreachable";
  return pageContainsCode(page, code) ? "found" : "not_found";
}
