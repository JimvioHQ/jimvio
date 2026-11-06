import type { MetadataRoute } from "next";
import { getAdminDB } from "@/services/base";
import { SITE } from "@/lib/seo";
import { hasSupabaseSecretKey } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const MIN_JOURNAL_POSTS = 3;

const STATIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  // "/marketplace" is a permanent redirect to /marketplace/physical, so it is not listed.
  { path: "/marketplace/physical", priority: 0.85, changeFrequency: "daily" },
  { path: "/marketplace/digital", priority: 0.85, changeFrequency: "daily" },
  { path: "/communities", priority: 0.85, changeFrequency: "daily" },
  { path: "/affiliates", priority: 0.85, changeFrequency: "weekly" },
  { path: "/ugc", priority: 0.85, changeFrequency: "daily" },
  { path: "/marketplace/flash-deals", priority: 0.8, changeFrequency: "daily" },
  { path: "/influencers", priority: 0.75, changeFrequency: "weekly" },
  { path: "/users/browse", priority: 0.7, changeFrequency: "weekly" },
  { path: "/founding-creators", priority: 0.7, changeFrequency: "weekly" },
  { path: "/getting-started", priority: 0.7, changeFrequency: "monthly" },
  { path: "/safety", priority: 0.6, changeFrequency: "monthly" },
  { path: "/shorts", priority: 0.7, changeFrequency: "daily" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
  { path: "/careers", priority: 0.5, changeFrequency: "monthly" },
  { path: "/press", priority: 0.5, changeFrequency: "monthly" },
  { path: "/help/contact", priority: 0.5, changeFrequency: "monthly" },
  { path: "/help", priority: 0.6, changeFrequency: "monthly" },
  { path: "/shipping", priority: 0.5, changeFrequency: "monthly" },
  { path: "/docs", priority: 0.45, changeFrequency: "monthly" },
  { path: "/monetization", priority: 0.55, changeFrequency: "monthly" },
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
];

function staticEntries(): MetadataRoute.Sitemap {
  return STATIC_ROUTES.map((route) => ({
    url: `${SITE.url}${route.path === "/" ? "" : route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = staticEntries();

  if (!hasSupabaseSecretKey()) {
    console.warn("[sitemap] Missing Supabase secret key — returning static routes only");
    return base;
  }

  try {
    const admin = getAdminDB();

    const [productsRes, communitiesRes, blogRes] = await Promise.all([
      admin
        .from("products")
        .select("slug, updated_at")
        .eq("status", "active")
        // M-10: same visibility rule as the product page, so no sitemap URL 404s.
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        // Single sitemap remains under the protocol's 50k URL limit; shard when
        // the public catalog approaches that ceiling.
        .limit(45_000),
      admin
        .from("communities")
        .select("slug, updated_at")
        .eq("is_active", true)
        .is("archived_at", null)
        .not("is_private", "is", true)
        .order("updated_at", { ascending: false })
        .limit(4_000),
      admin
        .from("blog_posts")
        .select("slug, published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(200),
    ]);

    if (productsRes.error) console.error("[sitemap] products:", productsRes.error.message);
    if (communitiesRes.error) console.error("[sitemap] communities:", communitiesRes.error.message);
    if (blogRes.error) console.error("[sitemap] blog:", blogRes.error.message);

    const productEntries: MetadataRoute.Sitemap = (productsRes.data ?? [])
      .filter((p) => typeof p.slug === "string" && p.slug.length > 0)
      .map((p) => ({
        url: `${SITE.url}/marketplace/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));

    const communityEntries: MetadataRoute.Sitemap = (communitiesRes.data ?? [])
      .filter((c) => typeof c.slug === "string" && c.slug.length > 0)
      .map((c) => ({
        url: `${SITE.url}/communities/${c.slug}`,
        lastModified: c.updated_at ? new Date(c.updated_at) : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.65,
      }));

    const blogEntries: MetadataRoute.Sitemap = (blogRes.data ?? [])
      .filter((b) => typeof b.slug === "string" && b.slug.length > 0)
      .map((b) => ({
        url: `${SITE.url}/blog/${b.slug}`,
        lastModified: b.published_at ? new Date(b.published_at) : undefined,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }));

    // R-9: the Journal and Updates index pages are listed only once the
    // Journal has real articles, so the sitemap never points at empty pages.
    const journalIndex: MetadataRoute.Sitemap =
      blogEntries.length >= MIN_JOURNAL_POSTS
        ? [
            { url: `${SITE.url}/blog`, changeFrequency: "weekly", priority: 0.7 },
            { url: `${SITE.url}/updates`, changeFrequency: "weekly", priority: 0.45 },
          ]
        : [];

    return [...base, ...journalIndex, ...productEntries, ...communityEntries, ...blogEntries];
  } catch (err) {
    console.error("[sitemap] Failed to load dynamic entries:", err);
    return base;
  }
}
