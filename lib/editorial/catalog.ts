import { EDITORIAL_FIXTURES } from "@/lib/editorial/fixtures";
import { listPublishedArticles } from "@/lib/editorial/public-store";
import type { PublicArticle } from "@/lib/editorial/types";
import { shouldUseFixtures } from "@/lib/editorial/validate";

export type EditorialCatalog = {
  articles: PublicArticle[];
  usingFixtures: boolean;
  unavailable: boolean;
};

export async function loadCatalog(): Promise<EditorialCatalog> {
  const loaded = await listPublishedArticles();
  const usingFixtures = shouldUseFixtures(loaded.articles.length, {
    nodeEnv: process.env.NODE_ENV,
    mediaFixtures: process.env.MEDIA_FIXTURES,
  });
  if (usingFixtures) {
    return { articles: EDITORIAL_FIXTURES, usingFixtures: true, unavailable: false };
  }
  return { articles: loaded.articles, usingFixtures: false, unavailable: loaded.unavailable };
}
