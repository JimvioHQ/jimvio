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

const PROFILE_HOSTS: Record<string, string[]> = {
  instagram: ["instagram.com"],
  tiktok: ["tiktok.com"],
  youtube: ["youtube.com", "youtu.be"],
  x: ["x.com", "twitter.com"],
  threads: ["threads.net"],
  facebook: ["facebook.com", "fb.com"],
  pinterest: ["pinterest.com"],
  snapchat: ["snapchat.com"],
  linkedin: ["linkedin.com"],
};

/** A submitted profile URL must belong to the platform being verified. */
function isPlatformHost(platform: string, hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return (PROFILE_HOSTS[platform] ?? []).some((domain) => host === domain || host.endsWith("." + domain));
}

/** The public page Jimvio reads for a bio code. */
export function publicProfileUrl(platform: string, handle: string | null, url: string | null): string | null {
  const raw = (url ?? "").trim();
  if (raw) {
    try {
      const u = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw);
      if ((u.protocol === "https:" || u.protocol === "http:") && isPlatformHost(platform, u.hostname)) {
        const storedHandle = cleanHandle(handle);
        const parts = u.pathname.split("/").filter(Boolean);
        let pathHandle = parts[0] ?? null;
        if (platform === "snapchat" && parts[0] === "add") pathHandle = parts[1] ?? null;
        if (platform === "linkedin" && parts[0] === "in") pathHandle = parts[1] ?? null;
        if (platform === "tiktok" || platform === "threads" || platform === "youtube") {
          pathHandle = pathHandle?.replace(/^@/, "") ?? null;
        }
        if (platform === "facebook" && pathHandle === "profile.php") pathHandle = "";
        const comparableHandle = storedHandle && !/^https?:/i.test(storedHandle) && !storedHandle.includes("/");
        if (!comparableHandle || !pathHandle || storedHandle.toLowerCase() === decodeURIComponent(pathHandle).toLowerCase()) {
          return u.toString();
        }
        // A URL for a different account must not be used as verification evidence.
        // Fall through and build the profile URL from the account's stored handle.
      }
    } catch {
      /* fall through to the validated handle */
    }
  }
  const h = cleanHandle(handle);
  if (!h) return null;
  switch (platform) {
    case "instagram": return "https://www.instagram.com/" + h + "/";
    case "tiktok": return "https://www.tiktok.com/@" + h;
    case "youtube": return "https://www.youtube.com/@" + h;
    case "x": return "https://x.com/" + h;
    case "threads": return "https://www.threads.net/@" + h;
    case "facebook": return "https://www.facebook.com/" + h;
    case "pinterest": return "https://www.pinterest.com/" + h + "/";
    case "snapchat": return "https://www.snapchat.com/add/" + h;
    case "linkedin": return "https://www.linkedin.com/in/" + h + "/";
    default: return null;
  }
}

/** Finds a complete code in bio text, including JSON-escaped and spaced variants. */
export function pageContainsCode(html: string, code: string): boolean {
  if (!html || !code) return false;
  const parts = code.toUpperCase().split("-").filter(Boolean);
  if (parts.length !== 2 || !parts.every((part) => /^[A-Z0-9]+$/.test(part))) return false;
  const normalized = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\\u002[dD]/g, "-")
    .replace(/&#(?:45|x2d);|&ndash;|&mdash;/gi, "-")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .toUpperCase();
  const pattern = parts.join("[\\s\\p{P}]*");
  return new RegExp("(^|[^\\p{L}\\p{N}])" + pattern + "(?![-_.‐‑‒–—―][A-Z0-9])(?![\\p{L}\\p{N}])", "u").test(normalized);
}

export type CodeCheck = "found" | "not_found" | "unreachable";

/** Handle from a stored handle or from the path of a profile link. */
export function handleFor(platform: string, handle: string | null, url: string | null): string | null {
  const direct = cleanHandle(handle);
  if (direct && !/^https?:/i.test(direct) && !direct.includes("/")) return direct;
  const raw = (url ?? handle ?? "").trim();
  if (!raw) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw);
    if (!isPlatformHost(platform, u.hostname)) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    const first = (platform === "snapchat" && parts[0] === "add") || (platform === "linkedin" && parts[0] === "in") ? parts[1] : parts[0];
    return first ? cleanHandle(decodeURIComponent(first)) : null;
  } catch {
    return null;
  }
}

type Source = { url: string; headers?: Record<string, string> };

/**
 * Only official, authenticated APIs are used for automatic bio verification.
 * Unsupported platforms stay pending and can be sent for manual review.
 */
function isValidApiHandle(platform: string, handle: string): boolean {
  if (platform === "instagram") return /^[A-Za-z0-9._]{1,30}$/.test(handle);
  if (platform === "x") return /^[A-Za-z0-9_]{1,15}$/.test(handle);
  if (platform === "youtube") return /^[A-Za-z0-9._-]{3,30}$/.test(handle);
  return false;
}

export function bioSources(platform: string, handle: string | null, url: string | null): Source[] {
  const h = handleFor(platform, handle, url);
  if (!h || !isValidApiHandle(platform, h)) return [];
  switch (platform) {
    case "instagram": {
      const token = process.env.INSTAGRAM_ACCESS_TOKEN;
      const businessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
      if (!token || !businessAccountId) return [];
      const fields = "business_discovery.username(" + h + "){username,biography}";
      return [{
        url: "https://graph.facebook.com/v26.0/" + encodeURIComponent(businessAccountId) + "?fields=" + encodeURIComponent(fields),
        headers: { Authorization: "Bearer " + token, Accept: "application/json" },
      }];
    }
    case "x": {
      const token = process.env.X_BEARER_TOKEN;
      if (!token) return [];
      return [{
        url: "https://api.x.com/2/users/by/username/" + encodeURIComponent(h) + "?user.fields=username,description",
        headers: { Authorization: "Bearer " + token, Accept: "application/json" },
      }];
    }
    case "youtube": {
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) return [];
      return [{
        url: "https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=" + encodeURIComponent(h),
        headers: { "X-Goog-Api-Key": apiKey, Accept: "application/json" },
      }];
    }
    default:
      return [];
  }
}

/** Extract a bio only from the official API response for the requested account. */
export function readProfileBio(platform: string, body: string, expectedHandle?: string | null): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }

  const readPath = (value: unknown, path: string[]): unknown => {
    let current: unknown = value;
    for (const key of path) {
      if (!current || typeof current !== "object") return null;
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  };

  const identityPath: Record<string, string[]> = {
    instagram: ["business_discovery", "username"],
    x: ["data", "username"],
    youtube: ["items", "0", "snippet", "customUrl"],
  };
  const bioPath: Record<string, string[]> = {
    instagram: ["business_discovery", "biography"],
    x: ["data", "description"],
    youtube: ["items", "0", "snippet", "description"],
  };
  const identity = readPath(parsed, identityPath[platform] ?? []);
  const biography = readPath(parsed, bioPath[platform] ?? []);
  if (typeof identity !== "string" || typeof biography !== "string") return null;

  if (expectedHandle) {
    const expected = expectedHandle.trim().replace(/^@/, "").toLowerCase();
    const actual = identity.trim().replace(/^@/, "").toLowerCase();
    if (!expected || actual !== expected) return null;
  }
  return biography;
}
