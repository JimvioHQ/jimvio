import { articleExcerpt, articleHref, categoryById } from "./format";
import type { SupportArticle, SupportSearchHit } from "./types";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

const STOP_WORDS = new Set([
  "how",
  "do",
  "does",
  "did",
  "i",
  "a",
  "an",
  "the",
  "my",
  "to",
  "on",
  "in",
  "of",
  "is",
  "are",
  "what",
  "why",
  "can",
  "if",
  "for",
  "and",
  "or",
]);

function tokens(query: string) {
  return normalize(query)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function haystack(article: SupportArticle) {
  const category = categoryById(article.category);
  return normalize(
    [
      article.title,
      article.lead,
      article.eligibility,
      article.next,
      article.steps.join(" "),
      article.troubleshooting.join(" "),
      article.tags.join(" "),
      category?.title ?? "",
      category?.summary ?? "",
    ].join(" "),
  );
}

export function searchSupportArticles(
  articles: SupportArticle[],
  query: string,
  options?: { category?: string; limit?: number },
): SupportSearchHit[] {
  const limit = options?.limit ?? 8;
  const q = normalize(query);
  if (q.length < 2) return [];
  const parts = tokens(query);
  const scoped = options?.category
    ? articles.filter((article) => article.category === options.category)
    : articles;

  const hits: SupportSearchHit[] = [];
  for (const article of scoped) {
    const text = haystack(article);
    const title = normalize(article.title);
    const tagText = normalize(article.tags.join(" "));
    let score = 0;
    if (title.includes(q)) score += 12;
    if (text.includes(q)) score += 6;
    for (const part of parts) {
      if (title.includes(part)) score += 4;
      else if (tagText.includes(part)) score += 3;
      else if (text.includes(part)) score += 1;
      else score -= 2;
    }
    if (score <= 0) continue;
    const category = categoryById(article.category);
    hits.push({
      slug: article.slug,
      title: article.title,
      category: article.category,
      categoryTitle: category?.title ?? article.category,
      excerpt: articleExcerpt(article),
      href: articleHref(article.slug),
      score,
    });
  }

  return hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit);
}
