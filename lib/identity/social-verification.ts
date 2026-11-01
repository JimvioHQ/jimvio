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
  const host = hostname.toLowerCase().replace(/\\.$/, "");
  return (PROFILE_HOSTS[platform] ?? []).some((domain) => host === domain || host.endsWith(`.\u0024{domain}`));
}

/** The public page Jimvio reads for a bio code. */
export function publicProfileUrl(platform: string, handle: string | null, url: string | null): string | null {
  const raw = (url ?? "").trim();
  if (raw) {
    try {
      const u = new URL(/^https?:\\/\\//i.test(raw) ? raw : `https://\u0024{raw}`);
      if ((u.protocol === "https:" || u.protocol === "http:") && isPlatformHost(platform, u.hostname)) {
        return u.toString();
      }
    } catch {
      /* fall through to the validated handle */
    }
  }
  const h = cleanHandle(handle);
  if (!h) return null;
  switch (platform) {
    case "instagram":
      return `https://www.instagram.com/\u0024{h}/`;
    case "tiktok":
      return `https://www.tiktok.com/@\u0024{h}`;
    case "youtube":
      return `https://www.youtube.com/@\u0024{h}`;
    case "x":
      return `https://x.com/\u0024{h}`;
    case "threads":
      return `https://www.threads.net/@\u0024{h}`;
    case "facebook":
      return `https://www.facebook.com/\u0024{h}`;
    case "pinterest":
      return `https://www.pinterest.com/\u0024{h}/`;
    case "snapchat":
      return `https://www.snapchat.com/add/\u0024{h}`;
    case "linkedin":
      return `https://www.linkedin.com/in/\u0024{h}/`;
    default:
      return null;
  }
}

/** Finds a complete code in bio text, including JSON-escaped and spaced variants. */
export function pageContainsCode(html: string, code: string): boolean {
  if (!html || !code) return false;
  const parts = code.toUpperCase().split("-").filter(Boolean);
  if (parts.length !== 2) return false;
  const normalized = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\\\\u002[dD]/g, "-")
    .replace(/&#(?:45|x2d);|&ndash;|&mdash;/gi, "-")
    .replace(/[\\u2010-\\u2015\\u2212]/g, "-")
    .replace(/[\\u200B-\\u200D\\uFEFF]/g, "")
    .toUpperCase();
  const escape = (value: string) => value.replace(/[.*+?^${ }()|[\\]\\\\]/g, "\\$&");
  const pattern = parts.map(escape).join("[\\s\\p{P}]*");
  return new RegExp(`(^|[^\\p{L}\\p{N}])\u0024{pattern}(?![\\p{L}\\p{N}])`, "u").test(normalized);
}

export type CodeCheck = "found" | "not_found" | "unreachable";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/** Handle from a stored handle or from the path of a profile link. */
export function handleFor(platform: string, handle: string | null, url: string | null): string | null {
  const direct = cleanHandle(handle);
  if (direct && !/^https?:/i.test(direct) && !direct.includes("/")) return direct;
  const raw = (url ?? handle ?? "").trim();
  if (!raw) return null;
  try {
    const u = new URL(/^https?:\\/\\//i.test(raw) ? raw : `https://\u0024{raw}`);
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

function readProfileBio(platform: string, body: string): string | null {
  const readPath = (value: unknown, path: string[]): unknown => {
    let current: unknown = value;
    for (const key of path) {
      if (!current || typeof current !== "object") return null;
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  };
  const paths: Record<string, string[][]> = {
    instagram: [["data", "user", "biography"], ["graphql", "user", "biography"], ["user", "biography"]],
    threads: [["data", "user", "biography"], ["graphql", "user", "biography"], ["user", "biography"]],
    x: [["user", "description"], ["user", "bio"], ["description"], ["bio"]],
  };
  const fields = platform === "x" ? ["description", "bio"] : ["biography"];
  try {
    const parsed: unknown = JSON.parse(body);
    for (const path of paths[platform] ?? []) {
      const value = readPath(parsed, path);
      if (typeof value === "string") return value;
    }
  } catch {
    /* Public profile HTML often embeds the profile object as JSON. */
  }
  for (const field of fields) {
    const expression = new RegExp(`"${field}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, "i");
    const match = body.match(expression);
    if (match?.[1] !== undefined) {
      try {
        return JSON.parse(`"${match[1]}"`) as string;
      } catch {
        return match[1].replace(/\\\\n/g, "\\n").replace(/\\\\"/g, '"');
      }
    }
  }
  return null;
}

async function readSource(source: Source): Promise<string | null> {
  try {
    const res = await fetch(source.url, {
      headers: {
        "User-Agent": BROWSER_UA,
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        ...(source.headers ?? {}),
      },
      redirect: "follow",
      signal: AbortSignal.timeout(6_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const text = (await res.text()).slice(0, 3_000_000);
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

/**
 * Verify only structured profile-bio fields. Searching an entire page could
 * incorrectly accept a code from a post caption, comment, or unrelated page text.
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
  let readableBio = false;
  for (const page of pages) {
    if (page == null) continue;
    const bio = readProfileBio(platform, page);
    if (bio == null) continue;
    readableBio = true;
    if (pageContainsCode(bio, code)) return "found";
  }
  return readableBio ? "not_found" : "unreachable";
}

/** Server-side read of one public page (kept for callers that have a URL only)./** Server-side read of one public page (kept for callers that have a URL only). */
export async function checkCodeOnPage(pageUrl: string, code: string): Promise<CodeCheck> {
  const page = await readSource({ url: pageUrl });
  if (page == null) return "unreachable";
  return pageContainsCode(page, code) ? "found" : "not_found";
}
