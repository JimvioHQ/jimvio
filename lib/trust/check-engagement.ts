import "server-only";
import { getDomain } from "tldts";
import type { CheckerResult, EngagementDetails, Finding, SocialPlatform } from "./types";
import { takeQuota } from "./threat-intel";
import { assessPost } from "@/lib/ugc/checker/post-signals";
import { youtubeVideoId } from "@/lib/ugc/verification/video-ref";
import { youtubeKeyEnvs, youtubeOembed, youtubePublic } from "@/lib/youtube/public-data";
import { estimateViews, ytDate } from "./engagement-estimate";

/**
 * Checker 2: engagement on public posts and channels.
 * YouTube: official Data API (free 10,000 units/day; capped at 9,000).
 * TikTok and X: official oEmbed (who posted it; no counts are public there).
 * Instagram/Facebook: need a Meta app review — shown as unavailable.
 * Website traffic: only the site owner's analytics can show it.
 */

export const YOUTUBE_DAILY_UNITS = 9000;

type Platform = SocialPlatform | null;

export function socialPlatform(u: URL): Platform {
  const reg = getDomain(u.hostname) ?? "";
  if (reg === "youtube.com" || reg === "youtu.be") return "youtube";
  if (reg === "tiktok.com") return "tiktok";
  if (reg === "instagram.com") return "instagram";
  if (reg === "facebook.com" || reg === "fb.watch") return "facebook";
  if (reg === "x.com" || reg === "twitter.com") return "x";
  if (reg === "threads.net" || reg === "threads.com") return "threads";
  return null;
}

// Repeat scans of the same video within a few minutes reuse YouTube's answer (saves quota, same public numbers).
const ytCache = new Map<string, { at: number; json: Record<string, unknown> }>();
const YT_TTL_MS = 10 * 60_000;

async function yt(userId: string | null, path: string): Promise<Record<string, unknown> | null> {
  const key = `${userId ?? "anon"}:${path}`;
  const hit = ytCache.get(key);
  if (hit && Date.now() - hit.at < YT_TTL_MS) return hit.json;
  if (!(await takeQuota("youtube_data_api", YOUTUBE_DAILY_UNITS))) return null;
  const r = await youtubePublic(path, userId);
  if (r.ok && r.json) {
    if (ytCache.size > 500) ytCache.delete(ytCache.keys().next().value as string);
    ytCache.set(key, { at: Date.now(), json: r.json });
  }
  return r.ok ? r.json : null;
}

/** Meta's official oEmbed (needs an app token with oEmbed Read). Author/thumbnail only — Meta never returns counts here. */
async function metaOembed(kind: "instagram" | "facebook", url: string): Promise<{ author: string | null; thumb: string | null; title: string | null } | null> {
  const id = process.env.META_APP_ID;
  const secret = process.env.META_APP_SECRET;
  if (!id || !secret) return null;
  const edge = kind === "instagram" ? "instagram_oembed" : /\/videos?\/|\/watch|\/reel\//.test(url) ? "oembed_video" : "oembed_post";
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${edge}?url=${encodeURIComponent(url)}&omitscript=true&access_token=${encodeURIComponent(`${id}|${secret}`)}`, { signal: AbortSignal.timeout(8_000), cache: "no-store" });
    if (!res.ok) return null;
    const j = (await res.json()) as { author_name?: string; thumbnail_url?: string; title?: string };
    return { author: str(j.author_name), thumb: str(j.thumbnail_url) && /^https:\/\//.test(String(j.thumbnail_url)) ? String(j.thumbnail_url) : null, title: str(j.title) };
  } catch {
    return null;
  }
}

const n = (v: unknown) => (v == null || v === "" ? null : Number(v));
const fmt = (v: number | null) => (v == null ? "—" : v.toLocaleString("en-US"));

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** ISO 8601 duration (PT1H2M3S) to seconds. */
export function isoDurationSeconds(d: string): number | null {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(d);
  if (!m || d === "P" || d === "PT") return null;
  return Number(m[1] ?? 0) * 86400 + Number(m[2] ?? 0) * 3600 + Number(m[3] ?? 0) * 60 + Number(m[4] ?? 0);
}

/** What kind of item a social link points at, from its path alone. */
export function socialContentType(platform: SocialPlatform, u: URL): EngagementDetails["contentType"] {
  const p = u.pathname.toLowerCase();
  if (platform === "youtube") {
    if (p.startsWith("/shorts/")) return "short";
    if (/^\/(@|channel\/|c\/|user\/)/.test(p)) return "channel";
    return "video";
  }
  if (platform === "instagram") return /\/(reel|reels)\//.test(p) ? "reel" : "post";
  if (platform === "tiktok") return /\/video\//.test(p) ? "video" : /^\/@[^/]+\/?$/.test(p) ? "channel" : "post";
  return "post";
}

/** @handle written in the link itself (tiktok.com/@name/…, instagram.com/name/reel/…). */
export function handleFromUrl(platform: SocialPlatform, u: URL): string | null {
  const parts = u.pathname.split("/").filter(Boolean);
  if (platform === "tiktok" || platform === "youtube") {
    const at = parts.find((x) => x.startsWith("@"));
    return at ? decodeURIComponent(at) : null;
  }
  if (platform === "instagram" && parts.length >= 2 && !["p", "reel", "reels", "tv", "stories", "explore"].includes(parts[0].toLowerCase())) {
    return `@${decodeURIComponent(parts[0])}`;
  }
  if (platform === "x" && parts.length >= 1 && !["i", "home", "search"].includes(parts[0].toLowerCase())) return `@${decodeURIComponent(parts[0])}`;
  return null;
}

function blankDetails(platform: SocialPlatform, url: URL): EngagementDetails {
  return {
    kind: "engagement",
    platform,
    contentType: socialContentType(platform, url),
    url: url.toString(),
    found: false,
    title: null,
    caption: null,
    authorName: null,
    authorHandle: handleFromUrl(platform, url),
    authorUrl: null,
    thumbnailUrl: null,
    publishedAt: null,
    durationSec: null,
    views: null,
    likes: null,
    comments: null,
    engagementRate: null,
    account: { createdAt: null, followers: null, followersHidden: false, totalViews: null, totalLikes: null, posts: null, country: null, verified: null, visibility: null },
    visibility: null,
    verdict: null,
    commentsRead: 0,
    accessNote: null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bestThumb(thumbs: any): string | null {
  if (!thumbs || typeof thumbs !== "object") return null;
  for (const k of ["maxres", "standard", "high", "medium", "default"]) {
    const u = str(thumbs[k]?.url);
    if (u && /^https:\/\//.test(u)) return u;
  }
  return null;
}

/** Repetitive or empty comments are a common sign of comment bots. */
export function commentSignals(comments: string[]): Finding[] {
  const f: Finding[] = [];
  if (comments.length < 10) return f;
  const norm = comments.map((c) => c.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim());
  const counts = new Map<string, number>();
  for (const c of norm) if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
  const repeated = [...counts.values()].filter((v) => v > 1).reduce((a, b) => a + b, 0);
  const empty = norm.filter((c) => c.length < 3).length;
  const repeatShare = repeated / comments.length;
  const emptyShare = empty / comments.length;
  if (repeatShare >= 0.3) {
    f.push({ tone: "warn", title: `${Math.round(repeatShare * 100)}% of recent comments repeat each other`, detail: "Copy-paste comments are typical of comment bots.", source: "YouTube Data API" });
  } else {
    f.push({ tone: "good", title: "Recent comments look varied", detail: `${comments.length} recent comments read.`, source: "YouTube Data API" });
  }
  if (emptyShare >= 0.5) f.push({ tone: "warn", title: "Most comments are emoji-only or one word", source: "YouTube Data API" });
  return f;
}

export async function checkEngagement(url: URL | null, userId: string | null = null): Promise<CheckerResult> {
  const base: CheckerResult = { id: "engagement", status: "not_applicable", summary: "", findings: [], metrics: [], sources: [], limits: [], nextSteps: [] };
  if (!url) return { ...base, summary: "Paste a post, channel or website link to check engagement." };
  const platform = socialPlatform(url);

  if (!platform) {
    return {
      ...base,
      status: "unavailable",
      summary: "Website traffic is private to the site owner.",
      limits: ["Visitors, sessions and referrals can only be checked with the owner's connected analytics (for example Google Analytics). No public source shows them reliably."],
      nextSteps: ["Ask the seller for an analytics screenshot from their dashboard, or a read-only analytics invite."],
    };
  }

  if (platform === "youtube") {
    const videoId = youtubeVideoId(url.toString());
    const d = blankDetails("youtube", url);
    const noAccess = (): CheckerResult => ({
      ...base,
      details: { ...d, accessNote: "YouTube's statistics could not be read for this scan." },
      status: "unavailable",
      summary: "Jimvio couldn't read YouTube's numbers for this link right now.",
      limits: [
        youtubeKeyEnvs().length === 0 && !userId
          ? "YouTube numbers need a free YouTube Data API key on Jimvio, or sign in with your YouTube connected."
          : "YouTube refused the request. The API key may not have YouTube Data API v3 enabled.",
      ],
    });
    if (videoId) {
      const data = await yt(userId, `videos?part=statistics,snippet,contentDetails,status&id=${encodeURIComponent(videoId)}`);
      const item = (data?.items as Record<string, any>[] | undefined)?.[0]; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!item) {
        const oe = await youtubeOembed(`https://www.youtube.com/watch?v=${videoId}`);
        if (!data) {
          const r = noAccess();
          return oe
            ? { ...r, details: { ...d, found: true, title: oe.title, authorName: oe.author, thumbnailUrl: /^[A-Za-z0-9_-]{6,20}$/.test(videoId) ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null, accessNote: "YouTube confirmed the video, but its statistics could not be read for this scan." }, findings: [{ tone: "info", title: `Public video by ${oe.author ?? "a YouTube channel"}`, detail: oe.title ?? undefined, source: "YouTube oEmbed" }], metrics: [{ label: "Video", value: (oe.title ?? "").slice(0, 80) }, { label: "Channel", value: oe.author ?? "—" }], sources: ["YouTube oEmbed (official)"] }
            : r;
        }
        return { ...base, status: "inconclusive", summary: "This video is private or was removed.", sources: ["YouTube Data API"], details: { ...d, accessNote: "YouTube did not return this video. It may be private or removed." } };
      }
      const st = item.statistics ?? {};
      const post = { views: n(st.viewCount), likes: n(st.likeCount), comments: n(st.commentCount), publishedAt: ytDate(item.snippet?.publishedAt) };
      const channelId = String(item.snippet?.channelId ?? "");
      const channelData = channelId ? await yt(userId, `channels?part=statistics,snippet&id=${encodeURIComponent(channelId)}`) : null;
      const channelItem = (channelData?.items as Record<string, any>[] | undefined)?.[0]; // eslint-disable-line @typescript-eslint/no-explicit-any
      const channelStats = channelItem?.statistics ?? {};
      const channelSubscribers = channelStats.hiddenSubscriberCount ? null : n(channelStats.subscriberCount);
      const channelViews = n(channelStats.viewCount);
      const channelVideos = n(channelStats.videoCount);
      const duration = String(item.contentDetails?.duration ?? "");
      const durationParts = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duration);
      const durationLabel = durationParts
        ? Number(durationParts[1] ?? 0) > 0
          ? `${Number(durationParts[1])}:${String(Number(durationParts[2] ?? 0)).padStart(2, "0")}:${String(Number(durationParts[3] ?? 0)).padStart(2, "0")}`
          : `${Number(durationParts[2] ?? 0)}:${String(Number(durationParts[3] ?? 0)).padStart(2, "0")}`
        : null;
      const a = assessPost(post);
      const findings: Finding[] = a.signals.map((s) => ({ tone: s.tone, title: s.text, source: "YouTube Data API" }));
      const commentsJson = post.comments && post.comments > 0
        ? await yt(userId, `commentThreads?part=snippet&maxResults=50&order=time&videoId=${encodeURIComponent(videoId)}`)
        : null;
      const texts = ((commentsJson?.items as Record<string, any>[] | undefined) ?? []) // eslint-disable-line @typescript-eslint/no-explicit-any
        .map((c) => String(c.snippet?.topLevelComment?.snippet?.textOriginal ?? ""))
        .filter(Boolean);
      findings.push(...commentSignals(texts));
      const status: CheckerResult["status"] =
        a.verdict === "suspicious" ? "suspicious" : a.verdict === "review" ? "suspicious" : a.verdict === "real" ? "low_risk" : "inconclusive";
      const customUrl = str(channelItem?.snippet?.customUrl);
      const details: EngagementDetails = {
        ...d,
        found: true,
        title: str(item.snippet?.title),
        caption: str(item.snippet?.description)?.slice(0, 280) ?? null,
        authorName: str(item.snippet?.channelTitle),
        authorHandle: customUrl ? (customUrl.startsWith("@") ? customUrl : `@${customUrl}`) : d.authorHandle,
        authorUrl: channelId ? `https://www.youtube.com/channel/${encodeURIComponent(channelId)}` : null,
        thumbnailUrl: bestThumb(item.snippet?.thumbnails),
        publishedAt: ytDate(item.snippet?.publishedAt),
        durationSec: duration ? isoDurationSeconds(duration) : null,
        views: post.views,
        likes: post.likes,
        comments: post.comments,
        engagementRate: a.engagementRate,
        account: {
          createdAt: ytDate(channelItem?.snippet?.publishedAt),
          followers: channelSubscribers,
          followersHidden: Boolean(channelStats.hiddenSubscriberCount),
          totalViews: channelViews,
          totalLikes: null,
          posts: channelVideos,
          country: str(channelItem?.snippet?.country),
          verified: null,
          visibility: channelItem ? "public" : null,
        },
        visibility: str(item.status?.privacyStatus),
        verdict: a.verdict === "unknown" ? null : a.verdict,
        commentsRead: texts.length,
      };
      details.estimate = estimateViews({
        platform: "youtube", contentType: details.contentType, views: post.views, likes: post.likes, comments: post.comments, publishedAt: details.publishedAt,
        channelViews, channelVideos, followers: channelSubscribers, commentWarnings: findings.filter((f) => f.tone === "warn" && /comment/i.test(f.title)).length,
      });
      const rep = (v: number | null) => (v == null ? "UNAVAILABLE" : "PLATFORM_REPORTED") as "UNAVAILABLE" | "PLATFORM_REPORTED";
      details.metricClass = {
        views: rep(post.views), likes: rep(post.likes), comments: rep(post.comments), followers: rep(channelSubscribers), totalViews: rep(channelViews), posts: rep(channelVideos),
        genuine: details.estimate.status === "ESTIMATED" ? "ESTIMATED" : "UNAVAILABLE", suspicious: details.estimate.status === "ESTIMATED" ? "ESTIMATED" : "UNAVAILABLE",
      };
      return {
        ...base,
        details,
        status: findings.some((f) => f.tone === "warn") && status === "low_risk" ? "suspicious" : status,
        summary:
          a.verdict === "real"
            ? "Engagement looks natural for this many views."
            : a.verdict === "too_early"
              ? "Too few views yet to judge."
              : "Some numbers don't fit natural viewing. Signals, not proof of fake views.",
        findings,
        metrics: [
          { label: "Video", value: String(item.snippet?.title ?? "").slice(0, 80) },
          { label: "Channel", value: String(item.snippet?.channelTitle ?? "") },
          { label: "Public views (YouTube)", value: fmt(post.views) },
          { label: "Estimated genuine views", value: details.estimate.genuine ? `${fmt(details.estimate.genuine[0])} – ${fmt(details.estimate.genuine[1])} (estimate, ${details.estimate.confidence.toLowerCase()} confidence)` : "Insufficient public evidence" },
          { label: "Estimated suspicious views", value: details.estimate.suspicious ? `${fmt(details.estimate.suspicious[0])} – ${fmt(details.estimate.suspicious[1])} (estimate)` : "Insufficient public evidence" },
          { label: "Likes", value: fmt(post.likes) },
          { label: "Comments", value: fmt(post.comments) },
          { label: "Engagement", value: a.engagementRate == null ? "—" : `${(a.engagementRate * 100).toFixed(2)}%` },
          { label: "Views per day", value: fmt(a.viewsPerDay) },
          { label: "Published", value: ytDate(item.snippet?.publishedAt) ? new Date(String(item.snippet?.publishedAt)).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "Not provided" },
          { label: "Category", value: String(item.snippet?.categoryId ?? "Not provided") },
          { label: "Duration", value: durationLabel ?? "Not provided" },
          { label: "Channel subscribers", value: channelSubscribers == null ? "Hidden / unavailable" : fmt(channelSubscribers) },
          { label: "Channel total views", value: fmt(channelViews) },
          { label: "Channel videos", value: fmt(channelVideos) },
          { label: "Channel ID", value: channelId || "Not provided" },
          { label: "Channel handle", value: String(channelItem?.snippet?.customUrl ?? "Not provided") },
          { label: "Channel created", value: ytDate(channelItem?.snippet?.publishedAt) ? new Date(String(channelItem?.snippet?.publishedAt)).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "Not provided" },
          { label: "Channel country", value: String(channelItem?.snippet?.country ?? "Not public") },
          { label: "Video description", value: String(item.snippet?.description ?? "").trim().slice(0, 240) || "Not provided" },
          { label: "Video visibility", value: String(item.status?.privacyStatus ?? "Not provided") },
        ],
        sources: ["YouTube Data API (public statistics)"],
        limits: ["Watch time, reach and audience details are private to the channel owner.", "One unusual ratio is a signal, not proof."],
        nextSteps: a.verdict === "real" ? [] : ["Ask the creator for a YouTube Studio screenshot of traffic sources.", "Compare with the creator's other videos."],
      };
    }
    // Channel link: @handle or /channel/ID
    const handle = /\/@([^/?#]+)/.exec(url.pathname)?.[1];
    const channelId = /\/channel\/([A-Za-z0-9_-]+)/.exec(url.pathname)?.[1];
    const q = handle ? `forHandle=${encodeURIComponent("@" + handle)}` : channelId ? `id=${encodeURIComponent(channelId)}` : null;
    if (!q) return { ...base, status: "inconclusive", summary: "Paste a video link or a channel link (youtube.com/@name).", details: { ...d, accessNote: "This YouTube link is not a video or channel link." } };
    const data = await yt(userId, `channels?part=statistics,snippet&${q}`);
    if (!data) return noAccess();
    const ch = (data?.items as Record<string, any>[] | undefined)?.[0]; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!ch) return { ...base, status: "inconclusive", summary: "YouTube didn't return this channel.", sources: ["YouTube Data API"], details: { ...d, accessNote: "YouTube did not return this channel." } };
    const subs = ch.statistics?.hiddenSubscriberCount ? null : n(ch.statistics?.subscriberCount);
    const views = n(ch.statistics?.viewCount);
    const videos = n(ch.statistics?.videoCount);
    const findings: Finding[] = [];
    const avg = views != null && videos ? Math.round(views / videos) : null;
    if (subs != null && avg != null && subs > 50_000 && avg < subs * 0.005) {
      findings.push({ tone: "warn", title: "Many subscribers but very few views per video", detail: `${fmt(subs)} subscribers, about ${fmt(avg)} views per video.`, source: "YouTube Data API" });
    } else if (subs != null && avg != null) {
      findings.push({ tone: "good", title: "Views per video fit the subscriber count", source: "YouTube Data API" });
    }
    const chCustom = str(ch.snippet?.customUrl);
    const chId = str(ch.id);
    return {
      ...base,
      details: {
        ...d,
        contentType: "channel",
        found: true,
        title: str(ch.snippet?.title),
        caption: str(ch.snippet?.description)?.slice(0, 280) ?? null,
        authorName: str(ch.snippet?.title),
        authorHandle: chCustom ? (chCustom.startsWith("@") ? chCustom : `@${chCustom}`) : d.authorHandle,
        authorUrl: chId ? `https://www.youtube.com/channel/${encodeURIComponent(chId)}` : url.toString(),
        thumbnailUrl: bestThumb(ch.snippet?.thumbnails),
        publishedAt: ytDate(ch.snippet?.publishedAt),
        views: views,
        account: { createdAt: ytDate(ch.snippet?.publishedAt), followers: subs, followersHidden: Boolean(ch.statistics?.hiddenSubscriberCount), totalViews: views, totalLikes: null, posts: videos, country: str(ch.snippet?.country), verified: null, visibility: "public" },
        verdict: findings.some((f) => f.tone === "warn") ? "suspicious" : findings.length ? "real" : null,
      },
      status: findings.some((f) => f.tone === "warn") ? "suspicious" : findings.length ? "low_risk" : "inconclusive",
      summary: findings.some((f) => f.tone === "warn") ? "The audience numbers don't fit together well." : "Channel numbers look consistent.",
      findings,
      metrics: [
        { label: "Channel", value: String(ch.snippet?.title ?? "") },
        { label: "Subscribers", value: subs == null ? "Hidden" : fmt(subs) },
        { label: "Total views", value: fmt(views) },
        { label: "Videos", value: fmt(videos) },
        { label: "Avg views / video", value: fmt(avg) },
      ],
      sources: ["YouTube Data API (public statistics)"],
      limits: ["Subscriber growth history is not public."],
      nextSteps: [],
    };
  }

  if (platform === "tiktok" || platform === "x") {
    const endpoint =
      platform === "tiktok"
        ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(url.toString())}`
        : `https://publish.twitter.com/oembed?omit_script=1&url=${encodeURIComponent(url.toString())}`;
    let author: string | null = null;
    let title: string | null = null;
    let authorUrl: string | null = null;
    let handle: string | null = null;
    let thumb: string | null = null;
    try {
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(8_000), cache: "no-store" });
      if (res.ok) {
        const j = (await res.json()) as { author_name?: string; title?: string; author_url?: string; author_unique_id?: string; thumbnail_url?: string };
        author = j.author_name ?? null;
        title = j.title ?? null;
        authorUrl = str(j.author_url) && /^https:\/\//.test(String(j.author_url)) ? String(j.author_url) : null;
        handle = str(j.author_unique_id) ? `@${j.author_unique_id}` : null;
        thumb = str(j.thumbnail_url) && /^https:\/\//.test(String(j.thumbnail_url)) ? String(j.thumbnail_url) : null;
      }
    } catch {
      /* unavailable */
    }
    const label = platform === "tiktok" ? "TikTok" : "X";
    const d = blankDetails(platform, url);
    if (!handle && authorUrl) handle = handleFromUrl(platform, new URL(authorUrl));
    return {
      ...base,
      details: {
        ...d,
        found: Boolean(author),
        caption: title,
        authorName: author,
        authorHandle: handle ?? d.authorHandle,
        authorUrl,
        thumbnailUrl: thumb,
        account: { ...d.account, visibility: author ? "public" : null },
        accessNote: author
          ? `${label} confirms who posted this, but only shares views, likes and account numbers with the account owner.`
          : `${label} did not confirm this post. It may be private, removed or the link may be incomplete.`,
      },
      status: "unavailable",
      summary: author ? `Post by ${author}. ${label} doesn't share view or like counts publicly.` : `${label} didn't confirm this post.`,
      findings: author ? [{ tone: "info", title: `Confirmed public post by ${author}`, detail: title ?? undefined, source: `${label} oEmbed` }] : [],
      metrics: [
        ...(author ? [{ label: "Author", value: author }] : []),
        { label: "Public views", value: "Not available from public oEmbed" },
        { label: "Verified real views", value: "Not available" },
        { label: "Detected fake / bot views", value: "Not available" },
      ],
      sources: author ? [`${label} oEmbed (official)`] : [],
      limits: [`${label} only shares views and likes with the account owner (connected login).`],
      nextSteps: ["On Jimvio campaigns, creators connect their account so real views are read directly."],
    };
  }

  const metaName = platform === "instagram" ? "Instagram" : platform === "facebook" ? "Facebook" : "Threads";
  const oe = platform === "instagram" || platform === "facebook" ? await metaOembed(platform, url.toString()) : null;
  if (oe?.author) {
    const d = blankDetails(platform, url);
    return {
      ...base,
      details: { ...d, found: true, authorName: oe.author, caption: oe.title, thumbnailUrl: oe.thumb, account: { ...d.account, visibility: "public" }, metricClass: { views: "UNAVAILABLE", likes: "UNAVAILABLE", comments: "UNAVAILABLE" }, estimate: null, accessNote: `${metaName} confirms who posted this, but only shares views, likes and follower numbers with the account owner.` },
      status: "unavailable",
      summary: `Post by ${oe.author}. ${metaName} doesn't share engagement numbers publicly.`,
      findings: [{ tone: "info", title: `Confirmed public post by ${oe.author}`, detail: oe.title ?? undefined, source: `${metaName} oEmbed (Meta Graph API)` }],
      metrics: [{ label: "Author", value: oe.author }, { label: "Public views", value: "Not shared by Meta" }],
      sources: [`${metaName} oEmbed (official)`],
      limits: ["Meta only shares counts with the account owner; Jimvio never scrapes them."],
      nextSteps: ["On Jimvio campaigns, creators connect their account so real numbers are read directly."],
    };
  }
  return {
    ...base,
    details: { ...blankDetails(platform, url), accessNote: `${metaName} only shares post and account numbers with approved apps and the account owner, so Jimvio can't read them from a link.` },
    status: "unavailable",
    summary: `${metaName} doesn't share engagement numbers publicly.`,
    metrics: [
      { label: "Public views", value: "Not available from public access" },
      { label: "Verified real views", value: "Not available" },
      { label: "Detected fake / bot views", value: "Not available" },
    ],
    limits: ["Meta only shares these numbers with approved apps and the account owner."],
  };
}
