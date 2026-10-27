import type { MetadataRoute } from "next";
import { mediaSitemapEntries } from "@/lib/editorial/publish";
import { listPublishedArticles } from "@/lib/editorial/public-store";
import { getSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const loaded = await listPublishedArticles();
  return mediaSitemapEntries(getSiteUrl(), loaded);
}
