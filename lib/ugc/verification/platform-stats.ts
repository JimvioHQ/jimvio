/**
 * Official platform API reads for one post, using the creator's own
 * connected account. Never scrapes pages and never trusts numbers typed by
 * the creator.
 */

export type PostStats = {
  views: number;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  /** Channel or account id that owns the post, when the API returns it. */
  ownerId: string | null;
};

export type StatsResult =
  | { ok: true; stats: PostStats }
  | {
      ok: false;
      reason: "needs_permission" | "unavailable" | "auth" | "error";
      message: string;
    };

const TIMEOUT_MS = 12_000;

function count(value: unknown): number | null {
  const num = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(num) && num >= 0 ? Math.floor(num) : null;
}

export async function fetchYouTubeStats(accessToken: string, videoId: string): Promise<StatsResult> {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${encodeURIComponent(videoId)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    return { ok: false, reason: "error", message: "YouTube did not respond. Jimvio will try again." };
  }
  if (res.status === 401) return { ok: false, reason: "auth", message: "Your YouTube connection expired. Reconnect YouTube." };
  if (res.status === 403) {
    return { ok: false, reason: "needs_permission", message: "Reconnect YouTube and allow Jimvio to read your videos." };
  }
  if (!res.ok) return { ok: false, reason: "error", message: "YouTube could not be read right now. Jimvio will try again." };
  const json = (await res.json().catch(() => null)) as {
    items?: {
      snippet?: { channelId?: string };
      statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
    }[];
  } | null;
  const item = json?.items?.[0];
  const views = count(item?.statistics?.viewCount);
  if (!item || views == null) {
    return { ok: false, reason: "unavailable", message: "This video is private, removed or not public yet." };
  }
  return {
    ok: true,
    stats: {
      views,
      likes: count(item.statistics?.likeCount),
      comments: count(item.statistics?.commentCount),
      shares: null,
      ownerId: item.snippet?.channelId ?? null,
    },
  };
}

/**
 * TikTok returns only videos that belong to the authorized account, so a
 * returned video is proof of ownership. Needs the video.list scope.
 */
export async function fetchTikTokStats(accessToken: string, videoId: string): Promise<StatsResult> {
  const url = "https://open.tiktokapis.com/v2/video/query/?fields=id,view_count,like_count,comment_count,share_count";
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ filters: { video_ids: [videoId] } }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    return { ok: false, reason: "error", message: "TikTok did not respond. Jimvio will try again." };
  }
  const json = (await res.json().catch(() => null)) as {
    data?: { videos?: { id?: string; view_count?: number; like_count?: number; comment_count?: number; share_count?: number }[] };
    error?: { code?: string };
  } | null;
  const code = json?.error?.code;
  if (code === "scope_not_authorized" || code === "scope_permission_missed") {
    return { ok: false, reason: "needs_permission", message: "Reconnect TikTok and allow Jimvio to read your videos." };
  }
  if (res.status === 401 || code === "access_token_invalid") {
    return { ok: false, reason: "auth", message: "Your TikTok connection expired. Reconnect TikTok." };
  }
  if (!res.ok || (code && code !== "ok")) {
    return { ok: false, reason: "error", message: "TikTok could not be read right now. Jimvio will try again." };
  }
  const video = json?.data?.videos?.find((v) => String(v.id) === videoId);
  const views = count(video?.view_count);
  if (!video || views == null) {
    return {
      ok: false,
      reason: "unavailable",
      message: "This video was not found on your connected TikTok account.",
    };
  }
  return {
    ok: true,
    stats: {
      views,
      likes: count(video.like_count),
      comments: count(video.comment_count),
      shares: count(video.share_count),
      ownerId: null,
    },
  };
}
