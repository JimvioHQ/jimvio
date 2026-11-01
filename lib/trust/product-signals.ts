/** Plain-text signals for digital product pages and files. Pure functions. */
import type { Finding } from "./types";

const CLAIMS: [RegExp, string][] = [
  [/guaranteed (income|profit|results|returns|money)/i, "Promises guaranteed income or results"],
  [/(make|earn) \$?\d[\d,]*(k|\+)? ?(per|a|\/) ?(day|hour|week)/i, "Promises a fixed amount of money per day or week"],
  [/(get rich|financial freedom) (fast|quick|in \d+)/i, "Get-rich-quick promise"],
  [/100% (guaranteed|risk[- ]free|passive)/i, "“100% guaranteed / risk-free” claim"],
  [/(no experience|no skills?) (needed|required).{0,60}(\$|money|income|earn)/i, "Easy money with no skills"],
  [/(secret|hidden|loophole) (method|system|formula|trick)/i, "“Secret method” language"],
  [/(only|just) \d+ (spots?|copies|left)|offer ends (today|tonight|in \d+)/i, "Pressure with fake scarcity"],
  [/(doctors|banks|experts) (hate|don't want you)/i, "Clickbait claim"],
  [/(send|share|provide|enter|reveal).{0,50}(seed phrase|recovery phrase|private key)/i, "Requests a wallet recovery phrase or private key"],
  [/(pay|send|transfer).{0,45}(gift cards?|crypto wallet|bitcoin|wire transfer|western union)/i, "Requests a hard-to-reverse payment method"],
];

export function claimFindings(text: string): Finding[] {
  const f: Finding[] = [];
  const sample = text.slice(0, 400_000);
  for (const [re, label] of CLAIMS) {
    const m = re.exec(sample);
    if (!m) continue;
    const prefix = sample.slice(Math.max(0, m.index - 24), m.index);
    // Do not flag protective advice such as "never share your seed phrase".
    if (/(?:never|don't|do not|dont|can't|cannot)\s+(?:ever\s+)?$/i.test(prefix)) continue;
    f.push({ tone: label.includes("recovery phrase") ? "bad" : "warn", title: label, detail: `“…${sample.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40).replace(/\s+/g, " ").trim()}…”`, source: "Claim check" });
  }
  if (/\b(plr|private label rights|master resell rights|mrr)\b/i.test(sample)) {
    f.push({ tone: "info", title: "Sold with resell rights (PLR/MRR)", detail: "The same content is often sold by many sellers; it isn't unique.", source: "Licensing text" });
  }
  return f;
}

export type ProductPage = {
  isProduct: boolean;
  name: string | null;
  price: string | null;
  rating: string | null;
  hasContact: boolean;
  hasRefund: boolean;
  hasPrivacy: boolean;
  text: string;
};

export function readProductPage(html: string): ProductPage {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 300_000);
  let name: string | null = null;
  let price: string | null = null;
  let rating: string | null = null;
  let isProduct = /property=["']og:type["'][^>]*content=["']product/i.test(html);
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const json = JSON.parse(m[1]);
      const items = (Array.isArray(json) ? json : [json]).flatMap((j: Record<string, unknown>) => (j["@graph"] as unknown[]) ?? [j]) as Record<string, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
      const product = items.find((i) => /Product|Course|Book|SoftwareApplication/.test(String(i?.["@type"] ?? "")));
      if (product) {
        isProduct = true;
        name = String(product.name ?? "") || null;
        const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
        if (offer?.price) price = `${offer.priceCurrency ?? ""} ${offer.price}`.trim();
        if (product.aggregateRating?.ratingValue) rating = `${product.aggregateRating.ratingValue} (${product.aggregateRating.reviewCount ?? product.aggregateRating.ratingCount ?? "?"} reviews)`;
      }
    } catch {
      /* ignore broken JSON-LD */
    }
  }
  if (!name) name = /property=["']og:title["'][^>]*content=["']([^"']{2,160})/i.exec(html)?.[1] ?? /<title[^>]*>([^<]{2,160})/i.exec(html)?.[1]?.trim() ?? null;
  if (!isProduct && /(add to cart|buy now|checkout|instant download|lifetime access)/i.test(text) && /(\$|usd|eur|rwf|£|€)\s?\d/i.test(text)) isProduct = true;
  return {
    isProduct,
    name,
    price,
    rating,
    hasContact: /mailto:|tel:|contact us|support@/i.test(html),
    hasRefund: /refund|money[- ]back/i.test(text),
    hasPrivacy: /privacy policy/i.test(text),
    text,
  };
}
