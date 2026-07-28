import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProductBySlug } from "@/services/db";
import { getImage, generateAffiliateUrl } from "@/lib/utils";
import { getSiteUrl } from "@/lib/site-url";
import { getResolvedPlatformSettings } from "@/lib/platform-settings";
import { createAffiliateLink } from "@/lib/affiliate/campaigns";
import {
  AffiliatePromoteProductClient,
  type AffiliatePromoteProductView,
} from "@/components/affiliate/AffiliatePromoteProductClient";

function collectProductImages(images: unknown): string[] {
  if (!images) return [];
  let arr: unknown[] = [];
  if (typeof images === "string") {
    try {
      arr = JSON.parse(images);
    } catch {
      return getImage(images) !== "/placeholder.png" ? [getImage(images)] : [];
    }
  } else if (Array.isArray(images)) {
    arr = images;
  }
  const out: string[] = [];
  for (const item of arr) {
    if (typeof item === "string" && item.startsWith("http")) out.push(item);
    else if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const u = o.url ?? o.src ?? o.image_url;
      if (typeof u === "string" && (u.startsWith("http") || u.startsWith("/"))) out.push(u);
    }
  }
  if (out.length === 0) {
    const fallback = getImage(images);
    if (fallback && fallback !== "/placeholder.png") out.push(fallback);
  }
  return out;
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Promote product | Jimvio" };
  return {
    title: `Promote ${product.name} | Jimvio Affiliates`,
    description: `Get your tracked affiliate link for ${product.name}.`,
  };
}

export default async function AffiliatePromoteProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const settings = await getResolvedPlatformSettings();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rate = Number(
    (product as { affiliate_commission_rate?: number | null }).affiliate_commission_rate ??
      settings.fees.default_affiliate_commission_percent
  );
  const currency =
    (product as { currency?: string | null }).currency || "USD";
  const price = Number(product.price ?? 0);
  const images = collectProductImages(product.images);

  const vendor = (product as {
    vendors?: {
      business_name?: string | null;
      verification_status?: string | null;
    } | null;
  }).vendors;
  const verification = vendor?.verification_status?.toLowerCase() ?? "";

  const view: AffiliatePromoteProductView = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: String(
      (product as { description?: string | null }).description ?? ""
    ).trim(),
    images,
    category:
      (product as { product_categories?: { name?: string | null } | null })
        .product_categories?.name ??
      (product as { product_type?: string | null }).product_type ??
      "General",
    price,
    currency,
    rate,
    avgEarning: Math.round(price * (rate / 100)),
    sellerName: vendor?.business_name ?? null,
    verified:
      verification === "verified" ||
      verification === "approved" ||
      verification === "active",
  };

  let affiliateLink: string | null = null;
  let linkCode: string | null = null;
  let needsAffiliate = false;

  if (user) {
    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("id, is_active")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!affiliate?.is_active) {
      needsAffiliate = true;
    } else {
      const site = getSiteUrl();
      const destinationUrl = `${site}/marketplace/${product.slug}`;

      const { data: existing } = await supabase
        .from("affiliate_links")
        .select("link_code, full_url, destination_url")
        .eq("affiliate_id", affiliate.id)
        .eq("product_id", product.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing?.link_code) {
        linkCode = existing.link_code;
        affiliateLink =
          existing.full_url?.startsWith("http")
            ? existing.full_url
            : generateAffiliateUrl(site, existing.link_code);
      } else {
        try {
          const link = await createAffiliateLink({
            affiliateId: affiliate.id,
            productId: product.id,
            vendorId: (product as { vendor_id?: string | null }).vendor_id ?? null,
            destinationUrl,
            commissionRate: rate,
          });
          linkCode = link.link_code;
          affiliateLink = link.full_url?.startsWith("http")
            ? link.full_url
            : generateAffiliateUrl(site, link.link_code);
        } catch {
          // Client can retry via API
        }
      }
    }
  }

  return (
    <AffiliatePromoteProductClient
      product={view}
      affiliateLink={affiliateLink}
      linkCode={linkCode}
      needsAuth={!user}
      needsAffiliate={!!user && needsAffiliate}
      activateHref="/dashboard/activate/affiliate"
      loginHref={`/login?next=${encodeURIComponent(`/affiliates/promote/${slug}`)}`}
    />
  );
}
