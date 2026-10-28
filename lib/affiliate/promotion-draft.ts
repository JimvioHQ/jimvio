/**
 * Editable promotion copy from fields already on a product.
 * This is a listing draft, not a model call and not a performance prediction.
 */

export const AFFILIATE_DISCLOSURE =
  "Affiliate disclosure: I may earn a commission if you buy through my link.";

export const AFFILIATE_DRAFT_LIMITATION =
  "Drafted from the current listing. Edit it before you post. It does not predict clicks, sales, or earnings, and nothing is posted for you.";

export type AffiliatePromotionDraft = {
  tiktokCaption: string;
  instagramCaption: string;
  youtubeTitle: string;
  facebookPost: string;
  threadsPost: string;
  xPost: string;
  emailCopy: string;
  blogIntro: string;
  seoTitle: string;
  keywords: string[];
  hashtags: string[];
  hooks: string[];
  scripts: string[];
  limitation: string;
};

function plain(value: string | null | undefined, max: number): string {
  return (value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function clip(value: string, max: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function withDisclosure(body: string, max: number): string {
  const combined = `${body.trim()} ${AFFILIATE_DISCLOSURE}`.trim();
  if (combined.length <= max) return combined;
  const room = max - AFFILIATE_DISCLOSURE.length - 1;
  if (room < 12) return clip(AFFILIATE_DISCLOSURE, max);
  return `${clip(body, room)} ${AFFILIATE_DISCLOSURE}`;
}

function money(amount: number): string {
  return amount.toFixed(2);
}

function rateLabel(rate: number): string {
  return String(Math.round(rate * 100) / 100);
}

export function draftAffiliatePromotion(input: {
  name?: string | null;
  category?: string | null;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  commissionRate?: number | null;
}): AffiliatePromotionDraft {
  const name = plain(input.name, 140) || "this product";
  const category = plain(input.category, 80);
  const description = plain(input.description, 220);
  const currency = plain(input.currency, 8) || "USD";
  const price = Number(input.price);
  const rate = Number(input.commissionRate);
  const facts = [
    category ? `Category: ${category}.` : "",
    Number.isFinite(price) && price > 0 ? `Listed price: ${currency} ${money(price)}.` : "",
    Number.isFinite(rate) && rate > 0 ? `Current commission rate: ${rateLabel(rate)}%.` : "",
    description ? `The listing says: “${description}”.` : "",
    "Share your Jimvio tracked link from Link Manager.",
  ].filter(Boolean);
  const detail = facts.join(" ");
  const keywords = name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3)
    .slice(0, 6);
  const hashtags = ["#ad"];
  for (const word of name.split(/[^A-Za-z0-9]+/)) {
    if (hashtags.length >= 3) break;
    if (word.length < 4) continue;
    hashtags.push(`#${word}`);
  }

  return {
    tiktokCaption: withDisclosure(`${name}. ${detail}`, 500),
    instagramCaption: withDisclosure(`${name}. ${detail}`, 900),
    youtubeTitle: clip(name, 70),
    facebookPost: withDisclosure(`${name}. ${detail}`, 900),
    threadsPost: withDisclosure(`${name}. ${detail}`, 500),
    xPost: withDisclosure(name, 240),
    emailCopy: withDisclosure(`Hello, ${detail}`, 1200),
    blogIntro: withDisclosure(`${name}. ${detail}`, 1200),
    seoTitle: clip(name, 60),
    keywords,
    hashtags,
    hooks: [`Here is ${name}.`],
    scripts: [
      `Show ${name}. Share your tracked link and say that you may earn a commission.`,
    ],
    limitation: AFFILIATE_DRAFT_LIMITATION,
  };
}
