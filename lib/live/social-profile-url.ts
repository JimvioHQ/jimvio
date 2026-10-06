import type { SocialPlatform } from "@/lib/identity/types";

/** Build a public profile URL from platform + handle/url. Never invents private data. */
export function publicSocialProfileUrl(input: {
  platform: string;
  handle?: string | null;
  url?: string | null;
}): string | null {
  const explicit = input.url?.trim();
  if (explicit && /^https?:\/\//i.test(explicit)) return explicit;

  const handle = (input.handle ?? "").trim().replace(/^@/, "");
  if (!handle) return explicit || null;

  const platform = input.platform.toLowerCase() as SocialPlatform | string;
  switch (platform) {
    case "tiktok":
      return `https://www.tiktok.com/@${encodeURIComponent(handle)}`;
    case "instagram":
      return `https://www.instagram.com/${encodeURIComponent(handle)}/`;
    case "youtube":
      return handle.startsWith("UC") || handle.startsWith("channel/")
        ? `https://www.youtube.com/channel/${encodeURIComponent(handle.replace(/^channel\//, ""))}`
        : `https://www.youtube.com/@${encodeURIComponent(handle)}`;
    case "facebook":
      return `https://www.facebook.com/${encodeURIComponent(handle)}`;
    case "x":
      return `https://x.com/${encodeURIComponent(handle)}`;
    case "threads":
      return `https://www.threads.net/@${encodeURIComponent(handle)}`;
    case "linkedin":
      return `https://www.linkedin.com/in/${encodeURIComponent(handle)}`;
    case "pinterest":
      return `https://www.pinterest.com/${encodeURIComponent(handle)}/`;
    case "snapchat":
      return `https://www.snapchat.com/add/${encodeURIComponent(handle)}`;
    case "website":
      return explicit || (handle.includes(".") ? `https://${handle}` : null);
    default:
      return explicit || null;
  }
}
