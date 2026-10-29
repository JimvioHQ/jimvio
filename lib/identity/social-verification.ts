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

/** Server-side read of the public profile page. */
export async function checkCodeOnPage(pageUrl: string, code: string): Promise<CodeCheck> {
  try {
    const res = await fetch(pageUrl, {
      headers: {
        "User-Agent": "JimvioVerifier/1.0 (+https://www.jimvio.com/legal/ugc-clipping)",
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!res.ok) return "unreachable";
    const text = (await res.text()).slice(0, 3_000_000);
    return pageContainsCode(text, code) ? "found" : "not_found";
  } catch {
    return "unreachable";
  }
}
