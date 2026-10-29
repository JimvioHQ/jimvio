/**
 * Reads the platform video id from a submitted post URL.
 * The id is what the platform API is asked about, so a wrong or missing id
 * means the post cannot be verified. Short links that hide the id
 * (vm.tiktok.com) return null and the creator is asked for the full link.
 */

export type VerifiablePlatform = "youtube" | "tiktok" | "instagram";

export type VideoRef = { platform: VerifiablePlatform; videoId: string };

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const TT_ID = /^\d{8,25}$/;
const IG_CODE = /^[A-Za-z0-9_-]{5,40}$/;

function parseUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
}

function host(url: URL): string {
  return url.hostname.toLowerCase().replace(/^(www\.|m\.|mobile\.)/, "");
}

function segments(url: URL): string[] {
  return url.pathname.split("/").filter(Boolean);
}

export function youtubeVideoId(raw: string): string | null {
  const url = parseUrl(raw);
  if (!url) return null;
  const h = host(url);
  const parts = segments(url);
  let id: string | null = null;
  if (h === "youtu.be") {
    id = parts[0] ?? null;
  } else if (h === "youtube.com" || h === "music.youtube.com") {
    if (parts[0] === "watch") id = url.searchParams.get("v");
    else if (["shorts", "live", "embed", "v"].includes(parts[0] ?? "")) id = parts[1] ?? null;
  }
  return id && YT_ID.test(id) ? id : null;
}

export function tiktokVideoId(raw: string): string | null {
  const url = parseUrl(raw);
  if (!url) return null;
  if (host(url) !== "tiktok.com") return null;
  const parts = segments(url);
  const at = parts.findIndex((p) => p === "video" || p === "photo" || p === "v");
  const candidate = at >= 0 ? parts[at + 1]?.replace(/\.html$/, "") : null;
  return candidate && TT_ID.test(candidate) ? candidate : null;
}

export function instagramShortcode(raw: string): string | null {
  const url = parseUrl(raw);
  if (!url) return null;
  if (host(url) !== "instagram.com") return null;
  const parts = segments(url);
  const at = parts.findIndex((p) => p === "p" || p === "reel" || p === "reels" || p === "tv");
  const candidate = at >= 0 ? parts[at + 1] : null;
  return candidate && IG_CODE.test(candidate) ? candidate : null;
}

export function videoRefFromUrl(platform: string, raw: string): VideoRef | null {
  if (platform === "youtube") {
    const id = youtubeVideoId(raw);
    return id ? { platform, videoId: id } : null;
  }
  if (platform === "tiktok") {
    const id = tiktokVideoId(raw);
    return id ? { platform, videoId: id } : null;
  }
  if (platform === "instagram") {
    const id = instagramShortcode(raw);
    return id ? { platform, videoId: id } : null;
  }
  return null;
}
