import { CATEGORY_PHOTO_CATALOG } from "../../community/photo-content/catalog";
import { unsplashDownloadUrl } from "../../community/photo-content/unsplash";
import type { ImageDecision } from "@/lib/editorial/ingest/images";

/**
 * When a story's source does not grant its photograph, Jimvio Media uses a
 * licensed Unsplash photo as an illustration (Unsplash License: free for
 * commercial use). The caption says plainly that it is not a photo of the
 * story, so readers are never misled.
 */
const TOPIC_RULES: { key: string; words: RegExp }[] = [
  { key: "AI", words: /\b(ai|artificial intelligence|llm|chatgpt|gemini|openai|model|agent|machine learning)\b/i },
  { key: "Creator", words: /\b(creator|influencer|tiktok|youtube|instagram|livestream|streamer|podcast)\b/i },
  { key: "Ecommerce", words: /\b(e-?commerce|retail|online store|marketplace|shopping|delivery|logistics)\b/i },
  { key: "Finance", words: /\b(bank|fintech|payment|pay|loan|lending|crypto|stock|ipo|insurance|mobile money)\b/i },
  { key: "Startups", words: /\b(startup|raises|funding|series [a-e]|seed|investors?|venture|vc)\b/i },
  { key: "Marketing", words: /\b(marketing|advertising|brand|ads)\b/i },
  { key: "Health", words: /\b(health|hospital|medical|drug|biotech)\b/i },
  { key: "Education", words: /\b(school|education|students?|university|learning)\b/i },
];

const CATEGORY_DEFAULT: Record<string, string> = {
  technology: "Technology",
  business: "Business",
  news: "News",
  lifestyle: "Travel",
  analysis: "Business",
  magazine: "Technology",
};

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

export function illustrativeTopic(category: string | null | undefined, title: string): string {
  const rule = TOPIC_RULES.find((r) => r.words.test(title));
  if (rule && CATEGORY_PHOTO_CATALOG[rule.key]?.length) return rule.key;
  const fallback = CATEGORY_DEFAULT[(category ?? "").toLowerCase()] ?? "News";
  return CATEGORY_PHOTO_CATALOG[fallback]?.length ? fallback : "Technology";
}

export function illustrativeImage(category: string | null | undefined, title: string): ImageDecision {
  const topic = illustrativeTopic(category, title);
  const pool = CATEGORY_PHOTO_CATALOG[topic] ?? [];
  const photo = pool[hash(title) % Math.max(1, pool.length)];
  return {
    status: "verified",
    url: unsplashDownloadUrl(photo.sourceId, 1600),
    alt: `Illustration for a ${topic.toLowerCase()} story`,
    caption: "Illustrative photo (Unsplash). It is not a picture of the people or events in this story.",
    license: "Unsplash License",
    mime: "image/jpeg",
    width: 1600,
    height: 900,
    note: `Licensed Unsplash illustration (${photo.sourceId}); the source did not grant its photograph.`,
  };
}
