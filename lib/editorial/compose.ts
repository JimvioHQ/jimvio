import { MEDIA_CATEGORIES, type HomeComposition, type PublicArticle } from "@/lib/editorial/types";
import { resolveMediaCategory } from "@/lib/editorial/validate";

function take(articles: PublicArticle[], used: Set<string>, predicate: (article: PublicArticle) => boolean, limit: number) {
  const picked: PublicArticle[] = [];
  for (const article of articles) {
    if (picked.length >= limit) break;
    if (used.has(article.id) || !predicate(article)) continue;
    picked.push(article);
    used.add(article.id);
  }
  return picked;
}

export function composeHome(articles: PublicArticle[]): HomeComposition {
  const used = new Set<string>();
  const heroes = take(articles, used, (article) => article.section === "hero", 5);
  const featured = take(articles, used, (article) => article.section === "featured", 3);
  let latest = take(
    articles,
    used,
    (article) => article.section === "news" || article.category === "news",
    4,
  );
  if (latest.length === 0) latest = take(articles, used, () => true, 4);
  const magazine = take(
    articles,
    used,
    (article) => article.section === "magazine" || article.category === "magazine",
    3,
  );
  const guides = take(
    articles,
    used,
    (article) => article.section === "guide" || article.category === "guides",
    3,
  );
  const sections = MEDIA_CATEGORIES.map((category) => ({
    slug: category.slug,
    label: category.label,
    articles: articles.filter((article) => article.category === category.slug).slice(0, 3),
  })).filter((section) => section.articles.length > 0);
  return { heroes, featured, latest, magazine, guides, allStories: articles.slice(0, 12), sections };
}

export function searchArticles(articles: PublicArticle[], query: string): PublicArticle[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  return articles
    .filter((article) => {
      const haystack = [
        article.title,
        article.excerpt,
        article.category,
        article.kicker,
        article.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    })
    .slice(0, 200);
}

export function articlesInCategory(articles: PublicArticle[], category: string): PublicArticle[] {
  const canonical = resolveMediaCategory(category);
  if (!canonical) return [];
  return articles.filter((article) => resolveMediaCategory(article.category) === canonical);
}

export function searchPublishedArticles(
  articles: PublicArticle[],
  query: string,
  category?: string | null,
): PublicArticle[] {
  const matched = searchArticles(articles, query);
  if (!category) return matched;
  return articlesInCategory(matched, category);
}
