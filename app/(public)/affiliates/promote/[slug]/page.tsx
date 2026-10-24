import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProductBySlug } from "@/services/db";
import { generateAffiliateUrl } from "@/lib/utils";
import { getSiteUrl } from "@/lib/site-url";
import { getResolvedPlatformSettings } from "@/lib/platform-settings";
import { createAffiliateLink } from "@/lib/affiliate/campaigns";
import {
  AffiliatePromoteProductClient,
  type AffiliatePromoteProductView,
} from "@/components/affiliate/AffiliatePromoteProductClient";
import { offerForAffiliateProduct } from "@/lib/affiliate/commission-tiers";
import { PLATFORM_CURRENCY } from "@/lib/currency/platform";
import {
  affiliatePlainText,
  deriveAffiliateBenefits,
  extractSafeDescriptionImages,
} from "@/lib/affiliate/rich-content";

function collectProductImages(images: unknown): string[] {
  if (!images) return [];
  let arr: unknown[] = [];
  if (typeof images === "string") {
    try {
      arr = JSON.parse(images);
    } catch {
      return typeof images === "string" && images.startsWith("http") ? [images] : [];
    }
  } else if (Array.isArray(images)) {
    arr = images;
  }
  const out: string[] = [];
  for (const item of arr) {
    if (typeof item === "string" && (item.startsWith("http") || item.startsWith("/"))) {
      out.push(item);
    } else if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const u = o.url ?? o.src ?? o.image_url;
      if (typeof u === "string" && (u.startsWith("http") || u.startsWith("/"))) out.push(u);
    }
  }
  return out;
}

function collectVideoUrl(product: Record<string, unknown>): string | null {
  const videos = product.product_videos;
  if (Array.isArray(videos) && videos.length > 0) {
    const first = videos[0] as { url?: string };
    if (typeof first?.url === "string" && first.url) return first.url;
  }
  const raw = product.videos;
  if (typeof raw === "string" && raw.startsWith("http")) return raw;
  if (Array.isArray(raw) && raw.length) {
    const first = raw[0];
    if (typeof first === "string" && first.startsWith("http")) return first;
    if (first && typeof first === "object") {
      const u = (first as { url?: string }).url;
      if (typeof u === "string" && u.startsWith("http")) return u;
    }
  }
  return null;
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

  const affiliateEnabled = Boolean(
    (product as { affiliate_enabled?: boolean | null }).affiliate_enabled
  );
  if (!affiliateEnabled) {
    notFound();
  }

  const settings = await getResolvedPlatformSettings();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const storedCurrency =
    (product as { currency?: string | null }).currency || PLATFORM_CURRENCY;
  const offer = offerForAffiliateProduct({
    price: Number(product.price ?? 0),
    currency: storedCurrency,
    configuredPercent: (product as { affiliate_commission_rate?: number | null }).affiliate_commission_rate,
    fallbackPercent: settings.fees.default_affiliate_commission_percent,
    fixedEarning: (product as { affiliate_price?: number | null }).affiliate_price,
  });
  const price = offer.priceUsd;
  const rate = offer.rate ?? 0;
  const avgEarning = offer.earningUsd;
  const currency = PLATFORM_CURRENCY;
  const description = String(
    (product as { description?: string | null }).description ?? ""
  ).trim();
  const shortDescription = String(
    (product as { short_description?: string | null }).short_description ?? ""
  ).trim();
  const gallery = collectProductImages(product.images);
  const embeddedImages = extractSafeDescriptionImages(description || shortDescription);
  const images = gallery.length > 0 ? gallery : embeddedImages;
  const features = (
    Array.isArray((product as { features?: string[] | null }).features)
      ? ((product as { features?: string[] }).features ?? [])
      : []
  )
    .map((feature) => affiliatePlainText(String(feature)))
    .filter(Boolean);

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
    description,
    shortDescription,
    images,
    videoUrl: collectVideoUrl(product as unknown as Record<string, unknown>),
    features,
    benefits: deriveAffiliateBenefits(description || shortDescription, features),
    category:
      (product as { product_categories?: { name?: string | null } | null })
        .product_categories?.name ??
      (product as { product_type?: string | null }).product_type ??
      "General",
    brand: (product as { brand?: string | null }).brand ?? null,
    price,
    currency,
    rate,
    avgEarning,
    sellerName: vendor?.business_name ?? null,
    verified:
      verification === "verified" ||
      verification === "approved" ||
      verification === "active",
  };

  let affiliateLink: string | null = null;
  let linkCode: string | null = null;
  let needsAffiliate = false;
  let linkError: string | null = null;
  let picked = false;

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

      const { data: existingRows } = await supabase
        .from("affiliate_links")
        .select("link_code, full_url, destination_url")
        .eq("affiliate_id", affiliate.id)
        .eq("product_id", product.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      const existing = Array.isArray(existingRows) ? existingRows[0] : existingRows;

      if (existing?.link_code) {
        linkCode = existing.link_code;
        affiliateLink =
          existing.full_url?.startsWith("http")
            ? existing.full_url
            : generateAffiliateUrl(site, existing.link_code);
        picked = true;
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
          picked = true;
        } catch (err) {
          linkError =
            err instanceof Error && err.message
              ? "Could not create your affiliate link. Try again."
              : "Could not create your affiliate link. Try again.";
        }
      }
    }
  }

  return (
    <AffiliatePromoteProductClient
      product={view}
      affiliateLink={affiliateLink}
      linkCode={linkCode}
      initialPicked={picked}
      initialLinkError={linkError}
      needsAuth={!user}
      needsAffiliate={!!user && needsAffiliate}
      activateHref="/activate/affiliate"
      loginHref={`/login?next=${encodeURIComponent(`/affiliates/promote/${slug}`)}`}
    />
  );
}
