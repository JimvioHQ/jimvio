import { ACCOUNT_ARTICLES } from "./account";
import { COMMUNITY_ARTICLES, LIVE_ARTICLES } from "./community-live";
import { MARKETPLACE_ARTICLES, SELLING_ARTICLES } from "./commerce";
import { CAMPAIGN_ARTICLES, CREATOR_ARTICLES } from "./creators";
import { AI_ARTICLES, DIGITAL_ARTICLES, TECHNICAL_ARTICLES } from "./digital-ai-tech";
import { AFFILIATE_ARTICLES, DROPSHIP_ARTICLES } from "./growth";
import { ORDER_ARTICLES, PAYMENT_ARTICLES } from "./money";
import type { SupportArticle } from "../types";

export const SUPPORT_ARTICLES: SupportArticle[] = [
  ...ACCOUNT_ARTICLES,
  ...MARKETPLACE_ARTICLES,
  ...SELLING_ARTICLES,
  ...PAYMENT_ARTICLES,
  ...AFFILIATE_ARTICLES,
  ...DROPSHIP_ARTICLES,
  ...CREATOR_ARTICLES,
  ...CAMPAIGN_ARTICLES,
  ...COMMUNITY_ARTICLES,
  ...LIVE_ARTICLES,
  ...DIGITAL_ARTICLES,
  ...ORDER_ARTICLES,
  ...AI_ARTICLES,
  ...TECHNICAL_ARTICLES,
];

const bySlug = new Map(SUPPORT_ARTICLES.map((article) => [article.slug, article]));

export function getSupportArticle(slug: string) {
  return bySlug.get(slug) ?? null;
}

export function articlesInCategory(category: string) {
  return SUPPORT_ARTICLES.filter((article) => article.category === category);
}

export function relatedArticles(article: SupportArticle) {
  const linked = article.related
    .map((slug) => bySlug.get(slug))
    .filter((item): item is SupportArticle => Boolean(item));
  if (linked.length > 0) return linked.slice(0, 4);
  return articlesInCategory(article.category)
    .filter((item) => item.slug !== article.slug)
    .slice(0, 3);
}
