import type { MetadataRoute } from "next";
import { getAdminDB } from "@/services/base";
import { SITE } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const STATIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/marketplace", priority: 0.9, changeFrequency: "daily" },
  { path: "/marketplace/physical", priority: 0.85, changeFrequency: "daily" },
  { path: "/marketplace/digital", priority: 0.85, changeFrequency: "daily" },
  { path: "/communities", priority: 0.85, changeFrequency: "daily" },
  { path: "/affiliates", priority: 0.85, changeFrequency: "weekly" },
  { path: "/ugc", priority: 0.85, changeFrequency: "daily" },
  { path: "/deals", priority: 0.8, changeFrequency: "daily" },
  { path: "/influencers", priority: 0.75, changeFrequency: "weekly" },
  { path: "/influencers/browse", priority: 0.7, changeFrequency: "weekly" },
  { path: "/vendors", priority: 0.75, changeFrequency: "weekly" },
  { path: "/shorts", priority: 0.7, changeFrequency: "daily" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
  { path: "/help", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.5, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.6, changeFrequency: "monthly" },
  { path: "/protection", priority: 0.5, changeFrequency: "monthly" },
  { path: "/verified", priority: 0.5, changeFrequency: "monthly" },
  { path: "/legal", priority: 0.45, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.4, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.4, changeFrequency: "yearly" },
  { path: "/cookies", priority: 0.3, changeFrequency: "yearly" },
  { path: "/refunds-payouts", priority: 0.3, changeFrequency: "yearly" },
  { path: "/community-guidelines", priority: 0.3, changeFrequency: "yearly" },
  { path: "/prohibited-products", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/buyer-terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/seller-terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/earnings", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/ugc-clipping", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/digital-products", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/wallet", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/commerce-integrations", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/developer", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/copyright-ip", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/youth-safety", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/affiliate-terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/advertising-disclosure", priority: 0.3, changeFrequency: "yearly" },
  { path: "/content", priority: 0.3, changeFrequency: "yearly" },
  { path: "/careers", priority: 0.5, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = getAdminDB();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE.url}${route.path === "/" ? "" : route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const [productsRes, communitiesRes, blogRes] = await Promise.all([
    admin
      .from("products")
      .select("slug, updated_at")
      .eq("status", "active")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      // Single sitemap remains under the protocol's 50k URL limit; shard when
      // the public catalog approaches that ceiling.
      .limit(45_000),
    admin
      .from("communities")
      .select("slug, updated_at")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(4_000),
    admin
      .from("blog_posts")
      .select("slug, published_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(200),
  ]);

  const productEntries: MetadataRoute.Sitemap = (productsRes.data ?? []).map((p) => ({
    url: `${SITE.url}/marketplace/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const communityEntries: MetadataRoute.Sitemap = (communitiesRes.data ?? []).map((c) => ({
    url: `${SITE.url}/communities/${c.slug}`,
    lastModified: c.updated_at ? new Date(c.updated_at) : now,
    changeFrequency: "weekly",
    priority: 0.65,
  }));

  const blogEntries: MetadataRoute.Sitemap = (blogRes.data ?? []).map((b) => ({
    url: `${SITE.url}/blog/${b.slug}`,
    lastModified: b.published_at ? new Date(b.published_at) : now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticEntries, ...productEntries, ...communityEntries, ...blogEntries];
}
