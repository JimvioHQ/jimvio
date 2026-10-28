import type { MetadataRoute } from "next";
import { mediaSitemapEntries } from "@/lib/editorial/publish";
import { listPublishedArticles } from "@/lib/editorial/public-store";
import { getSiteUrl } from "@/lib/site-url";

// Sitemap routes stay cached until the next deploy unless this is set.
export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const loaded = await listPublishedArticles();
  return mediaSitemapEntries(getSiteUrl(), loaded);
}
