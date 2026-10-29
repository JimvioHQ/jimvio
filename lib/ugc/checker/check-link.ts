import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { readGeminiKey } from "@/lib/ai/gemini-fallback";
import { freshCredentials, type CredentialDestination } from "@/lib/live/destinations/fresh-credentials";
import { videoRefFromUrl, type VerifiablePlatform } from "@/lib/ugc/verification/video-ref";
import { assessPost, type ContentAnalysis, type PostAssessment, type PostNumbers } from "./post-signals";

export type LinkCheck = {
  platform: VerifiablePlatform | null;
  videoId: string | null;
  url: string;
  title: string | null;
  channel: string | null;
  thumbnail: string | null;
  numbers: PostNumbers;
  numbersSource: "youtube_api" | null;
  content: ContentAnalysis | null;
  contentSource: "gemini_video" | null;
  assessment: PostAssessment;
  limits: string[];
};

function platformOf(url: string): VerifiablePlatform | null {
  const h = (() => {
    try {
      return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();
  if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(h)) return "youtube";
  if (/(^|\.)tiktok\.com$/.test(h)) return "tiktok";
  if (/(^|\.)instagram\.com$/.test(h)) return "instagram";
  return null;
}

/** A token that may read public YouTube data: an API key, or the checker's own connection. */
async function youtubeAuth(userId: string | null): Promise<{ key?: string; token?: string } | null> {
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (key) return { key };
  if (!userId) return null;
  const db = createServiceRoleClient() as unknown as { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data } = await db
    .from("live_destinations")
    .select("id, user_id, provider_channel_id, provider_account_id, encrypted_credentials")
    .eq("user_id", userId)
    .eq("platform", "youtube")
    .is("revoked_at", null)
    .limit(1);
  const dest = ((data ?? []) as CredentialDestination[])[0];
  if (!dest) return null;
  const fresh = await freshCredentials("youtube", dest);
  return fresh.ok && fresh.creds.accessToken ? { token: fresh.creds.accessToken } : null;
}

async function youtubeNumbers(videoId: string, userId: string | null) {
  const auth = await youtubeAuth(userId);
  if (!auth) return null;
  const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${encodeURIComponent(videoId)}${
    auth.key ? `&key=${encodeURIComponent(auth.key)}` : ""
  }`;
  const res = await fetch(url, {
    headers: auth.token ? { Authorization: `Bearer ${auth.token}` } : {},
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return null;
  const json = (await res.json().catch(() => null)) as {
    items?: {
      snippet?: { title?: string; channelTitle?: string; publishedAt?: string; thumbnails?: { high?: { url?: string } } };
      statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
    }[];
  } | null;
  const item = json?.items?.[0];
  if (!item) return null;
  const num = (v?: string) => (v == null ? null : Number(v));
  return {
    title: item.snippet?.title ?? null,
    channel: item.snippet?.channelTitle ?? null,
    thumbnail: item.snippet?.thumbnails?.high?.url ?? null,
    numbers: {
      views: num(item.statistics?.viewCount),
      likes: num(item.statistics?.likeCount),
      comments: num(item.statistics?.commentCount),
      publishedAt: item.snippet?.publishedAt ?? null,
    } as PostNumbers,
  };
}

const CONTENT_PROMPT = `You are Jimvio's content checker for brand campaigns. Watch this video and answer ONLY with JSON:
{"aiGeneratedLikelihood": 0-100, "aiSignals": [short strings], "qualityScore": 0-100, "qualityNotes": [short strings], "summary": "one or two plain sentences about what the video shows"}
aiGeneratedLikelihood: how likely the visuals or voice are AI-generated or synthetic (avatars, generated scenes, cloned voice). Be careful and honest; use 50 when unsure.
qualityScore: production quality for a brand ad (lighting, sound, framing, clarity, hook in the first seconds).
Keep each note under 12 words.`;

/** Gemini watches a public YouTube video. Other platforms can't be watched yet. */
export async function analyzeYouTubeVideo(url: string): Promise<ContentAnalysis | null> {
  const apiKey = readGeminiKey();
  if (!apiKey) return null;
  try {
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel(
      { model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json", temperature: 0.2 } },
      { timeout: 75_000 },
    );
    const res = await model.generateContent([
      { fileData: { fileUri: url, mimeType: "video/mp4" } },
      { text: CONTENT_PROMPT },
    ]);
    const parsed = JSON.parse(res.response.text()) as Partial<ContentAnalysis>;
    const clamp = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : null);
    const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 5) : []);
    return {
      aiGeneratedLikelihood: clamp(parsed.aiGeneratedLikelihood),
      aiSignals: list(parsed.aiSignals),
      qualityScore: clamp(parsed.qualityScore),
      qualityNotes: list(parsed.qualityNotes),
      summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 400) : null,
    };
  } catch (err) {
    console.warn("[checker] video analysis failed", err instanceof Error ? err.message.slice(0, 160) : "");
    return null;
  }
}

export async function checkLink(rawUrl: string, userId: string | null): Promise<LinkCheck> {
  const url = rawUrl.trim();
  const platform = platformOf(url);
  const ref = platform ? videoRefFromUrl(platform, url) : null;
  const limits: string[] = [];
  let title: string | null = null;
  let channel: string | null = null;
  let thumbnail: string | null = null;
  let numbers: PostNumbers = { views: null, likes: null, comments: null };
  let numbersSource: LinkCheck["numbersSource"] = null;
  let content: ContentAnalysis | null = null;

  if (!platform) limits.push("Paste a YouTube, TikTok or Instagram link.");
  else if (!ref) limits.push("Use the full link to the video (not a short or profile link).");

  if (platform === "youtube" && ref) {
    const canonical = `https://www.youtube.com/watch?v=${ref.videoId}`;
    const [yt, analysis] = await Promise.all([youtubeNumbers(ref.videoId, userId), analyzeYouTubeVideo(canonical)]);
    if (yt) {
      ({ title, channel, thumbnail } = yt);
      numbers = yt.numbers;
      numbersSource = "youtube_api";
    } else {
      thumbnail = `https://i.ytimg.com/vi/${ref.videoId}/hqdefault.jpg`;
      limits.push("Connect your YouTube account in Settings to read this video's public views and likes.");
    }
    content = analysis;
    if (!analysis) limits.push("The video could not be watched right now (it may be private or too long).");
  } else if (platform === "tiktok" || platform === "instagram") {
    limits.push(
      platform === "tiktok"
        ? "TikTok shares view numbers only for the creator's own connected account. Submitted TikTok posts are checked that way."
        : "Instagram does not share view numbers publicly yet. Instagram posts are reviewed by hand.",
    );
  }

  return {
    platform,
    videoId: ref?.videoId ?? null,
    url,
    title,
    channel,
    thumbnail,
    numbers,
    numbersSource,
    content,
    contentSource: content ? "gemini_video" : null,
    assessment: assessPost(numbers, content),
    limits,
  };
}
